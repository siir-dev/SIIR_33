/**
 * Narrative lead, assisted by an AI model. The model only sees the posts in data/x-posts.json and must quote them:
 * a call it cannot quote word for word is discarded, and with no valid quote the score is capped at 10. Because the
 * outcome of a call is not checked, the score never exceeds 60. Scores are stored as `narrative_lead` snapshots with
 * source `ai-assist` (an editor can overwrite them) and a short editorial paragraph is appended to the dossier.
 *   npx ts-node scripts/narrative-ai.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { SIGNAL } from '../src/config/scoring';
import { METHODOLOGY_VERSION } from '../src/editorial/scoring.service';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ override: true });
} catch {
  /* Prisma loads .env on its own */
}

const MAX_SCORE = 60;
const NO_CALL_CAP = 10;
const norm = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

const SYSTEM =
  'You assess the "Narrative lead" component of SIIR, an influencer ranking on Solana and Robinhood Chain. Narrative lead means: how often a mind states a view about a theme, asset or market direction BEFORE it plays out. ' +
  'You are given dated posts. A CALL is a forward-looking statement that names a theme, asset or direction and could later be checked (for example "X coins will be explosive"). ' +
  'Not calls: profit screenshots, lifestyle, jokes, complaints, promotion, referral links, reactions, gratitude, or opinions about the past. ' +
  'Reply with JSON only: {"calls":[{"date":"YYYY-MM-DD","quote":"words copied exactly from one post, at most 20 words"}],"score":0-100,"narrative":"two sentences"}. ' +
  'Score rubric: 0 when there is no call; 1-30 for vague, generic market opinions; 31-60 for specific, dated calls. Never above 60, because outcomes are not verified here. ' +
  'The narrative is two calm, professional sentences in the register of a Forbes editor. Use only what the posts show. State that outcomes are not verified when calls exist. ' +
  'When there is no call, say plainly that no forward-looking call appears in the posts sampled. No numbers other than dates, no character judgement, no insults, no investment advice, no emoji, no quotation marks.';

async function ask(base: string, key: string, model: string, name: string, posts: string[]): Promise<{ calls: { date: string; quote: string }[]; score: number; narrative: string }> {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Name: ${name}\nPosts (date text):\n${posts.map((p) => `- ${p}`).join('\n')}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (body.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in reply');
  return JSON.parse(m[0]);
}

(async () => {
  const prisma = new PrismaClient();
  const key = process.env.OPENAI_API_KEY ?? '';
  const base = (process.env.OPENAI_BASE_URL ?? '').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL ?? '';
  if (!key || !base || !model) throw new Error('AI provider is not configured');
  const evidence: Record<string, string[]> = JSON.parse(readFileSync(join(__dirname, '..', '..', 'data', 'x-posts.json'), 'utf8'));
  delete (evidence as Record<string, unknown>)._note;

  const infs = await prisma.influencer.findMany({ where: { submittedBy: 'editorial-import' }, include: { dossiers: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  const summary: string[] = [];
  for (const inf of infs) {
    const posts = evidence[inf.handle];
    const dossier = inf.dossiers[0];
    if (!posts || !dossier) continue;
    try {
      let out: Awaited<ReturnType<typeof ask>> | undefined;
      for (let attempt = 0; attempt < 2 && !out; attempt++) {
        try {
          out = await ask(base, key, model, inf.name, posts);
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      if (!out) continue;
      const bodies = posts.map((p) => ({ date: p.slice(0, 10), text: norm(p.slice(11)) }));
      const valid = (out.calls ?? []).filter((c) => c?.quote && bodies.some((b) => b.date === c.date && b.text.includes(norm(c.quote))));
      let score = Math.max(0, Math.min(MAX_SCORE, Math.round(Number(out.score) || 0)));
      if (valid.length === 0) score = Math.min(score, NO_CALL_CAP);
      let narrative = String(out.narrative ?? '').replace(/\s+/g, ' ').replace(/["“”]/g, '').trim();
      const evidenceText = posts.join(' ');
      const badNumber = (narrative.match(/\d[\d,.]*/g) ?? []).some((n) => !evidenceText.includes(n) && !/^20\d\d/.test(n));
      if (!narrative || narrative.length > 420 || badNumber) {
        narrative = valid.length
          ? `${inf.name} states forward-looking views in the sampled posts; outcomes are not verified.`
          : `No forward-looking call appears in the posts sampled for ${inf.name}.`;
      }
      await prisma.signalSnapshot.create({
        data: { influencerId: inf.id, signalKey: SIGNAL.narrativeLead, value: score, source: 'ai-assist', methodVersion: METHODOLOGY_VERSION, rawPayload: JSON.stringify({ model, calls: valid, sample: posts.length, readOn: '2026-10-25' }) },
      });
      const base0 = dossier.body.replace(/ Narrative lead is not rated yet\.$/, '');
      await prisma.dossier.update({
        where: { id: dossier.id },
        data: { body: `${base0} ${narrative}`.trim(), verdict: 'Rated on reach, engagement, on-chain footprint and an AI-assisted narrative assessment of sampled posts.', aiDrafted: true, editorVerified: false, publishedAt: null },
      });
      summary.push(`@${inf.handle.padEnd(14)} score=${String(score).padStart(2)} calls=${valid.length}/${(out.calls ?? []).length}  ${narrative}`);
    } catch (e) {
      summary.push(`@${inf.handle}: failed (${(e as Error).message}), left unrated`);
    }
  }
  console.log(summary.join('\n'));
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SIGNAL } from '../config/scoring';

/** Drafts the "Why they're Seen" paragraph with an OpenAI-compatible model. An editor always rewrites or approves it. */
@Injectable()
export class DossierAiService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAiDossier(influencerId: string): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new ServiceUnavailableException('AI drafting is disabled: OPENAI_API_KEY is not set');

    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      include: { identities: true },
    });
    if (!influencer) throw new NotFoundException('Influencer not found');

    const snapshots = await this.prisma.signalSnapshot.findMany({ where: { influencerId }, orderBy: { collectedAt: 'desc' } });
    const latest = (key: string) => snapshots.find((x) => x.signalKey === key)?.value;
    // The text is public. Only plain, checkable numbers go in: no profit, win rate, wallet age or source names.
    const chain = influencer.chains.split(',')[0] === 'robinhood' ? 'Robinhood Chain' : 'Solana';
    const lines: string[] = [`Chain: ${chain}`];
    const followers = latest(SIGNAL.followers);
    const engagement = latest(SIGNAL.engagementRate);
    const trades = latest(SIGNAL.trades30d);
    const total = latest(SIGNAL.txCountTotal);
    if (followers !== undefined) lines.push(`Followers on X: ${Math.round(followers).toLocaleString('en-US')}`);
    if (engagement !== undefined) lines.push(`Engagement rate (interactions per post divided by followers): ${(engagement * 100).toFixed(2)}%`);
    if (trades !== undefined) lines.push(`Trades in the last 30 days: ${Math.round(trades).toLocaleString('en-US')}`);
    if (total !== undefined) lines.push(`Transactions sent on the chain, lifetime: ${Math.round(total).toLocaleString('en-US')}`);
    const facts = lines.join('\n');

    const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You write the "Why they\'re Seen" paragraph for SIIR, an influencer ranking on Solana and Robinhood Chain. ' +
              'Tone: calm, authoritative, slightly mysterious, like a Forbes editor reading a forecast. Exactly two short sentences. ' +
              'No emoji, no hype, no price talk, no investment advice. Use only the facts given; never invent numbers or claims about topics, history or personality that the facts do not state. ' +
              'Say nothing about what the person posts about, the wallet age, or where the data comes from. Describe the numbers only: no judgement words such as quiet, loud, steady, strong, earned, or striking. Use the name once. Plain text only, no quotation marks, no title or prefix.',
          },
          {
            role: 'user',
            content: `Name: ${influencer.name}\nHandle: @${influencer.handle}\nRealm: ${influencer.realm}\nMeasured facts:\n${facts}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new ServiceUnavailableException(`AI provider returned ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ServiceUnavailableException('AI provider returned no content');
    return text;
  }
}

import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    const snapshots = await this.prisma.signalSnapshot.findMany({ where: { influencerId }, orderBy: { collectedAt: 'desc' }, take: 30 });
    const facts = snapshots.map((s) => `${s.signalKey}: ${s.value} (${s.source})`).join('\n') || 'No measured signals yet.';

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
              'Tone: calm, authoritative, slightly mysterious, like a Forbes editor reading a forecast. Two or three short sentences. ' +
              'No emoji, no hype, no price talk, no investment advice. Use only the facts given; never invent numbers.',
          },
          {
            role: 'user',
            content: `Name: ${influencer.name}\nHandle: @${influencer.handle}\nRealm: ${influencer.realm}\nBio: ${influencer.bio}\nMeasured signals:\n${facts}`,
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { THRESHOLDS, WEIGHTS } from '../config/siir';
import { SIGNAL, computeScore, deriveComponents, realmFromOnchain } from '../config/scoring';

export const METHODOLOGY_VERSION = '0.1';

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /** Consecutive most recent epochs in which the mind was listed with a score at or above the consistency threshold. */
  async consecutiveEpochs(influencerId: string): Promise<number> {
    const rows = await this.prisma.epochScore.findMany({
      where: { influencerId },
      orderBy: { epochNumber: 'desc' },
      select: { epochNumber: true, score: true },
    });
    let streak = 0;
    let expected = rows[0]?.epochNumber;
    for (const r of rows) {
      if (r.epochNumber !== expected || r.score < THRESHOLDS.consistencyScore) break;
      streak++;
      expected = r.epochNumber - 1;
    }
    return streak;
  }

  async calculateInfluencerScore(influencerId: string, methodologyVersion = METHODOLOGY_VERSION) {
    const influencer = await this.prisma.influencer.findUnique({ where: { id: influencerId } });
    if (!influencer) throw new NotFoundException('Influencer not found');

    console.log(`[SCAN PIPELINE - STEP 3] Calculating SIIR Score for "${influencer.name}" (@${influencer.handle})`);

    const snapshots = await this.prisma.signalSnapshot.findMany({
      where: { influencerId },
      orderBy: { collectedAt: 'desc' },
    });
    const walletChains = influencer.chains.split(',').filter(Boolean);
    const streak = await this.consecutiveEpochs(influencerId);
    const derived = deriveComponents(snapshots, streak);
    const finalScore = derived.insufficientEvidence ? 0 : computeScore(derived.components);

    // Realm follows measured on-chain strength; Bridged needs the threshold on both chains.
    const realm = realmFromOnchain(derived.onchainByChain, walletChains);
    if (realm !== influencer.realm) await this.prisma.influencer.update({ where: { id: influencerId }, data: { realm } });

    const pct = (n: number) => Math.round(n * 1000) / 10;
    const hardSignalScores = {
      finalScore,
      reach: pct(derived.components.reach),
      engagement: pct(derived.components.engagement),
      narrative: pct(derived.components.narrative),
      onchain: pct(derived.components.onchain),
      consistency: pct(derived.components.consistency),
      reachCount: derived.reachCount,
      consecutiveEpochs: streak,
      onchainByChain: derived.onchainByChain,
      realm,
      thresholds: THRESHOLDS,
      evidenced: derived.evidenced,
      insufficientEvidence: derived.insufficientEvidence,
      weights: Object.fromEntries(WEIGHTS.map((w) => [w.key, w.weight])),
      signalKeys: SIGNAL,
    };

    console.log(`- Final score: ${finalScore} / 100 (insufficient evidence: ${derived.insufficientEvidence})`);

    return this.prisma.score.create({
      data: {
        influencerId,
        methodologyVersion,
        hardSignalScores: JSON.stringify(hardSignalScores),
        editorialScore: derived.components.narrative * 100,
        confidence: derived.insufficientEvidence ? 0 : 1,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestService, SignalReading } from './ingest.service';
import { ScoringService, METHODOLOGY_VERSION } from '../editorial/scoring.service';
import { isChainKey, isValidAddressForChain } from '../config/explorer-registry';

/**
 * The scan pipeline. BullMQ processors and the no-Redis fallback both call these two steps,
 * so the queue path and the synchronous path behave identically.
 *
 *   submitted -> [verify] -> queued -> [ingest + score] -> draft -> (editor) -> published
 */
@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestService: IngestService,
    private readonly scoringService: ScoringService,
  ) {}

  /** Step 1. Returns true when the nomination passed and is `queued` for ingestion. */
  async verify(influencerId: string): Promise<boolean> {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      include: { identities: true, links: true },
    });
    if (!influencer) return false;

    console.log(`[SCAN PIPELINE - STEP 1] Verifying nomination: "${influencer.name}" (@${influencer.handle})`);
    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'ingesting' } });

    const errors: string[] = [];

    // Links: only the website is checked, because x.com answers 200 for any handle and proves nothing.
    for (const link of influencer.links.filter((l) => l.kind === 'website')) {
      const result = await this.ingestService.checkUrl(link.url);
      await this.prisma.influencerLink.update({
        where: { id: link.id },
        data: { resolves: result.ok, httpStatus: result.status ?? null, lastCheckedAt: new Date() },
      });
      if (!result.ok) console.warn(`[VERIFY WARNING] ${link.url} did not resolve (${result.status ?? 'network error'})`);
    }

    // Wallets: address format per chain, then on-chain activity.
    let validWallets = 0;
    for (const identity of influencer.identities) {
      if (!isChainKey(identity.chainKey) || !isValidAddressForChain(identity.chainKey, identity.address)) {
        errors.push(`Invalid ${identity.chainKey} address: ${identity.address}`);
        continue;
      }
      validWallets++;
      if (identity.verificationTier === 'ownership_verified') continue; // proven by the submitter's signature

      try {
        const active = await this.ingestService.hasOnchainActivity(identity.chainKey, identity.address);
        await this.prisma.influencerIdentity.update({
          where: { id: identity.id },
          data: {
            verificationTier: active ? 'verified' : 'unverified',
            verificationMethod: active ? 'rpc_activity' : 'none',
            lastCheckedAt: new Date(),
            verifiedAt: active ? new Date() : identity.verifiedAt,
          },
        });
      } catch (e) {
        console.warn(`[VERIFY WARNING] RPC check failed for ${identity.address} on ${identity.chainKey}:`, (e as Error).message);
      }
    }
    if (validWallets === 0) errors.push('No valid wallet address');

    if (errors.length) {
      await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'rejected_invalid' } });
      console.log(`Nomination @${influencer.handle} rejected:`, errors.join('; '));
      return false;
    }

    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'queued' } });
    console.log(`Nomination @${influencer.handle} verified and queued.`);
    return true;
  }

  /** Steps 2 and 3. Ends in `draft`: a human editor decides what happens next. */
  async ingestAndScore(influencerId: string): Promise<void> {
    const influencer = await this.prisma.influencer.findUnique({ where: { id: influencerId }, include: { identities: true } });
    if (!influencer) return;

    console.log(`[SCAN PIPELINE - STEP 2] Ingesting signals for "${influencer.name}" (@${influencer.handle})`);
    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'ingesting' } });

    const readings: SignalReading[] = [];

    try {
      readings.push(...(await this.ingestService.fetchSocialSignals(influencer.handle)));
    } catch (e) {
      console.warn(`[INGEST WARNING] Social signals failed for @${influencer.handle}:`, (e as Error).message);
    }

    for (const identity of influencer.identities) {
      if (identity.verificationTier === 'unverified' || !isChainKey(identity.chainKey)) continue;
      try {
        readings.push(...(await this.ingestService.fetchOnchainSignals(identity.chainKey, identity.address)));
      } catch (e) {
        console.warn(`[INGEST WARNING] On-chain signals failed for ${identity.address}:`, (e as Error).message);
      }
    }

    if (readings.length) {
      await this.prisma.signalSnapshot.createMany({
        data: readings.map((r) => ({
          influencerId,
          signalKey: r.signalKey,
          value: r.value,
          source: r.source,
          methodVersion: METHODOLOGY_VERSION,
          rawPayload: JSON.stringify(r.raw ?? {}),
        })),
      });
    }

    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'analyzing' } });
    await this.scoringService.calculateInfluencerScore(influencerId);
    await this.prisma.influencer.update({ where: { id: influencerId }, data: { status: 'draft' } });
    console.log(`@${influencer.handle} scored and waiting in the editorial draft queue.`);
  }

  /** No Redis (local development): run both steps in-process. */
  async runSynchronously(influencerId: string): Promise<void> {
    if (await this.verify(influencerId)) await this.ingestAndScore(influencerId);
  }
}

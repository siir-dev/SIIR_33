import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineService } from './pipeline.service';
import { SubmitInfluencerDto } from './dto/submit-influencer.dto';
import { nominationMessage, verifyWalletSignature } from './wallet-signature';
import { explorerUrl, isChainKey, isValidAddressForChain, realmFromChains } from '../config/explorer-registry';

const SIMILARITY_BLOCK = 0.85;

@Injectable()
export class InfluencersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
    @InjectQueue('verify') private readonly verifyQueue: Queue,
  ) {}

  /** A submitter's own nominations (by wallet), or every published mind when no wallet is given. */
  async findAll(walletAddress?: string) {
    const wallet = walletAddress?.trim();
    const rows = await this.prisma.influencer.findMany({
      where: wallet ? { submittedBy: { equals: wallet, mode: 'insensitive' } } : { status: 'published' },
      orderBy: { submittedAt: 'desc' },
      include: { identities: true },
    });
    return rows.map((r) => ({
      handle: r.handle,
      name: r.name,
      status: r.status,
      realm: r.realm,
      submittedAt: r.submittedAt,
      processAfter: r.processAfter,
      identities: r.identities.map((i) => ({
        chainKey: i.chainKey,
        address: i.address,
        verificationTier: i.verificationTier,
        explorerUrl: explorerUrl(i.chainKey, i.address),
      })),
    }));
  }

  async getIdentity(handle: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { handle: handle.replace(/^@/, '').toLowerCase() },
      include: { identities: true },
    });
    if (!influencer) throw new NotFoundException('Influencer not found');
    return {
      handle: influencer.handle,
      ownershipVerified: influencer.ownershipVerified,
      identities: influencer.identities.map((i) => ({
        chainKey: i.chainKey,
        address: i.address,
        verificationTier: i.verificationTier,
        verificationMethod: i.verificationMethod,
        verifiedAt: i.verifiedAt,
        explorerUrl: explorerUrl(i.chainKey, i.address),
      })),
    };
  }

  async submit(dto: SubmitInfluencerDto) {
    const handle = dto.handle.replace(/^@/, '').toLowerCase();

    // 1. The nomination is signed by a wallet; that wallet is accountable for it.
    verifyWalletSignature(nominationMessage(dto.name, handle, dto.submitterWallet), dto.submitterWallet, dto.signature);

    const wallets = dto.wallets.map((w) => ({ chainKey: w.chainKey, address: w.address.trim() }));
    for (const w of wallets) {
      if (!isChainKey(w.chainKey) || !isValidAddressForChain(w.chainKey, w.address)) {
        throw new ConflictException(`Invalid ${w.chainKey} address: ${w.address}`);
      }
    }

    // 2. Anti-abuse: a wallet can only belong to one mind, a handle only once, and names cannot impersonate.
    const existing = await this.prisma.influencer.findUnique({ where: { handle } });
    if (existing && existing.submittedBy.toLowerCase() !== dto.submitterWallet.toLowerCase()) {
      throw new ConflictException(`@${handle} has already been nominated.`);
    }
    for (const w of wallets) {
      const taken = await this.prisma.influencerIdentity.findFirst({
        where: { address: { equals: w.address, mode: 'insensitive' }, NOT: { influencerId: existing?.id ?? '' } },
      });
      if (taken) throw new ConflictException(`Wallet ${w.address} is already registered to another mind.`);
    }
    const nameKey = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const others = await this.prisma.influencer.findMany({ select: { id: true, name: true, handle: true } });
    for (const other of others) {
      if (other.handle === handle) continue;
      const otherKey = other.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const longest = Math.max(nameKey.length, otherKey.length);
      const similarity = longest === 0 ? 1 : 1 - this.levenshtein(nameKey, otherKey) / longest;
      if (similarity >= SIMILARITY_BLOCK) {
        throw new ConflictException(`"${dto.name}" is too similar to "${other.name}". Impersonation is not permitted.`);
      }
    }

    // 3. Per-wallet scan delay: 2 minutes, then 30 minutes, then 2 hours.
    const scanCount = await this.prisma.influencer.count({ where: { submittedBy: dto.submitterWallet } });
    const delayMs = scanCount === 0 ? 2 * 60_000 : scanCount === 1 ? 30 * 60_000 : 2 * 60 * 60_000;
    const processAfter = new Date(Date.now() + delayMs);

    const chains = [...new Set(wallets.map((w) => w.chainKey))];
    const data = {
      name: dto.name,
      bio: dto.bio ?? '',
      realm: realmFromChains([chains[0]]), // provisional; Bridged is only awarded after scoring
      chains: chains.join(','),
      status: 'submitted',
      submittedBy: dto.submitterWallet,
      selectionRationale: dto.rationale ?? null,
      processAfter,
      scanIndex: scanCount,
    };

    const influencer = existing
      ? await this.prisma.influencer.update({ where: { id: existing.id }, data })
      : await this.prisma.influencer.create({
          data: { ...data, handle, slug: `${handle}-${Math.random().toString(36).slice(2, 8)}` },
        });

    await this.syncIdentitiesAndLinks(influencer.id, handle, wallets, dto);

    if (existing) {
      // Fresh scan: drop stale signals and scores.
      await this.prisma.signalSnapshot.deleteMany({ where: { influencerId: influencer.id } });
      await this.prisma.score.deleteMany({ where: { influencerId: influencer.id } });
    }

    // 4. Queue the pipeline. Without Redis, fall back to running it in-process.
    let queued = false;
    try {
      await Promise.race([
        this.verifyQueue.add('verify-influencer', { influencerId: influencer.id }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000)),
      ]);
      queued = true;
    } catch {
      console.warn('Queue unavailable (Redis offline). Running the scan pipeline in-process.');
    }
    if (!queued) this.pipeline.runSynchronously(influencer.id).catch((err) => console.error('Scan pipeline failed:', err));

    return {
      influencerId: influencer.id,
      handle,
      status: influencer.status,
      message: existing
        ? 'Nomination updated. Re-running the scan.'
        : 'Nomination registered for assessment. Entry to The SIIR 33 is not guaranteed.',
    };
  }

  private async syncIdentitiesAndLinks(
    influencerId: string,
    handle: string,
    wallets: { chainKey: string; address: string }[],
    dto: SubmitInfluencerDto,
  ) {
    await this.prisma.influencerIdentity.deleteMany({ where: { influencerId } });
    await this.prisma.influencerIdentity.createMany({
      data: wallets.map((w, i) => {
        // The submitter proved control of this wallet by signing; everyone else is verified later by activity.
        const owned = w.address.toLowerCase() === dto.submitterWallet.toLowerCase();
        return {
          influencerId,
          chainKey: w.chainKey,
          address: w.address,
          isPrimary: i === 0,
          verificationTier: owned ? 'ownership_verified' : 'unverified',
          verificationMethod: owned ? 'signature' : 'none',
        };
      }),
    });
    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: { ownershipVerified: wallets.some((w) => w.address.toLowerCase() === dto.submitterWallet.toLowerCase()) },
    });

    await this.prisma.influencerLink.deleteMany({ where: { influencerId } });
    await this.prisma.influencerLink.createMany({
      data: [
        { influencerId, kind: 'x', url: `https://x.com/${handle}` },
        ...(dto.website ? [{ influencerId, kind: 'website', url: dto.website }] : []),
      ],
    });
  }

  private levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }
}

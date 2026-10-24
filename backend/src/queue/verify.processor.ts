import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineService } from '../influencers/pipeline.service';

@Processor('verify')
export class VerifyProcessor extends WorkerHost {
  constructor(
    private readonly pipeline: PipelineService,
    private readonly prisma: PrismaService,
    @InjectQueue('ingest') private readonly ingestQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ influencerId: string }>): Promise<void> {
    const { influencerId } = job.data;
    const passed = await this.pipeline.verify(influencerId);
    if (!passed) return;

    // Hand over to ingestion, honouring the per-wallet scan delay set at submission.
    const influencer = await this.prisma.influencer.findUnique({ where: { id: influencerId }, select: { processAfter: true } });
    const delay = Math.max(0, (influencer?.processAfter?.getTime() ?? 0) - Date.now());
    await this.ingestQueue.add('ingest-influencer', { influencerId }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  }
}

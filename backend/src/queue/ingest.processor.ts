import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PipelineService } from '../influencers/pipeline.service';

@Processor('ingest')
export class IngestProcessor extends WorkerHost {
  constructor(private readonly pipeline: PipelineService) {
    super();
  }

  async process(job: Job<{ influencerId: string }>): Promise<void> {
    await this.pipeline.ingestAndScore(job.data.influencerId);
  }
}

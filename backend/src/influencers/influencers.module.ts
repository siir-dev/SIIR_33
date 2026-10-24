import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InfluencersController } from './influencers.controller';
import { BadgeController } from './badge.controller';
import { InfluencersService } from './influencers.service';
import { IngestService } from './ingest.service';
import { PipelineService } from './pipeline.service';
import { EditorialModule } from '../editorial/editorial.module';
import { EpochsModule } from '../epochs/epochs.module';
import { VerifyProcessor } from '../queue/verify.processor';
import { IngestProcessor } from '../queue/ingest.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'verify' }, { name: 'ingest' }), EditorialModule, EpochsModule],
  controllers: [InfluencersController, BadgeController],
  providers: [InfluencersService, IngestService, PipelineService, VerifyProcessor, IngestProcessor],
  exports: [IngestService, PipelineService],
})
export class InfluencersModule {}

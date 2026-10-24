import { Module } from '@nestjs/common';
import { EpochsController } from './epochs.controller';
import { EpochsService } from './epochs.service';

@Module({
  controllers: [EpochsController],
  providers: [EpochsService],
  exports: [EpochsService],
})
export class EpochsModule {}

import { Module } from '@nestjs/common';
import { EditorialController } from './editorial.controller';
import { EditorialService } from './editorial.service';
import { ScoringService } from './scoring.service';
import { DossierAiService } from './dossier-ai.service';
import { EditorialGuard } from './editorial.guard';
import { EpochsModule } from '../epochs/epochs.module';
import { SeenModule } from '../seen/seen.module';

@Module({
  imports: [EpochsModule, SeenModule],
  controllers: [EditorialController],
  providers: [EditorialService, ScoringService, DossierAiService, EditorialGuard],
  exports: [ScoringService, DossierAiService],
})
export class EditorialModule {}

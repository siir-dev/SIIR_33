import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { EditorialService } from './editorial.service';
import { DossierAiService } from './dossier-ai.service';
import { EditorialGuard } from './editorial.guard';
import { CreateDossierDto, DecohereDto, PublishEpochDto } from './dto/editorial.dto';

type EditorReq = { editor: { id: string; email: string } };

@Controller('editorial')
@UseGuards(EditorialGuard)
export class EditorialController {
  constructor(
    private readonly editorialService: EditorialService,
    private readonly dossierAiService: DossierAiService,
  ) {}

  @Get('stats')
  getStats() {
    return this.editorialService.getStats();
  }

  @Post('dossier')
  saveDossier(@Req() req: EditorReq, @Body() dto: CreateDossierDto) {
    return this.editorialService.createOrUpdateDossier(req.editor, dto);
  }

  @Post('dossier/generate-ai')
  async generateAi(@Body('influencerId') influencerId: string) {
    if (!influencerId) throw new BadRequestException('influencerId is required');
    return { content: await this.dossierAiService.generateAiDossier(influencerId) };
  }

  @Post('publish')
  publish(@Req() req: EditorReq, @Body('influencerId') influencerId: string) {
    if (!influencerId) throw new BadRequestException('influencerId is required');
    return this.editorialService.publishDossier(req.editor, influencerId);
  }

  @Post('epochs/publish')
  publishEpoch(@Req() req: EditorReq, @Body() dto: PublishEpochDto) {
    return this.editorialService.publishEpoch(req.editor, dto);
  }

  @Post('decohere')
  decohere(@Req() req: EditorReq, @Body() dto: DecohereDto) {
    return this.editorialService.decohere(req.editor, dto);
  }
}

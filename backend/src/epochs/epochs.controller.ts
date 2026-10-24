import { Controller, Get, Param } from '@nestjs/common';
import { EpochsService } from './epochs.service';

@Controller('epochs')
export class EpochsController {
  constructor(private readonly epochsService: EpochsService) {}

  @Get()
  list() {
    return this.epochsService.list();
  }

  @Get(':ref')
  findOne(@Param('ref') ref: string) {
    return this.epochsService.findOne(ref);
  }
}

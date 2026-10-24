import { Controller, Get, Param } from '@nestjs/common';
import { SeenService } from './seen.service';

@Controller('seen')
export class SeenController {
  constructor(private readonly seenService: SeenService) {}

  @Get(':handle')
  findByHandle(@Param('handle') handle: string) {
    return this.seenService.findByHandle(handle);
  }
}

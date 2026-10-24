import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { OgService } from './og.service';

/** Share card for X, Telegram and friends: 1200x630 PNG. */
@Controller('og')
export class OgController {
  constructor(private readonly og: OgService) {}

  @Get(':file')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=600, s-maxage=600')
  async card(@Param('file') file: string) {
    const handle = file.replace(/\.png$/i, '').replace(/^@/, '').toLowerCase();
    return new StreamableFile(await this.og.forHandle(handle));
  }
}

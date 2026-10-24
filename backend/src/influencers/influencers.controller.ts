import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InfluencersService } from './influencers.service';
import { SubmitInfluencerDto } from './dto/submit-influencer.dto';
import { EpochsService } from '../epochs/epochs.service';

@Controller('influencers')
export class InfluencersController {
  constructor(
    private readonly influencersService: InfluencersService,
    private readonly epochsService: EpochsService,
  ) {}

  @Get()
  findAll(@Query('walletAddress') walletAddress?: string) {
    return this.influencersService.findAll(walletAddress);
  }

  @Get('public-rankings')
  getPublicRankings() {
    return this.epochsService.findOne('current');
  }

  @Get(':handle/identity')
  getIdentity(@Param('handle') handle: string) {
    return this.influencersService.getIdentity(handle);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('submit')
  submit(@Body() dto: SubmitInfluencerDto) {
    return this.influencersService.submit(dto);
  }
}

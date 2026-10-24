import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent: re-subscribing an existing address succeeds without revealing it was already listed. */
  async create(dto: CreateSubscriberDto) {
    const email = dto.email.trim().toLowerCase();
    await this.prisma.subscriber.upsert({ where: { email }, update: {}, create: { email } });
    return { subscribed: true };
  }
}

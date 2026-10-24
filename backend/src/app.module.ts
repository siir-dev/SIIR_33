import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { InfluencersModule } from './influencers/influencers.module';
import { EditorialModule } from './editorial/editorial.module';
import { EpochsModule } from './epochs/epochs.module';
import { SeenModule } from './seen/seen.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { OgModule } from './og/og.module';
import { MethodologyController } from './methodology.controller';

/** REDIS_URL=redis://host:6379 (Upstash: rediss://default:<password>@host:6379). Defaults to a local Redis. */
function redisConnection() {
  const raw = process.env.REDIS_URL;
  if (!raw) return { host: 'localhost', port: 6379 };
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    PrismaModule,
    InfluencersModule,
    EditorialModule,
    EpochsModule,
    SeenModule,
    SubscribersModule,
    OgModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRoot({ connection: redisConnection() }),
  ],
  controllers: [MethodologyController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

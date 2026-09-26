import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LyricsFetchProcessor } from './lyrics-fetch.processor';
import { LYRICS_FETCH_QUEUE } from './lyrics-fetch.queue';
import { LyricsFetchService } from './lyrics-fetch.service';

@Module({
  imports: [BullModule.registerQueue({ name: LYRICS_FETCH_QUEUE })],
  providers: [LyricsFetchService, LyricsFetchProcessor],
  exports: [LyricsFetchService],
})
export class LyricsFetchModule {}

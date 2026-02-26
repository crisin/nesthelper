import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LyricsFetchProcessor } from './lyrics-fetch.processor';
import { LYRICS_FETCH_QUEUE } from './lyrics-fetch.queue';

@Module({
  imports: [
    BullModule.registerQueue({ name: LYRICS_FETCH_QUEUE }),
  ],
  providers: [LyricsFetchProcessor],
  exports: [BullModule], // re-export so other modules can inject the Queue
})
export class LyricsFetchModule {}

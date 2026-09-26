import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LYRICS_FETCH_QUEUE, LyricsFetchJobData } from './lyrics-fetch.queue';
import { LyricsFetchService } from './lyrics-fetch.service';

/** BullMQ worker; the actual work lives in LyricsFetchService. */
@Processor(LYRICS_FETCH_QUEUE)
export class LyricsFetchProcessor extends WorkerHost {
  constructor(private readonly lyricsFetch: LyricsFetchService) {
    super();
  }

  process(job: Job<LyricsFetchJobData>): Promise<void> {
    return this.lyricsFetch.fetchAndStore(job.data);
  }
}

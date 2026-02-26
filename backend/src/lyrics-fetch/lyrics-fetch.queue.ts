export const LYRICS_FETCH_QUEUE = 'lyrics-fetch';

export interface LyricsFetchJobData {
  savedLyricId: string;
  track: string;
  artist: string;
}

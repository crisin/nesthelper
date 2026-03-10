export const LYRICS_FETCH_QUEUE = 'lyrics-fetch';

export interface LyricsFetchJobData {
  songId: string;
  spotifyId: string;
  track: string;
  artist: string;
}

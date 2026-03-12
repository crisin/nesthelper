export interface User {
  id: string
  email: string
  name?: string
}

export interface SpotifyCurrentlyPlayingResponse {
  item: {
    id: string
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
    duration_ms: number
  } | null
  progress_ms: number | null
  is_playing: boolean
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface SearchHistoryItem {
  id: string
  spotifyId: string
  track: string
  artist: string
  artists: string[]
  url: string
  imgUrl?: string
  createdAt: string
}

// ─── Shared song entity ────────────────────────────────────────────────────────

export interface SongTag {
  id: string
  songId: string | null
  tag: string
  type: 'CONTEXT' | 'MOOD'
  addedBy: string | null
  createdAt: string
}

export interface LyricsLine {
  id: string
  lineNumber: number
  text: string
  timestampMs?: number | null
  annotations?: LineAnnotation[]
}

export interface LyricsVersion {
  id: string
  version: number
  rawText: string
  createdAt: string
}

export interface SongLyrics {
  id: string
  songId: string
  rawText: string
  version: number
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
  lines: LyricsLine[]
  versions: LyricsVersion[]
}

export type LyricsFetchStatus = 'IDLE' | 'FETCHING' | 'DONE' | 'FAILED'

export interface Song {
  id: string
  spotifyId: string
  title: string
  artist: string
  artists: string[]
  imgUrl?: string | null
  spotifyUrl?: string | null
  videoUrl?: string | null
  fetchStatus: LyricsFetchStatus
  firstSeenAt: string
  updatedAt: string
  lyrics?: SongLyrics | null
  tags?: SongTag[]
  hasLyrics?: boolean
  saveCount?: number
}

// ─── Personal bookmark ────────────────────────────────────────────────────────

export interface SavedLyric {
  id: string
  userId: string
  songId: string | null
  note?: string | null
  isFavorite?: boolean
  createdAt: string
  song?: Song | null
}

// ─── Line annotations ──────────────────────────────────────────────────────────

export interface LineAnnotation {
  id: string
  lineId: string
  userId: string
  user: { id: string; name: string | null }
  text: string
  emoji?: string | null
  createdAt: string
  updatedAt: string
}

export interface SongNote {
  id: string
  songId: string
  userId: string
  user: { id: string; name: string | null }
  text: string
  createdAt: string
  updatedAt: string
}

// ─── Phase 2: Collections ─────────────────────────────────────────────────────

export interface CollectionItem {
  id: string
  collectionId: string
  savedLyricId?: string | null
  lineId?: string | null
  position: number
  addedAt: string
  savedLyric?: (SavedLyric & { song?: Song | null }) | null
  line?: (LyricsLine & {
    songLyrics?: { song: Pick<Song, 'id' | 'title' | 'artist' | 'artists'> } | null
  }) | null
}

export interface Collection {
  id: string
  userId: string
  name: string
  description?: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  _count?: { items: number }
  items?: CollectionItem[]
  user?: { name: string | null }
}

// ─── Song insights ─────────────────────────────────────────────────────────────

export interface TrackInsights {
  saveCount: number
  tagDistribution: { tag: string; count: number }[]
  mostAnnotatedLines: { text: string; lineNumber: number; count: number }[]
}

// ─── Phase 4: Analytics ───────────────────────────────────────────────────────

export interface WordFrequency { word: string; count: number }
export interface TagCount { tag: string; count: number }
export interface ArtistCount { artist: string; count: number }
export interface WeekCount { week: string; count: number }

// ─── Phase 4: Memory Timeline ─────────────────────────────────────────────────

export interface TimelineSong {
  id: string
  track: string
  artist: string
  artists: string[]
  lyrics?: string | null
  createdAt: string
  tags: { tag: string }[]
  searchHistory?: { imgUrl?: string | null; spotifyId?: string } | null
}

export interface TimelineMonth {
  month: string
  year: number
  dominantMood: string | null
  songs: TimelineSong[]
}

// ─── Phase 4: Weekly Digest ───────────────────────────────────────────────────

export interface DigestContent {
  savedCount: number
  topWord: string | null
  topArtist: string | null
  communityInsight: string | null
}

export interface Digest {
  id: string
  userId: string
  weekStart: string
  content: DigestContent
  read: boolean
  createdAt: string
}

// ─── LRCLib preview ───────────────────────────────────────────────────────────

export interface LrclibPreviewLine {
  text: string
  timestampMs?: number
}

export interface LrclibPreview {
  trackName: string
  artistName: string
  albumName: string
  isSynced: boolean
  lines: LrclibPreviewLine[]
}

// ─── Spotify Library (F15) ───────────────────────────────────────────────────

export interface SpotifyLibraryTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
  external_urls: { spotify: string }
}

export interface SpotifyLibraryPage<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  next: string | null
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  images: { url: string }[]
  tracks: { total: number }
  owner: { display_name: string }
  external_urls: { spotify: string }
}

export interface SpotifyPlaylistTrackItem {
  track: SpotifyLibraryTrack | null
  added_at: string
}

export interface SpotifySavedTrackItem {
  track: SpotifyLibraryTrack
  added_at: string
}

// ─── Feature Requests ────────────────────────────────────────────────────────

export type FeatureStatus = 'DRAFT' | 'MUST_HAVE' | 'WORKING_ON_IT' | 'DONE' | 'DECLINED'

export interface FeatureRequest {
  id: string
  userId: string
  title: string | null
  content: string
  page: string | null
  status: FeatureStatus
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null }
  votes: { userId: string }[]
}

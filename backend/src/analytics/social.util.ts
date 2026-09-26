/**
 * Comparing collections across the group.
 *
 * One caveat drives every design decision here: searching for a song already
 * creates a bookmark (search-history.service.ts), so a shared `SavedLyric` only
 * means "we both looked at this". Favourites are the honest signal, which is why
 * the panel defaults to them.
 */

export interface Peer {
  id: string;
  name: string | null;
}

export interface SaveRow {
  userId: string;
  songId: string;
  artist: string;
  createdAt: Date;
}

export interface TogetherResult {
  users: { id: string; name: string | null; savedCount: number }[];
  /** Artists that more than one person has — the grid rows. */
  rows: { artist: string; userIds: string[]; songCount: number }[];
  me: {
    total: number;
    onlyMine: number;
    sharedWithSome: number;
    sharedWithAll: number;
    exclusivityPct: number;
    overlaps: {
      userId: string;
      name: string | null;
      sharedSongs: number;
      jaccard: number;
    }[];
  };
  discovery: {
    userId: string;
    name: string | null;
    firstCount: number;
  }[];
  gates: { activeUsers: number; rowsAfterFilter: number };
}

const MAX_ROWS = 30;

export function buildTogether(
  meId: string,
  peers: Peer[],
  saves: SaveRow[],
): TogetherResult {
  const nameOf = new Map(peers.map((p) => [p.id, p.name]));

  // ── Per-user totals ──────────────────────────────────────────────────────
  const savedCount = new Map<string, number>();
  for (const save of saves) {
    savedCount.set(save.userId, (savedCount.get(save.userId) ?? 0) + 1);
  }

  const users = peers
    .filter((p) => (savedCount.get(p.id) ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      savedCount: savedCount.get(p.id) ?? 0,
    }));

  // ── Artist → who has them ────────────────────────────────────────────────
  const byArtist = new Map<
    string,
    { users: Set<string>; songs: Set<string> }
  >();
  for (const save of saves) {
    if (!save.artist) continue;
    let entry = byArtist.get(save.artist);
    if (!entry) {
      entry = { users: new Set(), songs: new Set() };
      byArtist.set(save.artist, entry);
    }
    entry.users.add(save.userId);
    entry.songs.add(save.songId);
  }

  const rows = [...byArtist.entries()]
    .filter(([, entry]) => entry.users.size > 1)
    .map(([artist, entry]) => ({
      artist,
      userIds: [...entry.users],
      songCount: entry.songs.size,
    }))
    // Most-shared first, so the common ground is at the top without a sort control
    .sort(
      (a, b) =>
        b.userIds.length - a.userIds.length || b.songCount - a.songCount,
    )
    .slice(0, MAX_ROWS);

  // ── Song → owners, for exclusivity and pairwise overlap ──────────────────
  const ownersBySong = new Map<string, Set<string>>();
  const songsByUser = new Map<string, Set<string>>();
  for (const save of saves) {
    const owners = ownersBySong.get(save.songId) ?? new Set<string>();
    owners.add(save.userId);
    ownersBySong.set(save.songId, owners);

    const mine = songsByUser.get(save.userId) ?? new Set<string>();
    mine.add(save.songId);
    songsByUser.set(save.userId, mine);
  }

  const mySongs = songsByUser.get(meId) ?? new Set<string>();
  const otherUserCount = users.filter((u) => u.id !== meId).length;

  let onlyMine = 0;
  let sharedWithAll = 0;
  for (const songId of mySongs) {
    const owners = ownersBySong.get(songId)!;
    if (owners.size === 1) onlyMine++;
    else if (otherUserCount > 0 && owners.size === otherUserCount + 1)
      sharedWithAll++;
  }

  const overlaps = users
    .filter((u) => u.id !== meId)
    .map((peer) => {
      const theirs = songsByUser.get(peer.id) ?? new Set<string>();
      let shared = 0;
      for (const songId of mySongs) if (theirs.has(songId)) shared++;
      const union = mySongs.size + theirs.size - shared;
      return {
        userId: peer.id,
        name: peer.name,
        sharedSongs: shared,
        jaccard: union > 0 ? shared / union : 0,
      };
    })
    .sort((a, b) => b.sharedSongs - a.sharedSongs);

  // ── Who saved it first, among songs more than one person has ─────────────
  const firstSaver = new Map<string, string>();
  const earliest = new Map<string, number>();
  for (const save of saves) {
    const at = save.createdAt.getTime();
    const best = earliest.get(save.songId);
    if (best === undefined || at < best) {
      earliest.set(save.songId, at);
      firstSaver.set(save.songId, save.userId);
    }
  }

  const firstCounts = new Map<string, number>();
  for (const [songId, userId] of firstSaver) {
    // Only songs someone else also picked up say anything about discovery.
    if ((ownersBySong.get(songId)?.size ?? 0) < 2) continue;
    firstCounts.set(userId, (firstCounts.get(userId) ?? 0) + 1);
  }

  const discovery = [...firstCounts.entries()]
    .map(([userId, firstCount]) => ({
      userId,
      name: nameOf.get(userId) ?? null,
      firstCount,
    }))
    .sort((a, b) => b.firstCount - a.firstCount);

  return {
    users,
    rows,
    me: {
      total: mySongs.size,
      onlyMine,
      sharedWithSome: mySongs.size - onlyMine - sharedWithAll,
      sharedWithAll,
      exclusivityPct:
        mySongs.size > 0 ? Math.round((onlyMine / mySongs.size) * 100) : 0,
      overlaps,
    },
    discovery,
    gates: { activeUsers: users.length, rowsAfterFilter: rows.length },
  };
}

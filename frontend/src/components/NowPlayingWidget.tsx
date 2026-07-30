import { ChevronRight, Maximize2, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useNowPlaying } from "../hooks/useNowPlaying";
import LyricsViewer from "./LyricsViewer";
import TrackCover from "./TrackCover";

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function NowPlayingWidget() {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const baseProgressMs = useRef(0);
  const fetchedAt = useRef(0);
  const prevTrackId = useRef<string | null>(null);

  // AppLayout owns the 5s poll; progress in between comes from interpolation.
  const { data: track } = useNowPlaying({ poll: false });

  // Record play on track change (fire-and-forget)
  useEffect(() => {
    const id = track?.item?.id ?? null;
    if (!id || id === prevTrackId.current) return;
    prevTrackId.current = id;
    api
      .post("/spotify/plays", {
        spotifyId: id,
        track: track!.item!.name,
        artist: track!.item!.artists[0]?.name ?? "",
        artists: track!.item!.artists.map((a) => a.name),
        imgUrl: track!.item!.album.images[0]?.url ?? null,
      })
      .catch(() => {});
  }, [track]);

  // Sync refs whenever Spotify gives us a new position (no setState — interval handles display)
  useEffect(() => {
    if (track?.progress_ms != null) {
      baseProgressMs.current = track.progress_ms;
      fetchedAt.current = Date.now();
    }
  }, [track?.progress_ms, track?.is_playing]);

  // Tick every second; interpolates when playing, holds when paused; poll corrects drift
  useEffect(() => {
    const id = setInterval(() => {
      setLocalProgressMs(
        track?.is_playing
          ? baseProgressMs.current + (Date.now() - fetchedAt.current)
          : baseProgressMs.current,
      );
    }, 1_000);
    return () => clearInterval(id);
  }, [track?.is_playing, track?.progress_ms]);

  if (!track?.item) return null;

  const { item, is_playing } = track;
  const duration = item.duration_ms;
  const progressPct =
    duration > 0 ? Math.min((localProgressMs / duration) * 100, 100) : 0;
  const imgUrl = item.album.images[0]?.url;

  return (
    <>
      <div className="w-full rounded-xl border border-edge bg-surface overflow-hidden hover:border-foreground-muted/40 transition-colors">
        {/* Cover keeps its own job: clicking it opens the fullscreen cover view */}
        <TrackCover
          src={imgUrl}
          track={item.name}
          artist={item.artists[0]?.name}
          className="w-full aspect-square rounded-none"
          iconSize={28}
        />

        {/* Track info — the primary action, straight to the song page */}
        <Link
          to={`/songs/${item.id}`}
          className="block w-full px-3 pt-2.5 pb-2 space-y-2 text-left hover:bg-surface-overlay/50
                     transition-colors"
        >
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground leading-tight truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-foreground-muted truncate mt-0.5">
                {item.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
            {is_playing && (
              <Radio
                size={9}
                className="text-accent flex-shrink-0 mt-1 animate-pulse"
                strokeWidth={2}
              />
            )}
            <ChevronRight
              size={13}
              strokeWidth={1.75}
              className="text-foreground-subtle flex-shrink-0 mt-0.5"
            />
          </div>

          {/* Progress bar + time */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full bg-surface-overlay overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[9px] tabular-nums text-foreground-subtle flex-shrink-0">
              {formatMs(localProgressMs)}
            </span>
          </div>
        </Link>

        {/* Fullscreen lyrics — used to be the primary click, now explicit */}
        <button
          onClick={() => setViewerOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-edge
                     text-[10px] font-medium text-foreground-subtle hover:text-foreground
                     hover:bg-surface-overlay/50 transition-colors"
        >
          <Maximize2 size={11} strokeWidth={1.75} />
          Lyrics im Vollbild
        </button>
      </div>

      {viewerOpen && (
        <LyricsViewer
          track={item.name}
          artist={item.artists[0]?.name ?? ""}
          artists={item.artists.map((a) => a.name)}
          imgUrl={imgUrl}
          lyrics=""
          spotifyId={item.id}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Turns lyrics copied from a lyrics site (Genius first, but also AZLyrics,
 * Musixmatch, Songtexte.com …) into the shape SongLyrics stores:
 * plain lines plus section markers and per-line singers.
 *
 * Genius copy-paste carries page chrome along with the text ("57 Contributors",
 * "Song Lyrics", "You might also like", "Embed", ticket ads). That gets dropped
 * here; section headers like `[Chorus: Artist]` become sections + singers
 * instead of lyric lines.
 */

export interface ParsedPaste {
  rawText: string
  /** startLine is 1-based, matching LyricsLine.lineNumber */
  sections: { label: string; startLine: number }[]
  /** Only lines whose section header named a performer */
  singers: { lineNumber: number; singer: string }[]
  /** How many lines of page chrome were removed */
  removedLines: number
}

const SECTION_WORDS =
  'intro|verse|vers|strophe|pre-chorus|prechorus|chorus|refrain|hook|post-chorus|bridge|' +
  'outro|interlude|breakdown|instrumental|skit|spoken|part|teil|zwischenteil|drop'

/** `[Verse 1: Artist]`, `[Chorus]`, `[Produced by …]` */
const BRACKET_HEADER = /^\[([^\]]+)\]$/
/** `(Chorus)`, `Verse 2:`, `Refrain x2` — only with a known section word */
const BARE_HEADER = new RegExp(
  `^[([]?\\s*((?:${SECTION_WORDS})(?:\\s*\\d+)?(?:\\s*(?:x|×)\\s*\\d+)?)\\s*(?::\\s*(.+?))?\\s*[)\\]]?\\s*:?$`,
  'i',
)

const CONTRIBUTORS = /^\d+\s*Contributors?/i
const READ_MORE = /Read More\s*$/i
const TITLE_LINE = /\sLyrics$/
const YMAL = /You might also like/gi
const TICKETS = /See .{1,80}? Live\s*Get tickets as low as \$\d+/gi
const EMBED = /\d*\s*Embed$/

/** Lines before the first header that belong to the Genius page, not the song. */
function stripHeaderChrome(lines: string[]): { lines: string[]; removed: number } {
  const limit = Math.min(lines.length, 20)
  let cut = -1
  for (let i = 0; i < limit; i++) {
    const l = lines[i].trim()
    if (BRACKET_HEADER.test(l)) break
    if (CONTRIBUTORS.test(l) || READ_MORE.test(l) || TITLE_LINE.test(l) || /^Translations/i.test(l)) {
      cut = i
    }
  }
  if (cut < 0) return { lines, removed: 0 }
  return { lines: lines.slice(cut + 1), removed: cut + 1 }
}

function parseHeader(line: string): { label: string; singer: string | null } | null {
  const bracket = BRACKET_HEADER.exec(line)
  if (bracket) {
    const inner = bracket[1].trim()
    const colon = inner.indexOf(':')
    const label = (colon >= 0 ? inner.slice(0, colon) : inner).trim()
    const singer = colon >= 0 ? inner.slice(colon + 1).trim() : ''
    return { label, singer: singer || null }
  }
  const bare = BARE_HEADER.exec(line)
  if (bare) return { label: bare[1].trim(), singer: bare[2]?.trim() || null }
  return null
}

/** True if the text looks like it came from a lyrics site rather than being typed. */
export function looksLikeImportedLyrics(text: string): boolean {
  return (
    /^\s*\[[^\]\n]+\]\s*$/m.test(text) ||
    CONTRIBUTORS.test(text.trim()) ||
    /You might also like|\d*Embed\s*$/.test(text)
  )
}

export function parsePastedLyrics(input: string): ParsedPaste {
  let lines = input.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n')
  const header = stripHeaderChrome(lines)
  lines = header.lines
  let removed = header.removed

  const out: string[] = []
  const sections: ParsedPaste['sections'] = []
  const singers: ParsedPaste['singers'] = []
  let pending: { label: string; singer: string | null } | null = null
  let singer: string | null = null

  for (const original of lines) {
    let line = original.replace(TICKETS, '').replace(YMAL, '').trimEnd()
    if (line.trim() === '' && original.trim() !== '') {
      removed++
      continue
    }
    line = line.replace(EMBED, '').trimEnd()
    const trimmed = line.trim()

    const h = trimmed ? parseHeader(trimmed) : null
    if (h) {
      removed++
      // Credits, not a part of the song
      if (/^(produced|written|prod\.)/i.test(h.label)) continue
      pending = h
      singer = h.singer
      // Keep exactly one blank line between sections
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }

    if (trimmed === '') {
      // Collapse runs of blank lines and drop leading ones
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }

    out.push(trimmed)
    const lineNumber = out.length
    if (pending) {
      sections.push({ label: pending.label, startLine: lineNumber })
      pending = null
    }
    if (singer) singers.push({ lineNumber, singer })
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop()

  return { rawText: out.join('\n'), sections, singers, removedLines: removed }
}

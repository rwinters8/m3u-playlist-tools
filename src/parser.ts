import type { ParseError, ParseResult, Playlist, Track } from './types.js';

interface Line {
  readonly number: number;
  readonly text: string;
}

const EXTM3U = '#EXTM3U';
const EXTINF_PREFIX = '#EXTINF:';

/**
 * Splits input into non-blank lines, keeping each line's original
 * 1-based position so error messages point somewhere useful even
 * after blank lines are dropped.
 */
function toLines(input: string): readonly Line[] {
  return input
    .split(/\r\n|\r|\n/)
    .map((text, index) => ({ number: index + 1, text }))
    .filter((line) => line.text.trim().length > 0);
}

interface ExtinfBody {
  readonly duration: number;
  readonly title: string;
}

/**
 * Duration is either a non-negative integer number of seconds, or
 * exactly -1 for "unknown" (the convention the format itself uses).
 */
function parseExtinf(rawLine: string): ExtinfBody | null {
  const body = rawLine.trim().slice(EXTINF_PREFIX.length);
  const commaIndex = body.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }
  const durationText = body.slice(0, commaIndex).trim();
  const title = body.slice(commaIndex + 1).trim();
  if (!/^-?\d+$/.test(durationText)) {
    return null;
  }
  const duration = Number(durationText);
  if (duration < 0 && duration !== -1) {
    return null;
  }
  return { duration, title };
}

/**
 * Parses M3U/M3U8 text into a Playlist, or a list of line-numbered
 * errors if the input doesn't hold together. Pure: same input always
 * yields the same result, no filesystem or network access.
 */
export function parsePlaylist(input: string): ParseResult {
  const lines = toLines(input);
  const errors: ParseError[] = [];
  const tracks: Track[] = [];

  let index = 0;
  let extended = false;
  const first = lines[0];
  if (first !== undefined && first.text.trim() === EXTM3U) {
    extended = true;
    index = 1;
  }

  while (index < lines.length) {
    const line = lines[index] as Line;
    const text = line.text.trim();

    if (text.startsWith(EXTINF_PREFIX)) {
      const parsed = parseExtinf(text);
      if (parsed === null) {
        errors.push({ line: line.number, message: `malformed #EXTINF directive: "${line.text.trim()}"` });
        index += 1;
        continue;
      }
      const next = lines[index + 1];
      if (next === undefined || next.text.trim().startsWith('#')) {
        errors.push({ line: line.number, message: '#EXTINF directive is not followed by a track location' });
        index += 1;
        continue;
      }
      tracks.push({ location: next.text.trim(), durationSeconds: parsed.duration, title: parsed.title });
      index += 2;
      continue;
    }

    if (text === EXTM3U) {
      errors.push({ line: line.number, message: '#EXTM3U must only appear as the first line of the file' });
      index += 1;
      continue;
    }

    if (text.startsWith('#')) {
      // Unrecognized directive or comment: ignored, same as most players do.
      index += 1;
      continue;
    }

    tracks.push({ location: text, durationSeconds: null, title: null });
    index += 1;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, playlist: { extended, tracks } };
}

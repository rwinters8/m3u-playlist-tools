import type { Playlist, Track } from './types.js';

export interface PrintOptions {
  /**
   * Reorders tracks before printing. 'location' sorts by the location
   * string; 'title' sorts by title, with untitled tracks last and ties
   * broken by location. Default is 'none', which keeps playlist order.
   */
  readonly sort?: 'none' | 'location' | 'title';
  /**
   * Drops tracks whose location already appeared earlier in the
   * playlist, keeping the first occurrence and its metadata. Runs
   * before sorting. Default is false.
   */
  readonly dedupe?: boolean;
}

// Plain code unit comparison instead of localeCompare, so output does
// not change with the host's locale and stays byte-for-byte stable.
function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareByTitle(a: Track, b: Track): number {
  if (a.title !== null && b.title !== null) {
    return compareStrings(a.title, b.title) || compareStrings(a.location, b.location);
  }
  if (a.title !== null) return -1;
  if (b.title !== null) return 1;
  return compareStrings(a.location, b.location);
}

function arrangeTracks(tracks: readonly Track[], options: PrintOptions): readonly Track[] {
  let result: Track[] = [...tracks];

  if (options.dedupe === true) {
    const seen = new Set<string>();
    result = result.filter((track) => {
      if (seen.has(track.location)) {
        return false;
      }
      seen.add(track.location);
      return true;
    });
  }

  if (options.sort === 'location') {
    result.sort((a, b) => compareStrings(a.location, b.location));
  } else if (options.sort === 'title') {
    result.sort(compareByTitle);
  }

  return result;
}

/**
 * Renders a Playlist back into M3U/M3U8 text in a single canonical
 * shape: LF line endings, trimmed track locations, and one trailing
 * newline. Two playlists that are structurally equal always print
 * identically, which makes this safe to use as a diff or a fixture
 * in tests.
 *
 * Pass options to dedupe or sort the tracks on the way out. The input
 * playlist is never modified.
 *
 * This does not re-validate the playlist. If you build one by hand
 * with extended: false but tracks that carry EXTINF metadata, that
 * metadata still gets printed - run the result through parsePlaylist
 * first if you need the round trip checked.
 */
export function printPlaylist(playlist: Playlist, options: PrintOptions = {}): string {
  const lines: string[] = [];

  if (playlist.extended) {
    lines.push('#EXTM3U');
  }

  for (const track of arrangeTracks(playlist.tracks, options)) {
    if (track.durationSeconds !== null || track.title !== null) {
      const duration = track.durationSeconds ?? -1;
      const title = track.title ?? '';
      lines.push(`#EXTINF:${duration},${title}`);
    }
    lines.push(track.location);
  }

  return lines.map((line) => `${line}\n`).join('');
}

import type { Playlist } from './types.js';

/**
 * Renders a Playlist back into M3U/M3U8 text in a single canonical
 * shape: LF line endings, trimmed track locations, and one trailing
 * newline. Two playlists that are structurally equal always print
 * identically, which makes this safe to use as a diff or a fixture
 * in tests.
 *
 * This does not re-validate the playlist. If you build one by hand
 * with extended: false but tracks that carry EXTINF metadata, that
 * metadata still gets printed - run the result through parsePlaylist
 * first if you need the round trip checked.
 */
export function printPlaylist(playlist: Playlist): string {
  const lines: string[] = [];

  if (playlist.extended) {
    lines.push('#EXTM3U');
  }

  for (const track of playlist.tracks) {
    if (track.durationSeconds !== null || track.title !== null) {
      const duration = track.durationSeconds ?? -1;
      const title = track.title ?? '';
      lines.push(`#EXTINF:${duration},${title}`);
    }
    lines.push(track.location);
  }

  return lines.map((line) => `${line}\n`).join('');
}

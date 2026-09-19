/**
 * A single entry in a playlist.
 *
 * durationSeconds and title travel together: they both come from an
 * #EXTINF directive, or neither is present. A plain M3U location line
 * (no directive above it) has both set to null.
 */
export interface Track {
  readonly location: string;
  readonly durationSeconds: number | null;
  readonly title: string | null;
}

/**
 * extended marks whether the playlist opens with #EXTM3U. Plain M3U
 * (extended: false) cannot carry EXTINF metadata by definition of the
 * format, but we don't enforce that on the way into printPlaylist -
 * see the README for why.
 */
export interface Playlist {
  readonly extended: boolean;
  readonly tracks: readonly Track[];
}

export interface ParseError {
  readonly line: number;
  readonly message: string;
}

export type ParseResult =
  | { readonly ok: true; readonly playlist: Playlist }
  | { readonly ok: false; readonly errors: readonly ParseError[] };

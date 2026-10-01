# m3u-playlist-tools

A strict parser and a canonical pretty-printer for M3U/M3U8 audio playlists.

## Why

M3U looks trivial - it's mostly just a list of file paths - until you have
to deal with a real one. Files show up with CRLF line endings, stray blank
lines, `#EXTINF` directives with the wrong number of fields, an `#EXTM3U`
header repeated halfway through a file that got concatenated with another
one, or an `#EXTINF` line with no track after it because something got
truncated. Most players shrug and skip the bad line. That's fine for
playback, bad for anything that needs to know the file was actually well
formed - a library importer, a dedupe tool, a lint step in CI.

This package does two things:

- `parsePlaylist` reads M3U/M3U8 text and either returns a `Playlist` or a
  list of errors with line numbers. It does not silently drop malformed
  entries.
- `printPlaylist` takes a `Playlist` and renders it back to text in one
  canonical form (LF endings, trimmed fields, one trailing newline), so two
  structurally equal playlists always print byte-for-byte identically.

Both functions are pure - no file I/O, no globals, no exceptions for
control flow. `parsePlaylist` and `printPlaylist` are plain functions from
data to data, which makes them straightforward to unit test with string
fixtures.

## Usage

```ts
import { parsePlaylist } from './src/parser.js';
import { printPlaylist } from './src/printer.js';

const input = `#EXTM3U
#EXTINF:213,Boards of Canada - Roygbiv
music/boc/roygbiv.flac
#EXTINF:-1,Live stream
https://example.com/stream.mp3
`;

const result = parsePlaylist(input);

if (!result.ok) {
  for (const error of result.errors) {
    console.error(`line ${error.line}: ${error.message}`);
  }
  process.exit(1);
}

console.log(result.playlist.tracks.length); // 2
console.log(printPlaylist(result.playlist) === input); // true - round trips
```

Malformed input comes back as errors, not a best-effort partial parse:

```ts
parsePlaylist('#EXTM3U\n#EXTINF:213,Some Track\n');
// {
//   ok: false,
//   errors: [{ line: 2, message: '#EXTINF directive is not followed by a track location' }]
// }
```

## Printer options

`printPlaylist` takes an optional second argument:

```ts
printPlaylist(playlist, { dedupe: true, sort: 'location' });
```

- `dedupe: true` drops later tracks whose location was already seen. The
  first occurrence and its `#EXTINF` data win.
- `sort` is `'none'` (default), `'location'`, or `'title'`. Title sort
  puts untitled tracks last and breaks ties by location. Comparison is by
  UTF-16 code unit, not locale, so output is the same on every machine.

Dedupe runs before sorting. The playlist you pass in is not modified.

## Format notes

- A file is "extended" if its first non-blank line is exactly `#EXTM3U`.
  Plain M3U (just a list of locations, one per line) is also accepted.
- `#EXTINF:<duration>,<title>` must precede a track location. `<duration>`
  is a non-negative integer number of seconds, or `-1` for "unknown."
- Unrecognized `#` lines are treated as comments and ignored, matching
  what most players do in practice.
- `#EXTM3U` appearing anywhere other than line one is a hard error, not a
  comment - it usually means two files got concatenated by mistake.

## Building

```
tsc
```

Compiles `src/` to `dist/` per `tsconfig.json`. No other tooling is
required; there are no runtime dependencies.

## Testing

```
npm test
```

Builds `dist/` and runs the suite under `test/` with Node's built-in test
runner (`node --test`). No test framework is installed - `node:test` and
`node:assert` are part of the Node standard library.

## License

MIT, see [LICENSE](LICENSE).

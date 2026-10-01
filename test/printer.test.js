import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaylist } from '../dist/parser.js';
import { printPlaylist } from '../dist/printer.js';

function parseOk(input) {
  const result = parsePlaylist(input);
  assert.equal(result.ok, true);
  return result.playlist;
}

test('round-trips a canonical extended playlist unchanged', () => {
  const input = '#EXTM3U\n#EXTINF:213,Roygbiv\nboc/roygbiv.flac\n#EXTINF:-1,Live\nhttps://example.com/s.mp3\n';
  assert.equal(printPlaylist(parseOk(input)), input);
});

test('normalizes CRLF input and blank lines to canonical output', () => {
  const playlist = parseOk('#EXTM3U\r\n\r\n#EXTINF:10,A\r\na.mp3\r\n');
  assert.equal(printPlaylist(playlist), '#EXTM3U\n#EXTINF:10,A\na.mp3\n');
});

test('prints plain M3U without a header', () => {
  assert.equal(printPlaylist(parseOk('a.mp3\nb.mp3\n')), 'a.mp3\nb.mp3\n');
});

test('dedupe keeps the first occurrence of each location', () => {
  const playlist = parseOk('#EXTM3U\n#EXTINF:10,First\na.mp3\nb.mp3\n#EXTINF:20,Second\na.mp3\n');
  assert.equal(
    printPlaylist(playlist, { dedupe: true }),
    '#EXTM3U\n#EXTINF:10,First\na.mp3\nb.mp3\n',
  );
});

test('sort by location orders tracks and leaves the input playlist alone', () => {
  const playlist = parseOk('c.mp3\na.mp3\nb.mp3\n');
  assert.equal(printPlaylist(playlist, { sort: 'location' }), 'a.mp3\nb.mp3\nc.mp3\n');
  assert.deepEqual(
    playlist.tracks.map((t) => t.location),
    ['c.mp3', 'a.mp3', 'b.mp3'],
  );
});

test('sort by title puts untitled tracks last and breaks ties by location', () => {
  const playlist = parseOk(
    '#EXTM3U\n#EXTINF:1,Same\nz.mp3\nplain.mp3\n#EXTINF:1,Alpha\nm.mp3\n#EXTINF:1,Same\na.mp3\n',
  );
  assert.equal(
    printPlaylist(playlist, { sort: 'title' }),
    '#EXTM3U\n#EXTINF:1,Alpha\nm.mp3\n#EXTINF:1,Same\na.mp3\n#EXTINF:1,Same\nz.mp3\nplain.mp3\n',
  );
});

test('dedupe and sort can be combined', () => {
  const playlist = parseOk('b.mp3\na.mp3\nb.mp3\n');
  assert.equal(printPlaylist(playlist, { dedupe: true, sort: 'location' }), 'a.mp3\nb.mp3\n');
});

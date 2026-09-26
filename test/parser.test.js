import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaylist } from '../dist/parser.js';

test('parses a plain M3U file with no #EXTM3U header', () => {
  const result = parsePlaylist('track1.mp3\ntrack2.mp3\n');
  assert.equal(result.ok, true);
  assert.equal(result.playlist.extended, false);
  assert.deepEqual(result.playlist.tracks, [
    { location: 'track1.mp3', durationSeconds: null, title: null },
    { location: 'track2.mp3', durationSeconds: null, title: null },
  ]);
});

test('handles CRLF line endings the same as LF', () => {
  const input = '#EXTM3U\r\n#EXTINF:180,Track One\r\nsong.mp3\r\n';
  const result = parsePlaylist(input);
  assert.equal(result.ok, true);
  assert.equal(result.playlist.tracks.length, 1);
  assert.equal(result.playlist.tracks[0].location, 'song.mp3');
  assert.equal(result.playlist.tracks[0].durationSeconds, 180);
});

test('ignores blank lines but keeps error line numbers pointing at the original file', () => {
  const input = ['#EXTM3U', '', '', '#EXTINF:120,Track', '', 'song.mp3', '', '#EXTM3U'].join('\n');
  const result = parsePlaylist(input);
  assert.equal(result.ok, false);
  // #EXTM3U is line 8 in the original input, not line 4 after blanks are dropped.
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].line, 8);
});

test('reports an error when #EXTINF is the last line in the file', () => {
  const result = parsePlaylist('#EXTM3U\n#EXTINF:213,Some Track\n');
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    { line: 2, message: '#EXTINF directive is not followed by a track location' },
  ]);
});

test('reports an error when #EXTINF is followed by another directive instead of a location', () => {
  const input = '#EXTM3U\n#EXTINF:213,Some Track\n#EXTINF:100,Another Track\nsong.mp3\n';
  const result = parsePlaylist(input);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].line, 2);
});

test('rejects an #EXTINF directive with no comma separator', () => {
  const result = parsePlaylist('#EXTM3U\n#EXTINF:213\nsong.mp3\n');
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 2);
  assert.match(result.errors[0].message, /malformed #EXTINF/);
});

test('rejects an #EXTINF directive with a non-numeric duration', () => {
  const result = parsePlaylist('#EXTM3U\n#EXTINF:abc,Some Track\nsong.mp3\n');
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 2);
});

test('rejects a negative duration other than -1', () => {
  const result = parsePlaylist('#EXTM3U\n#EXTINF:-5,Some Track\nsong.mp3\n');
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 2);
});

test('accepts -1 as the "unknown duration" sentinel', () => {
  const result = parsePlaylist('#EXTM3U\n#EXTINF:-1,Live stream\nhttps://example.com/stream.mp3\n');
  assert.equal(result.ok, true);
  assert.equal(result.playlist.tracks[0].durationSeconds, -1);
});

test('treats a repeated #EXTM3U line as a hard error, not a comment', () => {
  const input = '#EXTM3U\nsong.mp3\n#EXTM3U\nother.mp3\n';
  const result = parsePlaylist(input);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    { line: 3, message: '#EXTM3U must only appear as the first line of the file' },
  ]);
});

test('collects every error in the file instead of stopping at the first one', () => {
  const input = '#EXTM3U\n#EXTINF:bad,Track\nsong.mp3\n#EXTINF:213,Truncated\n';
  const result = parsePlaylist(input);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
  assert.equal(result.errors[0].line, 2);
  assert.equal(result.errors[1].line, 4);
});

test('ignores unrecognized # directives as comments', () => {
  const input = '#EXTM3U\n#EXTVLCOPT:some-option=1\nsong.mp3\n';
  const result = parsePlaylist(input);
  assert.equal(result.ok, true);
  assert.equal(result.playlist.tracks.length, 1);
});

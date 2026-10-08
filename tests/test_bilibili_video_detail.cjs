// Wire-level contracts: preserve unknown data and framing; remove only ad fields.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../surge/module/bilibili-lite/video-detail-fast.js'), 'utf8');
const unite = 'bilibili.app.viewunite.v1.View/View';
function varint(n) {
  const bytes = [];
  do { bytes.push((n & 127) | (n > 127 ? 128 : 0)); n = Math.floor(n / 128); } while (n);
  return Buffer.from(bytes);
}
function field(n, bytes) { return Buffer.concat([varint(n * 8 + 2), varint(bytes.length), Buffer.from(bytes)]); }
function frame(bytes, flags = 0) {
  const head = Buffer.alloc(5); head[0] = flags; head.writeUInt32BE(bytes.length, 1);
  return Buffer.concat([head, Buffer.from(bytes)]);
}
const retained = Buffer.concat([
  varint(2 * 8), varint(999999), // Unknown varint.
  varint(3 * 8 + 1), Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]), // Unknown 64-bit field.
  field(9, [0, 255, 128, 254]), // Unknown nested data is opaque, not re-encoded.
  varint(99 * 8 + 5), Buffer.from([9, 8, 7, 6]), // Unknown 32-bit field.
  varint(100 * 8 + 3), varint(1 * 8), varint(7), varint(100 * 8 + 4), // Unknown group.
]);
function run(body, opts = {}) {
  let result, calls = 0;
  const writes = [];
  const context = {
    Uint8Array, ArrayBuffer, DataView,
    $request: { url: 'https://grpc.biliapi.net/' + (opts.endpoint || unite), headers: opts.requestHeaders || {} },
    $response: { status: opts.status ?? 200, body: new Uint8Array(body), headers: Object.assign({ 'content-type': 'application/grpc' }, opts.headers) },
    $utils: { ungzip: bytes => new Uint8Array(zlib.gunzipSync(Buffer.from(bytes))) },
    $persistentStore: { read: () => { if (opts.storageFailure) throw new Error('storage'); return opts.debug ? String(Date.now() + 60000) : '0'; }, write: (v, k) => { writes.push({ v, k }); return true; } },
    $done: value => { result = value; calls++; },
  };
  if (opts.noGzip) delete context.$utils;
  // No URL or TextDecoder globals: the fast script must work in JSC.
  vm.runInNewContext(source, context);
  assert.equal(calls, 1);
  return { result, writes };
}
test('unified detail strips only top-level cm and preserves all other wire bytes', () => {
  const input = Buffer.concat([field(7, [8, 1]), retained, field(7, [18, 0])]);
  const { result } = run(frame(input));
  assert.deepEqual(Buffer.from(result.body), frame(retained));
});
test('legacy detail strips advertisement fields but retains recommendations and tab', () => {
  const content = Buffer.concat([retained, field(10, [18, 0]), field(32, [8, 1])]);
  const ads = [30, 31, 41, 48].map(n => field(n, [8, 1]));
  const { result } = run(frame(Buffer.concat([ads[0], content, ...ads.slice(1)])), { endpoint: 'bilibili.app.view.v1.View/View' });
  assert.deepEqual(Buffer.from(result.body), frame(content));
});
test('asynchronous cm is removed without changing other fields', () => {
  const { result } = run(frame(Buffer.concat([field(1, [8, 1]), retained])), { endpoint: 'bilibili.app.viewunite.v1.View/AIRelateAsync' });
  assert.deepEqual(Buffer.from(result.body), frame(retained));
});
test('compressed frames pass through and headers are never changed', () => {
  const compressed = frame(zlib.gzipSync(Buffer.concat([field(7, [8, 1]), retained])), 1);
  const headers = { 'content-type': 'application/grpc', 'grpc-encoding': 'gzip', 'Content-Length': '123', 'grpc-status': '0' };
  const result = run(compressed, { headers }).result;
  assert.equal(result.body, undefined);
  assert.equal(result.headers, undefined);
  const modified = run(frame(field(7, [8, 1])), { headers }).result;
  assert(modified.body);
  assert.equal(modified.headers, undefined);
});
test('normal responses and unexpected wire type on ad ID remain untouched', () => {
  for (const payload of [retained, Buffer.concat([retained, varint(7 * 8), varint(4)])]) {
    assert.equal(run(frame(payload)).result.body, undefined);
  }
});
test('malformed, unsupported, oversized and failed responses pass through', () => {
  const normalAd = frame(field(7, [8, 1]));
  const malformed = [Buffer.from([0]), frame(Buffer.from([0])), frame(Buffer.from([0x3a, 0x7f, 0])), Buffer.from([0, 255, 255, 255, 255])];
  for (const body of malformed) assert.equal(run(body).result.body, undefined);
  assert.equal(run(normalAd, { status: 500 }).result.body, undefined);
  assert.equal(run(normalAd, { headers: { 'grpc-status': '14' } }).result.body, undefined);
  assert.equal(run(normalAd, { headers: { 'content-type': 'application/json' } }).result.body, undefined);
  const gzip = frame(zlib.gzipSync(field(7, [8, 1])), 1);
  assert.equal(run(gzip, { noGzip: true }).result.body, undefined);
  assert.equal(run(gzip, { headers: { 'grpc-encoding': 'deflate' } }).result.body, undefined);
  assert.equal(run(frame(zlib.gzipSync(Buffer.alloc(1048577)), 1)).result.body, undefined);
});
test('playback API is never modified', () => {
  for (const endpoint of ['bilibili.app.playurl.v1.PlayURL/PlayView', 'bilibili.app.playerunite.v1.Player/PlayViewUnite']) {
    assert.equal(run(frame(field(7, [8, 1])), { endpoint }).result.body, undefined);
  }
});
test('diagnostics are off by default and storage failure does not affect cleanup', () => {
  const body = frame(field(7, [8, 1]));
  assert.equal(run(body).writes.length, 0);
  assert(run(body, { storageFailure: true }).result.body);
  const enabled = run(body, { debug: true });
  assert.equal(enabled.writes.length, 1);
  assert(!enabled.writes[0].k.includes('/'));
  assert.equal(JSON.parse(enabled.writes[0].v).removedFields, 1);
});

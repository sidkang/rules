// Bilibili Lite: remove only known top-level under-player advertisement fields.
// Field IDs: @biliverse/protobuf 1.1.0; skipping uses @protobuf-ts/runtime 2.11.1.
// Build from repository root:
// npm exec --yes --package=esbuild@0.25.12 -- esbuild ./surge/module/bilibili-lite/video-detail.source.js --bundle --minify --platform=neutral --target=es2018 --format=iife --outfile=./surge/module/bilibili-lite/video-detail-fast.js
import { BinaryReader } from './vendor/protobuf-runtime/binary-reader.js';

(function () {
  let result = {};
  let removed = 0;
  let path = '';
  try {
    const match = /^https:\/\/(?:app\.bilibili\.com|app\.biliapi\.net|grpc\.biliapi\.net)\/(bilibili\.app\.(?:view\.v1\.View\/View|viewunite\.v1\.View\/(?:View|AIRelateAsync)))$/.exec($request.url);
    if (!match || Number($response.status) !== 200) return $done({});
    path = '/' + match[1];
    const fields = path.includes('/AIRelateAsync') ? [1] : path.includes('.viewunite.') ? [7] : [30, 31, 41, 48];
    const body = $response.body;
    if (!(body instanceof Uint8Array) || !body.length) return $done({});
    const header = (headers, name) => {
      const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name);
      return key ? String(headers[key]) : '';
    };
    const contentType = header($response.headers, 'content-type').split(';')[0].trim().toLowerCase();
    const grpcStatus = header($response.headers, 'grpc-status');
    if (grpcStatus && grpcStatus !== '0') return $done({});
    if (!['application/grpc', 'application/grpc+proto', 'application/grpc-web', 'application/grpc-web+proto'].includes(contentType)) return $done({});

    function concat(parts, length) {
      const out = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) { out.set(part, offset); offset += part.length; }
      return out;
    }
    function filterMessage(bytes) {
      // No string decoding or object reconstruction: skip values and retain raw spans.
      const reader = new BinaryReader(bytes, { decode() { throw new Error('Unexpected string decoding'); } });
      const ranges = [];
      let removedBytes = 0;
      while (reader.pos < reader.len) {
        const start = reader.pos;
        const [number, wireType] = reader.tag();
        reader.skip(wireType);
        // Keep unknown fields and even known IDs if their wire type changes.
        if (wireType === 2 && fields.includes(number)) {
          ranges.push([start, reader.pos]);
          removedBytes += reader.pos - start;
        }
      }
      if (!ranges.length) return bytes;
      const parts = [];
      let offset = 0;
      for (const [start, end] of ranges) {
        parts.push(bytes.subarray(offset, start));
        offset = end;
      }
      parts.push(bytes.subarray(offset));
      removed += ranges.length;
      return concat(parts, bytes.length - removedBytes);
    }

    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const frames = [];
    let total = 0;
    for (let offset = 0; offset < body.length;) {
      if (offset + 5 > body.length) throw new Error('Truncated gRPC frame');
      const flags = body[offset];
      const length = view.getUint32(offset + 1);
      const end = offset + 5 + length;
      if (end > body.length) throw new Error('Invalid gRPC frame length');
      const original = body.subarray(offset, end);
      let frame = original;
      if (flags !== 0x80) { // Keep gRPC-web trailers verbatim.
        if (flags !== 0 && flags !== 1) throw new Error('Unsupported gRPC frame flags');
        let message = body.subarray(offset + 5, end);
        if (flags === 1) {
          const encoding = header($response.headers, 'grpc-encoding').toLowerCase();
          if ((encoding && encoding !== 'gzip') || typeof $utils === 'undefined') throw new Error('Unsupported gRPC compression');
          if (message[0] !== 0x1f || message[1] !== 0x8b) throw new Error('Unsupported compressed payload');
          message = $utils.ungzip(message);
          if (!(message instanceof Uint8Array) || message.length > 1048576) throw new Error('Invalid or oversized decompressed payload');
        }
        const filtered = filterMessage(message);
        if (filtered !== message) {
          frame = new Uint8Array(filtered.length + 5);
          // An uncompressed frame is valid even when grpc-encoding advertises gzip.
          new DataView(frame.buffer).setUint32(1, filtered.length);
          frame.set(filtered, 5);
        }
      }
      frames.push(frame);
      total += frame.length;
      offset = end;
    }
    if (removed) {
      const headers = Object.assign({}, $response.headers);
      for (const key of Object.keys(headers)) {
        if (['content-length', 'content-encoding'].includes(key.toLowerCase())) delete headers[key];
      }
      const ua = header($request.headers, 'user-agent');
      // Preserve upstream's established Bilibili client header compatibility.
      if ((ua.includes('bili-universal/') && header($request.headers, 'x-bili-moss-engine-type') === '1') || ua.includes('bili-blue/')) {
        for (const key of Object.keys(headers)) if (key.toLowerCase() === 'grpc-status') delete headers[key];
        headers['grpc-status'] = '0';
      }
      else if (ua.includes('bili-inter/')) {
        for (const key of Object.keys(headers)) if (key.toLowerCase() === 'grpc-status') delete headers[key];
      }
      result = { body: concat(frames, total), headers };
    }
  } catch (_) {
    // Malformed data, unsupported compression, or schema changes pass through.
    result = {};
    removed = 0;
  }
  try {
    if (path && Number($persistentStore.read('SID.BiliLite.DebugUntil')) > Date.now()) {
      $persistentStore.write(JSON.stringify({ time: new Date().toISOString(), path, changed: !!result.body, removedFields: removed }), 'SID.BiliLite.' + encodeURIComponent(path));
    }
  } catch (_) { /* Diagnostic storage never affects the response. */ }
  $done(result);
})();

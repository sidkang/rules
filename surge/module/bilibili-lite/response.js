// SID Bilibili Lite — Surge HTTP response script.
// Only splash, search suggestions, and navigation JSON are changed.
// Unknown schemas, failed responses, and all other URLs pass through unchanged.
(function () {
  let result = {};
  try {
    const match = /^https:\/\/(app\.bilibili\.com|app\.biliapi\.net)\/([^?#]*)/.exec($request.url);
    if (!match || !$response.body) return $done({});
    const path = '/' + match[2];
    const body = JSON.parse($response.body);
    if (body.code !== 0) return $done({});
    const data = body.data;
    let changed = false;
    let diagnostic = null;
    try {
      const until = Number($persistentStore.read('SID.BiliLite.DebugUntil'));
      if (Number.isFinite(until) && until > Date.now()) {
        function shape(value, depth) {
          if (Array.isArray(value)) return { type: 'array', length: value.length, sample: depth > 0 ? value.slice(0, 1).map(function (item) { return shape(item, depth - 1); }) : [] };
          if (value && typeof value === 'object') {
            const fields = {};
            Object.keys(value).slice(0, 35).forEach(function (key) {
              fields[key] = depth > 0 ? shape(value[key], depth - 1) : typeof value[key];
            });
            return fields;
          }
          return typeof value;
        }
        diagnostic = { time: new Date().toISOString(), path: path, shape: shape(data, 2) };
      }
    } catch (_) { /* A diagnostic failure must not affect normal processing. */ }

    if (/^\/x\/v2\/splash\/(show|list|brand\/list|event\/list2)$/.test(path)) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Remove known splash advertisement fields; keep the response envelope.
        ['account', 'event_list', 'preload', 'show'].forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            delete data[key];
            changed = true;
          }
        });
      }
    } else if (path === '/x/v2/search/square') {
      if (Array.isArray(data)) {
        const clean = data.filter(function (item) { return !item || item.type !== 'trending'; });
        if (clean.length !== data.length) {
          body.data = clean;
          changed = true;
        }
      }
    } else if (path === '/x/v2/search/defaultwords') {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        body.data = {};
        changed = true;
      }
    } else if (path === '/x/resource/show/tab/v2') {
      // Filter the server's own items rather than inventing navigation objects.
      if (data && Array.isArray(data.bottom)) {
        function identity(item) {
          if (!item) return '';
          if (['home', 'dynamic', 'mine'].indexOf(item.id) !== -1) return item.id;
          if (['home', 'dynamic', 'mine'].indexOf(item.tab_id) !== -1) return item.tab_id;
          const uri = String(item.uri || '');
          if (/^bilibili:\/\/main\/home\/?(?:\?|$)/.test(uri)) return 'home';
          if (/^bilibili:\/\/following\/home\/?(?:\?|$)/.test(uri)) return 'dynamic';
          if (/^bilibili:\/\/user_center\/?(?:\?|$)/.test(uri)) return 'mine';
          return { '首页': 'home', '动态': 'dynamic', '我的': 'mine', 'Home': 'home', 'Dynamic': 'dynamic', 'Me': 'mine' }[item.name] || '';
        }
        const keep = data.bottom.filter(function (item) { return !!identity(item); });
        // Do not leave the app without essential navigation on schema changes.
        if (['home', 'dynamic', 'mine'].every(function (id) {
          return keep.some(function (item) { return identity(item) === id; });
        }) && keep.length < data.bottom.length) {
          data.bottom = keep.map(function (item, index) {
            return Object.assign({}, item, { pos: index + 1 });
          });
          changed = true;
        }
      }
    }
    if (diagnostic) {
      try {
        diagnostic.changed = changed;
        $persistentStore.write(JSON.stringify(diagnostic), 'SID.BiliLite.' + encodeURIComponent(path));
      } catch (_) { /* Keep normal processing independent of diagnostic storage. */ }
    }
    if (changed) result = { body: JSON.stringify(body) };
  } catch (error) {
    console.log('[Bilibili Lite] Pass through: ' + error.message);
  }
  $done(result);
})();

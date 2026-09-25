# SID Bilibili Lite

Install in Surge's module UI using this URL:

```text
https://cdn.jsdelivr.net/gh/sidkang/rules@main/surge/module/bilibili-lite/bilibili-lite.sgmodule
```

The module downloads and caches `response.js` from the same CDN directory.
No local JavaScript copying is required. Enable MITM and trust the Surge CA;
the module does not install certificates or turn on the global switches.
Disable overlapping BiliUniverse ADBlock / Enhanced modules before enabling it.
Fully quit and relaunch Bilibili; previously cached UI/ads may persist initially.

## Scope

- Splash JSON: remove known advertisement fields.
- Search: remove trending panels and default recommended words. Actual search
  results and search history are not changed.
- Bottom navigation: keep Home / Dynamic / Me using IDs/URIs with name fallbacks.
  Unknown navigation schemas are left untouched rather than broken.
- No feed, comments, account page or playback-interface modification.

MITM is hostname-wide, even though script matching is narrow. Certificate
pinning or other MITM incompatibility can still break connections; disable the
module and compare real requests if this happens. Do not work around it by
turning off server-certificate verification.

## Video-node exception

Keep this profile rule ahead of reject lists if Bilibili MCDN playback fails:

```ini
DOMAIN-SUFFIX,mcdn.bilivideo.cn,DIRECT
```

This allows related PCDN/P2P nodes; it is not an advertisement-cleaning feature.
The module does not duplicate the routing rule.

## Optional diagnostics

Diagnostics default to off. A private local CLI tool can set the explicit
persistent-store key `SID.BiliLite.DebugUntil` to an expiry timestamp in
milliseconds. The response script records bounded structure/type summaries
only while that timestamp is in the future. The local tool uses a 15-minute
window; it is not distributed in this public repository.

Snapshots use `SID.BiliLite.` + `encodeURIComponent(endpointPath)` as their key.
They contain no scalar response values, cookies, account credentials or search
terms. Expiry stops new snapshots, not deletion of old ones. Inspect timestamps.
Storage failures must not affect normal response handling.

## Verification limits

Local JavaScript syntax, mock-response contracts and module configuration were
checked. This is not a promise of compatibility with future Bilibili versions.
After installing, verify all three features and the originally failing video
on the actual device. CDN availability does not prove phone installation.

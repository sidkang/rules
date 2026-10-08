# Bilibili Lite

Install in Surge's module UI using this URL:

```text
https://raw.githubusercontent.com/sidkang/rules/refs/heads/main/surge/module/bilibili-lite/bilibili-lite.sgmodule
```

The install entry uses GitHub Raw. The module downloads and caches `response.js`
from jsDelivr; the script CDN URL is independent of the module install URL.

Alternatively, open the [Surge one-click installer](surge:///install-module?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsidkang%2Frules%2Frefs%2Fheads%2Fmain%2Fsurge%2Fmodule%2Fbilibili-lite%2Fbilibili-lite.sgmodule).
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
- Video-detail ads: reuse Biliverse ADBlock v0.7.3 only for legacy/unified `View`
  and unified `AIRelateAsync`. It removes under-player/detail promotion content;
  the upstream View.AD handler may also clean promotional recommendations in the
  same detail response.
- No feed, comments, account page or playback-source API modification. No
  `PlayURL`, `PlayView` or `PlayerUnite` interception.

MITM is hostname-wide, even though script matching is narrow. Certificate
pinning or other MITM incompatibility can still break connections; disable the
module and compare real requests if this happens. Do not work around it by
turning off server-certificate verification.

## Video-detail dependency and scope

This extra feature downloads the pinned, client-side
[Biliverse ADBlock v0.7.3 response script](https://github.com/Biliverse/ADBlock/releases/download/v0.7.3/response.bundle.js)
(about 1 MB). It runs locally in Surge; this module does not install the upstream
Workers variant or redirect API requests to third-party processing servers.
The original splash/search/navigation script remains independent.

MITM additionally includes the observed `grpc.biliapi.net` host. Decryption is
still host-wide, not limited to the three selected response paths. If enabling
this host causes TLS/pinning or playback failures, stop and compare with the
module disabled; do not disable certificate verification as a workaround.

Only `View.AD` is requested in the upstream handler. Tracking/privacy changes
and airborne-danmaku processing are explicitly off; it cannot process unrelated
endpoints because the module URL pattern is narrow. Settings prefer this entry's
arguments over old saved ADBlock preferences.

Credit and implementation reference:
https://github.com/Biliverse/ADBlock . The external release is pinned for
reproducibility; no third-party bundle is copied into this repository.

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

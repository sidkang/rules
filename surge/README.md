# Surge rules

These are policy-free Surge rule lists. Their policy and priority are defined by
the subscribing profile. The new paths are intentional; no old-path copies are
maintained. Run `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests`
from the repository root for offline boundary checks, then inspect resource
loading and actual rule hits in Surge.

| Directory | Purpose |
| --- | --- |
| `common/` | General-purpose direct, reject, and other policy lists |
| `ai/` | AI/LLM domains and process rules |
| `apple/` | Apple-specific routing and update blocking |
| `games/` | Game services, including Steam and Xbox |
| `media/` | Plex and other media |
| `region/` | Country and regional services |
| `ccxi/` | Company routing and direct exceptions |

## Subscription path changes

There are no redirect files. Before removing the old URLs from any other
profile, update its references to these new raw URLs:

| Old `surge/` path(s) | New `surge/` path(s) |
| --- | --- |
| `acl.list`, `always-reject.list`, `direct.list`, `nproxy.list`, `cheap.list` | `common/` + same filename |
| `oversea-llm.list` | `ai/oversea-llm.list` |
| `steam.list`, `wot.list`, `wotb.list`, `xbox-cloud-gaming.list` | `games/` + same filename |
| `apple/ios-games.list` | `games/ios-games.list` |
| `plex.list`, `others/18x.list` | `media/` + same filename |
| `us.list`, `tw.list`, `cn/wechat.list` | `region/` + same filename |
| `ccxi/ccxi-vpn.list` | removed (not in use in the inspected profile) |

`ccxi/ccxi-black.list` stays in `ccxi/`. Other Apple and CCXI paths remain unchanged. The public `ccxi/` files expose
private-network routing information: only subscribe to them if this disclosure
is acceptable. Removing a file later will not remove previously published
history or third-party caches.

## Profile migration (not performed here)

The inspected `unify.conf` is external to this repository and remains read-only.
It currently references `always-reject`, `oversea-llm`, `cheap`, `steam`,
`others/18x`, `direct`, `cn/wechat`, `plex`, and `wot`. Its update-block rule is
commented out. Update those subscribed URLs **only after verifying the new raw
URLs**. Existing CDN subscriptions may continue to serve old cached resources;
check their actual responses separately before switching a device.

The existing company's suffix rules and IP/port rules are collected in
`ccxi/ccxi.list`, preserving the profile's existing broad IP ranges and
additional host exception. For a later migration, use `ccxi/ccxi-direct.list`
with `DIRECT` before `ccxi/ccxi.list` with `ccxi`; then remove the corresponding
inline domain and IP rules. `mail.ccxi.com.cn` must remain an earlier direct
exception. The old VPN list is deleted; **no new VPN-specific routing** is
introduced. The company proxy definitions and policy group remain in the
profile. Check real rule hits before deleting inline rules.

Keep narrow exceptions before broad suffixes or networks. If deliberately
enabling the macOS update block, position it before broad Apple direct rules and
consider its effect on Rosetta and carrier settings. `games/wot.list` and
`games/wotb.list` no longer contain wide IP catchalls or game keywords; if a
real game endpoint is missed, identify and add the narrow destination rather
than restoring a large range. `ai/oversea-llm.list` still includes process rules
for `codex` and `claude`, which match all traffic from those processes, not just
model APIs. Change this only if that behavior is unintended.

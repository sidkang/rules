# Surge resources

## Layout

```text
surge/
  list/                     # Policy-free routing/rejection lists
    ai/ apple/ ccxi/ common/ games/ media/ region/
  module/                   # Installable modules and their scripts
    bilibili-lite/
      bilibili-lite.sgmodule
      response.js
      README.md
```

Lists provide matching conditions; their policy and priority are defined by the
subscribing profile. Modules patch selected settings, scripts and rewrites.
Do not turn path-specific response changes into broad domain-routing rules.

| List category | Purpose |
| --- | --- |
| `list/common/` | General direct, reject and other policy lists |
| `list/ai/` | AI/LLM domains and process rules |
| `list/apple/` | Apple routing and update blocking |
| `list/games/` | Game services, including Steam and Xbox |
| `list/media/` | Plex and other media |
| `list/region/` | Country and regional services |
| `list/ccxi/` | Company routing and direct exceptions |

`list/region/cn.list` contains narrow Damai/Taobao direct-routing candidates,
not a complete China/App list or an ad blocker. Keep ad rejection ahead of it
and verify real requests; source module MITM hostnames do not imply routing intent.

## Subscription migration

All previously categorized lists move from `surge/<category>/<file>.list` to
`surge/list/<category>/<file>.list`. Contents are unchanged. No duplicate files
or redirect stubs are kept at the old paths.

New CDN base:

```text
https://cdn.jsdelivr.net/gh/sidkang/rules@main/surge/list/
```

Legacy uncategorized paths also map to the category, for example:

| Legacy path under `surge/` | Current path under `surge/list/` |
| --- | --- |
| `acl.list`, `always-reject.list`, `direct.list`, `nproxy.list`, `cheap.list` | `common/` + filename |
| `oversea-llm.list` | `ai/oversea-llm.list` |
| `steam.list`, `wot.list`, `wotb.list`, `xbox-cloud-gaming.list` | `games/` + filename |
| `apple/ios-games.list` | `games/ios-games.list` |
| `plex.list`, `others/18x.list` | `media/` + filename |
| `us.list`, `tw.list`, `cn/wechat.list` | `region/` + filename |

After pushing, verify **actual GET response contents** for every required CDN
URL before updating profiles. HTTP 200 alone is not enough: error text or stale
content must not be treated as a ready rule/script. Commented-out references
should be migrated too, without enabling them. Saving a local configuration does
not prove that a phone or TV has synced/reloaded it.

## Bilibili Lite module

See [module instructions](module/bilibili-lite/README.md). Install:

```text
https://raw.githubusercontent.com/sidkang/rules/refs/heads/main/surge/module/bilibili-lite/bilibili-lite.sgmodule
```

The module downloads its own response script; no local JS copying is needed.
It requires MITM and a trusted Surge CA. Disable overlapping Bilibili modules.

## Existing rule boundaries and privacy

- CCXI files expose private-network routing information. Publication history and
  third-party caches remain even if a file is later removed.
- `ccxi-direct.list` is a narrow direct exception and must precede the broader
  `ccxi.list`; routing groups and inline rules are not automatically changed.
- Apple update blocking is opt-in and may affect Rosetta/carrier resources.
- Game lists avoid broad IP catchalls; add observed narrow endpoints rather
  than restoring wide ranges or keywords.
- AI process rules for `codex` and `claude` affect all matching process traffic,
  not only model API requests.

Run offline boundary checks from the repository root:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s ./tests
node --test ./tests/test_bilibili_video_detail.cjs
```

Then verify resource loading and real rule/script hits on the intended device.

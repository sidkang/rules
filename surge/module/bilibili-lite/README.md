# Bilibili Lite

版本：**2026.10.08.2**。

## 功能

- 开屏去广告、搜索热词/默认词清理。
- 底栏保留首页、动态、我的。
- 清理视频详情/播放器下方广告；不处理 PlayURL、PlayView、PlayerUnite 或视频 CDN。

## 安装

在 Surge 的“模块 → 安装新模块”添加：

```text
https://raw.githubusercontent.com/sidkang/rules/refs/heads/main/surge/module/bilibili-lite/bilibili-lite.sgmodule
```

启用 MITM 并信任 Surge CA；关闭重叠的 Bilibili 模块。无需手动复制 JS，所有执行脚本均来自本仓库，禁止第三方远程 JS 依赖。视频详情代码的来源与许可见 [NOTICE](NOTICE) 和 [LICENSE-Biliverse](LICENSE-Biliverse)。

## 更新与诊断

手动检查模块更新后，描述应显示上述版本；这是识别标记，不是 Surge 的更新判定字段。模块与脚本分别缓存：脚本默认每 24 小时更新，必要时单独更新对应脚本资源。诊断默认关闭，由本地 skill 工具限时开启。

MITM 按域名生效；若出现 TLS 或播放异常，停用模块对照，不关闭证书验证。MCDN 放行是主配置中的独立分流规则，不由此模块管理。

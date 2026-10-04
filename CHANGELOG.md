# 更新日志（本仓库自有版本线）

> 本仓库**从 v1.0.0 起独立编号，不跟进上游更新**。
> 上游对应的版本见每条记录；上游自身的历史更新记录完整归档在 [`CHANGELOG.upstream.md`](./CHANGELOG.upstream.md)（未改动）。

## [1.0.0] — 2026-10-04

**首个自有版本**，基于上游 **omdsh-dev/dsh-annotation v1.4.11**（提交 `14111b2`，MIT，`Copyright (c) 2026 omdsh-dev`）。

### 改动（仅 `client.js`，15 增 / 15 删）

- **工具条位置**：改为「选区上方优先」（上游为「下方优先」，容易与系统原生选中菜单重叠）。
- **修复坐标问题**：上游按 400px 宽的卡片计算工具条水平位置，导致工具条偏移到选区左侧并压住文字；现在按**选区左边缘**对齐。
- **按钮文案**：`批注` → `添加到对话`；`已批注` → `已添加`（含悬停提示文案）。
- **尺寸收紧**：工具条 padding `4px → 2px`、按钮高度 `28px → 24px`、左右内边距 `12px → 9px`、图标 `14px → 12px`。

逐行差异：[`patches/01-toolbar-position-and-label.patch`](./patches/01-toolbar-position-and-label.patch)

### 未改动

颜色、圆角、按钮数量、发送格式（协议块）、锚点逻辑、界面语言与协议块。

### 仓库整理（与上游的差异）

- 归档上游原始文档到 [`docs/upstream/`](./docs/upstream/)。
- 上游更新日志更名为 [`CHANGELOG.upstream.md`](./CHANGELOG.upstream.md)（原文未改），本文件成为本仓库自有日志。
- 新增 [`NOTICE.md`](./NOTICE.md)：逐项列明来源、版本、提交、许可与修改声明。
- 移除上游产品站 `site/` 与上游 CI/发布工作流（不属于本改版，且会误触发发布/部署）。

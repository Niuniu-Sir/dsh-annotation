# NOTICE · 来源、修改声明与致谢

> 本文件是本仓库对**上游开源作品**的正式来源声明与致谢。**所有代码来自上游，我们只做了少量界面调整。**

## 一、上游作品（Upstream Work）

| 项目 | 内容 |
|---|---|
| 名称 | dsh-annotation（DSH Web 选中批注插件） |
| 仓库 | **https://github.com/omdsh-dev/dsh-annotation** |
| 组织 | `omdsh-dev`（原作者及其贡献者；贡献者名单见上游提交历史与 `CHANGELOG.upstream.md`） |
| 包名 | `@changfenhuang/dsh-annotation` |
| 我们使用的版本 | **v1.4.11**（稳定版） |
| 我们使用的提交 | **`14111b2`** — “Merge pull request #80 from omdsh-dev/release/1.4.11” |
| 获取时间 | 2026-10-04 |
| 许可 | **MIT License** — `Copyright (c) 2026 omdsh-dev` |

**许可原文完整保留在本仓库的 [`LICENSE`](./LICENSE) 中，一个字节都没有修改。**
上游的原始文档与更新日志同样原样留档：[`docs/upstream/`](./docs/upstream/)、[`CHANGELOG.upstream.md`](./CHANGELOG.upstream.md)。

## 二、本作品（This Work）

| 项目 | 内容 |
|---|---|
| 名称 | dsh-annotation-zh（上游 dsh-annotation 的自用改版） |
| 仓库 | https://github.com/Niuniu-Sir/dsh-annotation |
| 修改部分版权 | `Copyright (c) 2026 Niuniu-Sir` |
| 版本线 | 自 **v1.0.0** 起独立编号，**不跟进上游更新** |
| 与上游的关系 | v1.0.0–v1.0.3 = 上游 v1.4.11 + 下列 12 项改动 |

## 三、修改清单（完整、可逐行核对）

全部差异集中在 **1 个文件**（`client.js`），累计共 **90 行新增 / 39 行删除**，逐行补丁见
[`patches/01-toolbar-position-and-label.patch`](./patches/01-toolbar-position-and-label.patch)。

| # | 改动 | 位置 | 原因 |
|---|---|---|---|
| 1 | 工具条由「下方优先」改为**上方优先** | `placeAbove()` | 下方易与系统原生选中菜单重叠；上方更贴近常见交互 |
| 2 | 修复工具条水平坐标：不再按 400px 卡片计算，改为**按选区左边缘对齐** | `placeAbove()` 与 3 处调用点 | 上游会让工具条偏到选区左侧并压住文字 |
| 3 | 按钮文案：`批注` → `添加到对话`；`已批注` → `已添加`（含悬停提示） | 中文文案表 | 与使用者习惯的说法一致 |
| 4 | 尺寸收紧：padding `4→2px`、按钮高 `28→24px`、左右内边距 `12→9px`、图标 `14→12px` | 样式字符串 | 让工具条更紧凑 |
| 5 | 去掉工具条按钮左侧的「+」图标（按钮变纯文字） | `bar.appendChild(ghostButton(...))` 调用点 | 更紧凑、更接近纯文字胶囊 |
| 6 | 工具条外边框改为女仆皮肤深蓝：`var(--maid-navy-800, #1c326b)` | `.dsh-ann-bar` 的 `border` | 按使用者的配色偏好 |
| 7 | 批注编辑框紧凑化并封顶尺寸（宽 `400→320px`、内边距 `12→8px`、标题 `13→12px`、引文区 `72→34px`、引文清单 `150→84px`、输入框最小高 `64→42px`、**最大高 110px**） | `.dsh-ann-card`、`.dsh-ann-quote`、`.dsh-ann-quotes`、`.dsh-ann-input` | 原编辑框过大、遮挡正文 |
| 8 | 编辑框定位改为锚定「选中文字正上方」（记录选区矩形 `ui.rect`，按卡片实际高度计算；上方不足则放到选区下方） | `positionEditor()` 与 3 处 `ui.pos = p` | 原实现沿用了工具条坐标，导致卡片覆盖大段正文 |
| 9 | 新增编辑框底部「删除」按钮（红色 `.dsh-ann-danger`）：编辑已有批注→删除该条；新建→丢弃并关闭 | 卡片 footer、新增样式规则 | 需要独立的删除入口 |
| 10 | 新增批注改为**一行小框**（标题留空、隐藏引文块、输入框 26px 单行 + 圆形 ✓ 按钮、隐藏底部按钮行、回车即确认） | 卡片 render 的 add 分支、新增 `.dsh-ann-line` 等样式 | 按使用者的交互要求，与参考设计一致 |
| 11 | 编辑批注保留完整卡片并新增「取消」按钮（`🗑 删除` 靠左、`取消`/`保存` 在右） | 卡片 footer | 与参考设计的编辑态一致 |

**未改动**：颜色与主题变量、圆角、按钮数量（上游就是单个按钮）、发送格式（协议块）、锚点与滚动逻辑、界面语言体系与协议块。

## 四、仓库层面的差异

- 归档上游原始 README 到 `docs/upstream/`；上游 `CHANGELOG.md` 改名 `CHANGELOG.upstream.md`（原文未改）。
- 新增本 `NOTICE.md` 与自有 `CHANGELOG.md`、重写根 `README.md`（内容以本改版为准）。
- 移除上游产品站 `site/`、上游 CI 与发布工作流（`release.yml` 含 npm 发布步骤，属于上游的发布链，不适用于本改版）。

## 五、声明与免责

- 本改版**与原作者无关联、未获原作者背书**，未使用原作者名义或商标做任何宣称。
- MIT 许可允许修改与再分发，但**要求保留版权与许可声明**——本仓库已保留，并在本文件逐项列明来源。
- 若上游作者或任何权利人认为本仓库不妥，**请联系仓库所有者，我们会立即下架或调整**。
- 建议需要原版或最新版的用户前往上游仓库：**https://github.com/omdsh-dev/dsh-annotation**。
- 风险提示（与上游一致）：DSH 插件是**进程内可信代码**；本项目与上游相同，只有界面半边（`client.js`），Node 半边为空实现（`lib/index.js` 仅 `name` 与空的 `apply()`）。

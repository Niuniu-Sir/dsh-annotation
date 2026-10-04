# dsh-annotation-zh · DSH 选中批注插件（**自用改版 / 自有版本线**）

> ## ⚠️ 先说清楚：本项目不是原创，是对他人开源作品的修改版
>
> 本仓库的代码**全部来自上游开源项目**，我们只是在它之上做了少量界面调整，并从此**独立维护、不再跟进上游**。
> 对原作者的尊重体现在：**原始来源、版本、提交号、许可与版权声明全部逐项列明，上游原文也完整留档**。
>
> | 项目 | 内容 |
> |---|---|
> | 上游仓库 | **https://github.com/omdsh-dev/dsh-annotation** |
> | 上游包名 | `@changfenhuang/dsh-annotation` |
> | 上游许可 | **MIT License** — `Copyright (c) 2026 omdsh-dev` |
> | 我们改版的基准 | 上游 **v1.4.11**，提交 **`14111b2`**（2026-10-04 获取） |
> | 本改版在 DSH 里的插件 id | `@changfenhuang/dsh-annotation`（沿用上游 id，便于复用其客户端注册；**未重命名**） |
> | 修改部分版权 | `Copyright (c) 2026 Niuniu-Sir` |
> | 上游原始文档留档 | [`docs/upstream/`](./docs/upstream/)（上游 README 原文，未改动） |
> | 上游更新日志留档 | [`CHANGELOG.upstream.md`](./CHANGELOG.upstream.md)（上游原文，未改动） |
> | 我们与原作者的差异 | [`patches/01-toolbar-position-and-label.patch`](./patches/01-toolbar-position-and-label.patch)（1 个文件、55 增 / 34 删，可逐行审） |
>
> **本项目为个人自用改版，与原作者无关联、未获原作者背书，也未使用原作者的名义或商标。**
> 如需原版或最新版，请前往上游仓库。若原作者认为本改版不妥，请联系我删除。

*English: An independent, self-maintained **modified version** based on the MIT-licensed upstream project [omdsh-dev/dsh-annotation](https://github.com/omdsh-dev/dsh-annotation) v1.4.11 (commit `14111b2`). Upstream credit, licence and original docs are preserved verbatim. Not affiliated with or endorsed by the original author. This repo does **not** track upstream updates.*

---

## 这是什么

DSH（DeepSeek Harness）Web 界面里的**选中批注**插件：

- 在助手的回复里**选中一段文字** → 出现工具条 → 写入批注（**可留空**，只做标记）；
- 批注会**跨消息、跨轮次累积**，输入框旁有「批注 ×N」芯片（悬停查看、逐条删除）；
- **回车**时，批注块与你在输入框里的问题一起发给模型；
- 模型按 `Annotation 1: … / Annotation N: …` **逐条回答**，回复里的标签是**可悬停芯片**（显示被批注的原文 + 你的备注）；
- 额外：在侧栏**文件预览**里选中正文/Markdown/代码，同样可以批注（带文件路径）。

## 本版改了什么（v1.0.0 → v1.0.2）

1. **工具条位置**：改为**选区上方优先**（上游为"下方优先"，容易被系统原生选中菜单遮挡）。
2. **修掉一个坐标问题**：上游把工具条按 400px 宽的卡片来算水平位置，导致工具条被推到选区左侧、压住文字；本版改为按**选区左边缘**对齐。
3. **按钮文案**：`批注` → **`添加到对话`**；`已批注` → `已添加`（含悬停提示文字）。
4. **尺寸收紧**：工具条 padding `4px→2px`、按钮高度 `28px→24px`、左右内边距 `12px→9px`、图标 `14px→12px`。
5. **去掉按钮左侧的「+」图标**（v1.0.1）：按钮为纯文字「添加到对话」。
6. **工具条外边框改为女仆皮肤的深蓝**（v1.0.1）：`var(--maid-navy-800, #1c326b)`。
7. **批注编辑框紧凑化 + 尺寸封顶**（v1.0.2）：宽 `400→320px`、内边距 `12→8px`、标题 `13→12px`、引文区 `72→34px`、引文清单 `150→84px`、输入框最小高 `64→42px` 且**最大高 110px**。
8. **编辑框锚定到「选中文字正上方」**（v1.0.2）：按选区矩形与卡片实际高度定位，底边贴选区上方 8px；上方空间不足时改放选区下方。
9. **新增独立「删除」按钮**（v1.0.2）：编辑框底部的红色按钮——编辑已有批注时删除该条，新建批注时丢弃并关闭。

**未改动**：正文与其余主题颜色、圆角、按钮数量、发送格式（协议块）、锚点逻辑、界面语言与协议块；界面调整仅限上面第 5–9 条。

逐行差异见 [`patches/01-toolbar-position-and-label.patch`](./patches/01-toolbar-position-and-label.patch)。

## 版本线

- 本仓库从 **v1.0.0** 起**独立编号**，**不跟进上游更新**（上游后续版本不会自动合并进来）。
- 对应关系：**v1.0.0 = 上游 v1.4.11 + 上述改动**。
- 上游历史记录与原始说明都留档在仓库里（`CHANGELOG.upstream.md`、`docs/upstream/`），将来若需要手工移植上游某个修复，仍可对照。

## 安装

### DSH Web profile（CLI）

```sh
dsh plugin --profile web add github:Niuniu-Sir/dsh-annotation
```

### DSH 桌面端

桌面端的 `desktop` profile 由应用自有、不走 CLI profile 管理，安装方式为"把包放进 profile 的 `node_modules` 并把包名加入 `dsh.profile.bundles`"（或在 GUI 的 Plugins 面板安装）。安装后**需要重启 DSH**。

> ⚠️ **不要同时安装上游原版和本改版**：两者插件 id 相同、功能相同，同时存在会出现两条工具条。

## 使用

1. 选中助手回复中的文字 → 点工具条 **「添加到对话」**；
2. （可选）写一条批注；留空表示只标记原文；
3. **回车**发送 → 模型按编号逐条回应；
4. 输入框旁的「批注 ×N」芯片可悬停查看、逐条删除。

## 许可与署名

- 代码沿用上游 **MIT** 许可：[`LICENSE`](./LICENSE) **保持上游原文不变**（`Copyright (c) 2026 omdsh-dev`）。
- 本改版的修改部分版权：`Copyright (c) 2026 Niuniu-Sir`。
- 完整的来源、修改清单与免责声明见 [`NOTICE.md`](./NOTICE.md)。
- 本仓库自有更新记录见 [`CHANGELOG.md`](./CHANGELOG.md)。

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
| 与上游的关系 | v1.0.0–v1.0.20 = 上游 v1.4.11 + 下列 29 项改动 |

## 三、修改清单（完整、可逐行核对）

全部代码差异集中在 **`client.js`**（**359 行新增 / 86 行删除**）；另有 `package.json` 的 `dsh.client.inject` 增加 `@deepseek-ai/dsh-api-remotes`、`@deepseek-ai/dsh-api-gateway` 两项依赖。逐行补丁见
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
| 12 | 新增框去掉标题栏与 ✕（React 端只渲染一行输入 + 圆形确认；回车即保存，留空也算标记） | 卡片 render 的 add 分支、`.dsh-ann-input-line`/`.dsh-ann-send` | 按使用者要求，打开即默认输入 |
| 13 | 修正编辑卡定位：`openEditorFor()` 补记 `ui.rect`（此前用旧选区坐标） | `openEditorFor()` | 弹框必须锚定选中文字正上方 |
| 14 | 打开后位置固定：移除卡片拖动与 `onLayoutChange` 中的重算 | `render()` / `onLayoutChange()` | 弹框不得移动 |
| 15 | 新增框打开时，点框外任意处等效于回车（**确认保存**，留空也算标记；Esc 仍为取消） | `onDocPointerDown()` | 按使用者要求增加第三种确认方式 |
| 16 | 工具条与选区之间留白收紧：按**实测工具条高度**定位，底边距选区上沿固定 **4px**（上游按 40px 估算高度 + 8px 间距，实际留白约 20px） | `placeAbove()` 增加 gap 参数、`render()` 创建工具条后按 `offsetHeight` 二次定位、两处滚动重算点 | 工具条悬空过高，观感松散；要求紧贴选区 |
| 17 | 工具条字号与字族跟随界面：根节点 `[data-annotation-for-dsh]` 补 `font-family: var(--dsw-font-family)`；工具条字号改为 `clamp(12px, 界面字号 × .72, 16px)`（18px→约13px、14px→12px、22px→16px）；按钮字号改为继承。同时收紧盒子：内边距 `2→1px`、按钮高 `28px→auto(min 22px)`、横向内边距 `10→6px`、圆角 `12/14→10/9px` | 样式字符串（根规则、`.dsh-ann-bar`、`.dsh-ann-ghost`） | 工具条字体/字号与界面不一致（曾写死 12px），且悬浮框比文字大一圈 |
| 18 | 深色模式适配：写死颜色改走宿主主题 token——工具条边框 `#1c326b` 改为 `var(--maid-navy-800, var(--dsw-alias-border-inverted, #1c326b))`；发送键 `#111/#fff` 改为 `--dsw-alias-button-primary-fill`/`--dsw-alias-label-primary-foreground`；删除与错误红改为 `--dsw-alias-state-error-primary`；编号白字改为 `--dsw-alias-label-primary-foreground` | `.dsh-ann-bar`、`.dsh-ann-send`、`.dsh-ann-danger`、`.dsh-ann-qnum`/`.dsh-ann-num` 及两处内联样式 | 深色模式下纯黑发送键、固定深蓝边框与主题不协调；要求插件底色/强调色随主题一致 |
| 19 | 编号角标收紧：`.dsh-ann-num` 由 `16×16/10px、padding 0 4px`（内容盒约 26×18）改为 `border-box 14×14/9px、padding 0 2px、line-height 1、tabular-nums`；`.dsh-ann-qnum` 同步 `14×14/9px`；定位常量宽高 `26/18→14/14`、上沿 `20→16`、碰撞步长 `18→14`、视口边距同步收紧 | `.dsh-ann-num`、`.dsh-ann-qnum`、`buildMarkers()` 内定位常量 | 数字在角标里显得空、角标比文字大 |
| 20 | 编辑批注卡移除「被批注原文」预览块（`.dsh-ann-quote`）：页面上已有高亮与编号标注位置，原文预览重复；改后卡片只剩标题、删除、输入框与取消/保存。提交时协议块仍携带原文与备注 | `render()` 编辑分支 | 原文信息在卡片里重复显示，用户要求去掉 |
| 21 | 编号角标改方正造型：`.dsh-ann-num` 圆角 `7→2px`（14×14 小方块，多位数自动加宽）、边框透明度 `.3→.25`、投影 `0 1px 4px/.35 → 0 1px 2px/.3`；`.dsh-ann-qnum` 同步 `2px` | `.dsh-ann-num`、`.dsh-ann-qnum` | 圆角+大投影的胶囊造型被认为不好看，要求方正 |
| 22 | 编辑卡中文文案去掉「批注」二字：标题 `编辑批注→编辑`、保存按钮 `保存批注→保存`（英文/俄文未动） | `STR.zh.edit.editTitle`、`STR.zh.edit.save` | 编辑卡里「批注」二字被视为多余 |
| 23 | 批注输入框新增**语音输入**：录音按钮（新增/编辑卡各一个）、MediaRecorder 采集、16 kHz 单声道 PCM16 WAV 重采样、`ctx.remote.speech.transcribe` 调用宿主 SenseVoice；取消/关闭/失败时释放麦克风；`package.json` 的 `dsh.client.inject` 增加 api-remotes 与 api-gateway | `client.js` 语音段与卡片渲染、`package.json` | 要求与主输入框一致的语音输入能力 |
| 24 | 语音失败改为**卡片内持久红字 + console.error**，并带具体原因（remote 缺失/麦克风权限/转写错误对象/异常 message），替代一闪而过的 toast | `client.js` `voiceError()` 与各处调用 | 首次实测「不行」但抓不到错误信息 |
| 25 | 新增批注卡的话筒改为**输入框内部右侧小图标**：`.dsh-ann-input-wrap` 包裹输入框与话筒，话筒绝对定位、输入框右侧留 30px；编辑卡仍用底部按钮行话筒 | `client.js` 新增卡渲染与 `.dsh-ann-input-wrap/.dsh-ann-mic-inline` 样式 | 新增卡上看不到话筒/位置不明显，要求两张卡都能在输入处直接说话 |
| 26 | 取不到 `remote.speech` 时输出**诊断信息**（ctx 可用服务名、remote 是否存在、namespace 列表），并依次尝试 `ctx.remote`、`ctx.get('remote'/'apiRemotes'/'typertRemote'/'gateway')`；内嵌话筒补可见边框/底色与 z-index | `client.js` `speechService()/voiceDebugInfo()` 与话筒样式 | 主输入框语音正常、插件却提示「宿主语音输入插件未启用」，需定位上下文差异 |
| 27 | 诊断串加入 **build 版本标记**并写入 `localStorage['dsh-ann-last-voice-error']`，用于确认界面实际加载的客户端版本、便于离线取错误 | `client.js` `voiceDebugInfo()` | 重启后仍报错，需要确认加载版本与上下文事实 |
| 28 | **修复语音取不到 remote 的根因**：`exports.inject` 增加 `'remote'`（此前只声明 sessions/conversation/locale/uiSession，导致 `ctx.remote` 访问抛错）；诊断函数改为逐段 try，抛错时仍输出 build 与 ctx 服务列表 | `client.js` `exports.inject`、`voiceDebugInfo()` | 红字显示 `[dbg失败]`，证明访问 `ctx.remote` 即抛异常 |
| 29 | **语音服务名纠正为 `remote.speech`**：`exports.inject` 增加 `'remote.speech'`，`speechService()` 优先 `ctx.get('remote.speech')`；新增卡话筒改为 flex 行内子元素 + 内联样式，确保可见 | `client.js` `exports.inject`、`speechService()`、新增卡渲染 | 语音插件自身 `ctx.inject(["remote.speech", …])`，服务名带命名空间，此前只注入 `remote` 故取不到 |

**未改动**：颜色与主题变量、圆角、按钮数量（上游就是单个按钮）、发送格式（协议块）、锚点与滚动逻辑、界面语言体系与协议块。

## 四、仓库层面的差异

- 归档上游原始 README 到 `docs/upstream/`；上游 `CHANGELOG.md` 改名 `CHANGELOG.upstream.md`（原文未改）。
- 新增本 `NOTICE.md` 与自有 `CHANGELOG.md`。
- 重写根 `README.md`：说明本插件对标 OpenAI Codex 的「选中批注」交互、保留与去掉的能力、完整交互流程（`docs/images/` 6 张分段示意图）、功能清单、设计取舍与已知限制。
- 移除上游产品站 `site/`、上游 CI 与发布工作流（`release.yml` 含 npm 发布步骤，属于上游的发布链，不适用于本改版）。

## 五、声明与免责

- 本改版**与原作者无关联、未获原作者背书**，未使用原作者名义或商标做任何宣称。
- MIT 许可允许修改与再分发，但**要求保留版权与许可声明**——本仓库已保留，并在本文件逐项列明来源。
- 若上游作者或任何权利人认为本仓库不妥，**请联系仓库所有者，我们会立即下架或调整**。
- 建议需要原版或最新版的用户前往上游仓库：**https://github.com/omdsh-dev/dsh-annotation**。
- 风险提示（与上游一致）：DSH 插件是**进程内可信代码**；本项目与上游相同，只有界面半边（`client.js`），Node 半边为空实现（`lib/index.js` 仅 `name` 与空的 `apply()`）。

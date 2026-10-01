# Developer testing / 开发测试

## English

CI runs unit checks on Node 22 and 24 without cloning a DSH host. Browser smoke and release acceptance resolve the highest `dsh-v*` tag on deepseek-ai/deepseek-harness at run time. These are core versions, not Desktop shell versions.

`test/ime-submit-guard.test.mjs` exercises the real Enter handler and IME latch with controlled timers. During the 50ms post-composition guard, eligible annotation submissions stop event propagation without cancelling the native default; typed Ctrl/Meta+Enter, commands, native composition signals, and unrelated inputs pass through. Native IME text acceptance still requires browser verification.

## 简体中文

CI 在 Node 22 与 24 上跑单元检查，不克隆 DSH 宿主。浏览器冒烟和发布验收在运行时解析 deepseek-ai/deepseek-harness 上最高的 `dsh-v*` 标签。版本号指 DSH 内核，不是 Desktop 外壳。

`test/ime-submit-guard.test.mjs` 用可控计时器执行真实 Enter 处理与 IME latch。合成结束后的 50ms 保护窗内，仅对本来会携带批注的提交停止事件传播，不取消原生默认行为；带正文的 Ctrl/Meta+Enter、命令、原生合成信号与无关输入原样放行。原生输入法的上屏行为仍需浏览器验证。

# Running Enter regression evidence

This test follows issue #61 from real browser text entry through the actual
`session/prompt` HTTP request, Host admission, model input, and physical JSONL.
It runs the unchanged v1.4.10 annotation package against DSH v0.1.5-rc.2 and the
PR's annotation package against pinned DSH v0.2.0-rc.2. The workflow records
the exact Host commit and pins the historical plugin commit.

Each pairing covers a running turn, an existing queued prompt, a saved
annotation selected from actual streamed assistant text, and a typed question.
The six cases combine Queue/Steer preference with Enter/Ctrl+Enter/Meta+Enter.
Plain Enter must attach the quote and note and retain the configured delivery
mode. Accelerated Enter with typed text keeps the existing plugin policy:
it sends the question in the complementary mode and leaves annotations pending.

The model adapter is synthetic and held open until the test has asserted the
live queue state. It uses the same public adapter seam as the upstream streaming
Web tests. No credentials or external model requests are needed.

Build the Host and selected plugin, install the Host's Playwright Chromium,
then run:

```sh
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/annotation --variant historical
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/annotation --variant current
```

`--list` collects the six cases without launching a browser. Actual browser
execution uses the Host's `vitest.web.config.ts` and unchanged WebScaffold.
The historical installer reproduces the package link normally left by
`dsh plugin add`; the current installer uses the scaffold's installed-profile
option. Neither fixture modifies production Host or plugin source.

Artifacts include the actual HTTP prompt envelopes and acknowledgement,
observed events, one validated result per case, the physical compressed log,
its decoded JSONL, and a screenshot/error when a case fails. A failure should
identify the first boundary where the quote/note or requested delivery mode
changes before proposing a runtime fix.

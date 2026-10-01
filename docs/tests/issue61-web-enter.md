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

The `ime` scenario tests the PR's plugin against both pinned Hosts. Its eight
cases combine each Queue/Steer preference with one IME lifecycle, typed
Ctrl+Enter, typed Meta+Enter, and Enter without annotations. The lifecycle
dispatches compositionstart/end on the real editor root, probes Enter at
0ms and 20ms without a request or draft change, then uses a normal keyboard
Enter at 60ms to send the full annotation exactly once. Synthetic
isComposing/keyCode229 probes must still reach the root without cancelling
the event. The other three controls submit at 20ms and keep their existing
content and delivery policy. Every accepted prompt uses the same HTTP,
Host admission, model, and physical JSONL assertions as the ordinary cases.

The Playwright clock is installed before client boot, runs during setup, and
pauses only after the real quote/note/question are ready. Both the Host's
10ms guard and the plugin's 50ms timer use this clock. It resumes before
awaiting the accepted response or draining the agent.

The historical job also runs `ime-baseline` with the exact v1.4.10 package.
Its two Queue/Steer cases use the same 20ms sequence and expect a question-only
request with the quote/note still pending. That expected omission must persist
unchanged through model input and physical JSONL before the patched plugin is
tested against both Hosts.

The model adapter is synthetic and held open until the test has asserted the
live queue state. It uses the same public adapter seam as the upstream streaming
Web tests. No credentials or external model requests are needed.

Build the Host and selected plugin, install the Host's Playwright Chromium,
then run:

```sh
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/annotation --variant historical
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/annotation --variant current
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/fixed-annotation --variant historical --scenario ime
node scripts/run-host-enter.mjs --host /path/to/dsh --plugin /path/to/fixed-annotation --variant current --scenario ime
node scripts/run-host-enter.mjs --host /path/to/historical-dsh --plugin /path/to/v1.4.10-annotation --variant historical --scenario ime-baseline
```

`--list` collects six ordinary, eight IME, or two historical baseline cases without launching a browser. Actual browser
execution uses the Host's `vitest.web.config.ts` and unchanged WebScaffold.
The historical installer reproduces the package link normally left by
`dsh plugin add`; the current installer uses the scaffold's installed-profile
option. Neither fixture modifies production Host or plugin source.

Artifacts include the actual HTTP prompt envelopes and acknowledgement,
observed events, one validated result per case, the physical compressed log,
its decoded JSONL, and a screenshot/error when a case fails. A failure should
identify the first boundary where the quote/note or requested delivery mode
changes before proposing a runtime fix.

IME artifacts additionally record event timestamps, root propagation, native
signal properties, event trust, and defaultPrevented. Composition events and
guarded key probes are untrusted DOM events; they verify real browser handlers
but do not create an active OS input method. The accepted 60ms Enter and the
accelerator/no-annotation controls use Playwright keyboard input. Native
candidate acceptance, committed IME text, and browser default text insertion
during the guarded window remain separate manual verification. Slash command
pass-through is covered by `test/ime-submit-guard.test.mjs`.

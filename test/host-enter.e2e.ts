/** Copied into the pinned DSH host's apps/web/tests by run-host-enter.mjs. */
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { chromium, type Browser, type Page } from 'playwright'
import { expect, it } from 'vitest'
import { LlmAdapter, type GenerateOptions, type LlmModelInfo, type LlmProviderInfo, type LlmResolvedModelInfo, type StreamChunk } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import { logPath } from '../../../packages/session/session-persistence-jsonl/src/format.ts'
import { scanZstdFrames } from '../../../packages/session/session-persistence-jsonl/src/zstd.ts'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, writeComposerDraft } from './support.ts'

const PROVIDER = 'annotation-enter-fixture'
const MODEL = 'scripted'
const QUOTE = 'Synthetic quoted passage for the annotation Enter test.'
const NOTE = 'Synthetic annotation note.'
const QUESTION = 'Synthetic typed question.'
const INITIAL = 'Start the synthetic running turn.'
const EXISTING = 'Synthetic existing queued prompt.'
const pluginDir = process.env.ANNOTATION_TEST_PLUGIN_DIR
const variant = process.env.ANNOTATION_TEST_HOST_VARIANT
const artifacts = process.env.ANNOTATION_TEST_ARTIFACTS
if (pluginDir === undefined || artifacts === undefined || !['historical', 'current'].includes(variant ?? '')) {
  throw new Error('run-host-enter.mjs must provide plugin directory, host variant, and artifact directory')
}

interface PromptEnvelope {
  type: 'client-request'
  rpcId: string
  method: 'session/prompt'
  payload: { args: { request: SessionPromptRequest } }
}

/** Same open adapter seam as upstream streaming-fence-highlight.e2e.ts. */
class GatedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  private readonly gate = Promise.withResolvers<void>()
  private readonly paused = Promise.withResolvers<void>()
  readonly firstPaused = this.paused.promise

  release(): void { this.gate.resolve() }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Annotation Enter fixture' }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{ provider, id: MODEL, name: 'Scripted annotation model' }])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: 'Scripted annotation model', contextWindow: 128_000 })
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const text = this.requests.length === 1 ? QUOTE : 'Synthetic scripted response.'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    if (this.requests.length === 1) {
      this.paused.resolve()
      await new Promise<void>((resolveGate, reject) => {
        const abort = (): void => { reject(options.signal?.reason ?? new Error('aborted')) }
        if (options.signal?.aborted) { abort(); return }
        options.signal?.addEventListener('abort', abort, { once: true })
        void this.gate.promise.then(() => {
          options.signal?.removeEventListener('abort', abort)
          resolveGate()
        })
      })
    }
    options.signal?.throwIfAborted()
    yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 10 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function scaffoldWithPlugin(harnessHome: string): Promise<WebScaffold> {
  if (variant === 'current') {
    return launchWebScaffold({
      harnessHome,
      profile: { packages: [{ dir: pluginDir!, enabled: true }] },
    } as Parameters<typeof launchWebScaffold>[0])
  }
  // 0.1.5 has the dependency-closure/overlay seam, but predates the
  // scaffold's reproduction of the package link left by `dsh plugin add`.
  const manifest = JSON.parse(await readFile(join(pluginDir!, 'package.json'), 'utf8')) as { name: string }
  const installedLink = join(harnessHome, 'profiles/scaffold/node_modules', manifest.name)
  await mkdir(dirname(installedLink), { recursive: true })
  await symlink(pluginDir!, installedLink, 'junction')
  return launchWebScaffold({
    harnessHome,
    extraInstallAnchors: [join(pluginDir!, 'package.json')],
    extraOverlayPath: join(pluginDir!, 'cordis.patch.yml'),
  })
}

async function setPreference(page: Page, busyEnter: 'queue' | 'steer'): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('button', { name: 'Queue', exact: true }).waitFor()
  if (busyEnter === 'steer') {
    await settings.getByRole('button', { name: 'Queue', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Steer', exact: true }).click()
    await settings.getByRole('button', { name: 'Steer', exact: true }).waitFor()
  }
  await page.keyboard.press('Escape')
  await settings.waitFor({ state: 'hidden' })
}

function textOf(request: SessionPromptRequest): string {
  return request.content.filter(part => part.type === 'text').map(part => part.text).join('\n')
}

function userMessages(events: readonly SessionEvent[]): SessionEvent<'user/message'>[] {
  // The composed Host also logs model-visible runtime-context snapshots as
  // user/message. Assert the browser-authored stream separately by its source.
  return events.filter((event): event is SessionEvent<'user/message'> =>
    event.type === 'user/message' && event.data.source.kind === 'user')
}

for (const busyEnter of ['queue', 'steer'] as const) {
  for (const gesture of ['Enter', 'Control+Enter', 'Meta+Enter'] as const) {
    it(`annotation running Enter: ${variant}, preference=${busyEnter}, gesture=${gesture}`, async () => {
      const caseDir = join(artifacts!, `${busyEnter}-${gesture.replace('+', '-')}`)
      await mkdir(caseDir, { recursive: true })
      const harnessHome = await mkdtemp(join(tmpdir(), 'annotation-enter-web-'))
      const adapter = new GatedAdapter()
      const envelopes: PromptEnvelope[] = []
      let scaffold: WebScaffold | undefined
      let browser: Browser | undefined
      let page: Page | undefined
      let off: (() => void) | undefined
      let observedError: string | undefined
      const events: SessionEvent[] = []
      try {
        scaffold = await scaffoldWithPlugin(harnessHome)
        scaffold.ctx.effect(() => scaffold!.ctx.llm.registerAdapter([PROVIDER], adapter), 'annotation Enter controlled adapter')
        await scaffold.ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: MODEL })
        off = scaffold.ctx.on('session/event', (_session, event) => { events.push(event) })
        browser = await chromium.launch()
        page = await newEnglishPage(browser)
        const tripwire = watchConsole(page)
        page.on('request', (request) => {
          if (new URL(request.url()).pathname !== '/api/session/prompt') return
          const envelope = request.postDataJSON() as PromptEnvelope
          if (envelope.method !== 'session/prompt') throw new Error('Unexpected prompt HTTP envelope')
          envelopes.push(envelope)
        })
        await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
        await page.locator('[data-annotation-for-dsh]').waitFor({ state: 'attached', timeout: 30_000 })
        const clientUrl = await page.evaluate(() => {
          const boot = (globalThis as unknown as { __DSH_BOOT__?: { entries?: { id: string; url: string }[] } }).__DSH_BOOT__
          return boot?.entries?.find(entry => entry.id === '@changfenhuang/dsh-annotation')?.url
        })
        expect(clientUrl).toBeDefined()
        const servedClient = await page.request.get(new URL(clientUrl!, scaffold.baseUrl).href)
        expect(servedClient.ok()).toBe(true)
        const selectedPath = join(pluginDir!, 'client.js')
        const resolvedPath = scaffold.ctx.clientModules.clientPath('@changfenhuang/dsh-annotation')
        expect(resolvedPath).toBeDefined()
        expect(await realpath(resolvedPath!)).toBe(await realpath(selectedPath))
        const selectedSource = await readFile(selectedPath)
        const servedBody = await servedClient.body()
        // Both pinned Hosts serve a one-entry combo: authored debugger
        // trailers are removed, then a separator and indexed-map URL added.
        // Match every executable byte, rather than comparing the raw file
        // with this documented transport wrapper or accepting a substring.
        let executable = selectedSource.toString('utf8')
          .replace(/(?:\r?\n)?\/\/# sourceURL=([^\r\n]+)(?:\r?\n)?$/, '')
          .replace(/(?:\r?\n)?\/\/# sourceMappingURL=[^\r\n]*(?:\r?\n)?$/, '')
        if (!executable.endsWith('\n')) executable += '\n'
        const mapUrl = clientUrl!.replace('/client.js&rev=', '/client.js.map&rev=')
        expect(mapUrl).not.toBe(clientUrl)
        // 0.2's trailer resolves from the script directory; 0.1.5 uses the
        // absolute route. Keep the exact per-tag reference in the byte proof.
        const mapReference = variant === 'current' ? mapUrl.replace(/^plugins\//, '') : mapUrl
        const expectedBody = Buffer.from(`${executable};\n//# sourceMappingURL=${mapReference}\n`)
        const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')
        await writeFile(join(caseDir, 'selected-client.js'), selectedSource)
        await writeFile(join(caseDir, 'served-client.js'), servedBody)
        await writeFile(join(caseDir, 'expected-served-client.js'), expectedBody)
        await writeFile(join(caseDir, 'client-provenance.json'), JSON.stringify({
          selectedPath, resolvedPath, clientUrl, mapUrl, mapReference,
          selectedSha256: hash(selectedSource), servedSha256: hash(servedBody), expectedServedSha256: hash(expectedBody),
        }, null, 2) + '\n')
        expect(servedBody.equals(expectedBody)).toBe(true)
        await connectFreshWorkspace(page, scaffold.workspaceCwd)
        await setPreference(page, busyEnter)
        const input = page.locator('[data-composer-input][contenteditable="true"]').first()
        await writeComposerDraft(page, input, INITIAL)
        await input.press('Enter')
        await adapter.firstPaused
        const initialRequest = envelopes.find(envelope => textOf(envelope.payload.args.request) === INITIAL)?.payload.args.request
        expect(initialRequest).toBeDefined()
        const found = await scaffold.ctx.sessionController.resolveAgent(initialRequest!.sessionId)
        if ('error' in found) throw found.error
        const agent = found.agent
        expect(agent.status).toBe('running')

        // Create the existing queue through the real composer before saving
        // any annotation. Choose the gesture that actually means Queue.
        await writeComposerDraft(page, input, EXISTING)
        await input.press(busyEnter === 'queue' ? 'Enter' : 'Control+Enter')
        await expect.poll(() => agent.inbox.nextTurn.length).toBe(1)
        expect(agent.status).toBe('running')
        const existingRequest = envelopes.find(envelope => textOf(envelope.payload.args.request) === EXISTING)?.payload.args.request
        expect(existingRequest?.mode).toBe('queue')
        await page.locator('[data-queue-dock]').getByText(EXISTING, { exact: true }).waitFor()

        // Select real streamed assistant text. The plugin's normal UI owns
        // the quote/note; no fabricated chat row or seeded quote state.
        const passage = page.getByText(QUOTE, { exact: true }).first()
        await passage.waitFor()
        await passage.evaluate((element) => {
          const selection = window.getSelection()!
          const range = document.createRange()
          range.selectNodeContents(element)
          selection.removeAllRanges()
          selection.addRange(range)
        })
        await page.locator('.dsh-ann-bar button').click()
        await page.locator('.dsh-ann-input').fill(NOTE)
        await page.locator('.dsh-ann-action').click()
        await page.locator('[data-annotation-chip]').waitFor()
        await writeComposerDraft(page, input, QUESTION)
        await expect.poll(() => input.innerText()).toBe(QUESTION)
        expect(agent.status).toBe('running')
        expect(agent.inbox.nextTurn).toHaveLength(1)
        const before = envelopes.length
        const admitted = page.waitForResponse('**/api/session/prompt')
        await input.press(gesture)
        const admissionResponse = await admitted
        expect(admissionResponse.ok()).toBe(true)
        await expect.poll(() => envelopes.length).toBe(before + 1)
        const targetEnvelope = envelopes[before]!
        const target = targetEnvelope.payload.args.request
        const admission = await admissionResponse.json()
        expect(admission).toMatchObject({ type: 'server-response', rpcId: targetEnvelope.rpcId,
          result: { ok: true, value: { accepted: true } } })
        await writeFile(join(caseDir, 'http-prompt-response.json'), JSON.stringify(admission, null, 2) + '\n')
        const accelerated = gesture !== 'Enter'
        const expectedMode = accelerated ? (busyEnter === 'queue' ? 'steer' : 'queue') : busyEnter
        expect(target.mode).toBe(expectedMode)
        expect(textOf(target)).toContain(QUESTION)
        if (accelerated) {
          expect(textOf(target)).toBe(QUESTION)
          expect(await page.locator('[data-annotation-chip]').isVisible()).toBe(true)
          const pending = await page.evaluate(id => localStorage.getItem('dsh.annotation.pending.v1.' + id), target.sessionId)
          expect(pending).not.toBeNull()
          expect(JSON.parse(pending!)).toMatchObject([{ text: QUOTE, note: NOTE }])
        } else {
          expect(textOf(target)).toContain(QUOTE)
          expect(textOf(target)).toContain(NOTE)
          // updateChip hides the permanent layer rather than removing it.
          await expect.poll(() => page!.locator('[data-annotation-chip]').isVisible()).toBe(false)
          await expect.poll(() => page!.evaluate(id => localStorage.getItem('dsh.annotation.pending.v1.' + id), target.sessionId)).toBeNull()
        }
        await expect.poll(() => (expectedMode === 'queue' ? agent.inbox.nextTurn : agent.inbox.nextStep)
          .some(message => message.source.kind === 'user' && 'rpcId' in message.source && message.source.rpcId === target.requestId)).toBe(true)
        await expect.poll(() => page!.locator('[data-composer-input]').first().innerText()).toBe('')
        expect(agent.inbox.nextTurn.some(message => JSON.stringify(message.content) === JSON.stringify(existingRequest!.content))).toBe(true)
        adapter.release()
        await agent.whenIdle()
        await scaffold.ctx.sessions.flush(agent.session)

        const expectedOrder = expectedMode === 'queue'
          ? [initialRequest!.content, existingRequest!.content, target.content]
          : [initialRequest!.content, target.content, existingRequest!.content]
        const expectedRpcOrder = expectedMode === 'queue'
          ? [initialRequest!.requestId, existingRequest!.requestId, target.requestId]
          : [initialRequest!.requestId, target.requestId, existingRequest!.requestId]
        expect(userMessages(events).map(event => event.data.content)).toEqual(expectedOrder)
        expect(userMessages(events).map(event => 'rpcId' in event.data.source ? event.data.source.rpcId : undefined)).toEqual(expectedRpcOrder)
        const reader = await scaffold.ctx.sessionPersistence.open(target.sessionId, 'read')
        let durable: readonly SessionEvent[]
        try { durable = (await reader.read()).events } finally { await reader.close() }
        expect(userMessages(durable).map(event => event.data.content)).toEqual(expectedOrder)
        expect(userMessages(durable).map(event => 'rpcId' in event.data.source ? event.data.source.rpcId : undefined)).toEqual(expectedRpcOrder)
        const targetEvents = userMessages(durable).filter(event => event.data.source.kind === 'user'
          && 'rpcId' in event.data.source && event.data.source.rpcId === target.requestId)
        expect(targetEvents).toHaveLength(1)
        expect(targetEvents[0]!.data.content).toEqual(target.content)
        const physicalPath = logPath(scaffold.persistenceRoot, agent.session.header.cwd, agent.session.id, 'zstd')
        const bytes = await readFile(physicalPath)
        const scan = scanZstdFrames(bytes)
        expect(scan.tornStart).toBeUndefined()
        const decoded = Buffer.concat(scan.frames.map(frame => zstdDecompressSync(bytes.subarray(frame.start, frame.end)))).toString('utf8')
        const physicalEvents = decoded.trim().split('\n').map(line => JSON.parse(line)) as SessionEvent[]
        const physicalTarget = userMessages(physicalEvents).filter(event => event.data.source.kind === 'user'
          && 'rpcId' in event.data.source && event.data.source.rpcId === target.requestId)
        expect(physicalTarget).toHaveLength(1)
        expect(physicalTarget[0]!.data.content).toEqual(target.content)
        expect(adapter.requests).toHaveLength(3)
        const modelTargets = adapter.requests.flatMap(request => request.messages.filter(message => message.role === 'user'
          && message.source.kind === 'user' && 'rpcId' in message.source && message.source.rpcId === target.requestId))
        expect(modelTargets.length).toBeGreaterThan(0)
        for (const message of modelTargets) expect(message.content).toEqual(target.content)
        expect(tripwire.pageErrors).toEqual([])
        await copyFile(physicalPath, join(caseDir, basename(physicalPath)))
        await writeFile(join(caseDir, 'physical-decoded.jsonl'), decoded)
        await writeFile(join(caseDir, 'result.json'), JSON.stringify({ pass: true, variant, busyEnter, gesture,
          target, expectedMode, userOrder: expectedOrder, modelCalls: adapter.requests.length }, null, 2) + '\n')
      } catch (error) {
        observedError = error instanceof Error ? error.stack ?? error.message : String(error)
        await page?.screenshot({ path: join(caseDir, 'failure.png'), fullPage: true }).catch(() => {})
        throw error
      } finally {
        await writeFile(join(caseDir, 'http-prompt-envelopes.json'), JSON.stringify(envelopes, null, 2) + '\n')
        await writeFile(join(caseDir, 'observed-events.json'), JSON.stringify(events, null, 2) + '\n')
        if (observedError !== undefined) await writeFile(join(caseDir, 'failure.txt'), observedError + '\n')
        adapter.release()
        off?.()
        try { await browser?.close() } finally {
          try { await scaffold?.close() } finally { await rm(harnessHome, { recursive: true, force: true }) }
        }
      }
    }, 180_000)
  }
}

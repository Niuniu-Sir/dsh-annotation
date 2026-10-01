import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const protocol = source.slice(source.indexOf('    var STR = {'), source.indexOf('    // ============================== 工具'))
function fn(name) {
  const match = source.match(new RegExp(`      function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n      \\}`))
  assert.ok(match, name)
  return match[0]
}

function harness({ draft = '我的问题\n第二行', running = true, legacy = false, quotes = true, failSubmit = false } = {}) {
  const sent = []
  const writes = []
  const subscribers = new Set()
  const shell = {
    state: {
      getSnapshot: () => ({ draft }),
      subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback) },
    },
    setDraft(value) {
      draft = value
      writes.push(value)
      for (const callback of subscribers) callback()
    },
    submit(mode) {
      if (failSubmit) { failSubmit = false; throw new Error('temporary submission failure') }
      sent.push({ text: draft, mode })
      this.setDraft('')
    },
  }
  let card
  class Element { closest(selector) { return selector === '[data-composer-card]' ? card : null } }
  card = new Element()
  class HTMLTextAreaElement extends Element {}
  class ComposerInput extends Element { closest(selector) { return selector === '[data-composer-input]' ? this : super.closest(selector) } }
  const input = legacy ? new HTMLTextAreaElement() : new ComposerInput()
  const ui = { mode: 'closed', quotes: quotes ? [{ text: '需要解释的原文', note: '批注内容' }] : [] }
  const sessions = { list: { getSnapshot: () => ({ current: 'session' }) }, scope: () => ({}) }
  const api = Function('shell', 'sessions', 'ui', 'Element', 'HTMLTextAreaElement', 'console', `
    ${protocol}
    ${source.slice(source.indexOf('    function quoteWithSource('), source.indexOf('    function assistantRows('))}
    var ctx = { conversation: { input: { for: () => shell } } }
    var uiSessionService = null
    var annotationAttached = false
    var inputUnsub = null
    var pendingDeco = []
    var chipLayer = {}
    var cleared = 0
    function isImeKeyBlocked(e) { return e.isComposing === true || e.keyCode === 229 || e.imeLatched === true }
    function showToast() {}
    function writeCurrentPendingQuotes() { cleared++ }
    function clearTip() {}
    function updateChip() {}
    function renderMarkers() {}
    function kickDecorate() {}
    function closeToolbar() {}
    ${['uiSessionFace', 'currentSessionSource', 'readCurrentSessionId', 'buildBlock', 'shouldAttachForEnter', 'isCommandDraft', 'attachAndSend', 'submitAttached', 'onKeyDown', 'tryWatchInputDraft'].map(fn).join('\n')}
    tryWatchInputDraft('session')
    return { onKeyDown, pendingDeco, cleared: () => cleared }
  `)(shell, sessions, ui, Element, HTMLTextAreaElement, { log() {}, warn() {} })

  function dispatch(overrides = {}) {
    // A React/Lexical handler can still see its pre-capture render values.
    // In the running host this stale closure sends only the original question.
    const renderedDraft = draft
    const event = {
      key: 'Enter', target: input, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true },
      stopPropagation() { this.stopped = true },
      ...overrides,
    }
    api.onKeyDown(event)
    if (!event.stopped && !event.defaultPrevented && !event.shiftKey && !event.altKey && !event.isComposing && event.keyCode !== 229 && !event.imeLatched) {
      if (running) {
        sent.push({ text: renderedDraft, mode: 'host-steer' })
        shell.setDraft('')
      } else shell.submit('host-queue')
    }
    return event
  }
  return { dispatch, sent, writes, shell, ui, api, input, Element }
}

for (const legacy of [false, true]) {
  for (const running of [true, false]) {
    test(`${legacy ? 'textarea' : 'contenteditable'}: ${running ? 'running' : 'idle'} Enter sends annotations and question exactly once (#61)`, () => {
      const h = harness({ legacy, running })
      const event = h.dispatch()
      assert.equal(h.sent.length, 1)
      assert.match(h.sent[0].text, /1\. 需要解释的原文\n   批注：批注内容/)
      assert.ok(h.sent[0].text.endsWith('提问：\n我的问题\n第二行'))
      assert.equal(h.sent[0].mode, 'queue')
      assert.equal(event.defaultPrevented, true)
      assert.equal(event.stopped, true, 'the stale host handler must not also submit')
      assert.equal(h.shell.state.getSnapshot().draft, '')
      assert.equal(h.ui.quotes.length, 0)
      assert.equal(h.api.cleared(), 1)
      assert.deepEqual(h.api.pendingDeco, [{ items: [{ text: '需要解释的原文', note: '批注内容' }] }])
    })
  }
}

test('running: plain Enter and accelerated empty-draft Enter still send annotation-only messages', () => {
  for (const modifiers of [{}, { ctrlKey: true }, { metaKey: true }]) {
    const h = harness({ draft: ' \n\t ' })
    h.dispatch(modifiers)
    assert.equal(h.sent.length, 1)
    assert.match(h.sent[0].text, /需要解释的原文/)
    assert.doesNotMatch(h.sent[0].text, /提问：/)
    assert.equal(h.sent[0].mode, 'queue')
  }
})

test('Ctrl/Cmd+Enter with a question remains the host gesture and keeps annotations pending', () => {
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
    const h = harness()
    const event = h.dispatch(modifiers)
    assert.equal(event.stopped, false)
    assert.equal(event.defaultPrevented, false)
    assert.deepEqual(h.sent, [{ text: '我的问题\n第二行', mode: 'host-steer' }])
    assert.equal(h.ui.quotes.length, 1)
    assert.equal(h.api.cleared(), 0)
  }
})

test('newline, Alt+Enter and IME confirmation do not attach or submit annotations', () => {
  for (const overrides of [{ shiftKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }, { imeLatched: true }]) {
    const h = harness()
    const event = h.dispatch(overrides)
    assert.equal(event.stopped, false)
    assert.equal(event.defaultPrevented, false)
    assert.deepEqual(h.writes, [])
    assert.deepEqual(h.sent, [])
    assert.equal(h.ui.quotes.length, 1)
  }
})

test('slash commands and messages without annotations still use the host path', () => {
  for (const options of [{ draft: '  /model sonnet' }, { quotes: false }]) {
    const h = harness(options)
    const originalDraft = h.shell.state.getSnapshot().draft
    const event = h.dispatch()
    assert.equal(event.stopped, false)
    assert.deepEqual(h.sent, [{ text: originalDraft, mode: 'host-steer' }])
    assert.equal(h.api.cleared(), 0)
  }
})

test('submission failure keeps the combined draft and annotations; retry does not duplicate the block', () => {
  const h = harness({ failSubmit: true })
  h.dispatch()
  assert.deepEqual(h.sent, [])
  assert.equal(h.ui.quotes.length, 1)
  const combined = h.shell.state.getSnapshot().draft
  assert.match(combined, /需要解释的原文/)
  h.dispatch()
  assert.deepEqual(h.sent, [{ text: combined, mode: 'queue' }])
  assert.equal(h.writes.filter(text => text !== '').length, 1)
  assert.equal(h.ui.quotes.length, 0)
})

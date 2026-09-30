import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

function fnOf(name) {
  const match = source.match(new RegExp(`function ${name}\\(\\) \\{[\\s\\S]*?\\n      \\}`))
  assert.ok(match, `client.js should define ${name}`)
  return match[0]
}

test('装饰扫描绝不清空待发送批注（issue #28 复测：历史消息重装饰 ≠ 已发送）', () => {
  const deco = fnOf('decorateAll')
  assert.ok(!deco.includes('writeCurrentPendingQuotes'),
    'decorateAll must not write pending storage — DOM cannot distinguish a freshly sent message from history re-rendered after session switch / refresh')
  assert.ok(!deco.includes('ui.quotes = []'),
    'decorateAll must not clear ui.quotes — send-clearing authority is watchInputDraft alone')
})

test('watchInputDraft 订阅失败时每秒重试（初始化时序洞由重试补齐，不再依赖装饰兜底）', () => {
  const watch = fnOf('watchInputDraft')
  assert.match(watch, /setInterval/, 'watchInputDraft should retry the subscription')
  assert.match(watch, /tryWatchInputDraft/, 'retry should go through tryWatchInputDraft')
  assert.match(source, /clearInterval\(inputWatchTimer\)/, 'dispose/switch must stop the retry timer')
})

test('会话切换作废旧会话未消费的发送暂存数据', () => {
  const sw = source.match(/var unsub = currentSessionSource\(\)\.subscribe\(function \(\) \{[\s\S]*?\n      \}\)/)
  assert.ok(sw, 'client.js should define the session-switch handler')
  assert.match(sw[0], /pendingDeco\.length = 0/,
    'stale send staging from the previous session must be dropped, not consumed by the new session history')
})

test('当前会话 id 兼容 DSH 0.1.7（list 快照不再暴露 current）', () => {
  assert.match(source, /function readCurrentSessionId\(\)/, 'client.js should route current-session reads through one helper')
  assert.match(source, /adapter\.current/, 'helper should prefer uiSession.adapter.current')
  assert.doesNotMatch(source, /sessions\.list\.getSnapshot\(\)\.current/,
    'the removed list.current field must not be read directly — it is always undefined on 0.1.7+, which breaks send')
})

test('发送暂存数据在隐藏手术成功后才消费（peek → shift，不提前丢失）', () => {
  assert.match(source, /pendingDeco\[0\]\.items/, 'peek pendingDeco instead of popping')
  assert.doesNotMatch(source, /pendingDeco\.pop\(\)/,
    'popping before hideAnnotationBlock succeeds loses the staged items when content is not rendered yet')
})

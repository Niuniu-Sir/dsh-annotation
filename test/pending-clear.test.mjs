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
  // issue #64：0.1.6-alpha.2 起 list.subscribe 不再于切换时触发，改经
  // onSessionSwitch 统一处理（双订阅 + 轮询兜底），旧暂存仍须作废。
  const sw = fnOf('onSessionSwitch')
  assert.match(sw, /currentSessionId\(\)/,
    'session-switch handler must resolve the id via currentSessionId (list.current is gone on new hosts)')
  assert.match(sw, /pendingDeco\.length = 0/,
    'stale send staging from the previous session must be dropped, not consumed by the new session history')
  assert.match(source, /sessions\.list\.subscribe\(onSessionSwitch\)/,
    'must keep the legacy list subscription for old hosts')
  assert.match(source, /currentProvideInfo[\s\S]*?subscribe\(onSessionSwitch\)/,
    'must subscribe to the public currentProvideInfo for new hosts')
  assert.match(source, /setInterval\(onSessionSwitch, 1000\)/,
    'must poll as fallback where neither subscription fires')
  assert.match(source, /clearInterval\(switchTimer\)/,
    'dispose must stop the switch poller')
})

test('发送暂存数据在隐藏手术成功后才消费（peek → shift，不提前丢失）', () => {
  assert.match(source, /pendingDeco\[0\]\.items/, 'peek pendingDeco instead of popping')
  assert.doesNotMatch(source, /pendingDeco\.pop\(\)/,
    'popping before hideAnnotationBlock succeeds loses the staged items when content is not rendered yet')
})

test('currentSessionId 三级解析：公开读面优先，私有键仅兜底（issue #64）', () => {
  const helper = fnOf('currentSessionId')
  assert.match(helper, /currentProvideInfo/,
    'must prefer the public currentProvideInfo read face (stable across the list.current removal)')
  assert.match(helper, /list\.getSnapshot/,
    'must keep the legacy list.current fallback for old hosts')
  assert.match(helper, /dsh\.sessions\.current/,
    'private persistence key is allowed only as last resort')
  assert.ok(helper.indexOf('currentProvideInfo') < helper.indexOf('list.getSnapshot')
    && helper.indexOf('list.getSnapshot') < helper.indexOf('dsh.sessions.current'),
    'resolution order must be provide → list → localStorage')
  assert.doesNotMatch(source, /getSnapshot\(\)\.current/,
    'no direct sessions.list.getSnapshot().current reads may remain — all must go through currentSessionId')
})

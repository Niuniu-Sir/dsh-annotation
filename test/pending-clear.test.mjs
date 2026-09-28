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
  // issue #64：0.1.6-alpha.2 起选择态移出 list store，list.subscribe 不再于切换时触发；
  // 新宿主没有可订阅的选中态来源，故由 onSessionSwitch + 1s 轮询兜底（旧暂存仍须作废）。
  const sw = fnOf('onSessionSwitch')
  assert.match(sw, /currentSessionId\(\)/,
    'session-switch handler must resolve the id via currentSessionId (list.current is gone on new hosts)')
  assert.match(sw, /pendingDeco\.length = 0/,
    'stale send staging from the previous session must be dropped, not consumed by the new session history')
  assert.match(source, /sessions\.list\.subscribe\(onSessionSwitch\)/,
    'must keep the legacy list subscription for old hosts')
  assert.match(source, /setInterval\(onSessionSwitch, 1000\)/,
    'must poll as fallback where no selection source can be subscribed')
  assert.match(source, /clearInterval\(switchTimer\)/,
    'dispose must stop the switch poller')
  assert.doesNotMatch(source, /sessions\.currentProvideInfo/,
    'sessions.currentProvideInfo exists on no published host (current contract lives in packages/api/session-controller and has no such member) — it must not be read or subscribed')
})

test('发送暂存数据在隐藏手术成功后才消费（peek → shift，不提前丢失）', () => {
  assert.match(source, /pendingDeco\[0\]\.items/, 'peek pendingDeco instead of popping')
  assert.doesNotMatch(source, /pendingDeco\.pop\(\)/,
    'popping before hideAnnotationBlock succeeds loses the staged items when content is not rendered yet')
})

test('currentSessionId 三级解析：持久化选择态 → 旧 list.current → retainedBy 公开面（issue #64）', () => {
  const helper = fnOf('currentSessionId')
  assert.match(helper, /dsh\.sessions\.current/,
    'must read the kernel-persisted selection first — on 0.1.6-alpha.2 ~ 0.1.7-rc.2 it is the only path that works')
  assert.match(helper, /snap\.current/,
    'must keep the legacy list.current for hosts <= 0.1.6-alpha.1, where it is the exact selection')
  assert.match(helper, /retainedBy/,
    'must fall back to the public retainedBy.mainView>0 face (covers "no persisted key yet / storage cleared")')
  assert.ok(helper.indexOf('dsh.sessions.current') < helper.indexOf('snap.current')
    && helper.indexOf('snap.current') < helper.indexOf('retainedBy'),
    'resolution order must be localStorage → list.current → retainedBy (retainedBy is the main-view heuristic the kernel itself only uses as a repair path)')
  assert.doesNotMatch(source, /sessions\.currentProvideInfo/,
    'the stale-source read face must be gone: upstream contract has no currentProvideInfo')
  assert.doesNotMatch(source, /getSnapshot\(\)\.current/,
    'no direct sessions.list.getSnapshot().current reads may remain — all must go through currentSessionId')
})

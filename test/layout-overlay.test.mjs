import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

test('设置弹窗打开时隐藏会话高亮层（issue #44）', () => {
  assert.match(source, /body:has\(\[role="dialog"\]\[aria-modal="true"\]\) \[data-annotation-overlay\] \{ display: none; \}/)
})

test('滚动和布局变化会刷新输入框批注胶囊（issue #44）', () => {
  const start = source.indexOf('function onLayoutChange()')
  const end = source.indexOf("window.addEventListener('scroll', onLayoutChange, true)", start)
  assert.ok(start >= 0 && end > start, 'client.js should define the shared layout refresh')
  assert.match(source.slice(start, end), /updateChip\(\)/)
  assert.match(source, /new ResizeObserver\(onLayoutChange\)/)
  assert.match(source, /composerObserver\.disconnect\(\)/)
})

test('工具条优先选区下方，底部空间不足时放在上方（PR #48）', () => {
  const match = source.match(/function placeAbove\(rect, height\) \{[\s\S]*?\n    \}/)
  assert.ok(match)
  const place = Function('window', `return (${match[0]})`)({ innerWidth: 1000, innerHeight: 800 })
  assert.equal(place({ left: 200, width: 300, top: 300, bottom: 320 }, 40).top, 328)
  assert.equal(place({ left: 200, width: 300, top: 750, bottom: 770 }, 40).top, 702)
  assert.ok(place({ left: -100, width: 300, top: 0, bottom: 800 }, 40).top >= 8)
})

test('共享悬浮面板按归属清理：宿主 layout mutation 不误杀正在观看的面板', () => {
  // 归属机制存在：清空必须指名归属元素。
  assert.match(source, /var tipOwner = null/)
  assert.match(source, /function clearTip\(owner\) \{\r?\n\s+if \(owner !== undefined && tipOwner !== owner\) return/)
  assert.match(source, /function presentTip\(owner, el\) \{[\s\S]*?tipOwner = owner/)

  // 唯一的裸清空只允许在 clearTip / presentTip 内部，其它调用点一律走归属 API。
  const raw = source.match(/tipLayer\.textContent = ''/g) ?? []
  assert.equal(raw.length, 2, 'tipLayer 只能被 clearTip/presentTip 独占清空')

  // updateChip 的「无待发送批注」分支：只能清胶囊自己的面板。该分支由 body 上
  // MutationObserver（attributes/characterData/childList）经 onLayoutChange 高频
  // 触发，无归属清空会把 hover 中的气泡标签/回复芯片面板抹掉。
  const start = source.indexOf('function updateChip()')
  const end = source.indexOf('// 悬停宽限', start)
  assert.ok(start >= 0 && end > start, 'client.js 应定义 updateChip 与悬停宽限段')
  const updateChip = source.slice(start, end)
  assert.match(updateChip, /clearTip\(chipLayer\)/)
  assert.doesNotMatch(updateChip, /tipLayer\.textContent = ''/)

  // 三类面板（输入框胶囊 / 气泡标签 / 回复芯片）各自带归属挂载与清理。
  assert.match(source, /presentTip\(chipLayer, el\)/)
  assert.match(source, /clearTip\(chipLayer\)/)
  assert.match(source, /presentTip\(tag, el\)/)
  assert.match(source, /clearTip\(tag\)/)
  assert.match(source, /presentTip\(chip, el\)/)
  assert.match(source, /clearTip\(chip\)/)

  // 删除待发送批注时只重建胶囊面板，不接管他人的面板。
  assert.match(source, /if \(tipOwner === chipLayer\) showChipTip\(\)/)
})

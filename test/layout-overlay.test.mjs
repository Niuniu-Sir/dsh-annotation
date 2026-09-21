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

// Source slice for one `function name(...) { ... }` by brace matching. The
// extracted functions hold no braces inside strings or comments, so a plain
// depth scan is enough and keeps the eval idiom of the placeAbove case above.
function tryExtractFunction (name) {
  const start = source.indexOf(`function ${name}(`)
  if (start < 0) return null
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`unbalanced braces in ${name}`)
}

// [data-conversation-scroll] carries the conversation column: the session
// header sits above its top edge. The hole must cover that band only, never
// the full viewport width — the sidebar file previews of #57 live outside the
// conversation column and must stay paintable.
const VIEW = { left: 12, top: 76, right: 912, bottom: 800, width: 900, height: 724 }
const COMPOSER = { left: 120, top: 600, right: 820, bottom: 700, width: 700, height: 100 }

// Drive the real renderMarkers with stubbed DOM so the assertion is about the
// clipPath the plugin actually installs, not about which helpers exist.
// Helpers are extracted only when present: on the pre-#62 client.js they are
// absent and the inline clipPath still has to satisfy the same expectation.
function runRenderMarkers (viewRect, composerRect) {
  const overlay = { style: {}, textContent: '' }
  const document = {
    querySelector: (selector) => {
      const rect = selector === '[data-conversation-scroll]' ? viewRect : composerRect
      return rect === null ? null : { getBoundingClientRect: () => rect }
    },
  }
  const prelude = ['markerClipPath', 'markerViewport']
    .map(tryExtractFunction).filter((text) => text !== null).join('\n')
  const run = Function(
    'document', 'window', 'overlay', 'markersSignature', 'markersSig', 'buildMarkers',
    `${prelude}\n${tryExtractFunction('renderMarkers')}\nreturn renderMarkers`,
  )
  run(document, { innerWidth: 1000, innerHeight: 800 }, overlay, () => 'same', 'same', () => {})()
  return overlay.style.clipPath
}

test('renderMarkers 的 clipPath 挖掉会话顶栏横带，高亮不再压住顶栏（issue #62）', () => {
  const clipPath = runRenderMarkers(VIEW, COMPOSER)
  assert.notEqual(clipPath, 'none')
  // header hole: the conversation column from the viewport top down to the scroll body
  assert.ok(
    clipPath.includes('12px 0px, 912px 0px, 912px 76px, 12px 76px, 12px 0px'),
    `header hole missing from ${clipPath}`,
  )
  // the hole must not span the whole width: sidebar file markers (#57) stay visible
  assert.ok(!clipPath.includes(', 0px 0px, 100% 0px'), 'header hole must be bounded to the conversation column')
})

test('输入框挖洞（issue #50）保持原样，两个洞互不影响', () => {
  const clipPath = runRenderMarkers(VIEW, COMPOSER)
  assert.ok(
    clipPath.includes('120px 600px, 820px 600px, 820px 700px, 120px 700px, 120px 600px'),
    `composer hole missing from ${clipPath}`,
  )
})

test('没有会话滚动容器时，标记层退回只挖输入框（不依赖新宿主钩子）', () => {
  assert.equal(
    runRenderMarkers(null, COMPOSER),
    'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, '
      + '120px 600px, 820px 600px, 820px 700px, 120px 700px, 120px 600px)',
  )
  assert.equal(runRenderMarkers(null, null), 'none')
})

test('编号胶囊的顶部下限跟着会话滚动容器上沿抬高（issue #62）', () => {
  const build = (viewRect) => Function(
    'document',
    'window',
    `var markerViewport = ${tryExtractFunction('markerViewport')};`
      + `return (${tryExtractFunction('markerChipFloor')})`,
  )(
    { querySelector: () => (viewRect === null ? null : { getBoundingClientRect: () => viewRect }) },
    { innerHeight: 800 },
  )
  assert.equal(build(VIEW)(), 80)
  assert.equal(build(null)(), 4)
})

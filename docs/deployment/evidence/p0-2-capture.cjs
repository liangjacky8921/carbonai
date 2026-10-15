const fs = require('node:fs')
const path = require('node:path')
const { chromium, devices } = require(process.env.CARBON_PLAYWRIGHT_PATH)

const baseUrl = process.env.CARBONAI_TEST_URL || 'https://www.carbontool.cn/'
const outputDir = __dirname
const cases = [
  { name: 'pc-1440', viewport: { width: 1440, height: 900 } },
  { name: 'pc-1280', viewport: { width: 1280, height: 800 } },
  { name: 'mobile-sim-390', viewport: { width: 390, height: 844 }, mobile: true },
]

function collectState() {
  const describe = (element) => {
    if (!element) return null
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className : null,
      text: (element.innerText || '').trim().slice(0, 100),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      style: {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        color: style.color,
        backgroundColor: style.backgroundColor,
        transform: style.transform,
      },
    }
  }
  const hit = (x, y) => {
    const element = document.elementFromPoint(x, y)
    return element ? { tag: element.tagName.toLowerCase(), id: element.id || null, className: typeof element.className === 'string' ? element.className : null } : null
  }
  const overlays = [...document.querySelectorAll('body *')].flatMap((element) => {
    const style = getComputedStyle(element)
    if (!['fixed', 'absolute'].includes(style.position) || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return []
    const rect = element.getBoundingClientRect()
    if (rect.width < innerWidth * .8 || rect.height < innerHeight * .8) return []
    return [{ tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : null, position: style.position, zIndex: style.zIndex, opacity: style.opacity, pointerEvents: style.pointerEvents, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }]
  }).slice(0, 12)
  return {
    url: location.href,
    readyState: document.readyState,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
    root: { mounted: Boolean(document.querySelector('#app')?.__vue_app__), childCount: document.querySelector('#app')?.children.length ?? null, textLength: document.querySelector('#app')?.innerText.length ?? null },
    landing: describe(document.querySelector('.landing-page')),
    header: describe(document.querySelector('.masthead')),
    hero: describe(document.querySelector('.hero')),
    heroTitle: describe(document.querySelector('#hero-title')),
    sections: [...document.querySelectorAll('[data-story-section]')].map(describe),
    visibleReveal: document.querySelectorAll('[data-story-reveal].is-story-visible').length,
    totalReveal: document.querySelectorAll('[data-story-reveal]').length,
    globe: { canvasCount: document.querySelectorAll('.globe-canvas').length, fallbackCount: document.querySelectorAll('.globe-fallback').length },
    hitTests: { center: hit(innerWidth / 2, innerHeight / 2), upperLeft: hit(innerWidth * .25, innerHeight * .25) },
    overlays,
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const result = { baseUrl, checkedAt: new Date().toISOString(), browser: browser.version(), cases: {} }
  try {
    for (const item of cases) {
      const context = await browser.newContext(item.mobile
        ? { ...devices['Pixel 7'], viewport: item.viewport, deviceScaleFactor: 1 }
        : { viewport: item.viewport })
      const page = await context.newPage()
      const issues = { console: [], pageerror: [], failedAssets: [] }
      page.on('console', (message) => { if (message.type() === 'error') issues.console.push(message.text()) })
      page.on('pageerror', (error) => issues.pageerror.push(error.message))
      page.on('requestfailed', (request) => { if (/\.(?:js|css)(?:\?|$)/.test(request.url())) issues.failedAssets.push({ url: request.url(), error: request.failure()?.errorText }) })
      page.on('response', (response) => { if (response.status() >= 400 && /\.(?:js|css)(?:\?|$)/.test(response.url())) issues.failedAssets.push({ url: response.url(), status: response.status() }) })
      let navigationError = null
      try { await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }) }
      catch (error) { navigationError = error.message }
      await page.waitForTimeout(8000)
      const state = await page.evaluate(collectState)
      const screenshot = path.join(outputDir, `p0-2-${item.name}.png`)
      await page.screenshot({ path: screenshot, fullPage: false })
      result.cases[item.name] = { navigationError, state, issues, screenshot: path.basename(screenshot) }
      await context.close()
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(outputDir, 'p0-2-results.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ browser: result.browser, cases: Object.fromEntries(Object.entries(result.cases).map(([name, item]) => [name, { navigationError: item.navigationError, mounted: item.state.root.mounted, rootTextLength: item.state.root.textLength, sections: item.state.sections.length, heroTitle: item.state.heroTitle?.text, heroOpacity: item.state.hero?.style.opacity, titleOpacity: item.state.heroTitle?.style.opacity, globeCanvases: item.state.globe.canvasCount, overlayCount: item.state.overlays.length, issues: item.issues }])) }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })

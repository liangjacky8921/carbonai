// Historical M0 concept verification. The temporary preview entry was deleted after M1 integration.
// This script is retained as evidence and is no longer expected to run.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH || 'playwright')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const output = __dirname
  const results = { environment: { date: '2026-10-13', timezone: 'Asia/Shanghai', browser: browser.version(), server: 'Vite production preview on loopback', throttling: 'none', runs: 1 }, viewports: [], checks: {}, errors: [], apiRequests: [], limitations: ['Single-run local lab measurements, not production field data.', 'INP not measured; click event timing is diagnostic only.', 'CPU reported as Chromium TaskDuration delta, not operating-system utilization.', 'Heap reported as JS heap only; total browser/GPU memory not measured.', 'Frame cadence uses requestAnimationFrame, not GPU presentation FPS.', 'Visibility branch tested with a synthetic visibilitychange; real background-tab scheduling not measured.', 'Full GIS/chart business regression deferred to M5.'] }
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', error => results.errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()) })
  page.on('request', request => { if (request.url().includes('/api/')) results.apiRequests.push(request.url()) })
  await page.addInitScript(() => {
    window.__motionMetrics = { lcp: null, cls: 0, events: [], longTasks: [] }
    for (const type of ['largest-contentful-paint', 'layout-shift', 'event', 'longtask']) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (type === 'largest-contentful-paint') window.__motionMetrics.lcp = entry.startTime
          if (type === 'layout-shift' && !entry.hadRecentInput) window.__motionMetrics.cls += entry.value
          if (type === 'event') window.__motionMetrics.events.push({ name: entry.name, duration: entry.duration })
          if (type === 'longtask') window.__motionMetrics.longTasks.push(entry.duration)
        }
      }).observe(type === 'event' ? { type, buffered: true, durationThreshold: 16 } : { type, buffered: true })
    }
  })
  for (const width of [1440, 1280, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 })
    await page.goto('http://127.0.0.1:4174/motion-preview.html')
    await page.waitForTimeout(1200)
    const measured = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, ...window.__motionMetrics, canvasCount: document.querySelectorAll('canvas').length }))
    assert.equal(measured.width, measured.scrollWidth, `Overflow at ${width}`)
    results.viewports.push(measured)
    await page.screenshot({ path: path.join(output, `concept-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:4174/motion-preview.html')
  await page.waitForTimeout(1000)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  const before = (await cdp.send('Performance.getMetrics')).metrics
  const frames = await page.evaluate(() => new Promise(resolve => {
    const deltas = []; let last = performance.now(); const start = last
    function tick(now) { deltas.push(now - last); last = now; if (now - start < 3000) requestAnimationFrame(tick); else resolve(deltas) }
    requestAnimationFrame(tick)
  }))
  const after = (await cdp.send('Performance.getMetrics')).metrics
  const value = (metrics, name) => metrics.find(m => m.name === name)?.value
  results.performance = { sampleSeconds: 3, frameSamples: frames.length, averageIntervalMs: frames.reduce((a, b) => a + b, 0) / frames.length, intervalsAbove34ms: frames.filter(n => n > 34).length, maxIntervalMs: Math.max(...frames), taskDurationSeconds: value(after, 'TaskDuration') - value(before, 'TaskDuration'), jsHeapBytes: value(after, 'JSHeapUsedSize'), inp: 'not measured' }
  const field = page.locator('.aurora')
  assert.equal(await field.getAttribute('data-running'), 'true')
  await page.getByRole('button', { name: '暂停背景动效' }).click()
  assert.equal(await field.getAttribute('data-running'), 'false')
  assert.equal(await page.locator('.ribbon-one').evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
  results.checks.pause = true
  await page.getByRole('button', { name: '播放背景动效' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  assert.equal(await field.getAttribute('data-running'), 'false')
  assert.equal(await page.locator('.ribbon-one').evaluate(el => getComputedStyle(el).animationName), 'none')
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto')
  await page.screenshot({ path: path.join(output, 'concept-reduced-motion.png') })
  results.checks.reducedMotion = true
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  assert.equal(await field.getAttribute('data-running'), 'false')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(100)
  assert.equal(await field.getAttribute('data-running'), 'true')
  results.checks.syntheticVisibility = true
  await page.locator('#spatial').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  assert.equal(await field.getAttribute('data-running'), 'false')
  results.checks.offscreenPause = true
  await page.goto('http://127.0.0.1:4174/motion-preview.html')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '跳转到主要内容')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
  results.checks.skipLink = true
  await page.getByRole('link', { name: '了解平台能力' }).click()
  assert.ok(page.url().endsWith('#capabilities'))
  results.checks.anchorNavigation = true
  results.clickEventDiagnostics = await page.evaluate(() => window.__motionMetrics.events)
  const noWebGL = await browser.newContext()
  await noWebGL.addInitScript(() => { const native = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : native.call(this, type, ...args) } })
  const staticPage = await noWebGL.newPage()
  await staticPage.goto('http://127.0.0.1:4174/motion-preview.html')
  assert.ok(await staticPage.getByRole('heading', { level: 1 }).isVisible())
  assert.equal(await staticPage.locator('canvas').count(), 0)
  results.checks.noWebGL = true
  await page.goto('http://127.0.0.1:4174/motion-preview.html')
  const conceptErrors = [...results.errors]
  const conceptRequests = [...results.apiRequests]
  await page.getByRole('link', { name: '进入碳管理平台' }).click()
  await page.waitForURL('http://127.0.0.1:4173/dashboard')
  results.checks.platformLink = true
  // Business preview intentionally has no local API backend; do not mix its probe with concept results.
  results.businessPreviewErrors = results.errors.slice(conceptErrors.length)
  results.apiRequests = conceptRequests
  results.errors = conceptErrors
  assert.equal(results.apiRequests.length, 0)
  assert.equal(results.errors.length, 0)
  fs.writeFileSync(path.join(output, 'initial-check.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results))
}
main().catch(error => { console.error(error); process.exit(1) })

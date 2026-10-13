const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH || 'playwright')

const BASE = process.env.CARBON_BASE_URL || 'http://127.0.0.1:4173'
const evidenceDir = __dirname
const result = {
  environment: {}, checks: [], viewports: [], errors: [], failedResponses: [],
  performance: {}, bundles: [], limitations: [
    '本地 loopback、无网络或 CPU 节流，结果不是生产环境 Core Web Vitals。',
    'INP 需要真实用户现场数据或完整交互测量，本次仅记录 Event Timing 诊断样本。',
    'FPS 为 requestAnimationFrame 回调节奏，不代表 GPU 实际呈现帧率。',
    '内存为 Chromium JSHeapUsedSize 单点/短程诊断，不足以证明不存在长期泄漏。',
    '页面隐藏测试通过合成 visibilitychange 覆盖代码分支，未模拟操作系统真实后台调度。',
    '本地 FastAPI 未启动，/api/health 404 单独列为预期测试环境响应。',
  ],
}

function record(name, passed, details = {}) {
  result.checks.push({ name, passed, ...details })
}

async function attempt(name, fn) {
  try {
    const details = await fn()
    record(name, true, details || {})
  } catch (error) {
    record(name, false, { error: String(error && error.message || error) })
  }
}

async function installMetrics(context) {
  await context.addInitScript(() => {
    window.__m5 = { lcp: 0, cls: 0, longTasks: [], events: [] }
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__m5.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__m5.cls += e.value }).observe({ type: 'layout-shift', buffered: true }) } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__m5.longTasks.push({ start: e.startTime, duration: e.duration }) }).observe({ type: 'longtask', buffered: true }) } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__m5.events.push({ name: e.name, duration: e.duration, interactionId: e.interactionId || 0 }) }).observe({ type: 'event', buffered: true, durationThreshold: 16 }) } catch {}
  })
}

function attachDiagnostics(page, label) {
  page.on('pageerror', error => result.errors.push({ label, type: 'pageerror', text: error.message }))
  page.on('console', message => {
    if (message.type() === 'error') result.errors.push({ label, type: 'console', text: message.text() })
  })
  page.on('requestfailed', request => result.errors.push({ label, type: 'requestfailed', url: request.url(), text: request.failure()?.errorText || '' }))
  page.on('response', response => {
    if (response.status() >= 400) result.failedResponses.push({ label, status: response.status(), url: response.url() })
  })
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const events = window.__m5?.events || []
    return {
      lcpMs: Math.round(window.__m5?.lcp || 0),
      cls: Number((window.__m5?.cls || 0).toFixed(4)),
      maxLongTaskMs: Math.round(Math.max(0, ...(window.__m5?.longTasks || []).map(item => item.duration))),
      longTaskCount: (window.__m5?.longTasks || []).length,
      maxEventDurationMs: Math.round(Math.max(0, ...events.map(item => item.duration))),
      transferBytes: Math.round(resources.reduce((sum, item) => sum + (item.transferSize || 0), 0)),
      domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
      loadMs: navigation ? Math.round(navigation.loadEventEnd) : null,
    }
  })
}

async function rafSample(page, duration = 2000) {
  return page.evaluate(ms => new Promise(resolve => {
    const gaps = []
    let prior = performance.now()
    const started = prior
    function frame(now) {
      gaps.push(now - prior); prior = now
      if (now - started < ms) requestAnimationFrame(frame)
      else resolve({
        durationMs: Math.round(now - started), frames: gaps.length,
        averageGapMs: Number((gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)),
        maxGapMs: Number(Math.max(...gaps).toFixed(2)), droppedGapCount: gaps.filter(value => value > 34).length,
      })
    }
    requestAnimationFrame(frame)
  }), duration)
}

function collectBundles() {
  const assets = path.resolve(__dirname, '../../../frontend/dist/assets')
  if (!fs.existsSync(assets)) return []
  return fs.readdirSync(assets).filter(name => /\.(js|css)$/.test(name)).map(name => {
    const bytes = fs.readFileSync(path.join(assets, name))
    return { name, bytes: bytes.length, gzipBytes: zlib.gzipSync(bytes).length }
  }).sort((a, b) => b.bytes - a.bytes)
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  result.environment = { date: '2026-10-13', timezone: 'Asia/Shanghai', browser: browser.version(), baseUrl: BASE, build: 'Vite production preview' }
  result.bundles = collectBundles()

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await installMetrics(context)
  const page = await context.newPage()
  attachDiagnostics(page, 'normal')
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await attempt('首页基本结构与无横向溢出', async () => {
    const data = await page.evaluate(() => ({
      title: document.title, h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ''),
      sections: document.querySelectorAll('[data-story-section]').length,
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth, canvas: document.querySelectorAll('canvas').length,
    }))
    if (data.title !== 'CarbonAI · 时空智能碳管理平台' || data.sections !== 6 || data.width !== data.scrollWidth || data.canvas !== 0) throw new Error(JSON.stringify(data))
    return data
  })
  result.performance.homeCold = await pageMetrics(page)
  const perfBefore = await cdp.send('Performance.getMetrics')
  result.performance.homeRaf = await rafSample(page, 2000)
  const perfAfter = await cdp.send('Performance.getMetrics')
  const metricMap = values => Object.fromEntries(values.metrics.map(item => [item.name, item.value]))
  const before = metricMap(perfBefore); const after = metricMap(perfAfter)
  result.performance.homeRuntime = {
    taskDurationDeltaSeconds: Number(((after.TaskDuration || 0) - (before.TaskDuration || 0)).toFixed(4)),
    jsHeapUsedBytes: Math.round(after.JSHeapUsedSize || 0),
  }
  await page.getByRole('button', { name: '暂停背景动效' }).click()
  await attempt('首页动效暂停与恢复', async () => {
    const aurora = page.locator('.aurora')
    if (await aurora.getAttribute('data-running') !== 'false') throw new Error('暂停后 data-running 未变为 false')
    await page.getByRole('button', { name: '播放背景动效' }).click()
    await page.waitForTimeout(80)
    if (await aurora.getAttribute('data-running') !== 'true') throw new Error('恢复后 data-running 未变为 true')
  })
  await attempt('首页离屏暂停', async () => {
    await page.locator('#enter').scrollIntoViewIfNeeded(); await page.waitForTimeout(150)
    if (await page.locator('.aurora').getAttribute('data-running') !== 'false') throw new Error('离屏后仍在运行')
    await page.locator('#overview').scrollIntoViewIfNeeded(); await page.waitForTimeout(150)
    if (await page.locator('.aurora').getAttribute('data-running') !== 'true') throw new Error('回到首屏后未恢复')
  })
  await attempt('页面隐藏与重新显示分支', async () => {
    const values = await page.evaluate(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 30))
      const hidden = document.querySelector('.aurora')?.getAttribute('data-running')
      delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 30))
      const visible = document.querySelector('.aurora')?.getAttribute('data-running')
      return { hidden, visible }
    })
    if (values.hidden !== 'false' || values.visible !== 'true') throw new Error(JSON.stringify(values))
    return values
  })

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
    const storySections = page.locator('[data-story-section]')
    for (let index = 0; index < await storySections.count(); index++) {
      await storySections.nth(index).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(80)
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(80)
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    const measured = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      sections: document.querySelectorAll('[data-story-section]').length,
      hiddenSections: [...document.querySelectorAll('[data-story-section]')].filter(el => getComputedStyle(el).opacity === '0').length,
    }))
    result.viewports.push({ ...viewport, ...measured, metrics: await pageMetrics(page) })
    await page.screenshot({ path: path.join(evidenceDir, `m5-home-${viewport.width}.png`), fullPage: true })
    record(`首页 ${viewport.width}px 响应式与滚动叙事`, measured.width === measured.scrollWidth && measured.sections === 6 && measured.hiddenSections === 0, measured)
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800)
  await attempt('Dashboard 图表、KPI 与行情控制', async () => {
    const cards = await page.locator('.c-card-title').count(); const canvases = await page.locator('canvas').count()
    const kpis = await page.locator('.kpi-card').count()
    if (cards < 7 || canvases < 5 || kpis !== 4) throw new Error(JSON.stringify({ cards, canvases, kpis }))
    const button = page.locator('.ticker-control'); await button.click()
    const pressed = await button.getAttribute('aria-pressed')
    const playState = await page.locator('.ticker-track').evaluate(el => getComputedStyle(el).animationPlayState)
    if (pressed !== 'true' || playState !== 'paused') throw new Error(JSON.stringify({ pressed, playState }))
    return { cards, canvases, kpis, pressed, playState }
  })
  await page.screenshot({ path: path.join(evidenceDir, 'm5-dashboard-1280.png'), fullPage: true })
  result.performance.dashboard = await pageMetrics(page)
  const dashboardCanvasInitial = await page.locator('canvas').count()
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(250)
  await attempt('Dashboard 手机缩放与图表保留', async () => {
    const state = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, main: document.querySelector('main')?.getBoundingClientRect().width }))
    const canvas = await page.locator('canvas').count()
    if (state.scrollWidth !== state.viewport || canvas < 5) throw new Error(JSON.stringify({ state, canvas }))
    return { ...state, canvas }
  })

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE}/gis`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200)
  await attempt('GIS 地图缩放与热力图示例', async () => {
    const map = page.locator('.leaflet-container'); if (!await map.isVisible()) throw new Error('地图容器不可见')
    await page.locator('.leaflet-control-zoom-in').click(); await page.waitForTimeout(150)
    await page.getByText('碳源热力图', { exact: true }).click(); await page.waitForTimeout(150)
    await page.getByRole('button', { name: '加载示例点位' }).click(); await page.waitForTimeout(250)
    const heatCanvas = await map.locator('canvas').count()
    if (heatCanvas < 1) throw new Error(`热力图 canvas=${heatCanvas}`)
    return { heatCanvas }
  })
  await page.screenshot({ path: path.join(evidenceDir, 'm5-gis-1280.png'), fullPage: true })
  await attempt('Dashboard/GIS 路由往返与实例数量稳定', async () => {
    const counts = []
    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1000)
      counts.push(await page.locator('canvas').count())
      await page.goto(`${BASE}/gis`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500)
      if (await page.locator('.leaflet-container').count() !== 1) throw new Error('GIS 容器数量异常')
    }
    if (counts.some(value => value !== dashboardCanvasInitial)) throw new Error(JSON.stringify({ dashboardCanvasInitial, counts }))
    return { dashboardCanvasInitial, counts }
  })
  const heapAfterRoutes = metricMap(await cdp.send('Performance.getMetrics')).JSHeapUsedSize
  result.performance.routeCycle = { jsHeapUsedBytesAfterCycles: Math.round(heapAfterRoutes || 0), cycles: 2 }
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await installMetrics(reduced)
  const reducedPage = await reduced.newPage(); attachDiagnostics(reducedPage, 'reduced-motion')
  await reducedPage.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await reducedPage.waitForTimeout(500)
  await attempt('减少动画：首页静态状态', async () => {
    const data = await reducedPage.evaluate(() => ({
      running: document.querySelector('.aurora')?.getAttribute('data-running'),
      ribbon: getComputedStyle(document.querySelector('.ribbon-one')).animationName,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      hiddenStories: [...document.querySelectorAll('[data-story-section]')].filter(el => getComputedStyle(el).opacity === '0').length,
    }))
    if (data.running !== 'false' || data.ribbon !== 'none' || data.scrollBehavior !== 'auto' || data.hiddenStories !== 0) throw new Error(JSON.stringify(data))
    return data
  })
  await reducedPage.screenshot({ path: path.join(evidenceDir, 'm5-reduced-motion.png'), fullPage: true })
  await reducedPage.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await reducedPage.waitForTimeout(1300)
  await attempt('减少动画：Dashboard 行情静止', async () => {
    const button = reducedPage.locator('.ticker-control')
    const state = { disabled: await button.isDisabled(), text: await button.textContent(), animation: await reducedPage.locator('.ticker-track').evaluate(el => getComputedStyle(el).animationName) }
    if (!state.disabled || !state.text?.includes('已静止') || state.animation !== 'none') throw new Error(JSON.stringify(state))
    return state
  })
  await reduced.close()

  const noWebgl = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await noWebgl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (String(type).toLowerCase().startsWith('webgl')) return null
      return original.call(this, type, ...args)
    }
  })
  const noWebglPage = await noWebgl.newPage(); attachDiagnostics(noWebglPage, 'no-webgl')
  await noWebglPage.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await noWebglPage.waitForTimeout(400)
  await attempt('WebGL 不可用：首页仍可操作', async () => {
    if (!await noWebglPage.locator('h1').isVisible() || await noWebglPage.locator('canvas').count() !== 0) throw new Error('首页降级失败')
  })
  await noWebglPage.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await noWebglPage.waitForTimeout(1500)
  await attempt('WebGL 不可用：Dashboard 非 3D 内容仍可见', async () => {
    const state = { kpis: await noWebglPage.locator('.kpi-card').count(), canvases: await noWebglPage.locator('canvas').count(), main: await noWebglPage.locator('main').isVisible() }
    if (!state.main || state.kpis !== 4 || state.canvases < 4) throw new Error(JSON.stringify(state))
    return state
  })
  await noWebgl.close()

  result.performance.homeCached = result.viewports[0]?.metrics || {}
  result.summary = {
    passed: result.checks.filter(item => item.passed).length,
    failed: result.checks.filter(item => !item.passed).length,
    expectedBackendResponses: result.failedResponses.filter(item => item.url.includes('/api/health')),
    unexpectedFailedResponses: result.failedResponses.filter(item => !item.url.includes('/api/health')),
  }
  fs.writeFileSync(path.join(evidenceDir, 'm5-quality-check.json'), JSON.stringify(result, null, 2))
  await browser.close()
  console.log(JSON.stringify(result.summary))
  if (result.summary.failed) process.exitCode = 1
}

main().catch(error => {
  result.fatal = String(error && error.stack || error)
  fs.writeFileSync(path.join(evidenceDir, 'm5-quality-check.json'), JSON.stringify(result, null, 2))
  console.error(error)
  process.exit(1)
})

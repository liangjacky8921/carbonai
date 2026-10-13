const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH || 'playwright')

const base = 'https://www.carbontool.cn'
const output = { checkedAt: new Date().toISOString(), base, checks: [], errors: [], failedResponses: [] }
const check = (name, passed, details = {}) => output.checks.push({ name, passed, ...details })

async function attempt(name, fn) {
  try { check(name, true, await fn() || {}) }
  catch (error) { check(name, false, { error: String(error?.message || error) }) }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  output.browser = browser.version()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.on('pageerror', error => output.errors.push({ type: 'pageerror', text: error.message }))
  page.on('console', message => { if (message.type() === 'error') output.errors.push({ type: 'console', text: message.text() }) })
  page.on('requestfailed', request => output.errors.push({ type: 'requestfailed', url: request.url(), text: request.failure()?.errorText || '' }))
  page.on('response', response => { if (response.status() >= 400) output.failedResponses.push({ status: response.status(), url: response.url() }) })

  await page.goto(`${base}/?release=20261013-132106`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await attempt('生产首页与新空间光场', async () => {
    const before = await page.locator('.aurora').evaluate(element => ({ x: getComputedStyle(element).getPropertyValue('--pointer-x').trim(), grids: element.querySelectorAll('.aurora-grid').length }))
    await page.mouse.move(1040, 330); await page.waitForTimeout(80)
    const after = await page.locator('.aurora').evaluate(element => ({ x: getComputedStyle(element).getPropertyValue('--pointer-x').trim(), running: element.getAttribute('data-running') }))
    const state = { h1: await page.locator('h1').innerText(), sections: await page.locator('[data-story-section]').count(), width: await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]), before, after }
    if (state.sections !== 6 || state.width[0] !== state.width[1] || before.grids !== 1 || before.x === after.x || after.running !== 'true') throw new Error(JSON.stringify(state))
    return state
  })
  await attempt('生产首页动效控制', async () => {
    await page.getByRole('button', { name: '暂停背景动效' }).click()
    const running = await page.locator('.aurora').getAttribute('data-running')
    if (running !== 'false') throw new Error(`data-running=${running}`)
    return { running }
  })
  await page.screenshot({ path: path.join(__dirname, 'm6-production-home-1440.png'), fullPage: false })

  await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900)
  await attempt('生产 Dashboard 与 ECS API', async () => {
    const health = await page.evaluate(async () => {
      const response = await fetch('/api/health')
      return { status: response.status, body: await response.json() }
    })
    const state = { healthStatus: health.status, service: health.body.service, kpis: await page.locator('.kpi-card').count(), canvases: await page.locator('canvas').count() }
    if (state.healthStatus !== 200 || state.service !== 'carbonai-api' || state.kpis !== 4 || state.canvases < 5) throw new Error(JSON.stringify(state))
    return state
  })
  await page.waitForTimeout(500)

  await page.goto(`${base}/gis`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800)
  await attempt('生产 GIS 路由', async () => {
    const state = { map: await page.locator('.leaflet-container').isVisible(), zoom: await page.locator('.leaflet-control-zoom-in').isVisible(), tiles: await page.locator('.leaflet-tile-loaded').count() }
    if (!state.map || !state.zoom) throw new Error(JSON.stringify(state))
    return state
  })
  await page.screenshot({ path: path.join(__dirname, 'm6-production-gis-1440.png'), fullPage: false })
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  await reducedPage.goto(`${base}/`, { waitUntil: 'networkidle' })
  await attempt('生产减少动画降级', async () => {
    const state = await reducedPage.evaluate(() => ({
      running: document.querySelector('.aurora')?.getAttribute('data-running'),
      ribbon: getComputedStyle(document.querySelector('.ribbon-one')).animationName,
      grid: getComputedStyle(document.querySelector('.aurora-grid')).animationName,
    }))
    if (state.running !== 'false' || state.ribbon !== 'none' || state.grid !== 'none') throw new Error(JSON.stringify(state))
    return state
  })
  await reduced.close()
  await browser.close()

  output.summary = { passed: output.checks.filter(item => item.passed).length, failed: output.checks.filter(item => !item.passed).length, errors: output.errors.length, failedResponses: output.failedResponses.length }
  fs.writeFileSync(path.join(__dirname, 'm6-production-smoke.json'), JSON.stringify(output, null, 2))
  console.log(JSON.stringify(output.summary))
  if (output.summary.failed || output.summary.failedResponses) process.exitCode = 1
}

main().catch(error => { console.error(error); process.exit(1) })

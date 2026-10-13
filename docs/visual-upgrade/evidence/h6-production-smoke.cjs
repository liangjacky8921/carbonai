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

function observe(page) {
  page.on('pageerror', error => output.errors.push({ type: 'pageerror', text: error.message }))
  page.on('console', message => {
    if (message.type() === 'error') output.errors.push({ type: 'console', text: message.text() })
  })
  page.on('requestfailed', request => {
    output.errors.push({ type: 'requestfailed', url: request.url(), text: request.failure()?.errorText || '' })
  })
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(base)) {
      output.failedResponses.push({ status: response.status(), url: response.url() })
    }
  })
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  output.browser = browser.version()

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await desktop.newPage()
  observe(page)
  await page.goto(`${base}/?release=h5-20261013-01`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  await attempt('生产首页与 3D 地球', async () => {
    const state = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ''),
      sections: document.querySelectorAll('[data-story-section]').length,
      width: [window.innerWidth, document.documentElement.scrollWidth],
      canvas: document.querySelectorAll('.globe-canvas').length,
      globeClass: document.querySelector('.globe-visual')?.className,
      loginHref: document.querySelector('.header-login')?.getAttribute('href'),
    }))
    if (state.sections !== 7 || state.width[1] > state.width[0] || state.canvas !== 1 || !state.globeClass?.includes('is-ready') || state.loginHref !== '/auth/login') {
      throw new Error(JSON.stringify(state))
    }
    return state
  })

  await attempt('生产首页动效控制', async () => {
    const button = page.locator('.hero-foot button')
    await button.click()
    const state = { pressed: await button.getAttribute('aria-pressed'), label: await button.innerText() }
    if (state.pressed !== 'true' || state.label.trim() !== '播放背景动效') throw new Error(JSON.stringify(state))
    return state
  })
  await page.screenshot({ path: path.join(__dirname, 'h6-production-home-1440.png'), fullPage: false })

  await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await attempt('生产工作台与 ECS API', async () => {
    const health = await page.evaluate(async () => {
      const response = await fetch('/api/health')
      return { status: response.status, body: await response.json() }
    })
    const state = {
      healthStatus: health.status,
      service: health.body.service,
      kpis: await page.locator('.kpi-card').count(),
      canvases: await page.locator('canvas').count(),
    }
    if (state.healthStatus !== 200 || state.service !== 'carbonai-api' || state.kpis !== 4 || state.canvases < 5) throw new Error(JSON.stringify(state))
    return state
  })

  await page.goto(`${base}/gis`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  await attempt('生产 GIS 路由', async () => {
    const state = {
      map: await page.locator('.leaflet-container').isVisible(),
      zoom: await page.locator('.leaflet-control-zoom-in').isVisible(),
      tiles: await page.locator('.leaflet-tile-loaded').count(),
    }
    if (!state.map || !state.zoom) throw new Error(JSON.stringify(state))
    return state
  })
  await page.screenshot({ path: path.join(__dirname, 'h6-production-gis-1440.png'), fullPage: false })

  await page.goto(`${base}/auth/login`, { waitUntil: 'networkidle' })
  await attempt('生产登录入口', async () => {
    const state = {
      title: await page.title(),
      inputs: await page.locator('input').count(),
      submit: await page.getByRole('button').count(),
    }
    if (state.inputs < 2 || state.submit < 1) throw new Error(JSON.stringify(state))
    return state
  })
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobilePage = await mobile.newPage()
  observe(mobilePage)
  await mobilePage.goto(`${base}/?release=h5-mobile`, { waitUntil: 'networkidle' })
  await attempt('生产手机端静态降级', async () => {
    const state = await mobilePage.evaluate(() => ({
      width: [window.innerWidth, document.documentElement.scrollWidth],
      canvas: document.querySelectorAll('.globe-canvas').length,
      globeClass: document.querySelector('.globe-visual')?.className,
      menuDisplay: getComputedStyle(document.querySelector('.mobile-nav')).display,
    }))
    if (state.width[1] > state.width[0] || state.canvas !== 0 || !state.globeClass?.includes('is-static') || state.menuDisplay === 'none') throw new Error(JSON.stringify(state))
    return state
  })
  await mobilePage.screenshot({ path: path.join(__dirname, 'h6-production-home-390.png'), fullPage: false })
  await mobile.close()

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  observe(reducedPage)
  await reducedPage.goto(`${base}/?release=h5-reduced`, { waitUntil: 'networkidle' })
  await attempt('生产减少动画降级', async () => {
    const state = await reducedPage.evaluate(() => ({
      canvas: document.querySelectorAll('.globe-canvas').length,
      globeClass: document.querySelector('.globe-visual')?.className,
      ribbon: getComputedStyle(document.querySelector('.ribbon-one')).animationName,
      grid: getComputedStyle(document.querySelector('.aurora-grid')).animationName,
    }))
    if (state.canvas !== 0 || !state.globeClass?.includes('is-static') || state.ribbon !== 'none' || state.grid !== 'none') throw new Error(JSON.stringify(state))
    return state
  })
  await reduced.close()
  await browser.close()

  output.summary = {
    passed: output.checks.filter(item => item.passed).length,
    failed: output.checks.filter(item => !item.passed).length,
    errors: output.errors.length,
    failedResponses: output.failedResponses.length,
  }
  fs.writeFileSync(path.join(__dirname, 'h6-production-smoke.json'), JSON.stringify(output, null, 2))
  console.log(JSON.stringify(output.summary))
  if (output.summary.failed || output.summary.errors || output.summary.failedResponses) process.exitCode = 1
}

main().catch(error => { console.error(error); process.exit(1) })

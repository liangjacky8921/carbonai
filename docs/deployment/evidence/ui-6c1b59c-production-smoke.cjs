const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH)

const base = 'https://www.carbontool.cn'
const out = __dirname
const cases = [
  { name: 'pc-1440-home', viewport: { width: 1440, height: 900 }, route: '/' },
  { name: 'pc-1280-home', viewport: { width: 1280, height: 800 }, route: '/' },
  { name: 'pc-1440-dashboard', viewport: { width: 1440, height: 900 }, route: '/dashboard' },
  { name: 'pc-1440-gis', viewport: { width: 1440, height: 900 }, route: '/gis' },
  { name: 'pc-1440-login', viewport: { width: 1440, height: 900 }, route: '/auth/login' },
  { name: 'mobile-sim-390-home', viewport: { width: 390, height: 844 }, mobile: true, route: '/' },
  { name: 'mobile-sim-390-dashboard', viewport: { width: 390, height: 844 }, mobile: true, route: '/dashboard' },
]

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []
  try {
    for (const item of cases) {
      const context = await browser.newContext({ viewport: item.viewport, isMobile: Boolean(item.mobile), hasTouch: Boolean(item.mobile), deviceScaleFactor: 1 })
      const page = await context.newPage()
      const errors = { console: [], page: [], assets: [], api: [] }
      page.on('console', msg => { if (msg.type() === 'error') errors.console.push(msg.text()) })
      page.on('pageerror', err => errors.page.push(err.message))
      page.on('requestfailed', req => {
        if (/\.(?:js|css)(?:\?|$)/.test(req.url())) errors.assets.push(`${req.url()}: ${req.failure()?.errorText}`)
        if (req.url().includes('/api/')) errors.api.push(`${req.url()}: ${req.failure()?.errorText}`)
      })
      page.on('response', res => {
        if (res.status() >= 400 && /\.(?:js|css)(?:\?|$)/.test(res.url())) errors.assets.push(`${res.status()} ${res.url()}`)
        if (res.status() >= 500 && res.url().includes('/api/')) errors.api.push(`${res.status()} ${res.url()}`)
      })
      let navigationError = null
      try {
        await page.goto(base + item.route, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.locator('#app').waitFor({ state: 'visible', timeout: 45000 })
        await page.locator(item.route === '/' ? 'main h1' : item.route === '/auth/login' ? 'input' : 'main').first().waitFor({ state: 'visible', timeout: 45000 })
        if (item.route === '/dashboard') await page.waitForFunction(() => document.querySelectorAll('main canvas').length >= 4, null, { timeout: 45000 })
        else await page.waitForTimeout(item.route === '/' ? 1800 : 800)
      } catch (err) { navigationError = err.message }
      const state = await page.evaluate(() => {
        const root = document.querySelector('#app')
        const title = document.querySelector('main h1') || document.querySelector('h1')
        const titleStyle = title && getComputedStyle(title)
        const titleRect = title && title.getBoundingClientRect()
        return {
          pathname: location.pathname,
          mounted: Boolean(root?.__vue_app__),
          rootTextLength: root?.innerText?.length || 0,
          title: title?.textContent?.trim() || null,
          titleVisible: Boolean(titleRect && titleRect.width && titleRect.height && titleStyle.visibility !== 'hidden' && Number(titleStyle.opacity) > 0),
          sections: [...document.querySelectorAll('main section[id]')].map(el => el.id),
          globeCanvas: document.querySelectorAll('.globe-canvas canvas, canvas.globe-canvas').length,
          globeFallback: document.querySelectorAll('.globe-fallback').length,
          chartCanvas: document.querySelectorAll('canvas').length,
          leaflet: Boolean(document.querySelector('.leaflet-container')),
          exampleLabel: Boolean(document.body.innerText.includes('示例数据')),
          loginInputs: document.querySelectorAll('input').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
      const screenshot = ['pc-1440-home', 'pc-1440-dashboard', 'mobile-sim-390-dashboard'].includes(item.name)
        ? `ui-6c1b59c-${item.name}.png` : null
      if (screenshot) await page.screenshot({ path: path.join(out, screenshot) })
      results.push({ name: item.name, navigationError, state, errors: Object.fromEntries(Object.entries(errors).map(([key, list]) => [key, list.slice(0, 10)])), screenshot })
      await context.close()
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(out, 'ui-6c1b59c-production-results.json'), JSON.stringify({ commit: '6c1b59c', generatedAt: new Date().toISOString(), results }, null, 2))
  console.log(JSON.stringify(results.map(({ name, navigationError, state, errors }) => ({ name, navigationError, state, errors })), null, 2))
}

run().catch(err => { console.error(err); process.exitCode = 1 })

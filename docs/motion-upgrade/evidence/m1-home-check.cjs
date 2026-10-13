const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH || 'playwright')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const homeErrors = []
  const apiRequests = []
  page.on('pageerror', error => homeErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') homeErrors.push(message.text()) })
  page.on('request', request => { if (request.url().includes('/api/')) apiRequests.push(request.url()) })

  const results = {
    environment: { date: '2026-10-13', timezone: 'Asia/Shanghai', browser: browser.version(), server: 'Vite production preview on loopback' },
    viewports: [],
    checks: {},
    homeErrors,
    apiRequests,
    limitations: ['Local single-browser regression only.', 'Business backend intentionally not started.', 'Full GIS and chart interaction regression remains in M5.'],
  }

  for (const width of [1440, 1280, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 })
    await page.goto('http://127.0.0.1:4173/')
    await page.waitForTimeout(600)
    const measured = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.replace(/\s+/g, ''),
      conceptTextPresent: document.body.textContent?.includes('视觉概念验证') ?? false,
    }))
    assert.equal(measured.width, measured.scrollWidth)
    assert.equal(measured.title, 'CarbonAI · 时空智能碳管理平台')
    assert.equal(measured.conceptTextPresent, false)
    results.viewports.push(measured)
    await page.screenshot({ path: path.join(__dirname, `m1-home-${width}.png`), fullPage: true })
  }

  assert.equal(apiRequests.length, 0, 'Public homepage should not probe the business API')
  results.checks.homeHasNoApiProbe = true

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:4173/')
  const aurora = page.locator('.aurora')
  await page.getByRole('button', { name: '暂停背景动效' }).click()
  assert.equal(await aurora.getAttribute('data-running'), 'false')
  results.checks.pauseControl = true

  await page.getByRole('button', { name: '播放背景动效' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(50)
  assert.equal(await aurora.getAttribute('data-running'), 'false')
  assert.equal(await page.locator('.ribbon-one').evaluate(element => getComputedStyle(element).animationName), 'none')
  results.checks.reducedMotion = true
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  await page.goto('http://127.0.0.1:4173/')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '跳转到主要内容')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'landing-main')
  results.checks.skipLink = true

  const errorsBeforeBusiness = homeErrors.length
  await page.getByRole('link', { name: '进入碳管理平台' }).first().click()
  await page.waitForURL('http://127.0.0.1:4173/dashboard')
  await page.waitForTimeout(500)
  assert.ok(await page.locator('main').isVisible())
  assert.ok(apiRequests.some(url => url.endsWith('/api/health')))
  results.checks.dashboardRoute = true
  results.businessPreviewErrors = homeErrors.splice(errorsBeforeBusiness)

  await page.goto('http://127.0.0.1:4173/gis')
  await page.waitForTimeout(500)
  assert.equal(page.url(), 'http://127.0.0.1:4173/gis')
  assert.ok(await page.locator('main').isVisible())
  results.checks.gisDirectRoute = true

  const errorsBeforeReturn = homeErrors.length
  await page.goto('http://127.0.0.1:4173/')
  await page.waitForTimeout(100)
  assert.ok(await page.getByRole('heading', { level: 1 }).isVisible())
  results.checks.returnHome = true
  assert.equal(homeErrors.length, errorsBeforeReturn)
  results.businessPreviewErrors.push(...homeErrors.splice(0))

  fs.writeFileSync(path.join(__dirname, 'm1-home-check.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results))
}

main().catch(error => { console.error(error); process.exit(1) })

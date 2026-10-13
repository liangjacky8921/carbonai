const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.CARBON_PLAYWRIGHT_PATH || 'playwright')

const base = process.env.CARBON_BASE || 'http://127.0.0.1:4176'

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1530, height: 741 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1600)

  const before = await page.evaluate(() => {
    const rect = selector => {
      const box = document.querySelector(selector)?.getBoundingClientRect()
      return box ? { left: box.left, right: box.right, width: box.width, height: box.height } : null
    }
    return {
      viewport: window.innerWidth,
      rail: rect('.story-progress'),
      pause: rect('.hero-foot button'),
      labels: [...document.querySelectorAll('.story-progress strong')].map(element => getComputedStyle(element).opacity),
      links: [...document.querySelectorAll('.story-progress a')].map(element => ({
        width: element.getBoundingClientRect().width,
        label: element.getAttribute('aria-label'),
      })),
    }
  })

  await page.locator('.story-progress a').nth(1).hover()
  await page.waitForTimeout(220)
  const hover = await page.locator('.story-progress a').nth(1).locator('strong').evaluate(element => ({
    opacity: getComputedStyle(element).opacity,
    visibility: getComputedStyle(element).visibility,
    text: element.textContent?.trim(),
  }))
  await page.screenshot({ path: path.join(__dirname, 'h7-navigation-rail-1530.png'), fullPage: false })

  await page.setViewportSize({ width: 1180, height: 800 })
  const narrowDisplay = await page.locator('.story-progress').evaluate(element => getComputedStyle(element).display)

  const passed = Boolean(
    before.rail && before.pause &&
    before.rail.right === before.viewport &&
    before.rail.width <= 46 &&
    before.pause.right < before.rail.left &&
    before.labels.every(value => value === '0') &&
    before.links.every(item => item.width <= 46 && item.label) &&
    hover.opacity === '1' && hover.visibility === 'visible' &&
    narrowDisplay === 'none' && errors.length === 0
  )
  const output = { checkedAt: new Date().toISOString(), base, passed, before, hover, narrowDisplay, errors }
  fs.writeFileSync(path.join(__dirname, 'h7-navigation-rail.json'), JSON.stringify(output, null, 2))
  console.log(JSON.stringify({ passed, errors: errors.length }))
  await browser.close()
  if (!passed) process.exitCode = 1
}

main().catch(error => { console.error(error); process.exit(1) })

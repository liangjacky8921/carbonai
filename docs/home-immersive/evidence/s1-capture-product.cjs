const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const baseUrl = process.env.CARBONAI_PREVIEW_URL || 'http://127.0.0.1:4173'
const assetDir = path.resolve(__dirname, '../../../frontend/src/assets/landing')

async function main() {
  fs.mkdirSync(assetDir, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const report = { baseUrl, capturedAt: new Date().toISOString(), captures: {} }

  for (const route of ['dashboard', 'gis']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(900)
    await page.screenshot({ path: path.join(assetDir, `${route}-preview.png`), fullPage: false })
    report.captures[route] = {
      title: await page.title(),
      url: page.url(),
      consoleErrors,
      capturedViewport: '1440x900',
    }
    await page.close()
  }

  fs.writeFileSync(path.join(__dirname, 's1-product-capture.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

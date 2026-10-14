const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const baseUrl = process.env.CARBONAI_PREVIEW_URL || 'http://127.0.0.1:4173/'
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'tablet-768', width: 768, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]
const expectedSections = ['overview', 'capabilities', 'provenance', 'spatial', 'product', 'enter']
const captureSections = ['capabilities', 'provenance', 'spatial', 'product', 'enter']

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const report = { baseUrl, capturedAt: new Date().toISOString(), viewports: {} }

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport })
    const consoleErrors = []
    const failedRequests = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }))
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.addStyleTag({ content: '.skip-link { display: none !important; }' })

    const collectResult = () => page.evaluate((ids) => {
      const actualSections = [...document.querySelectorAll('[data-story-section]')].map((section) => section.id)
      const imageState = [...document.querySelectorAll('#spatial img, #product img')].map((image) => ({
        alt: image.alt,
        loading: image.loading,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }))
      return {
        actualSections,
        expectedOrder: ids.every((id, index) => actualSections[index] === id),
        progressLinks: document.querySelectorAll('.story-progress a').length,
        legacyAnchors: {
          applications: Boolean(document.getElementById('applications')),
          roles: Boolean(document.getElementById('roles')),
        },
        imageState,
        canvasCount: document.querySelectorAll('canvas').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        pageHeight: document.documentElement.scrollHeight,
      }
    }, expectedSections)

    if (viewport.name === 'desktop-1440' || viewport.name === 'mobile-390') {
      for (const id of captureSections) {
        const section = page.locator(`#${id}`)
        await section.scrollIntoViewIfNeeded()
        await page.waitForTimeout(260)
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        })
        await section.screenshot({
          path: path.join(__dirname, `s1-${viewport.name}-${id}.png`),
          animations: 'disabled',
        })
      }
    }

    for (const selector of ['#spatial img', '#product img']) {
      const image = page.locator(selector)
      await image.scrollIntoViewIfNeeded()
      await image.evaluate((element) => element.complete || new Promise((resolve) => {
        element.addEventListener('load', resolve, { once: true })
        element.addEventListener('error', resolve, { once: true })
      }))
    }
    const result = await collectResult()

    report.viewports[viewport.name] = { ...result, consoleErrors, failedRequests }
    await page.close()
  }

  fs.writeFileSync(path.join(__dirname, 's1-validation.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const baseUrl = process.env.CARBONAI_PREVIEW_URL || 'http://127.0.0.1:4173/'
const outputDir = __dirname
const sections = ['overview', 'capabilities', 'spatial', 'applications', 'provenance', 'roles', 'enter']
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]

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
    const pauseButton = page.getByRole('button', { name: '暂停背景动效' })
    if (await pauseButton.count()) await pauseButton.click()

    const viewportReport = { consoleErrors, failedRequests, sections: {} }
    for (const id of sections) {
      const section = page.locator(`#${id}`)
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(350)
      viewportReport.sections[id] = await section.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const heading = element.querySelector('h1, h2')
        return {
          heading: heading?.textContent?.replace(/\s+/g, ' ').trim() || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          directChildren: element.children.length,
          links: element.querySelectorAll('a').length,
          canvases: element.querySelectorAll('canvas').length,
          svgs: element.querySelectorAll('svg').length,
        }
      })
      await section.screenshot({
        path: path.join(outputDir, `s0-${viewport.name}-${id}.png`),
        animations: 'disabled',
      })
    }
    viewportReport.page = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      canvasCount: document.querySelectorAll('canvas').length,
      sectionCount: document.querySelectorAll('[data-story-section]').length,
      reducedMotionSupport: matchMedia('(prefers-reduced-motion: reduce)').media,
    }))
    report.viewports[viewport.name] = viewportReport
    await page.close()
  }

  fs.writeFileSync(path.join(outputDir, 's0-page-inventory.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

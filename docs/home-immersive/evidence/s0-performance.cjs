const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const baseUrl = process.env.CARBONAI_PREVIEW_URL || 'http://127.0.0.1:4173/'

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.addInitScript(() => {
    window.__carbonaiVitals = { lcp: null, cls: 0, longTasks: [] }
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      window.__carbonaiVitals.lcp = entries.at(-1)?.startTime ?? null
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__carbonaiVitals.cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__carbonaiVitals.longTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: true })
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1600)
  const report = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const byType = {}
    for (const resource of resources) {
      const type = resource.initiatorType || 'other'
      byType[type] ??= { count: 0, transferSize: 0, encodedBodySize: 0 }
      byType[type].count += 1
      byType[type].transferSize += resource.transferSize || 0
      byType[type].encodedBodySize += resource.encodedBodySize || 0
    }
    return {
      environment: 'Local Vite preview, system Chrome, 1440×900, single cold browser context',
      navigation: {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd,
        responseEnd: navigation.responseEnd,
      },
      resources: {
        count: resources.length,
        transferSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        encodedBodySize: resources.reduce((sum, resource) => sum + (resource.encodedBodySize || 0), 0),
        byType,
      },
      vitals: window.__carbonaiVitals,
    }
  })
  fs.writeFileSync(path.join(__dirname, 's0-performance.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

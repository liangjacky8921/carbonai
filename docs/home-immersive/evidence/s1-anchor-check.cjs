const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  })
  const results = {}
  for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    if (name === 'desktop') {
      await page.locator('.navigation a[href="#provenance"]').click()
    } else {
      await page.locator('.mobile-nav summary').click()
      await page.locator('.mobile-nav a[href="#product"]').click()
    }
    await page.waitForTimeout(120)
    results[name] = await page.evaluate(() => ({
      hash: location.hash,
      activeId: document.activeElement?.id,
      mobileMenuOpen: document.querySelector('.mobile-nav')?.hasAttribute('open'),
    }))
    await page.close()
  }
  fs.writeFileSync(path.join(__dirname, 's1-anchor-check.json'), JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

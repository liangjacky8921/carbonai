async page => {
  const results = {}

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('http://127.0.0.1:4173/pcf')
  await page.getByRole('button', { name: '加载演示数据' }).click()
  await page.waitForTimeout(500)
  results.pcf = {
    canvases: await page.locator('canvas').count(),
    resultVisible: await page.getByText('碳足迹核算结果').isVisible(),
    pdfEnabled: await page.getByRole('button', { name: '双语 PDF 报告' }).isEnabled(),
  }

  await page.goto('http://127.0.0.1:4173/report')
  await page.getByRole('button', { name: '一键生成报告' }).click()
  await page.waitForTimeout(150)
  results.report = {
    templateButtons: await page.locator('button.rpt-card').count(),
    historyRows: await page.locator('.dark-table tbody tr').count(),
    previewScrollable: await page.locator('.report-preview').evaluate((el) => el.scrollHeight >= el.clientHeight),
  }

  await page.goto('http://127.0.0.1:4173/tools')
  await page.getByLabel('用电量').fill('1000')
  await page.getByRole('button', { name: '计算' }).first().click()
  results.tools = {
    resultVisible: await page.getByText('碳排放量：').first().isVisible(),
  }

  await page.goto('http://127.0.0.1:4173/auth/login')
  results.login = await page.evaluate(() => ({
    usernameAutocomplete: document.querySelector('input[name="username"]')?.getAttribute('autocomplete'),
    passwordAutocomplete: document.querySelector('input[name="password"]')?.getAttribute('autocomplete'),
  }))

  return results
}

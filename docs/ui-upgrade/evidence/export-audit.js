async page => {
const evidenceDir = '../docs/ui-upgrade/evidence'

await page.goto('http://127.0.0.1:4173/pcf')
await page.getByRole('button', { name: '加载演示数据' }).click()
await page.getByText('碳足迹核算结果').waitFor()

const pdfPromise = page.waitForEvent('download')
await page.getByRole('button', { name: '双语 PDF 报告' }).click()
const pdf = await pdfPromise
await pdf.saveAs(`${evidenceDir}/pcf-test-export.pdf`)

const wordPromise = page.waitForEvent('download')
await page.getByRole('button', { name: '双语 Word 报告' }).click()
const word = await wordPromise
await word.saveAs(`${evidenceDir}/pcf-test-export.docx`)

return {
  pdf: pdf.suggestedFilename(),
  word: word.suggestedFilename(),
  resultVisible: await page.getByText('碳足迹核算结果').isVisible(),
}
}

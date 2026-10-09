import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const browserPath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const baseURL = process.env.APP_URL || 'http://127.0.0.1:5173'
const outputDir = path.resolve('..', '.artifacts')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox'] })
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await desktop.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'Tổng quan nghiên cứu' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'dashboard-desktop.png'), fullPage: true })

  await page.getByRole('link', { name: 'Dự đoán ảnh' }).click()
  await page.getByRole('heading', { name: 'Phân tích ảnh OCT' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'prediction-desktop.png'), fullPage: true })

  const pngData = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const context = canvas.getContext('2d')
    context.fillStyle = '#172539'; context.fillRect(0, 0, 512, 512)
    context.strokeStyle = '#d9e3ec'; context.lineWidth = 3
    for (let i = 0; i < 12; i++) {
      context.beginPath()
      context.moveTo(0, 130 + i * 17)
      context.bezierCurveTo(150, 120 + i * 17, 340, 150 + i * 17, 512, 130 + i * 17)
      context.stroke()
    }
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({ name: 'oct-visual-check.png', mimeType: 'image/png', buffer: Buffer.from(pngData, 'base64') })
  await page.getByText('oct-visual-check.png').waitFor()
  await page.getByRole('button', { name: 'Xem kết quả demo' }).click()
  await page.getByText('Đây là kết quả mô phỏng.').waitFor()
  await page.screenshot({ path: path.join(outputDir, 'prediction-result-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Xem chi tiết' }).click()
  await page.getByRole('heading', { name: 'Chi tiết phân tích' }).waitFor()
  await page.getByRole('button', { name: 'Xóa kết quả demo' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa kết quả' }).click()
  await page.getByRole('heading', { name: 'Lịch sử phân tích' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'history-desktop.png'), fullPage: true })
  await page.getByPlaceholder('Tìm theo tên, mã hoặc lớp...').fill('khong-co-ket-qua')
  await page.getByRole('heading', { name: 'Không tìm thấy kết quả phù hợp' }).waitFor()
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
  await page.getByRole('link', { name: 'Thông tin mô hình' }).click()
  await page.getByRole('heading', { name: 'Thông tin mô hình' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'model-desktop.png'), fullPage: true })
  assert.equal(pageErrors.length, 0, `Browser errors: ${pageErrors.join('; ')}`)

  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 })
  const tabletPage = await tablet.newPage()
  await tabletPage.goto(baseURL)
  await tabletPage.getByRole('heading', { name: 'Tổng quan nghiên cứu' }).waitFor()
  await tabletPage.screenshot({ path: path.join(outputDir, 'dashboard-tablet.png'), fullPage: true })
  const tabletOverflow = await tabletPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  assert.equal(tabletOverflow, false, 'Tablet page has horizontal overflow')

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const mobilePage = await mobile.newPage()
  await mobilePage.goto(baseURL)
  await mobilePage.getByRole('heading', { name: 'Tổng quan nghiên cứu' }).waitFor()
  await mobilePage.screenshot({ path: path.join(outputDir, 'dashboard-mobile.png'), fullPage: true })
  await mobilePage.getByRole('button', { name: 'Mở menu' }).click()
  await mobilePage.getByRole('link', { name: 'Dự đoán ảnh' }).click()
  await mobilePage.getByRole('heading', { name: 'Phân tích ảnh OCT' }).waitFor()
  await mobilePage.waitForTimeout(300)
  await mobilePage.screenshot({ path: path.join(outputDir, 'prediction-mobile.png'), fullPage: true })
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  assert.equal(overflow, false, 'Mobile page has horizontal overflow')
  console.log('UI checks passed. Screenshots saved to .artifacts/.')
} finally {
  await browser.close()
}

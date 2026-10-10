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
  await page.getByRole('tab', { name: 'Heatmap' }).click()
  await page.getByText('Heatmap chưa khả dụng').waitFor()
  await page.getByRole('tab', { name: 'Ảnh gốc' }).click()
  await page.getByRole('button', { name: /^Phù hợp/ }).click()
  await page.getByRole('button', { name: 'Lưu phản hồi demo' }).click()
  await page.getByText('Đã lưu phản hồi tham khảo').waitFor()
  await page.getByRole('heading', { name: 'Kết quả và lớp đề xuất' }).waitFor()
  const resultDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải kết quả demo' }).click()
  assert.match((await resultDownload).suggestedFilename(), /-demo\.json$/)
  await page.screenshot({ path: path.join(outputDir, 'detail-desktop.png'), fullPage: true })
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

  await page.goto(`${baseURL}/signin`)
  await page.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'signin-desktop.png'), fullPage: true })
  await page.locator('form').getByRole('textbox', { name: 'Email' }).fill('demo@example.org')
  await page.locator('form input[name="password"]').fill('temporary-pass')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click()
  await page.getByRole('status').getByText(/Phiên đăng nhập chưa được tạo/).waitFor()

  await page.getByRole('link', { name: 'Đăng ký ngay' }).click()
  await page.getByRole('heading', { name: 'Tạo tài khoản' }).waitFor()
  assert.equal(await page.getByRole('status').count(), 0, 'Sign in message leaked into sign up form')
  await page.screenshot({ path: path.join(outputDir, 'signup-desktop.png'), fullPage: true })
  await page.locator('form').getByLabel('Họ và tên').fill('Nguyễn An')
  await page.locator('form').getByLabel('Email').fill('demo@example.org')
  await page.locator('form input[name="password"]').fill('temporary-pass')
  await page.locator('form').getByLabel('Xác nhận mật khẩu').fill('different-pass')
  await page.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.getByRole('alert').getByText(/chưa khớp/).waitFor()
  await page.locator('form').getByLabel('Xác nhận mật khẩu').fill('temporary-pass')
  await page.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.getByRole('status').getByText(/Tài khoản chưa được tạo/).waitFor()
  assert.equal(await page.locator('form input[name="password"]').inputValue(), '')

  await page.goto(`${baseURL}/settings`)
  await page.getByRole('heading', { name: 'Cài đặt ứng dụng' }).waitFor()
  await page.getByLabel('Kết quả mỗi trang').selectOption('16')
  await page.screenshot({ path: path.join(outputDir, 'settings-desktop.png'), fullPage: true })
  await page.reload()
  assert.equal(await page.getByLabel('Kết quả mỗi trang').inputValue(), '16')

  await page.goto(`${baseURL}/batch`)
  await page.getByRole('heading', { name: 'Phân tích nhiều ảnh' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'batch-desktop.png'), fullPage: true })
  await page.locator('input[type=file]').setInputFiles([
    { name: 'oct-batch-a.png', mimeType: 'image/png', buffer: Buffer.from(pngData, 'base64') },
    { name: 'oct-batch-b.png', mimeType: 'image/png', buffer: Buffer.from(pngData, 'base64') },
  ])
  await page.getByText('2 ảnh đã chọn').waitFor()
  await page.getByRole('button', { name: /Xem kết quả batch demo/ }).click()
  await page.getByRole('heading', { name: '2 ảnh đã hoàn thành' }).waitFor()
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải CSV demo' }).click()
  assert.equal((await csvDownload).suggestedFilename(), 'oct-vision-demo-batch.csv')
  await page.screenshot({ path: path.join(outputDir, 'batch-result-desktop.png'), fullPage: true })

  await page.goto(`${baseURL}/analytics`)
  await page.getByRole('heading', { name: 'Phân tích dữ liệu' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'analytics-desktop.png'), fullPage: true })
  assert.equal(await page.locator('.app-footer').count(), 0, 'Removed footer is still present')
  await page.goto(`${baseURL}/history`)
  await page.getByLabel('Lọc theo điểm demo').selectOption('high')
  await page.getByLabel('Sắp xếp').selectOption('lowest')
  assert.match(page.url(), /score=high/)
  assert.match(page.url(), /sort=lowest/)
  await page.goto(`${baseURL}/settings`)
  await page.getByRole('button', { name: 'Xóa dữ liệu demo' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa dữ liệu' }).click()
  await page.getByRole('status').getByText(/Đã xóa toàn bộ dữ liệu demo/).waitFor()
  await page.goto(`${baseURL}/history`)
  await page.getByRole('heading', { name: 'Chưa có kết quả nào' }).waitFor()
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
  for (const route of ['signin', 'signup', 'settings', 'batch', 'analytics', 'history', 'model']) {
    await mobilePage.goto(`${baseURL}/${route}`)
    await mobilePage.screenshot({ path: path.join(outputDir, `${route}-mobile.png`), fullPage: true })
    const routeOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    assert.equal(routeOverflow, false, `${route} page has horizontal overflow on mobile`)
  }
  await mobilePage.goto(`${baseURL}/history/sample-1`)
  await mobilePage.getByRole('heading', { name: 'Chi tiết phân tích' }).waitFor()
  await mobilePage.screenshot({ path: path.join(outputDir, 'detail-mobile.png'), fullPage: true })
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Detail page has horizontal overflow on mobile')

  const narrow = await browser.newContext({ viewport: { width: 320, height: 720 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const narrowPage = await narrow.newPage()
  for (const route of ['', 'signin', 'signup', 'settings', 'analytics', 'batch', 'history']) {
    await narrowPage.goto(`${baseURL}/${route}`)
    assert.equal(await narrowPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${route || 'dashboard'} overflows at 320px`)
  }
  console.log('UI checks passed. Screenshots saved to .artifacts/.')
} finally {
  await browser.close()
}

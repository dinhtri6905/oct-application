import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const browserPath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const baseURL = process.env.APP_URL || 'http://127.0.0.1:5173'
const outputDir = path.resolve('..', '.artifacts')
await mkdir(outputDir, { recursive: true })

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==', 'base64')

async function mockApi(context, signedIn = false) {
  const state = {
    user: signedIn ? { id: 'user-1', name: 'Nguyễn An', email: 'an@example.org', createdAt: new Date().toISOString(), csrfToken: 'test-csrf' } : null,
    records: [],
  }
  let nextId = 1
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const body = () => request.postDataJSON() || {}
    const respond = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (pathname === '/auth/me') return respond(state.user ? 200 : 401, state.user || { detail: 'Vui lòng đăng nhập.' })
    if (pathname === '/auth/register' && method === 'POST') {
      const data = body()
      state.user = { id: 'user-1', name: data.name, email: data.email, createdAt: new Date().toISOString(), csrfToken: 'test-csrf' }
      return respond(201, state.user)
    }
    if (pathname === '/auth/login' && method === 'POST') {
      const data = body()
      if (data.password !== 'temporary-pass') return respond(401, { detail: 'Email hoặc mật khẩu không đúng.' })
      state.user = { id: 'user-1', name: 'Nguyễn An', email: data.email, createdAt: new Date().toISOString(), csrfToken: 'test-csrf' }
      return respond(200, state.user)
    }
    if (!state.user) return respond(401, { detail: 'Vui lòng đăng nhập.' })
    if (pathname === '/auth/logout' && method === 'POST') { state.user = null; return route.fulfill({ status: 204 }) }
    if (pathname === '/auth/profile' && method === 'PATCH') { state.user.name = body().name; return respond(200, state.user) }
    if (pathname === '/model') return respond(200, { name: 'MaxViT-OCT', version: 'test-model', ready: true, classes: ['CNV', 'DME', 'DRUSEN', 'NORMAL'], input: 'RGB 224×224', preprocessingVersion: 'test', error: null })
    if (pathname === '/predictions' && method === 'GET') return respond(200, state.records)
    if (pathname === '/predictions' && method === 'POST') {
      const id = `prediction-${nextId++}`
      const record = { source: 'model', id, displayName: `oct-${id}.png`, imageDataUrl: `/api/v1/predictions/${id}/image`, imageWidth: 128, imageHeight: 128, sizeBytes: 400, predictedClass: 'CNV', classScores: { CNV: 0.7, DME: 0.1, DRUSEN: 0.1, NORMAL: 0.1 }, modelVersion: 'test-model', preprocessingVersion: 'test', createdAt: new Date().toISOString(), feedback: null }
      state.records.unshift(record)
      return respond(201, record)
    }
    if (pathname === '/predictions' && method === 'DELETE') { state.records = []; return route.fulfill({ status: 204 }) }
    const image = pathname.match(/^\/predictions\/([^/]+)\/image$/)
    if (image) return state.records.some((item) => item.id === image[1]) ? route.fulfill({ status: 200, contentType: 'image/png', body: png }) : respond(404, { detail: 'Không tìm thấy ảnh.' })
    const feedback = pathname.match(/^\/predictions\/([^/]+)\/feedback$/)
    if (feedback && method === 'PATCH') {
      const record = state.records.find((item) => item.id === feedback[1])
      if (!record) return respond(404, { detail: 'Không tìm thấy kết quả.' })
      record.feedback = { ...body(), createdAt: new Date().toISOString(), status: 'unverified' }
      return respond(200, record)
    }
    const detail = pathname.match(/^\/predictions\/([^/]+)$/)
    if (detail) {
      const record = state.records.find((item) => item.id === detail[1])
      if (!record) return respond(404, { detail: 'Không tìm thấy kết quả.' })
      if (method === 'DELETE') { state.records = state.records.filter((item) => item.id !== detail[1]); return route.fulfill({ status: 204 }) }
      return respond(200, record)
    }
    return respond(404, { detail: 'Không tìm thấy API.' })
  })
  return state
}

const browser = await chromium.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox'] })
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await mockApi(desktop)
  const page = await desktop.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/signin', 'Dashboard requires a session')
  await page.screenshot({ path: path.join(outputDir, 'signin-light.png'), fullPage: true })
  await page.getByRole('link', { name: 'Đăng ký ngay' }).click()
  await page.getByRole('heading', { name: 'Tạo tài khoản' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'signup-light.png'), fullPage: true })
  await page.locator('form').getByLabel('Họ và tên').fill('Nguyễn An')
  await page.locator('form').getByLabel('Email').fill('an@example.org')
  await page.locator('form input[name="password"]').fill('temporary-pass')
  await page.locator('form').getByLabel('Xác nhận mật khẩu').fill('temporary-pass')
  await page.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.getByRole('heading', { name: 'Tổng quan nghiên cứu' }).waitFor()
  await page.getByRole('button', { name: 'Mở menu tài khoản Nguyễn An' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'dashboard-light.png'), fullPage: true })

  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.reload()
  await page.getByRole('heading', { name: 'Tổng quan nghiên cứu' }).waitFor()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.screenshot({ path: path.join(outputDir, 'dashboard-dark.png'), fullPage: true })
  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click()
  await page.getByRole('button', { name: 'Mở menu tài khoản Nguyễn An' }).click()
  await page.getByRole('navigation', { name: 'Tài khoản' }).getByRole('link', { name: 'Hồ sơ' }).click()
  await page.getByRole('heading', { name: 'Hồ sơ của bạn' }).waitFor()
  await page.getByLabel('Tên hiển thị').fill('Nguyễn Minh An')
  await page.getByRole('button', { name: 'Lưu tên' }).click()
  await page.getByRole('button', { name: 'Mở menu tài khoản Nguyễn Minh An' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'profile-light.png'), fullPage: true })

  await page.goto(`${baseURL}/prediction`)
  const pngData = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 128
    const context = canvas.getContext('2d')
    context.fillStyle = '#172539'; context.fillRect(0, 0, 128, 128)
    context.strokeStyle = '#d9e3ec'; context.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      context.beginPath(); context.moveTo(0, 40 + i * 10)
      context.bezierCurveTo(40, 35 + i * 10, 90, 45 + i * 10, 128, 40 + i * 10)
      context.stroke()
    }
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const file = { name: 'oct-check.png', mimeType: 'image/png', buffer: Buffer.from(pngData, 'base64') }
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByText('oct-check.png').waitFor()
  await page.getByRole('button', { name: 'Bắt đầu phân tích' }).click()
  await page.getByRole('link', { name: /Xem chi tiết trong lịch sử/ }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'prediction-light.png'), fullPage: true })
  await page.getByRole('link', { name: /Xem chi tiết trong lịch sử/ }).click()
  await page.getByRole('heading', { name: 'Chi tiết phân tích' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'detail-light.png'), fullPage: true })
  await page.goto(`${baseURL}/history`)
  await page.getByRole('heading', { name: 'Lịch sử phân tích' }).waitFor()
  await page.goto(`${baseURL}/analytics`)
  await page.getByRole('heading', { name: 'Phân tích dữ liệu' }).waitFor()
  await page.screenshot({ path: path.join(outputDir, 'analytics-light.png'), fullPage: true })

  await page.goto(`${baseURL}/batch`)
  await page.locator('input[type=file]').setInputFiles([file, { ...file, name: 'oct-check-2.png' }])
  await page.getByText('2 ảnh đã chọn').waitFor()
  await page.getByRole('button', { name: 'Bắt đầu phân tích (2)' }).click()
  await page.getByText('2 / 2').waitFor()
  await page.screenshot({ path: path.join(outputDir, 'batch-light.png'), fullPage: true })

  await page.goto(`${baseURL}/settings`)
  await page.getByRole('heading', { name: 'Cài đặt ứng dụng' }).waitFor()
  await page.getByLabel('Kết quả mỗi trang').selectOption('16')
  await page.reload()
  assert.equal(await page.getByLabel('Kết quả mỗi trang').inputValue(), '16')
  await page.screenshot({ path: path.join(outputDir, 'settings-light.png'), fullPage: true })
  await page.getByRole('button', { name: 'Xóa dữ liệu' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa dữ liệu' }).click()
  await page.getByRole('status').getByText(/Đã xóa dữ liệu phân tích/).waitFor()
  await page.getByRole('button', { name: 'Mở menu tài khoản Nguyễn Minh An' }).click()
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await page.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/signin')
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`)

  for (const width of [390, 320]) {
    const mobile = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await mockApi(mobile, true)
    const mobilePage = await mobile.newPage()
    for (const route of ['', 'prediction', 'batch', 'history', 'analytics', 'model', 'settings', 'profile']) {
      await mobilePage.goto(`${baseURL}/${route}`)
      await mobilePage.getByRole('heading').first().waitFor()
      assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${route || 'dashboard'} overflows at ${width}px`)
      if (width === 390) await mobilePage.screenshot({ path: path.join(outputDir, `${route || 'dashboard'}-mobile-light.png`), fullPage: true })
    }
    await mobile.close()
  }
  console.log('UI checks passed. Screenshots saved to .artifacts/.')
} finally {
  await browser.close()
}

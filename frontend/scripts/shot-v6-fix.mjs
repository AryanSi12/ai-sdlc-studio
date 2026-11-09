import { chromium } from 'playwright'
const base = 'http://127.0.0.1:8000'
const PID = '5fa499f1-4bbe-46ac-8135-f1fb5834b0e0'
const out = '/workspace/ai-sdlc-studio/screenshots/v6'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${out}/01-hero.png`, fullPage: true })
console.log('01')

await page.evaluate(() => document.getElementById('crew')?.scrollIntoView({ block: 'start' }))
await page.waitForTimeout(400)
const pause = page.getByRole('button', { name: /Pause|Play/i }).first()
if (await pause.count()) await pause.click()
const designer = page.getByRole('tab', { name: /Designer/i })
if (await designer.count()) await designer.click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/02-slideshow-designer.png`, fullPage: true })
console.log('02')

// Verify header stays at top of viewport after scroll (not mid-page sticky artifact of wrong scroll root)
const headerBox = await page.locator('header').boundingBox()
console.log('header y after scroll into crew:', headerBox?.y)

await page.goto(`${base}/projects/${PID}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/04-pipeline-idle.png`, fullPage: true })
console.log('04')

const replay = page.getByRole('button', { name: /Replay run/i })
if (await replay.count()) {
  await replay.click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${out}/05-pipeline-mid-replay.png`, fullPage: true })
  console.log('05')
}
await browser.close()

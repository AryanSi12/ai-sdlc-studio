import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const base = 'http://127.0.0.1:8000'
const PID = '5fa499f1-4bbe-46ac-8135-f1fb5834b0e0'
const out = '/workspace/ai-sdlc-studio/screenshots/v6'
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ headless: true })

async function shot(page, path, file, wait = 1000) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${out}/${file}`, fullPage: true })
  console.log('saved', file)
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await shot(page, '/', '01-hero.png', 1200)

// slideshow slide - designer
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const pause = page.getByRole('button', { name: /Pause|Play/i }).first()
if (await pause.count()) await pause.click()
const designer = page.getByRole('tab', { name: /Designer/i })
if (await designer.count()) await designer.click()
await page.waitForTimeout(700)
await page.locator('#crew').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/02-slideshow-designer.png`, fullPage: true })
console.log('saved 02-slideshow-designer.png')

await shot(page, '/projects', '03-projects.png')

// pipeline idle
await page.goto(`${base}/projects/${PID}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/04-pipeline-idle.png`, fullPage: true })
console.log('saved 04-pipeline-idle.png')

// mid-replay
const replay = page.getByRole('button', { name: /Replay run/i })
if (await replay.count()) {
  await replay.click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${out}/05-pipeline-mid-replay.png`, fullPage: true })
  console.log('saved 05-pipeline-mid-replay.png')
  const stop = page.getByRole('button', { name: /Stop/i })
  if (await stop.count()) await stop.click()
  await page.waitForTimeout(300)
}

// node drawer
const node = page.getByText('Development', { exact: true }).first()
await node.click({ force: true })
await page.waitForTimeout(700)
await page.screenshot({ path: `${out}/06-pipeline-drawer.png`, fullPage: true })
console.log('saved 06-pipeline-drawer.png')

await shot(page, '/inbox', '07-inbox.png')
await shot(page, '/activity', '08-activity.png')

const docs = await (await fetch(`${base}/api/projects/${PID}/documents`)).json()
if (docs[0]) {
  await shot(page, `/projects/${PID}/docs/${docs[0].id}`, '09-document-viewer.png')
}

// Video: hero + pipeline replay
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
})
const vpage = await context.newPage()
await vpage.goto(base + '/', { waitUntil: 'networkidle' })
await vpage.waitForTimeout(2500)
await vpage.goto(`${base}/projects/${PID}`, { waitUntil: 'networkidle' })
await vpage.waitForTimeout(1000)
const r2 = vpage.getByRole('button', { name: /Replay run/i })
if (await r2.count()) {
  await r2.click()
  await vpage.waitForTimeout(5500)
}
await vpage.waitForTimeout(800)
await context.close()

// rename video
import { readdir, rename } from 'fs/promises'
const files = await readdir(out)
const webm = files.find((f) => f.endsWith('.webm'))
if (webm) {
  await rename(`${out}/${webm}`, `${out}/demo.webm`)
  console.log('saved demo.webm')
}

await browser.close()
console.log('done')

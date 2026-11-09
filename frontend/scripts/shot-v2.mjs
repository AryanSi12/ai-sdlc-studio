import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const base = 'http://127.0.0.1:4173'
const PID = '5fa499f1-4bbe-46ac-8135-f1fb5834b0e0'
const out = '/workspace/ai-sdlc-studio/screenshots/v2'
await mkdir(out, { recursive: true })

const shots = [
  ['/', '01-new-run.png'],
  ['/projects', '02-projects.png'],
  [`/projects/${PID}`, '03-project-detail.png'],
  ['/approvals', '04-approvals.png'],
  ['/activity', '05-activity-log.png'],
  ['/maintainer', '06-maintainer.png'],
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

for (const [path, file] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${file}`, fullPage: true })
  console.log('saved', file)
}

// also a mobile-ish check of project detail
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(base + `/projects/${PID}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/03-project-detail-mobile.png`, fullPage: true })
console.log('saved mobile')

await browser.close()

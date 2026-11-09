import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const base = 'http://127.0.0.1:4173'
const shots = [
  ['/', '01-new-run.png'],
  ['/projects', '02-projects.png'],
  ['/projects/p1', '03-project-detail.png'],
  ['/approvals', '04-approvals.png'],
  ['/activity', '05-activity-log.png'],
  ['/maintainer', '06-maintainer.png'],
]

await mkdir('screenshots', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})

for (const [path, file] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({
    path: `screenshots/${file}`,
    fullPage: true,
  })
  console.log('saved', file)
}

await browser.close()

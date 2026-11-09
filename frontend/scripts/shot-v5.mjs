import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const base = 'http://127.0.0.1:8000'
const PID = '5fa499f1-4bbe-46ac-8135-f1fb5834b0e0'
const out = '/workspace/ai-sdlc-studio/screenshots/v5'
await mkdir(out, { recursive: true })

const shots = [
  ['/', '01-new-run-hero.png'],
  ['/projects', '02-projects.png'],
  [`/projects/${PID}`, '03-project-overview-pipeline.png'],
  [`/projects/${PID}?tab=documents`, '04-project-documents.png'],
  [`/projects/${PID}?tab=activity`, '05-project-activity.png'],
  ['/inbox', '06-inbox.png'],
  ['/activity', '07-activity.png'],
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

for (const [path, file] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${file}`, fullPage: true })
  console.log('saved', file)
}

// Pipeline hover / click state
await page.goto(`${base}/projects/${PID}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const node = page.getByRole('button', { name: /Development/i }).first()
await node.hover()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/03b-pipeline-hover.png`, fullPage: true })
console.log('saved 03b-pipeline-hover.png')
await node.click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/03c-pipeline-node-detail.png`, fullPage: true })
console.log('saved 03c-pipeline-node-detail.png')

// Slideshow mid-slide (pause + advance)
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const pauseBtn = page.getByRole('button', { name: /Pause slideshow|Play/i })
if (await pauseBtn.count()) await pauseBtn.click()
const designerDot = page.getByRole('tab', { name: /Show Designer/i })
if (await designerDot.count()) await designerDot.click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/01b-slideshow-designer.png`, fullPage: true })
console.log('saved 01b-slideshow-designer.png')

const docs = await (await fetch(`${base}/api/projects/${PID}/documents`)).json()
if (docs[0]) {
  await page.goto(`${base}/projects/${PID}/docs/${docs[0].id}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/08-document-viewer.png`, fullPage: true })
  console.log('saved doc viewer')
}

await browser.close()

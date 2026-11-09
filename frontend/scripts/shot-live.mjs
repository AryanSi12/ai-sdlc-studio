import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const base = 'http://127.0.0.1:4173'
await mkdir('/workspace/ai-sdlc-studio/screenshots', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// Project detail — NovaPay with live bot events
await page.goto(base + '/projects/p1-novapay', { waitUntil: 'networkidle' })
await page.waitForSelector('text=NovaPay Checkout')
await page.waitForTimeout(800)
await page.screenshot({ path: '/workspace/ai-sdlc-studio/screenshots/03-project-detail-live.png', fullPage: true })
console.log('detail ok')

// Approvals — pending gates
await page.goto(base + '/approvals', { waitUntil: 'networkidle' })
await page.waitForSelector('text=Approvals')
await page.waitForTimeout(500)
// Approve Shopflow design gate via UI
const shopflow = page.locator('article').filter({ hasText: 'Shopflow Checkout' })
if (await shopflow.count()) {
  await shopflow.locator('textarea').fill('Approved via UI — proceed to Development')
  await shopflow.getByRole('button', { name: 'Approve' }).click()
  await page.waitForTimeout(800)
}
await page.screenshot({ path: '/workspace/ai-sdlc-studio/screenshots/04-approvals-live.png', fullPage: true })
console.log('approvals ok')

// Projects list with new Shopflow
await page.goto(base + '/projects', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.screenshot({ path: '/workspace/ai-sdlc-studio/screenshots/02-projects-live.png', fullPage: true })
console.log('projects ok')

// New project detail after UI approve
const newId = (await import('fs')).readFileSync('/tmp/new_project_id.txt', 'utf8').trim()
await page.goto(base + `/projects/${newId}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.screenshot({ path: '/workspace/ai-sdlc-studio/screenshots/03b-shopflow-after-approve.png', fullPage: true })
console.log('shopflow detail ok')

await browser.close()

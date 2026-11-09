import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'

const base = 'http://127.0.0.1:4174'
const PID = readFileSync('/tmp/idea.json', 'utf8')
const projectId = JSON.parse(PID).id
const out = '/workspace/ai-sdlc-studio/screenshots/v3'
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// 1 New Run with idea option
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/01-new-run-idea.png`, fullPage: true })
console.log('shot new-run')

// 2 Project detail quiz step
await page.goto(base + `/projects/${projectId}`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Clarifying quiz', { timeout: 10000 })
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/02-quiz-step.png`, fullPage: true })
console.log('shot quiz step')

// Answer through wizard
async function pick(text) {
  await page.getByRole('button', { name: text, exact: true }).click()
}
// Q1 single
await pick('Both')
await page.getByRole('button', { name: 'Next' }).click()
// Q2 multi
await pick('Web')
await pick('Slack only')
await page.getByRole('button', { name: 'Next' }).click()
// Q3 multi
await pick('Daily check-in')
await pick('Trend charts')
await pick('Slack digest')
await page.getByRole('button', { name: 'Next' }).click()
// Q4 single
await pick('Slack OAuth')
await page.getByRole('button', { name: 'Next' }).click()
// Q5 text optional - skip / empty next
await page.getByRole('button', { name: 'Next' }).click()
// Q6 scale
await page.getByRole('button', { name: 'Scale 4' }).click()
await page.getByRole('button', { name: 'Review' }).click()
await page.waitForSelector('text=Review your answers')
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/03-quiz-review.png`, fullPage: true })
console.log('shot review')

await page.getByRole('button', { name: 'Submit answers' }).click()
await page.waitForSelector('text=Requirement Gatherer is writing', { timeout: 10000 })
await page.waitForTimeout(500)

await browser.close()
console.log('quiz answered via UI')

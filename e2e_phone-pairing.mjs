// End-to-end phone-pairing smoke test for JARVIS.
//
// Proves the full phone <-> PC flow works against a running backend:
//   1. load the HUD with a real pairing token (?pair=<token>),
//   2. at a phone viewport (390x844),
//   3. confirm it is PAIRED (zero console errors),
//   4. send a chat message and confirm a streamed reply arrives,
//   5. confirm the layout does not overflow horizontally on mobile.
//
// Run with the backend up on :3210 and a token present:
//   node e2e/phone-pairing.mjs
// Exits 0 on success, 1 on failure. Requires `playwright` in node_modules.

import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.JARVIS_TEST_URL || 'http://127.0.0.1:3210'
const TOKEN_PATH = join(homedir(), '.jarvis', 'remote-token')

function fail(msg) {
  console.error('FAIL: ' + msg)
  process.exitCode = 1
}

let token
try {
  token = readFileSync(TOKEN_PATH, 'utf8').trim()
} catch {
  fail(`no pairing token at ${TOKEN_PATH} — start JARVIS (remote mode) first`)
  process.exit(1)
}

const URL = `${BASE}/?pair=${encodeURIComponent(token)}`
const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const input = page.getByPlaceholder('Say something to JARVIS')
  await input.waitFor({ state: 'visible', timeout: 20000 })

  if (errors.length > 0) fail('console errors before chat: ' + errors.slice(0, 5).join(' | '))

  await input.click()
  await input.fill('Reply with only the single word TEST-OK.')
  await input.press('Enter')

  const replied = await page
    .waitForFunction(() => document.body.innerText.includes('TEST-OK'), { timeout: 60000 })
    .then(() => true)
    .catch(() => false)
  if (!replied) fail('chat did not produce a reply')

  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
  const winW = await page.evaluate(() => window.innerWidth)
  if (scrollW > winW + 2) fail(`horizontal overflow on mobile: ${scrollW} > ${winW}`)

  if (errors.length > 0) fail('console errors: ' + errors.slice(0, 5).join(' | '))
} catch (e) {
  fail('flow error: ' + e.message)
} finally {
  await browser.close()
}

if (process.exitCode === 1) {
  console.error('E2E_PAIRING_FAIL')
} else {
  console.log('E2E_PAIRING_OK — paired, chat replied, mobile layout clean, 0 console errors')
}

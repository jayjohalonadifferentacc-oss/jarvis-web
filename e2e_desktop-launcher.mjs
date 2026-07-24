// Desktop-launcher smoke test for JARVIS.
//
// Verifies the Tauri boot page (src-tauri-ui/index.html) does its one job:
// wait for the sidecar backend on :3210, then point the app iframe at it
// (with a ?pair= token when remote mode is on).
//
// The page is designed for the Tauri WebView, but the logic is plain DOM, so
// it runs in a normal browser too — without window.__TAURI__, pairedUrl() falls
// back to the bare SERVER, which is exactly what we assert.
//
//   node e2e/desktop-launcher.mjs   →   DESKTOP_LAUNCHER_OK
// Requires the backend up on :3210.

import { chromium } from 'playwright'
import { resolve } from 'node:path'

const SERVER = process.env.JARVIS_TEST_URL || 'http://127.0.0.1:3210'
const fileUrl = 'file://' + resolve('src-tauri-ui', 'index.html')

const browser = await chromium.launch()
const page = await browser.newPage()
let ok = true
try {
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

  // The launcher polls the backend; once it answers, it sets the iframe src.
  await page.waitForFunction(
    (server) => {
      const src = document.getElementById('app')?.getAttribute('src') || ''
      return src.startsWith(server)
    },
    SERVER,
    { timeout: 15000 },
  )

  const src = await page.getAttribute('#app', 'src')
  const paired = src.includes('?pair=')
  console.log('iframe src:', src, '| paired token attached:', paired)

  // With remote mode on the desktop carries a token; in a bare browser it does
  // not. Either way the src must be the backend, never blank or an error page.
  if (!src || !src.startsWith(SERVER)) {
    console.error('FAIL: iframe did not point at the backend')
    ok = false
  }
} catch (e) {
  console.error('FAIL: ' + e.message)
  ok = false
} finally {
  await browser.close()
}

console.log(ok ? 'DESKTOP_LAUNCHER_OK' : 'DESKTOP_LAUNCHER_FAIL')
if (!ok) process.exitCode = 1

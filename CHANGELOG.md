# Changelog

## v3.0.0 — phone pairing, mobile display, firewall helper

### Phone / Android
- **Fixed: phone "keeps loading" / "internal server error" on connect.**
  The connector (`mobile/index.html`, bundled in the APK as `assets/index.html`)
  was auto-connecting to a stale saved address and silently ignoring a freshly
  scanned `?pair=` QR. Now a scan always wins, and the token is kept on the full
  URL so the PC's app captures it (`capturePairing`).
- **Fixed: token was stripped before navigating.** The launcher navigated to a
  tokenless URL, so the phone stayed unpaired forever. It now navigates to the
  full `?pair=…` URL; only the visible input box shows the tokenless form.
- **Added: boot-retry.** The phone retries the reachability probe a few times
  (1.5s backoff) before declaring the PC unreachable — covers "I tapped before
  JARVIS finished booting."
- **Added: clear connect states** (reachable / connected-but-unpaired / unreachable),
  a **Forget** button to clear a stuck saved address, a **Copy** button for the
  address, and a "Connected to `<host>`" confirmation.
- **Repackaged & re-signed the APK** with the above. The app is now signed with a
  fresh keystore, so **uninstall the old APK before installing** (Android won't
  update in place across key changes).

### Desktop / pairing
- `enable-lan.bat`: one-click firewall rule for port 3210 (idempotent, with a
  PowerShell fallback and a self-check).

### Site
- Download site adds a **What's new** strip and a **troubleshooting** section
  covering the three real failure modes (old-APK-not-uninstalled, firewall/Wi-Fi,
  stale QR).

### Mobile display (HUD)
- `globals.css` already reflows the desktop cockpit into a phone-first bottom
  sheet + stacked HUD under 820px. Added `font-size: 16px` on inputs (stops iOS
  zoom-on-focus) and `touch-action: manipulation` (removes tap delay).

### Notes
- The Android app is a **remote window** into the PC's JARVIS — there is no brain
  on the phone. The PC must be on, with remote mode on and port 3210 reachable.
- Pairing is mutual and explicit; the QR encodes a bearer token. Treat it like a key.

## v3.0.0 (overnight) — health endpoint, friendlier errors, verified E2E

### Backend
- **New `/api/health` aggregate endpoint** (guarded, like everything else). Returns
  `version`, `provider`, `model`, `brain.ok`, and `pairedDevices`/`totalDevices` so a
  client can show "JARVIS online · qwen2.5:3b · 2 devices" in one call.
- **Friendlier chat errors.** When the local brain (Ollama) is unreachable, the chat
  stream now says so plainly and tells you how to fix it (`ollama serve` / `ollama run
  <model>`) instead of a raw stack fragment.

### Phone / Android (launcher)
- The connect screen now shows the **PC model, paired-device count, and brain
  online/offline status** (from `/api/health`) in the "Connected to …" confirmation.
- APK repackaged & re-signed with each fix (same fresh keystore — uninstall old APK first).

### Verification (new)
- `e2e/phone-pairing.mjs`: an automated smoke test that proves the full phone↔PC flow
  against a live backend — pair via token, send a chat message, assert a reply arrives,
  zero console errors, and no horizontal overflow at a 390px phone viewport.
  `node e2e/phone-pairing.mjs` → `E2E_PAIRING_OK`.

### Deploy
- Standalone deploy requires copying root `.next/static` **and** `public` alongside the
  `.next/standalone` server output, or every `_next/static/*` asset 404s. Documented in
  the deploy routine; the running app + installer both use it.

### Quality gates (all green)
- `tsc --noEmit` clean · `vitest` 422 passing · live E2E `E2E_PAIRING_OK` · public site
  `SITE_OK` (0 console errors).

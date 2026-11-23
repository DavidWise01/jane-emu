# AV-199 — Focused input and release diagnostic

## Status

Phase 6 turn 3/8 (37.5% implementation progress; **not** gameplay acceptance).
Phase 5 remains frozen at 50% verified acceptance.

## Change

- New `tests/av199_keyboard_release_browser.test.cjs` focuses the *actual* embedded NES canvas and sends explicit held Chromium keyboard down/up events, rather than using a quick press on the iframe body.
- Logs keyboard focus, clock frames before/while/after each input, NES RAM X and the actual rendered sprite bounding box.
- Requires uninterrupted frame progression during and after key release and directional pixel movement with RIGHT and LEFT.
- Existing ROM loading, one JSNES emulator, Jane → Toph → Patricia → Jane turns, PLAY/LEARN/VERIFY tools and GitHub Pages layout are unchanged.
- Wired the diagnostic into `.github/workflows/jane-pages.yml`, but with `continue-on-error: true` until actual passing browser evidence is available.

## Evidence

JavaScript static syntax passed. GitHub commits recorded. **No passing Chromium gameplay outcome or hosted Pages deployment verified here.** Because the original emulator's embedded keyboard logic was not accessible through the repository file reader, this update does not claim to have fixed the underlying emulator keyboard handler.

## AV-200 next bound

Read AV-197, AV-198 and AV-199 actual job logs together. If canvas-focus and key-hold check passes, promote the movement check to blocking acceptance; otherwise target the exact keyboard handler or frame scheduler identified by the logs. Verify START, game-over and restart in the same original cartridge session without counterfactual success claims.

`.dlw`

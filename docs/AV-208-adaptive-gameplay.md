# AV-208 — Adaptive NES gameplay from completed action results

**Phase 7:** 4/8 turns implemented (50%). Live Chromium gameplay acceptance remains unverified.

## Gameplay implementation

The new `dashboard/av208_adaptive_gameplay.js` is active only for the AV-201 homebrew cartridge in a matching, armed NES session. It supplies button choices to the existing production `chooseAction()` and adaptive hold lengths to the existing controller dispatcher. It reads NES RAM $0002 (sprite X), $0004 (palette) and $0005 (playing mode), and does **not** write RAM or create a second emulator.

Its target actions are RIGHT to X 136, A to palette $16, LEFT to X 104, and B to palette $2A. Crucially, the next target advances only after a completed action's observed RAM confirms an effect or the goal was already satisfied. Each action begins with an 8-frame hold. An ineffective completed action increases its next hold by 3 frames, capped at 24; an effective action decreases the hold by 1, floored at 2. Sessions and player identities reset their local adaptation. During game over or title mode, the existing START/recovery controller takes precedence; the adaptive policy cannot issue gameplay actions.

The AV-207 fallback is retained. No existing playfield or PLAY/LEARN/VERIFY component was removed.

## Verification

The new `tests/av208_adaptive_gameplay.test.cjs` passed direct functional execution with controlled RAM values, covering action goal progression, failed/successful effects, adaptive holds, actor isolation, defeat and clock rewind. All 184 embedded arcade scripts parsed.

The new `tests/av208_browser_adaptive_gameplay.test.cjs` requires the original browser NES to complete the four actions, show actual RAM state changes and maintain its 256×240 canvas. It is a nonblocking GitHub Actions diagnostic pending actual passing browser results. The deterministic unit test is blocking.

**Not established:** passing Chromium gameplay, current GitHub Pages deployment, reliable adaptation on other games, or commercial ROM progress. Unit tests and compilation do not award these claims.

## Next natural bound — AV-209

Inspect actual controller and browser evidence, prioritize fixes for missed actions, and measure real gameplay outcomes instead of advancing solely on policy tests. Preserve the authoritative single NES, three rotating learners, three tools and full-size game field.

`.dlw`

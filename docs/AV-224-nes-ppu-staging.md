# AV-224 — Original NES PPU Sprite Staging Repair

**Phase 9:** Turn 4 of 8 (**50% implementation**). **Independently confirmed live Chromium gameplay:** 0 accepted gates.

## Concrete source-code issue

The previous AV-201 homebrew cartridge enabled NES sprite rendering with `$2001=$14` immediately when START switched the game into mode 1. At that point the program had **not yet refreshed** the new life's palette entry `$3F11` or sprite-zero OAM bytes through `$2003/$2004`. After a prior defeat, that could expose the old sprite position or color before the next frame update.

AV-224 removes the early `$2001` write from the START handler and moves it into the playing draw routine, **after** writing the current palette and all four sprite-zero OAM bytes (Y, tile 1, attributes 0, X). Game-over still sets mode 2 and turns sprites off. This is a change to the actual generated 6502 ROM, not a browser-side fake or secondary controller.

## Executable PPU bus verification

The new `tests/av224_6502_ppu_staging.test.cjs` runs the original generated cartridge through the same deterministic 6502 controller fixture used by AV-222/223, with additional PPU write-model checks. It tracks palette address/data writes (`$2006/$2007`), OAM address/data writes (`$2003/$2004`) and mask changes (`$2001`). At the first sprite-enable event it requires sprite zero to already have Y=108, CHR tile 1, attributes 0 and X=120, and palette entry `$3F11=$30`. It also checks B-driven palette updates, game-over sprite disablement, later restart rendering and all four movement bounds. Direct controlled functional execution passed; prior AV-222/223 regressions also passed after the change.

## Browser evidence, separately tracked

The new `tests/av224_browser_ppu_pixels.test.cjs` is a nonblocking Chromium diagnostic. It waits for real homebrew NES movement and polls actual `#nesCanvas` pixels within the original game iframe, comparing the pixel at the RAM-reported sprite position with the background. Unlike a single unsynchronized sample, it captures the exact successful pixel observation in the browser before returning serialized numbers to the test process. It retains the 256×240 canvas and PLAY/LEARN/VERIFY checks. **No live-browser pass or Pages deployment was independently confirmed.**

The GitHub Actions workflow includes the blocking executed-6502 regression and the nonblocking Chromium diagnostic. No changes were made to the original arcade layout, its single NES emulator or its three-player order.

## Next natural bound — AV-225

Observe the real browser framebuffer through sustained palette changes and D-pad movement. Repair a reproducible PPU, color or input-delivery mismatch before awarding gameplay acceptance.

`.dlw`

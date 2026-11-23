# AV-223 — Visible NES Sprite Bounds and Pixel Verification

**Phase 9:** 3/8 implemented (37.5%). **Independently confirmed live Chromium gameplay:** 0 gates, browser outcome not yet inspected.

## Concrete cartridge defect

The AV-201 homebrew NROM-128 ROM previously executed unrestricted 6502 `DEC`/`INC` on zero-page X ($0002) and Y ($0003) whenever the D-pad was held. Since those values are 8-bit integers, long movement could wrap from 255 to 0 or move the entire 8×8 sprite out of the NES's visible 256×240 frame. This undermines visual tracking, sprite position evidence and continuous gameplay even when controller completion receipts are correct.

## AV-223 6502 repair

The ROM's original controller polling path now checks a boundary with `LDA/CMP/BEQ` before every D-pad increment/decrement. The emitted 6502 code keeps X in **8..247** and Y in **8..231**, ensuring that the full 8×8 sprite remains on the original NES screen. The generated ROM, not the host, enforces these movement constraints. No new emulator, extra controller, JavaScript RAM mutation, or interface replacement was introduced.

## Executed deterministic cartridge tests

`tests/av223_6502_sprite_bounds.test.cjs` executes the generated ROM instructions in a minimal 6502 controller-bus fixture, including actual $4016 serial polling and NROM-128 bank mirroring. It passed X right, X left, Y up and Y down boundary tests, with the associated direction held beyond the edge. It also repeats the AV-222 title START, A/B palette response, automatic defeat and fresh-life restart checks; all passed.

`tests/av223_browser_sprite_pixels.test.cjs` is committed as a **nonblocking Chromium diagnostic**. It waits for the original NES homebrew ROM to enter actual playing mode and for completed movement effects, then samples pixels from the genuine 256×240 canvas at the sprite position reported by NES RAM. Its acceptance condition is an observed sprite RGB pixel that differs from a background pixel, combined with X/Y bounds, unchanged session/cartridge, and the retained PLAY/LEARN/VERIFY layout. This is not yet a verified passing browser result.

The new 6502 test runs as a blocking GitHub Actions step. No changes were made to `dashboard/arena.html` or its permanent NES playfield/card space.

## Next natural bound — AV-224

Inspect actual Chromium sprite-rendering and controller results. If sprite pixels remain absent or input effects cannot be observed, repair the first demonstrated PPU/timing/ROM defect, preserving the complete existing arcade.

`.dlw`

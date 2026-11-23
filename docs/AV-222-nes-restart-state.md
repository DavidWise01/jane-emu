# AV-222 — Repair Original NES START Restart State

**Phase 9:** Turn 2/8 (**25% implementation**). **Independently verified Chromium gameplay:** 0 gates earned.

## Production defect found

The AV-201 homebrew NROM-128 6502 program previously interpreted START as a command to set mode=1 and reset its life timer, even while mode=1. Holding START therefore repeatedly set the gameplay age to zero. On a defeat, START also left the previous player's X/Y and palette intact rather than restoring the next player's deterministic spawn. This could create different goal starting conditions for Jane, Toph, and Patricia and postpone automatic defeat while START remained held.

## AV-222 source repair

The generated cartridge now handles START only when the actual game mode at $0005 differs from 1. It uses an original 6502 `LDA $05 / CMP #1 / BEQ` branch and, for an actual title/restart event, sets:

| Original NES RAM | Reset value | Meaning |
| --- | --- | --- |
| $0002 | 120 | Sprite X |
| $0003 | 108 | Sprite Y |
| $0004 | $30 | Sprite palette byte |
| $0005 | 1 | Playing mode |
| $0006 | 0 | Lifetime gameplay counter |

It then re-enables the original NES sprites via $2001=$14. An already-active life is not restarted by repeated START frames. All changes occur inside the 6502 ROM code that the same original NES emulator loads. No host-side RAM write or fabricated controller completion is introduced.

## Executable verification

Added `tests/av222_6502_restart_gameplay.test.cjs`: a minimal deterministic 6502 execution harness for the assembled ROM. It models the genuine NROM-128 16 KiB mirrored CPU mapping, serial eight-button $4016 controller strobe/latch, $2002 VBlank status, and the subset of original emitted 6502 opcodes. It executes the actual ROM and **passed** the following controlled checks:

- Title mode -> START -> playing mode, with initial age advancement.
- RIGHT and A update actual emulated $0002 and $0004; LEFT and B reverse those input effects.
- Holding START during active play no longer resets lifetime age.
- After 180 playing frames, the program itself reaches mode=2 and hides sprites.
- The subsequent START genuinely restores x=120, y=108, palette=$30, mode=1, and sprite drawing; holding it longer does not re-enter restart.

This is more faithful than a synthetic policy test because the generated 6502 instructions are executed. It is nevertheless **not** the original Chromium/JSNES runtime and cannot independently certify the hosted arcade.

A nonblocking `tests/av222_browser_restart_gameplay.test.cjs` exercises the current original NES in Chromium across Jane's first defeat, Toph's completed START and observed resumed gameplay, with preserved 256×240 canvas and three-tool layout. Its result has not been independently inspected. The deterministic cartridge test is blocking in GitHub Actions.

## Next natural bound — AV-223

Review or reproduce an actual Chromium framebuffer/controller mismatch and repair the next concrete original NES gameplay fault before expanding strategy. Preserve Jane→Toph→Patricia, one emulator, original PLAY/LEARN/VERIFY and complete card/playfield area.

`.dlw`

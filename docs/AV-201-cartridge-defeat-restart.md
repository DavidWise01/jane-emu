# AV-201 — Cartridge-observed defeat and START recovery

**Phase 6:** turn 5/8 implemented (62.5% of planned turns, NOT verified gameplay acceptance).  
**Phase 5:** remains frozen at 50% earned acceptance.

## What changed

- Added `dashboard/av201_defeat_rom.js`: a purpose-built original 24,592-byte NROM-128 cartridge. Its **6502 code**, not the browser, runs a gameplay counter. START begins playing (RAM $0005 = 1), after 180 game-frame increments the cartridge sets RAM $0005 = 2 and hides the sprite, and a subsequent START returns to play and resets the counter. Original AV-193 cartridge is retained untouched.
- The added **PLAY LOSS ROM** button uses the **existing** `jane-av193-load` ROM-file dispatch path and embedded NES instance.
- Added `dashboard/av201_live_observer.js`, a passive reader of NES RAM $0005, real frame count, and original completed START trial records. It sends cartridge-observed states to the AV-200 fail-closed gate. It never injects keys or writes memory.
- Added `tests/av201_jsnes_defeat_restart.test.cjs` for direct real-JSNES 6502 execution. This is a **blocking** CI check.
- Added `tests/av201_browser_defeat_restart.test.cjs` for Chromium: START, true cartridge game over, START through original arcade, and 60 post-restart frames with one session root, cartridge and three tools. This remains **nonblocking diagnostics** until genuinely observed passing results justify promotion.
- Wired both CI checks in `.github/workflows/jane-pages.yml`, preserving PLAY / LEARN / VERIFY and all three players.

## Verified in this turn

The ROM builder executed and returned a valid-size 24,592-byte iNES image with the NROM header. JavaScript syntax parsed for the new browser test and modules. GitHub writes succeeded.

**Not verified:** actual JSNES execution test outcome, live Chromium gameplay/restart success, and the newest GitHub Pages deployment. They must not earn more acceptance credit until real run logs pass. The recovery gate is cartridge-specific for this original homebrew; it does not imply commercial Punch-Out game-over recognition.

## Next natural bound — AV-202

Read the blocking JSNES and diagnostic browser results. Fix any genuine frame or action-completion failure. Only after a verified game-over should the controller rotate from Jane to Toph to Patricia and back, without restarting the shared cartridge at a handoff.

`.dlw`

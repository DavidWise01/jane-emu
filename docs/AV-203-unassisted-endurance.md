# AV-203 — Unassisted NES endurance on one cartridge

**Phase 6:** 7 of 8 planned implementation turns (87.5%). This is not verified gameplay acceptance.  
**Phase 5:** immutable acceptance freeze remains 50%.

## Production integration

The original AV-201 loss cartridge remains the sole emulator input. After detecting title RAM mode 0, or a new live RAM mode 1→2 defeat that AV-202 has already used for a legitimate handoff, the AV-201 monitor asks the AV-203 host gate to queue START using the *existing* reciprocal scheduler (`JANE_RECIPROCAL.request`). That scheduler remains the only authoritative NES controller. The new gate independently reads the current RAM mode, session root, cartridge ID, owner, bounded frame interval, and unique event ID. No debug port, second emulator, or direct synthetic memory write is introduced.

Each loss is tracked by a distinct cartridge-observed transition and accepted player transfer. A recovery cycle is counted only after RAM returns to playing, at least 60 real NES frames advance, and a completed production START trial exists after the defeat. The passive monitor exposes `cycles`, `completedCycles`, `recoveryRequests`, and `clockStalls` for evidence inspection.

## AV-203 Chromium test

`tests/av203_unassisted_endurance_browser.test.cjs` uses PLAY LOSS ROM once. It must observe Jane→Toph→Patricia→Jane across three cartridge-game-over transitions, with recovery for each and no manually clicked START or Life Lost button. It demands the same session root and cartridge throughout, increasing frame numbers, completed action evidence and three preserved top-level tools.

The browser test is a nonblocking diagnostic in `.github/workflows/jane-pages.yml`; a green Pages deployment **does not** establish the three-cycle acceptance gate. CI outputs must be inspected before promoting this to a blocking gate. The original handoff and stop/restart code paths remain in use.

## Verification during this turn

GitHub commits and workflow wiring were confirmed. JavaScript syntax parsed for the updated observer and new browser test, and all 181 embedded arcade scripts parsed. **Not independently verified:** three-cycle Chromium playback, action scheduler success, browser hosted Pages deployment, or commercial Punch-Out gameplay. No new earned acceptance credit is claimed.

## Next natural bound — AV-204

Read AV-197–203 diagnostic results, fix any observed regressions, and freeze Phase 6 at its **earned** acceptance percentage. Do not infer success from synthetic fixtures, static syntax checks, nonblocking CI, or manual handoffs.

`.dlw`

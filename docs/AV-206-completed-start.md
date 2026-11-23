# AV-206 — Completed START receipt and automatic NES browser recovery

**Phase 7:** turn 2/8 implemented (25% implementation; 0 independently verified live gameplay gates).  
**Phase 6:** frozen at 0/8 verified live-browser gates. Prior Phase 5: 50% accepted.

## Concrete controller evidence repair

In AV-205, bounded START priority counted each *offer*, but recorded no authoritative acknowledgement that the original NES action loop completed a START action. AV-206 adds `completed({root,rom,actor,frame,button})` to `dashboard/av205_priority_start.js`. It accepts only START, matching active owner/root/rom, valid frame and an outstanding attempt. It records a `START_COMPLETED` receipt separately from `START_OFFER`.

The original production `memory.trials.push(record)` completion hook in `dashboard/arena.html` calls the AV-206 receipt bridge. No second controller, synthetic ROM state, direct NES button port or extra emulator is created. The bridge does not call the controller; it records the action that existing emulator machinery already completed. Acceptance still requires actual cartridge RAM mode changes and browser evidence.

## Tests

- `tests/av206_start_receipt.test.cjs` tests offered ≠ completed, completed START authorization, wrong-owner rejection, bounded retries and mode cancellation. **Direct functional test passed.**
- `tests/av206_browser_autostart_recovery.test.cjs` loads the original AV-201 homebrew cartridge via PLAY LOSS ROM and clicks no manual START or Life Lost. Its real Chromium assertions require: initial automatic title → playing, a 256-pixel NES canvas, a START_COMPLETED receipt in the original input scheduler, real 6502 game-over, Jane → Toph handoff, automatic restart, 60 post-restart gameplay frames, unchanged cartridge/root, and three top-level tools. **Chromium run outcome not independently verified.**
- Both checks wired to `.github/workflows/jane-pages.yml`; the direct policy regression is blocking and the unverified Chromium test remains nonblocking. A green deployment alone cannot prove game mechanics.
- All **182 inline arcade scripts** passed static JS parsing after integration.

## Next natural bound — AV-207

Read production Chromium action records, verify direction and A/B controller execution against the actual NES sprite and palette, and repair only demonstrated gameplay-mechanics defects. Maintain the one-NES, three-player, three-tool and play-area invariants.

`.dlw`

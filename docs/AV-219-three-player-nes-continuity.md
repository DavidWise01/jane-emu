# AV-219 — Unassisted Jane → Toph → Patricia NES Continuity

**Phase 8:** 7/8 implementation turns (**87.5%**). **Independently confirmed live Chromium acceptance:** 0; the current browser test has not been observed passing.

## Problem and change

AV-218 preserved a completed START receipt for a single post-defeat recovery, but the live AV-201 observer's `completedCycles` count did not verify those recoveries as an ordered chain. Two unrelated cycles or misattributed START receipts could be counted as two individual results without confirming correct Jane→Toph→Patricia succession.

AV-219 adds `dashboard/av219_rotation_chain.js`, a **read-only fail-closed audit** of the original NES observer's cycle ledger. It requires exactly ordered defeats numbered 1 and 2, with a loss observed under Jane then Toph, accepted next-owner transfers to Toph then Patricia, a **separate completed START from each incoming player tied to that cycle's exact source root, cartridge and defeat ID**, and at least 60 observed playing frames after each new life begins. Wrong actor, foreign cartridge, missing completed input, re-used receipt, misplaced defeat, or inadequate resumed play results in a specific first-fault reason instead of a success claim.

The original `JANE_AV201_MONITOR.snapshot()` now exposes `av219Chain` with `verifiedCycles`, `firstFault`, `complete`, and the two grounded receipt/frame summaries. No controller priority, NES RAM, emulator canvas, rotation logic, or three-tool UI is changed.

## Tests

- **PASS:** `tests/av219_rotation_chain.test.cjs` (controlled cycles); successful two-life progression plus wrong owner, mismatched handoff, source/root drift, missing START, duplicate/older receipt, premature resumed state, and wrong defeat ordering.
- **Committed, not yet observed passing:** `tests/av219_browser_three_player_chain.test.cjs` performs the same demands on the actual Chromium NES, including the original 256×240 canvas and PLAY/LEARN/VERIFY interface. CI includes it as nonblocking pending independent review.
- The policy test runs as a blocking GitHub Actions step.
- **No verified live-browser gameplay, newest hosted Pages deployment, or commercial NES cartridge claim is implied.**

## Next natural bound — AV-220

Close Phase 8 as an implementation freeze while preserving live-gameplay gates separately, and inspect the real browser results before awarding acceptance. The following phase must prioritize directly observed gameplay faults rather than more inferred success layers.

`.dlw`

# AV-214 — Repair exhausted START recovery in the original NES

**Phase 8:** 2 of 8 turns (25% implementation). **Independently verified live-browser gameplay acceptance:** still 0 gates; no passing browser result has been directly reviewed.

## Concrete code defect

The original AV-205 homebrew recovery policy made four START offers and then stayed in a terminal pending state. AV-203 deduplicated the recovery evidence ID after the first queue. If the original NES remained at title or game over, that episode had **no subsequent retry path**. This was confirmed by source inspection; a live-browser occurrence of the defect is still unverified.

## Controller-path repair

`dashboard/av205_priority_start.js` now permits one additional frame-bounded retry batch using the **same evidence ID and original NES controller**. Each batch offers at most four START actions, 48 NES frames apart, separated by 120 NES frames. The original cartridge's observed playing mode immediately cancels any remaining retry work. The total remains bounded to eight offers; when both windows are exhausted, `START_EXHAUSTED` is recorded rather than silently treating offered inputs as successful.

The repair keeps the original action completion receipts and preserves the cumulative attempt count across retry windows. Changed owner, ROM, session root, frame rewind or unexpected cartridge mode cancels the old episode. Calling `arm()` with the same evidence ID cannot create infinite retries.

`dashboard/av213_fault_isolator.js` now emits a distinct `START_RECOVERY_EXHAUSTED` fault candidate, allowing a future Chromium trace to distinguish an in-progress retry from permanent terminal exhaustion.

## Test results

- `tests/av214_start_retry.test.cjs`: passed direct functional execution with controlled inputs, including eight-offer maximum, retry cooldown, duplicate evidence ID, gameplay-state exit and player change.
- Existing `tests/av205_priority_start.test.cjs`, `tests/av206_start_receipt.test.cjs`, and updated `tests/av213_fault_isolator.test.cjs`: passed direct functional checks after preserving the previous attempt-accounting semantics.
- `tests/av214_browser_start_retry.test.cjs`: added to GitHub Actions as **nonblocking** until actual Chromium results are inspected. It requires the original NES canvas, an actual RAM playing state, bounded START offers and the existing three tools.
- No second emulator, synthetic RAM changes, fake action receipts, or altered playfield.

**Not established:** a live-browser occurrence of the diagnosed dead-end; an end-to-end successful recovery run; current hosted GitHub Pages publication; or commercial NES cartridge performance. Static and controlled-input results must not be promoted to those claims.

## Next natural bound — AV-215

Inspect actual Chromium input and cartridge state progression. If START still fails, isolate controller press/release timing; otherwise validate genuine sprite movement and A/B changes in the same live cartridge. Preserve one NES, Jane→Toph→Patricia, and PLAY/LEARN/VERIFY.

`.dlw`

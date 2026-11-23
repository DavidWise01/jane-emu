# AV-213 — Original NES Gameplay Fault Isolation

**Phase 8:** turn 1/8 (12.5% implemented). **Independently verified live Chromium gameplay acceptance:** 0 gates; actual browser result not yet available.

## Concrete control-path finding

Prior phases recorded real-cartridge mode, action offers, and some completed NES action receipts, but the live replay did not classify *which boundary* was preventing progress. A queued START is not necessarily a completed START; a frozen frame counter is not a failed gameplay strategy; a missing action completion is not proof that the button was ineffective. There was no consistent evidence split among these cases.

## AV-213 implementation

- Added `dashboard/av213_fault_isolator.js`: read-only, session-root- and cartridge-scoped, frame-aware candidate classifier. It examines the existing NES emulator frame clock, actual RAM game mode, AV-205 START policy, AV-208 gameplay pending receipt, and AV-202 accepted transfer records. It classifies `NES_FRAME_STALLED`, `START_NOT_COMPLETED`, `GAMEPLAY_RECEIPT_MISSING`, `TITLE_WITHOUT_START_REQUEST`, `DEFEAT_WITHOUT_HANDOFF`, and `HANDOFF_WITHOUT_RESTART`.
- Wired `dashboard/av201_live_observer.js` to record observations from the live NES every 60 ms. `JANE_AV201_MONITOR.snapshot().av213Faults` exposes the resulting bounded evidence. Distinct cartridge and session roots do not share status. No additional gameplay input, NES emulator, or RAM mutation occurs.
- The existing PLAY/LEARN/VERIFY controls and full-size playfield are unmodified.

## Verification and acceptance

`tests/av213_fault_isolator.test.cjs` passed controlled-input functional checks covering clock stalls, START completion versus offer, missing action receipts, defeated cartridge handoff, restart gaps, and cross-session isolation.

`tests/av213_browser_fault_trace.test.cjs` was committed as a nonblocking Chromium diagnostic. It loads the existing AV-201 homebrew ROM, verifies the real NES advances at least 120 frames, requires its original canvas and three tabs, and prints the actual observed cartridge state and fault candidates for review. The outcome of that browser test has **not been independently inspected or verified**. An available GitHub connector did not provide conclusive previous push-workflow results, and web access to the live arcade and Actions page was unsuccessful during this turn. No deployment or browser-success claim is made.

## AV-214 — next bound

Use actual Chromium fault candidates to repair a demonstrated problem with START, gameplay button completion, frame advancement, or handoff. Keep the original single NES and avoid a new policy layer unless the observed failure requires it.

`.dlw`

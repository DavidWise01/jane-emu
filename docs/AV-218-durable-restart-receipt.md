# AV-218 — Durable Completed START Receipt Across NES Handoffs

**Phase 8:** 6/8 implementation turns (75%). **Independently verified live Chromium gameplay gates:** 0; the new browser test is committed but its passing output has not been inspected.

## Concrete observed source-code defect

The AV-201 observer verifies a restarted NES life after at least 60 real playing frames. Previously, only *at that point* did it search the emulator's `recentTrials` ring for a completed START action after the last defeat. That ring can discard earlier records as new actions accumulate. A real START completion could thus be forgotten, leading to a false negative for gameplay continuity. A START from the wrong actor could also satisfy the older filter because it only checked button and frame, not owner or cartridge.

## AV-218 production repair

The new `dashboard/av218_restart_receipt.js` captures the first eligible **completed** START action as soon as it appears in the original NES trial history. Eligibility requires the observed cartridge root and ROM, the incoming player named by the accepted defeat transfer, and an end frame after that loss and no later than the observed frame. It records the actual trial ID and frame, with `source: completed-original-nes-trial`, inside that defeat cycle. It never creates input, writes NES RAM, or fabricates victory.

`dashboard/av201_live_observer.js` now keeps that receipt while the existing original NES continues to play. At 60 subsequent playing frames, certification requires the matching receipt, the correct incoming actor, an observed restart and the original defeat evidence ID. The event `AV203_RESUMED_FRAMES` includes `startReceiptFrame` to make the proof auditable. A second defeat requires its own completed START receipt; a previous player's trial cannot establish the new life.

The original NES `dashboard/arena.html` now loads the AV-218 module before the live observer. The NES canvas and PLAY/LEARN/VERIFY layout, same original controller, and Jane→Toph→Patricia rotation are preserved.

## Verification

- `tests/av218_restart_receipt.test.cjs` **passed direct controlled-input execution**, covering late trial eviction, rejected old-player and foreign-ROM/root receipts, wait for 60 actual resumed frames, no double certification, and a separate Patricia restart.
- All **188 inline arcade scripts** passed syntax parsing.
- `tests/av218_browser_restart_receipt.test.cjs` added to CI as a **nonblocking Chromium gate** requiring an actual original homebrew NES game over, accepted Jane→Toph handoff, matching completed START trial, and 60 sustained playing frames. It also checks the unchanged 256×240 NES canvas and three tool tabs.
- GitHub Pages deployment and actual passing Chromium results have not been independently verified. This iteration earns implementation progress, not live gameplay acceptance.

## Next natural bound — AV-219

Test repeated NES defeat/restart cycles through Jane→Toph→Patricia without assistance and establish that each life carries independent, matching completed START evidence. Repair any observed player rotation or controller continuity fault.

`.dlw`

# AV-217 — Preserve NES Gameplay Evidence Across Real Life Boundaries

**Phase 8:** 5 of 8 implementation turns (**62.5%**). **Independently verified Chromium gameplay gates:** 0; nonblocking browser result not yet reviewed.

## Concrete sustained-play fault and repair

The AV-216 evidence recorder allowed a sequence of actions from the same player and cartridge to remain part of one episode after an actual NES game-over and restart. Since the previous identity was only root, ROM and actor, a resumed player could inherit partial actions from an earlier life and satisfy the four-action sustained-play threshold without demonstrating that continuity within one life. Unbounded gaps between actions could similarly merge unrelated input intervals.

AV-217 updates the existing `dashboard/av215_input_effects.js` with a read-only `boundary()` API. The existing `dashboard/av201_live_observer.js` now invokes it on observed homebrew NES RAM $0005 states 0 (title) or 2 (game over), before the AV-202 original-controller handoff. The existing dashboard only forwards matching original session root, cartridge and actor context. The active episode is closed, while its completed-action evidence remains in the bounded archive.

Each new episode also begins after an action gap over 90 NES frames, after a frame rewind or an actor/cartridge/root change. An observed resumed playing state does not fabricate success, and no new controller, input path, or ROM RAM writes are introduced. The exact NES game display and the PLAY/LEARN/VERIFY layout remain intact.

## Verification

- `tests/av217_life_boundary_input.test.cjs`: direct functional execution passed. Demonstrates partial movements/A-B effects before and after real defeat **cannot** be combined to qualify sustained gameplay, while independently complete post-restart evidence can qualify. Also covers title boundary, long gap, player isolation and duplicate completed-action rejection.
- Existing AV-215 and AV-216 regressions passed direct functional execution after the modification.
- `tests/av217_browser_life_boundary.test.cjs` committed as nonblocking Chromium diagnostic requiring actual NES defeat RAM state, recorded life boundary, accepted next-player handoff and unchanged 256×240 NES canvas. Its outcome has not been independently verified.
- The functional boundary test is a blocking CI step. Previous Phase 7 evidence freeze remains unchanged.

## Next natural bound — AV-218

Use the actual Chromium defeat/restart trace to diagnose the first resumed-gameplay failure, especially where a new player inherits the controller but no longer sends successful START or A/B/D-pad input. Preserve one real NES, three rotating players, and the complete playfield.

`.dlw`

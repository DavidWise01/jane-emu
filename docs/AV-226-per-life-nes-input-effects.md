# AV-226 — Completed NES Controller Effects Bound to Each Player's Own Life

**Phase 9:** 6 of 8 implementation turns (**75%**). **Independently confirmed Chromium gameplay gates:** 0; browser diagnostic result has not been reviewed.

## Concrete acceptance defect

The AV-220 browser acceptance test treated any completed input effect attributed to Toph or Patricia as sufficient for that player. It did **not** require the effect to have occurred within the incoming player's actual observed restarted-life interval, and did not demand both A and B. As a result, stale, misordered or wrong-life action evidence could satisfy the test even when the restarted player had not shown both palette effects and movement during that life.

## AV-226 production verification

The new read-only module `dashboard/av226_life_effects.js` audits the original NES's AV-201 defeat/restart cycle records alongside AV-215 completed input-effect rows. Toph's evidence must fall between the first verified restart and Toph's next defeat. Patricia's evidence must begin after her own verified restart. Every counted row must match the original game root and cartridge, the incoming actor, a completed hardware trial with actual NES RAM change, strictly ordered start/end frames, and mode=1 before and after. Each life must demonstrate at least one directional movement and **both** A (palette byte `$16`) and B (palette byte `$2A`) changes. The verifier rejects offered-only actions and stale effects from title, defeat, the previous actor, another ROM, or outside the life interval. It does not control or alter NES gameplay.

`dashboard/arena.html` exposes `JANE_AV226_LIFE_EFFECTS()` and loads this module without changing the NES playfield, controller, rotation or PLAY/LEARN/VERIFY layout. The original AV-219 handoff audit remains separate and necessary.

## Tests

**PASS (controlled evidence):** `tests/av226_life_effects.test.cjs` validates two sequential Toph and Patricia lives and rejects a missing A, missing movement, pre-restart A, post-defeat B, foreign cartridge, offered-only action, defeated-mode action, and a START receipt from the wrong player.

**Committed, browser outcome unverified:** `tests/av226_browser_life_effects.test.cjs` waits for original NES multi-life continuity and requires the in-life verifier to qualify both players, with the same 256×240 canvas and three-tool interface.

A blocking GitHub Actions controlled regression and a nonblocking Chromium diagnostic were added. No browser or Pages success is claimed without inspecting run results.

## Next natural bound — AV-227

Use original Chromium action traces to repair the first independently observed gameplay-delivery failure. Maintain one NES, Jane → Toph → Patricia, complete playfield, and append-only evidence.

`.dlw`

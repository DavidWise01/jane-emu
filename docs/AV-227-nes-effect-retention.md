# AV-227 — Retain Genuine NES Input Evidence Across the Three-Player Handoff

**Phase 9:** 7 of 8 implementation turns (**87.5%**). **Independently inspected passing Chromium gameplay evidence:** none yet.

## Source-level failure

The AV-215 input recorder previously kept only its most recent 160 completed original NES trials. Its AV-226 per-player life auditor used only those rows to decide whether Toph and Patricia had demonstrated D-pad, A and B changes during their observed restarted lives. When subsequent actions filled the ring, Toph's genuine earliest completed input effects could disappear. That produced a **false negative** in two-life gameplay acceptance despite earlier source-qualified hardware observations.

## AV-227 repair

The existing read-only AV-215 recorder now maintains a separate bounded `proofRows` archive. The first genuine `NES_EFFECT_OBSERVED` with measured state change and real mode=1 before and after is preserved for each exact `root + ROM + actor + button`. This includes the original completed trial ID, frame span and NES RAM before/after values; it is not a button offer, fabricated observation or inferred win. Up to eight distinct original cartridge sessions are retained with at most three actors × seven buttons per session. Live `rows` remains capped at 160.

The AV-226 auditor now receives both the original recent ring and retained source observations. It removes duplicates using the original action ID, or the full source frame identity when the ID is unavailable, **before** counting movements and A/B changes. Each event still must fall within the correct actor's verified restarted NES life interval and match the original cartridge ancestry. This avoids both lost evidence and double counting.

No controller, ROM code, NES RAM, player rotation, canvas or three-tool layout was changed.

## Evidence

- **Passed controlled functional execution:** `tests/av227_completed_effect_retention.test.cjs`. After 250 subsequent completed diagnostics actions evict every original Toph and Patricia action from the live 160-row ring, the retained proof still qualifies both original restarted lives. Repeated copies don't inflate counts, caller snapshot mutations don't alter source memory, and foreign-cartridge records cannot qualify the original ROM.
- **Committed but not independently observed passing:** `tests/av227_browser_retained_effects.test.cjs`. Requires a real single-NES Jane→Toph→Patricia restart chain, retained completed Toph/Patricia A/B effects and correct original canvas/three-tool layout.
- GitHub Actions runs the controlled regression as blocking and the Chromium diagnostic as nonblocking. Latest push workflow and Pages deployment were not independently confirmed.

## Scope limitation

The archive preserves the *first* completed effect per actor and control for each root/ROM. It is adequate for the initial distinct Toph and Patricia lives in the required two-handoff acceptance chain. Long-running repeated cycles with the same player will need explicitly keyed per-life archives before being treated as separate new evidence.

## Next natural bound — AV-228

Freeze the eight-turn Phase 9 implementation with honest separation between tested source repairs and independently verified Chromium gameplay. Use browser failures to choose any next original NES controller or framebuffer repair.

`.dlw`

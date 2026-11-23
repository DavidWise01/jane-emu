# AV-216 — Sustained NES movement and A/B effect continuity

**Phase 8:** 4/8 implementation turns (**50%**). **Independently verified Chromium gameplay gates:** **0**; no current browser-run result has been reviewed.

## Concrete defect and correction

AV-215 deduplicated action completions with `root|rom|actor|trialId`. If a trial counter was reused after an NES restart or another gameplay interval, a **distinct** completed action could be discarded merely because its local ID had appeared earlier. Such a drop undermined evaluation of repeated gameplay even though the emulator had registered a new frame span. AV-216 extends the original action identity with the completed NES start and end frames. Exact repeated records remain deduplicated; recycled trial IDs at different frame spans remain distinct. This is a correction to the real input observation path, not a second controller or an injected game outcome.

## Sustained-play evidence

The existing AV-215 read-only input-effects module now tracks per-root, per-cartridge, per-actor contiguous episodes. Each episode requires **at least two NES D-pad movement effects, two A/B palette effects, and four completed actions** to be marked qualified. A single successful movement or palette action cannot qualify. Overlapping frame spans or an actor change start a fresh episode; previous episodes remain distinct. Evidence remains correlated RAM state, not causal proof of a button's effect, and it never asserts a win.

`JANE_AV215_INPUT_STATUS()` now includes `episodes` and `qualifiedEpisodes`. These observations are recorded by the same pre-dispatch and post-completion NES hooks already installed in `dashboard/arena.html`; that HTML and its full playfield were not modified in AV-216.

## Verification

- **PASS (controlled-input functional test):** `tests/av216_sustained_input_effects.test.cjs` — repeated D-pad and A/B state changes, reused trial IDs across distinct frames, exact-replay rejection, Jane → Toph → Patricia separation, and rejection of offered-only inputs.
- **PASS (regression):** existing AV-215 completed input-effects test.
- **Committed, not yet live-verified:** `tests/av216_browser_sustained_inputs.test.cjs` checks the actual Chromium NES, requiring real RAM effects and one sustained episode. It is a nonblocking GitHub Actions diagnostic until logs are inspected. The direct functional test is blocking in CI.
- **Preserved:** one NES, original playfield, PLAY/LEARN/VERIFY, Jane→Toph→Patricia, and the phase-7 evidence freeze.

## AV-217 — next natural bound

Inspect live-browser failures and repair the original NES input delivery or cartridge response responsible for an unqualified gameplay episode. Do not promote synthetic or controlled-input results to browser acceptance.

`.dlw`

# AV-210 — Goal-stall response and bounded counter-action probe

**Phase 7:** 6/8 implemented (75% turn progress). **Live gameplay acceptance:** remains unverified; no credit granted from policy tests.

## Gameplay change

AV-208's goal-closed-loop controller now measures not merely whether any pixel or NES RAM changed, but whether a completed action moved toward its concrete cartridge objective. When the same goal produces three consecutive completed, ineffective results, a single bounded opposite-action probe is offered through the **existing** NES controller: RIGHT ↔ LEFT or A ↔ B. The probe tests whether that input path changes the actual cartridge state. It does not count as a win, advance the original objective or invent a successful controller receipt. After the probe, gameplay returns to the original goal.

The probe keeps the existing adaptive hold limits (2–24 frames), completed-trial boundary, 90-frame missing-receipt release, ROM RAM observation and actor/root isolation. Changes are confined to the homebrew AV-201 live session, retaining the NES canvas, PLAY / LEARN / VERIFY and Jane → Toph → Patricia ownership.

## Tests and evidence

- `tests/av210_goal_stall_probe.test.cjs`: passed direct functional simulation. Checks three failures, exactly one probe, measured probe response, preservation of original objective, success-only progression and actor reset.
- Existing `av208_adaptive_gameplay.test.cjs` and `av209_missed_receipt_recovery.test.cjs`: both still passed direct functional simulation.
- `tests/av210_browser_goal_response.test.cjs` added to CI as a nonblocking live Chromium diagnostic. Requires actual NES RAM goal attainment and provenance of every probe from a stalled objective. Browser results have **not** been confirmed.
- GitHub Actions now includes a blocking AV-210 policy regression. Passing a nonblocking browser job or a Pages deployment must not be confused with verified gameplay.

## Next natural bound — AV-211

Evaluate measured progress per completed action and retain useful controller timing across the observed player rotation without conflating independent players' learned records. Check browser evidence before claiming gameplay acceptance.

`.dlw`

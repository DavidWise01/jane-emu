# AV-209 — Missed-controller-receipt recovery

**Phase 7:** 5/8 implementation turns (62.5%). **Live-browser acceptance:** still unverified and not counted.

## Defect and repair

The AV-208 policy retains a pending action until it sees a completed NES action receipt. While pending, `offer()` returns null. That allowed the older AV-207 gameplay fallback inside the original `chooseAction()` to select a competing command. An absent receipt could also keep AV-208 waiting indefinitely.

AV-209 adds `blocked()` to the existing AV-208 policy and calls it at the **original NES `startAction()` neutral boundary**, before any recovery/gameplay input choice. While a matching action is awaiting completion, the existing controller selects no competing action. When the receipt arrives, the previous AV-208 completion path measures its real RAM effect and releases the gate.

If no receipt appears after 90 emulator frames, AV-209 emits `MISSING_RECEIPT`, releases the pending action, and permits another attempt. **Missing proof of delivery is not counted as a failed gameplay action.** A measured goal already reached can still advance, but the record remains delivery-unknown. Mode changes, ownership changes, and clock rewind release stale pending actions without direct NES RAM writes or synthetic controller input.

## Verification

- `tests/av209_missed_receipt_recovery.test.cjs`: passed direct functional test covering pending-action serialization, 89/90-frame boundary, correct classification, resumed offers, actual completions, owner change, and defeat gating.
- All **184 inline scripts** in `dashboard/arena.html` parsed.
- `tests/av209_browser_receipt_recovery.test.cjs`: added a real Chromium gameplay diagnostic. It requires a real emulator lap, changed NES RAM, and distinguishes completed actions and delivery-unknown events in the output. Added to the Pages workflow as nonblocking pending verified browser outcome.
- The policy regression is blocking in the workflow.

**Not verified:** hosted Pages deployment, a passing Chromium test, all original NES controller actions, or other commercial game success. Phase 6 remains frozen, and no live gameplay gate is promoted on static/unit evidence alone.

## Next natural bound — AV-210

Inspect browser test failures and completed-action records, correct real action response timing and progress decisions, and preserve the same original arcade, PLAY/LEARN/VERIFY tabs, and full-size 256×240 NES framebuffer.

`.dlw`

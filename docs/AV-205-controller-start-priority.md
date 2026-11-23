# AV-205 — START priority in the original NES gameplay controller

**Phase 7:** turn 1/8 implemented (12.5% implementation; 0 verified live-browser gameplay gates in this phase).  
**Phase 6:** remains frozen at 100% implemented and 0/8 verified live-browser gates, per the original evidence ledger.

## Defect addressed

AV-203 sent one recovery request to the reciprocal helper and then treated that request as queued for good. The helper might offer several START attempts, but actual controller execution and entering the playing state were separate facts. The resulting handoff and reboot process had no explicit state-aware START priority tied to the NES's observed title/game-over RAM state.

## Production change

- `dashboard/av205_priority_start.js` is a small action-**offer** policy, not a second controller.
- AV-203 arms it only after matching the original AV-201 homebrew ROM, active run root, actor, frame, current mode (RAM $0005 = 0 title or 2 game over), and, after defeat, an accepted AV-202 handoff.
- The existing injected NES `startAction()` loop asks AV-205 for a high-priority `{button:'START',hold:12}` proposal at its normal neutral action boundary. The same old JSNES input dispatcher performs the button press.
- Retry offers are spaced 48 NES frames apart and capped at four per episode. Observing RAM mode = 1 (playing) ends the pending episode. Unexpected mode, changed owner/root/cartridge, or clock rewind cancels it.
- Preserves the standalone legacy emulator, arcade play area, 3 tabs PLAY/LEARN/VERIFY, one NES instance, the AV-201 original loss cartridge, and three actor banks.

## Verification evidence

`tests/av205_priority_start.test.cjs` passed direct deterministic functional execution using controlled inputs. The original arcade's **182** inline scripts were syntax parsed with no errors. GitHub commits and workflow registration are verified. The GitHub Actions browser test and newest hosted Pages deployment have **not** been independently verified, so live gameplay acceptance remains unearned. A green nonblocking AV-203 diagnostic or successful publish alone is insufficient to award gameplay acceptance.

## Next natural bound — AV-206

Prove in Chromium that the same old NES starts from title without a manual button, then loses and restarts after a transferred controller owner. Diagnose actual action records, frame advancement and on-screen sprite. Only make AV-203 a blocking gate after a directly observed passing test.

`.dlw`

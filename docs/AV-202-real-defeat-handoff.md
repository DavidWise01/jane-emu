# AV-202 — Cartridge-observed defeat-based three-player rotation

**Phase 6:** 6 of 8 turns implemented (75% implementation progress, NOT earned gameplay acceptance).  
**Phase 5:** frozen at 50% accepted, unchanged.

## Production change

The original shared NES and PLAY / LEARN / VERIFY interface remain intact. `dashboard/arena.html` now exposes a narrowly gated `JANE_AV202_DEFEAT_HANDOFF` callback *inside* the existing session/controller closure. The AV-201 read-only cartridge observer invokes it only on an observed transition from RAM $0005 = 1 (playing) to 2 (game over) in the original AV-201 homebrew cartridge.

Before transferring controller ownership, the authoritative host callback re-checks: current loaded ROM, session root, current actor, recent live frame number, cartridge RAM mode = 2, unique defeat evidence identifier and existing cooldown. A successful transfer calls the existing `switchTurn` exactly once and preserves the same ROM and advancing NES clock. A second invocation with the same evidence ID is rejected.

AV-202's event records identify the source accurately as `AV-201 ROM game-over RAM $0005`, not as a generic RAM-life decrement. No new emulator or controller is created; manual life-loss labels do not count as AV-202 evidence.

## New Chromium regression

`tests/av202_real_defeat_rotation_browser.test.cjs` loads the original loss cartridge and requires three real game-over-driven handoffs: Jane → Toph → Patricia → Jane. It checks identical root and ROM, increasing NES frames, recorded cartridge-loss evidence, a final handoff count of 3, three tool tabs, and no JavaScript errors. It drives START through the original arcade recovery control; it never calls manual `confirmDeath`.

Wired to the Pages CI as **nonblocking diagnostic** while its result remains unverified.

## Verification boundary

GitHub commits and workflow wiring are verified. Live Chromium success, hosted Pages deployment and autonomous restart after each loss have not been independently confirmed. No new gameplay acceptance percentage is earned from implementation alone. This is a purpose-built homebrew cartridge, not proof of commercial Punch-Out!! gameplay.

## Next natural bound — AV-203

Prove continuous unassisted gameplay/recovery over multiple complete life cycles and inspect actual AV-201/202 browser logs. Repair failures at the production controller/scheduler rather than relying on an invented second controller. Keep evidence fail-closed.

`.dlw`

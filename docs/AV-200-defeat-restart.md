# AV-200 — Defeat → START → Playing, without false graduation

Phase 6: iteration 4 of 8 (50% implementation progress), not gameplay acceptance. Phase 5 stays frozen at its earned 50%.

## What changed

Added a small, pure, fail-closed recovery gate in `dashboard/av200_defeat_restart.js` and a 12-assertion regression in `tests/av200_defeat_restart.test.cjs`. CI now runs the regression through `.github/workflows/jane-pages.yml`.

Gate requirements: same cartridge and run root, cartridge-specific **observed** game-over state, **completed** NES START action after defeat, cartridge-specific observed playing state at least 60 advancing NES frames after the completed START. Manual "Life lost" labels, offers (not completed actions), inferred hashes, or a rotating owner are insufficient.

## Critical evidence boundary

AV-193 is a homebrew movement-and-color cartridge with **no game-over state**. Consequently this gate is tested with deterministic synthetic state records; it is NOT yet connected to a cartridge's real death detector and does NOT prove live death/restart. No new emulator or controller is introduced. No production NES controller inputs were changed.

A future cartridge-specific adapter must derive both observed game-over and observed-playing facts from the *real* NES, retain raw input/frame evidence, and connect completed START records. Only then is a passing Chromium test meaningful. Never pass `verified:true` merely from a manual loss click or a game label.

## Remaining Phase 6 work

AV-201: cartridge-specific state extraction and end-to-end game mechanics; AV-202: defeat-based ownership transfer; AV-203: uninterrupted play; AV-204: phase freeze at earned percentage.

`.dlw`

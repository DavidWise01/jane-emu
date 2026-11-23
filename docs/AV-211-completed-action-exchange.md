# AV-211 — Completed NES gameplay evidence exchange

**Phase 7:** 7/8 turns implemented = **87.5%** implementation. Live Chromium acceptance remains **unverified**, not counted as passing. The Phase 6 acceptance freeze remains unchanged.

## Production behavior

Added `dashboard/av211_action_exchange.js` and wired it to the existing AV-208 action-completion callback in the single NES arcade. Only completed actions from the original AV-201 homebrew cartridge which actually change NES RAM **and achieve the goal**, with `probe:false`, are eligible to inform another actor. Events are keyed by root, cartridge, actor, start frame, completed frame, and button, then deduplicated. Manual labels, mere offers, ineffective actions, unrelated ROMs, cross-root runs, and contrary probes are excluded.

The exchange preserves **per-actor evidence ancestry**. Two distinct completed actions from another actor in the same cartridge/root allow a *timing hint*, but those actions are **not described as independent witnesses**: one emulator still produces one ancestry. On a new actor/session, AV-208 may seed only bounded hold values (6–10 frames) for a qualifying button. It never inherits the other actor's success counts, phase, objective certificates, or game-win claims. After initialization, the actor's own action outcomes control hold adjustments. No second emulator, synthetic input, or RAM mutation is introduced.

## Validation

- `tests/av211_action_exchange.test.cjs`: passed direct functional execution testing action-ID deduplication, manual/probe/ineffective exclusions, foreign root/ROM isolation, actor isolation, no independent-witness claims, and bounded timing inheritance.
- AV-208, AV-209 and AV-210 controlled-input functional regressions still passed.
- All **185** embedded arena scripts parsed without error.
- `tests/av211_browser_action_exchange.test.cjs` added as a **nonblocking** Chromium diagnostic requiring actual NES completed-action records followed by Jane → Toph transfer and separate Toph counts. No browser passing result has been independently reviewed, so none of those end-to-end claims are promoted.

## Next natural bound — AV-212

Close Phase 7 only at earned browser acceptance after inspecting real Actions logs. Address any genuine failures in movement, A/B action completion, homebrew defeat/restart, or real player handoff; retain the complete NES playfield and original PLAY / LEARN / VERIFY interface.

`.dlw`

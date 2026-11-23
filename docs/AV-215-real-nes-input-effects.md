# AV-215 — Real NES completed-input effects

**Phase 8:** 3/8 implementation turns = **37.5%**.  
**Live Chromium gameplay acceptance:** not independently verified.

## What changed

The original emulator is injected from the preserved v71 NES release, which holds the actual JSNES controller and 256×240 canvas. Previous gameplay checks could observe action proposals and some controller trials, but they did not preserve a simple direct pairing of hardware RAM state at dispatch and hardware RAM state at the original **completed-trial** boundary.

AV-215 adds `dashboard/av215_input_effects.js`, a read-only action/result classifier for the original AV-201 homebrew cartridge. Within the existing NES injection in `dashboard/arena.html`, one hook snapshots NES RAM $0002 (X), $0003 (Y), $0004 (palette) and $0005 (mode) immediately before the original action dispatch. A second hook, placed immediately before `memory.trials.push(record)`, sends that snapshot and the corresponding completed trial with the actual post-action NES RAM values. The host bridge accepts it only for the same active run root, cartridge and actor recorded by the live AV-201 observer.

The classifier distinguishes direction-specific X/Y changes, A/B palette changes and START's transition into playing. Missing or unobserved effects are labeled `COMPLETED_WITHOUT_EXPECTED_EFFECT`, not a successful gameplay action. It rejects duplicate action IDs, offered-only claims and invalid frames. It makes **no claims of causation** from a correlated RAM change and issues no input of its own.

The original NES, full canvas, three rotating players and PLAY/LEARN/VERIFY remain unchanged.

## Tests and evidence

- `tests/av215_completed_input_effects.test.cjs`: direct functional execution passed for RIGHT, LEFT, UP, DOWN, A, B and START, plus no-effect, duplicate, invalid and offered-only cases.
- All **187** arcade inline scripts passed syntax parsing after integration.
- `tests/av215_browser_input_effects.test.cjs`: added to CI as nonblocking Chromium diagnostic. It requires completed real-NES movement **and** A/B palette changes, verifies the 256×240 framebuffer and three tabs, and prints the observed action evidence. Browser outcome is not independently verified.
- No direct hosted Pages deployment or CI browser-run result was retrieved. This turn earns implementation progress, **not** live gameplay acceptance.

## Next natural bound — AV-216

Inspect completed-action evidence and repair the first demonstrated delivery or cartridge response mismatch. Focus on sustained playable NES movement, attack inputs and automatic loss-to-restart transitions; preserve all arcade constraints.

`.dlw`

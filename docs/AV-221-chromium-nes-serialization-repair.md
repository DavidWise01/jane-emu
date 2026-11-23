# AV-221 — Repair False Chromium NES Canvas Failures

**Phase 9:** 1/8 implementation turns = **12.5%**. **Independently verified live Chromium gameplay:** 0 gates accepted, until a passing run is inspected.

## Reproduced source-code defect

The AV-218, AV-219 and AV-220 Playwright browser tests each used `page.evaluate()` to return the NES's actual `HTMLCanvasElement` as part of the returned result, then asserted `result.canvas.width === 256` and `result.canvas.height === 240` outside the browser. DOM nodes are not reliable serialized objects across Playwright's browser-to-Node boundary; the test can receive an empty representation rather than the element's dimensions. That leads to a false browser failure even when the original NES canvas is present. The offending pattern was present in all three versioned test sources.

## Minimal repair

Each affected browser test now reads the original `#game` iframe's `#nesCanvas.width` and `#nesCanvas.height` **inside the browser**, returning only an ordinary object with numeric properties. The assertions still demand the original 256×240 NES physical framebuffer and the original three tabs, and the AV-219/220 tests still require genuine defeat/restart evidence and independently completed Toph and Patricia input effects. No runtime emulator/controller logic, page sizing, user interface or cartridge ROM was touched.

New blocking regression `tests/av221_browser_serialization.test.cjs` rejects the nonserializable DOM-return anti-pattern in all three acceptance tests, checks plain numeric dimension extraction, and confirms the browser-test scripts parse. The regression passed when evaluated against current GitHub file contents; the full GitHub Actions workflow outcome remains independently unverified.

## Evidence boundary

**Verified in source and controlled test:** three faulty Playwright result shapes corrected; corrected source parses; no regressions introduced to the actual gameplay code.

**Not verified:** real Chromium gameplay success, Toph/Patricia controller action completion, current GitHub Pages deployment. A fixed test is not a passing test.

## Next natural bound — AV-222

Review or execute Chromium to find the first actual NES START/ROM/controller failure. Correct real delivery/response behavior before adding higher-order policies. Preserve the original one-NES 256×240 playfield, PLAY/LEARN/VERIFY and Jane→Toph→Patricia.

`.dlw`

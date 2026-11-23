# AV-198 — Production A/B Controller Delivery

Date: 2026-11-22 (America/Chicago)  
Repository: DavidWise01/jane-emu  
Phase 6: turn 2 of 8 (25% of iterations implemented; **not** 25% gameplay acceptance)  
Phase 5 immutable checkpoint: 50% accepted at AV-196.

## Why this experiment

AV-197 probes browser keyboard controls, but the Jane NES cabinet also has a production autonomous action scheduler. A failed keypress proves neither that the autonomous scheduler is healthy nor that A/B actions arrive. Do not conflate these paths.

## Production Chromium test

`tests/av198_production_ab_browser.test.cjs` loads the original AV-193 homebrew NES cartridge in the existing `dashboard/arena.html` Chromium browser, starts it with the existing START recovery button, and observes up to 60 seconds of the existing live NES frame clock, action-trial records, RAM palette address $0004 and rendered player sprite pixels.

The gate requires:
1. The live frame clock advances by more than 120 frames.
2. Both A and B appear as **completed** real production action trials.
3. Cartridge RAM records A = $16 and B = $2A.
4. The rendered sprite displays different RGB values at these two palette states.
5. No browser page errors.

This gate does not write emulator RAM, inject a test controller, access the private `nes` object or create a second emulator. Test failure is diagnostic only.

## Status

- New AV-198 test and GitHub Pages workflow wiring: committed.
- Static JavaScript syntax: checked.
- End-to-end Chromium test outcome: **not yet verified**.
- Hosted GitHub Pages outcome: **not yet verified**.
- Verified A/B and movement gameplay: **not yet established**.

Both AV-197 and AV-198 are currently nonblocking diagnostic CI steps. A green deployment does **not** mean either diagnostic passed. Promote to a blocking acceptance gate only after a real passing browser run, with logs retained.

## Next natural bound — AV-199

Analyze AV-197 and AV-198 Chromium diagnostics, repair the input/focus or autonomous action scheduling defect where demonstrated, and rerun both tests as blocking gameplay gates. Preserve the NES and the three PLAY, LEARN, VERIFY tools. Do not claim commercial ROM compatibility from a deterministic NROM test cartridge.

`.dlw`

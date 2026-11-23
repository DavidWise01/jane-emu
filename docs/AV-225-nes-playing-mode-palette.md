# AV-225 — Playing-Mode Controller Gating and NES A/B Color Evidence

**Phase 9:** turn 5/8 (**62.5% implementation**). **Live Chromium gameplay acceptance:** 0 independently confirmed gates.

## Concrete cartridge defect

In the AV-201 homebrew NROM-128 program, the A/B and UP/DOWN/LEFT/RIGHT controller handlers ran even when the game-mode register $0005 was 0 (title) or 2 (defeated). That meant button presses could change the preceding life's sprite palette and coordinates while it was already over, or modify title-screen RAM before an authorized START. This is a genuine behavior in the generated 6502 code, independent of host controller policy.

## Production repair

The actual 6502 A/B and D-pad routines now check `LDA $05; CMP #1; BNE skip` before modifying zero-page sprite RAM. Only mode 1 (**PLAYING**) allows changes to X ($0002), Y ($0003) or palette ($0004). All four AV-223 movement bounds remain intact; A still selects palette byte `$16`, B selects `$2A`. START continues to be the only command authorizing a fresh life with position (120,108), palette `$30`, and the AV-224 palette/OAM-before-display staging. No second emulator, secondary controller, fabricated CPU writes or arcade layout change.

## Verified controlled execution

`tests/av225_6502_input_mode_gate.test.cjs` executes the original generated ROM instructions with NROM-128 mapping, serial $4016 reads and PPU palette/OAM writes. It explicitly tests title-screen A/B/directions being ignored; valid in-play A/B and directional responses; actual game-over mode 2; repeated A/B/directions while defeated leaving RAM entirely unchanged; actual START restoring new-life state; held START not resetting age; movement edges; and PPU staging. **Passed.** AV-222, AV-223 and AV-224 controlled regressions also passed.

## Real Chromium evidence requirement

`tests/av225_browser_ab_palette.test.cjs` is a nonblocking Chromium diagnostic. It requires the same original NES iframe to enter mode 1, observes completed A and B NES action effects, and records actual sprite RGB pixels (as well as RAM palette byte) at each matching visible frame. A and B must have different visible RGB values, and each must differ from background. It also preserves the physical 256×240 NES frame and exactly three tool tabs.

This browser test has been committed to CI, but its passing output and the most recent hosted GitHub Pages deployment are **not independently verified**. The new code earns implementation credit, not live gameplay acceptance.

## Next natural bound — AV-226

Inspect original NES Chromium A/B and post-defeat action effects through multiple player lives; repair a reproduced controller or framebuffer failure. Preserve Jane→Toph→Patricia, PLAY/LEARN/VERIFY and the full original NES playfield.

`.dlw`

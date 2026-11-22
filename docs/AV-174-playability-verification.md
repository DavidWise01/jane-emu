# JANE EMU — AV-174 Playability Verification

**Release:** AV-174 · **Date:** 2026-11-21  
**Repository:** https://github.com/DavidWise01/jane-emu  
**Baseline:** AV-173 commit 297515bce93bdffa536939a8419890074c067d81  
**Baseline Pages run:** https://github.com/DavidWise01/jane-emu/actions/runs/44973288350

> One plays. Two learn. The emulator comes first.

## Scope and observed status

The referenced AV-173 GitHub Pages workflow completed successfully. Its commit fixed two over-escaped regular-expression assertions in the static emulator startup preflight. **This is not evidence that ROM execution, START response, or game-over recovery works in a real browser.** No commercial ROM is bundled with this report. Do not report live gameplay as passed without an actual user-selected, lawfully obtained ROM and browser observations.

## Verification protocol

| Gate | Browser procedure | Acceptance condition | Current evidence |
| --- | --- | --- | --- |
| 1. Cartridge initialization | Open Pages arena; choose a local .nes ROM; try simplified canvas, then Cabinet view if needed. | Emulator displays an identifiable game title or first playable frame; no stuck loading state. | Not yet browser-verified |
| 2. Frame progression | Observe for 5 seconds after cartridge startup and capture two frame timestamps or visually distinct frames. | Frames advance consistently, without frozen canvas or JS exception. | Not yet browser-verified |
| 3. START response | Send START once, observe 2 seconds; retry using Cabinet original controls if necessary. | Screen transitions from title/menu into gameplay or game-specific start sequence. | Not yet browser-verified |
| 4. Game-over recovery | Reach defeat/game-over using a test cartridge or suitable reproducible state; try START, then RESET/reload. | Emulator recovers and resumes visible frame progression without reloading the website. | Not yet browser-verified |
| 5. Role rotation | During verified gameplay, confirm Jane plays while Toph and the third observer learn; rotate after a loss. | Exactly one active player; two observers; control handoff does not pause the emulator permanently. | Not yet browser-verified |

## Suggested evidence record (append only)

For each trial record: timestamp (ISO 8601), commit SHA, browser/version, view (Canvas/Cabinet), cartridge identifier without ROM bytes, ROM file hash if appropriate, event name, emulator frame counter or equivalent trace, input sent, observed transition, pass/fail/blocked, console errors, and screenshot reference. Keep derived findings separate from primary observations.

## Test failure hierarchy

**P0:** ROM cannot load; emulator frame clock frozen; START not delivered; recovery impossible.  
**P1:** Simplified canvas fails but Cabinet view works; role handoff breaks; repeated START necessary.  
**P2:** Visual telemetry out of sync, cosmetic effects, nonessential neural tooling errors.

## Release gate

Do not advance beyond AV-174 merely because static scripts parse or CI passes. Require at least one real browser ROM session demonstrating gates 1–4. A second cartridge should be tested for generality before claiming cross-ROM robustness. Record failed trials rather than overwriting evidence.

## AV-175 candidate — Replayable Evidence Capture

Only after AV-174 is demonstrated: build a ROM-safe append-only timeline of frame, input, screen transition, death, reset and handoff events. Compare repeated trials without storing or redistributing ROM content.

**Status at publication:** AV-173 Pages success verified; AV-174 runtime gameplay **unverified**.  
`.dlw`

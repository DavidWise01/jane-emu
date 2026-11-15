# Jane EMU — Mission Control

Jane is an experimental autonomous NES player and pixel-perception laboratory. This repository holds standalone HTML builds with an embedded JPG story of each iteration.

## Interface

- Left 50%: NES emulator and Player 1 controller.
- Right 50%: tabbed telemetry, sensors, perception, memory, evidence and advanced learning instruments.
- Bottom: collapsible skin gallery with ten selectable designs.

## Current version

AV-071: Cross-Game Semantic Transfer. Jane tests whether a word-to-action association learned in one cartridge holds in another, requiring independently rooted human-labeled evidence. A controlled gating test is not proof of transfer in commercial games.

Launch [Jane Mission Control](./index.html) or use the versioned release in releases/.


## AV-073 — Play ↔ Learn session continuity

- [Play the Git-connected dashboard](./dashboard/) (GitHub Pages: `/jane-emu/dashboard/`).
- Play the NES in the left pane; review trials and Git evidence in the right pane.
- The **Continuity** tab saves the reviewed evidence queue into browser-local storage, restores it after page reload, and supports JSON export/import. Exact repeated queue entries are not added twice.
- A checkpoint is an unlabeled observation of a reviewed session. It **is not** a NES RAM save, automatic learning claim, or independent witness.
- The public [Git memory pool](./memory/pool/index.json) remains append-only; pushing reviewed evidence requires an explicit repository-scoped GitHub token and a manual Publish action.
- Jane's GitHub evidence agent independently reduces repeated source roots, preserving contradictions. GitHub does not receive ROM bytes.

The standalone AV-073 edition includes a new JPEG visual story embedded in its HTML. The GitHub Pages dashboard implements the same reviewed-evidence continuity feature and retains the current repository-hosted playable release.

## Provenance

One starting NES state is one witness root even when multiple forks are produced. Pixel changes are observations, not rewards. A START press is not proof of reading an instruction. Unknown words remain unknown. Do not redistribute cartridge ROMs without rights.

Each JPEG story is a conceptual illustration rather than experimental proof.

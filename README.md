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

## The Wizard · Three-Player NES Arena

Play at [Wizard Arena](./dashboard/arena.html) or [Play ↔ Learn dashboard](./dashboard/index.html). The arena provides **three separate NES emulator instances** using one locally selected ROM file, with independent per-profile memory namespace. The players are **Jane (FAST, every frame)**, **Toph (CAREFUL, every four frames)** and **Patricia (BALANCED, every two frames)**. These are reaction profiles of the same experimental controller, **not independently trained personalities** and not a fictional native NES controller port 3. Cartridge bytes remain in the browser.

A master **0–100% speaker-volume slider**, plus mute/unmute, controls Jane's audible APU, with Toph and Patricia muted to prevent three soundtracks mixing. The three machines still emulate audio for their own sensors. Each cabinet displays frames, observed actions and scene counts. Those are not game victory scores; enter the actual visible game scores and click **Finish / Judge** to declare the winner. This avoids inventing game objectives from pixel motion.

The main [Play ↔ Learn Git dashboard](./dashboard/index.html) also exposes a volume slider and a link to the arena. GitHub Pages uses the Pages Actions workflow and tests `tests/test_wizard_arena.cjs` alongside learning policy tests.


## TE-081 — Teaching Effectiveness Arcade (v81)

[Launch v81 teaching arcade](./dashboard/v81.html). A self-contained canvas arcade lab presents Jane (student), TOPH (teacher), and Patricia (auditor), with speed control, pause, deterministic paired baseline/intervention trials, preregistered 6 training + 4 held-out seeds, a held-out improvement gate, skin hangar, and JSON evidence export. Simulation outcomes are illustrative synthetic measurements and **not** demonstrated improvement in a real NES cartridge. The same-seed A/B pair has one witness ancestry. The [actual ROM-based NES arena](./dashboard/arena.html) remains available separately. This release does not transmit ROMs or commit browser experiment logs automatically.

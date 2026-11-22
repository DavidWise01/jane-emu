# Jane EMU — Mission Control

Jane is an experimental autonomous NES player and pixel-perception laboratory. This repository holds standalone HTML builds with an embedded JPG story of each iteration.


## AV-174 — Playability verification (emulator-first)

- [Download the AV-174 PDF verification report](./docs/AV-174-playability-verification.pdf) (generated and published by Pages CI).
- [Read the source verification protocol](./docs/AV-174-playability-verification.md).
- Check ROM initialization, advancing frames, START input and recovery after game over in an actual browser session; use Cabinet view if Canvas fails.
- Static syntax checks and a successful Pages deployment are **not** proof of live ROM playability. Record browser observations before marking AV-174 passed.


## AV-176 — Screen transition candidates (non-invasive)

- [Open the live arena](./dashboard/arena.html), enable the existing screen tracer, and expand **AV-175 Playability Evidence** then **AV-176 Screen Transitions**.
- Three consecutive identical screen hashes produce a **candidate stable-screen transition**. The operator can label a visibly confirmed title, gameplay, game-over, or recovery screen.
- The label is scoped to the cartridge identifier and is reset appropriately when a session changes. Repeated matched screens receive the saved manual label, not an independently inferred claim.
- Export local append-only JSON evidence. No ROM bytes are sent or bundled. No automatic START, NES input injection, or alteration to role handoff is introduced.
- **Limit:** animated screens may never have three identical hashes. AV-176 does not establish real ROM playability or autonomous semantic classification; live browser testing is still required.

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


## TE-082 — Teaching Transfer Arcade

[Launch the v82 cross-pattern arcade](./dashboard/v82.html). Six STRAIGHT training seeds are followed by four distinct held-out hazard families (ZIGZAG, MIRROR, ACCELERATE, DECOY). The seed is paired within baseline/taught arms. This is a synthetic browser experiment, not actual NES learning. The preregistered gate requires positive held-out mean delta and improvements in at least three of the four distinct held-out families. DECOY is an explicit counterexample opportunity. Results remain local until exported as JSON. The NES emulator is preserved at [the actual NES arena](./dashboard/arena.html).


## TE-083 — Teaching Recovery Arcade

[Launch v83](./dashboard/v83.html). Run the original ten tests, preserve the DECOY counterexample and initial policy, then explicitly propose a repaired prediction rule. Patricia audits the revision on five predeclared fresh seeds (151, 157, 163, 167, 173), one per pattern family. The repair passes only if every audit pair beats the control and none regresses against the original taught rule. Audit results are appended to the browser-session ledger, including the revision event, and exported as JSON. The lesson is a deterministic toy policy, not evidence of actual autonomous NES learning. The [ROM-based arena](./dashboard/arena.html) remains unchanged.


## TE-084 — Recursive Teaching · Python server + JSON indexes

- [Arcade UI](./dashboard/v84.html) · [version index](./data/v84/index.json) · [lesson registry](./data/v84/lessons.json) · [Python server](./server_v84.py)
- Run locally using `python server_v84.py` from the repository root; visit `http://127.0.0.1:8784/`. Python standard library only. Binds to loopback by default.
- Local API: `GET /api/v84/index`, `GET /api/v84/lessons`, `GET /api/v84/audit` (read-only), `GET /api/v84/ledger`, and `POST /api/v84/run` with `{\"kind\":\"audit\"}` or `{\"kind\":\"trial\",\"seed\":151,\"family\":\"DECOY\"}`. POST appends JSONL evidence under `data/v84/runtime/evidence.jsonl` with parent SHA-256 digest chaining. The ledger is local, not auto-published. This chain is tamper-evident only relative to a trusted prior digest; it does not establish independent witnesses or prevent a privileged local operator rewriting storage.
- GitHub Pages is STATIC and cannot execute the Python API. The v84 page detects this and disables server actions; static JSON indexes remain browsable. Run a local Python server for persisted trials.
- Scope: a deterministic synthetic three-lane experiment, not actual NES training. The original ROM-based [NES arena](./dashboard/arena.html) remains accessible.


## AV-085 — Real .nes cartridges, not simulated hazards

Launch [Jane v85 real NES arcade](./dashboard/v85.html). The frontend **embeds the existing actual NES arena** (`dashboard/arena.html`) and loads a user-selected local `.nes` ROM into that browser emulator. The emulator itself (not Python) runs the ROM and supplies Jane/Toph/Patricia turn-taking, coaching telemetry, speed and game-specific death monitoring. An empty ROM is not included; use a legally obtained cartridge image.

**Local JSON evidence server:** run `python server_v85.py` from the repository root (Python standard library), then visit `http://127.0.0.1:8785/`. The new server hosts the NES frontend, serves `data/v85/index.json` at `/api/v85/index`, exposes `/api/v85/ledger`, and accepts `POST /api/v85/observe`. Press **Save NES Observation** during a running ROM to append metadata to the local `data/v85/runtime/observations.jsonl` journal, chained by SHA-256 digest. This is observation evidence, **not proof of improved NES gameplay**; ROM bytes are neither posted nor stored by Python.

GitHub Pages can host and execute the existing JavaScript NES emulator and load user-selected `.nes` files, but Pages **does not execute `.py` servers**. The frontend disables journal submission when its local API is unavailable. Existing v81–v84 synthetic demos are retained as historical prototypes, not the current NES arcade. Never treat a repeated observation of the same NES run as an independent witness.

## AV-086 — NES-native action trials

[Launch NES-native arcade](./dashboard/v86.html) · [Python server](./server_v86.py) · [JSON index](./data/v86/index.json).

The frontend keeps the real in-browser NES emulator and reads completed action trials from the existing JANE_PERCEPTION diagnostics. It records buttons, frame ranges, available screen hashes, and pixel differences. Pixel differences are observations, not game rewards or proof of teaching effectiveness.

Run locally: `python server_v86.py`; open `http://127.0.0.1:8786/`. The Python server accepts POST /api/v86/trials with a JSON object containing 1–30 trials. GET /api/v86/trials returns recent records, GET /api/v86/verify checks the hash chain, and GET /api/v86/index returns the protocol index. Locally persisted records go to data/v86/runtime/trials.jsonl. Identical session/trial pairs are deduplicated. The emulator ROM remains in the browser; no ROM bytes are submitted.

The interface includes manual Save Action Trials, five-second auto-save when Python is present, and JSON export. On GitHub Pages, the browser can run the actual .nes emulator, but no Python server or backend persistence is available. Compatibility still depends on the emulator and ROM mapper.

Tests: `python -m unittest discover -s tests -p 'test_server_v86.py'`. Next improvement: attach verified cartridge-specific life, score, or opponent-health outcomes; avoid treating arbitrary pixel changes as rewards. All observations from one emulator session share one witness ancestry.

## AV-087 — Embedded NES + GitHub Actions

The default landing page is [Jane v87](./dashboard/v87.html). It embeds the existing actual JavaScript NES emulator via [the turn-taking arena](./dashboard/arena.html), accepts local `.nes` cartridge images, and saves bounded observed action-trial metadata to browser localStorage every five seconds. It provides local SHA-256 journal verification and JSON export. No Python server is required for playing or observing in a browser. No ROM is uploaded by this feature.

[The Actions workflow](./.github/workflows/jane-arcade-v87.yml) validates JSON, compiles Python modules, runs tests, and deploys a static subset to GitHub Pages. GitHub Actions is a build/test/deploy environment, **not** a 24/7 NES hosting process. A browser executes the NES emulator after GitHub Pages loads the HTML/JS. The workflow deliberately excludes ROM uploads and local runtime journals. Its deployment requires Pages to be configured for GitHub Actions and relevant repository permissions.

Python servers `server_v84.py`, `server_v85.py`, and `server_v86.py` remain optional development tools. They do not need to be running to use v87. Browser storage is device/browser scoped, may be cleared, and is not synchronized to GitHub. Export JSON to retain a durable archive. SHA-256 chaining can detect altered local journal entries relative to a trusted digest; it is not an independent witness or proof of improved NES gameplay.

## AV-088 — First cartridge: Punch-Out!!

[Launch Jane v88 Punch-Out!! arcade](./dashboard/v88.html) · [Punch-Out JSON profile](./data/v88/punchout.json) · [Actions workflow](./.github/workflows/jane-arcade-v87.yml).

The arcade runs the existing actual NES emulator inside its game cabinet; the game file must be selected locally by the user. Glass Joe is the first opponent in the match desk. Jane, Toph and Patricia continue sharing a single emulator and taking turns through the existing handoff system. The match desk adds manual opponent knockdowns, Jane knockdowns, win/loss confirmation, round and opponent selection, browser-local match evidence, and JSON export. Confirm Jane Down also requests a handoff through the existing arena controls.

Opponent knockdowns, match victories and losses are **human-confirmed labels**, not automatically recognized from the ROM. The NES emulator continues to capture controller/frame/pixel observations separately, and no undocumented memory offsets are assumed. Browser-local evidence is not Git-published automatically. A ROM-based gameplay test with a lawfully supplied cartridge is still needed to establish mapper compatibility and player behavior.

GitHub Actions now validates data/v88/punchout.json and stages dashboard/v88.html for Pages; Python servers are optional and not required to play. Only user-owned ROM files chosen locally at runtime are used. The next target is verified game-specific RAM observation for round, health, and knockdown state, followed by controlled before/after teaching trials.

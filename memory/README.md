# Jane evidence pool / append-only memory

This **public repository** is Jane's durable, evidence-carrying memory surface—not an LLM memory service, ROM archive, or private data store.

## Architecture

- `agent/jane_agent.py`: deterministic worker executed through GitHub Actions every six hours and on demand.
- `memory/inbox/*.json`: public evidence packets submitted via normal Git commits.
- `memory/pool/events/<sha256>.json`: immutable content-addressed events. Existing events are never modified or deleted by the agent.
- `memory/pool/index.json`: derived cache of event IDs and independently-rooted word/button evidence. Can be rebuilt from immutable events.
- `.github/workflows/jane-memory.yml`: tests, imports and commits only genuinely new events. Uses a concurrency guard.
- `.github/workflows/jane-pages.yml`: separate playable-site deployment; the memory worker does not edit Jane's emulator HTML.

The worker also fingerprints the latest playable HTML. It does **not** run games, interpret pixels on GitHub's servers, hallucinate action outcomes or create evidence from lack of input.

## Manual observation entry

Add a new UTF-8 file to `memory/inbox/` (e.g. `trial-001.json`), commit, and let GitHub Actions run:

```json
{
  "kind": "outcome_label",
  "rom": "example-nes-rom-fingerprint",
  "source_root": "independent-start-state-001",
  "source": "human-labeled-nes-trial",
  "word": "START",
  "button": "START",
  "outcome": "beneficial",
  "frame": 300,
  "note": "Label provided by a human after seeing a specific game result."
}
```

Supported kinds: `observation`, `outcome_label`, `checkpoint`. Outcomes: `beneficial`, `harmful`, `neutral`, `unknown`. Buttons: `START`, `SELECT`, `UP`, `DOWN`, `LEFT`, `RIGHT`, `A`, `B`, `NONE`. Always provide `rom`, `source_root`, and `source`. No duplicate roots counted as separate witnesses. Three independent beneficial roots with no harmful evidence yield only **SUPPORTED_PROVISIONAL**, never proven semantic comprehension.

You can also run **Actions → Jane Memory Agent — Evidence Pool → Run workflow**, optionally pasting one small public evidence JSON object into the input.

**Privacy and licensing:** This repo is public. Never upload ROM binaries, ROM-derived proprietary assets, API tokens, personal health information, or private GitHub material. Browser localStorage is private to the browser and does not automatically sync to this pool; export and submit evidence explicitly.

## Causality and ancestry

A saved-state fork and each of its replay branches share one ancestry. A GitHub file and its public-site mirror share one ancestry. Source independence is checked by `source_root`, not by number of files or URL appearances. Harmful or contradictory labels contest confidence; absence of evidence means abstain.

## AV-074: Verified Memory Reuse

Each newly submitted `outcome_label` may include `context`, the **exact pre-action screen fingerprint** associated with the human-labeled trial (a safe token of 1–128 characters). The agent groups word/action evidence by `rom`, `context`, `word` and `button` and counts distinct `source_root` values, not repeated forks. It adds `context_bound` to the derived index. Legacy records without `context` remain visible, but they are not eligible for live recall.

The dashboard's **MEMORY REUSE** tab is observation-only: it requires an exact current cartridge and context match, a confirmed recognized word, at least three distinct beneficial roots and zero contradictory/harmful roots. Even when every gate passes, the dashboard displays an evidence-backed candidate; **it never presses a controller button from Git memory**. If a field cannot be measured, the result is **ABSTAIN**. Current screen hashes and confirmed word status are queried only from an accessible same-origin NES player.

This protects the distinction between historical evidence and new independent trials. Pixel change alone is not a beneficial outcome, and GitHub memory isn't a source of independently verified gameplay understanding.

## AV-076: Experiment feedback closure

The Play ↔ Learn dashboard's **FEEDBACK** tab freezes one evidence-gap question *before* the next completed NES action. The existing autonomous controller remains the only Player 1 controller. A changed cartridge, different button, pre-existing frame, or missing witness ancestry rejects the question's outcome instead of searching for a conveniently matching later trial.

A matching trial is recorded locally as `experiment_feedback` and optionally submitted through the existing opt-in Git workflow. An accepted packet uses this narrowly typed public schema:

```json
{
  "kind": "experiment_feedback",
  "question_id": "q-example-001",
  "rom": "rom-fingerprint",
  "context": "pre-action-screen-fingerprint",
  "button": "START",
  "source_root": "independent-starting-state-root",
  "source": "nes-action-observation",
  "status": "OBSERVED_UNLABELED",
  "pixel_change_bp": 1200,
  "frame": 240,
  "note": "Observed pixel response only; no human benefit label or semantic proof"
}
```

`pixel_change_bp` is measured pixel change in basis points (0–10,000), **not** reward. The memory agent refuses a forged `outcome` field on feedback packets, and records `feedback_summary` with independent observation roots per question ID. It does **not** add feedback packets to human-labeled `associations` or claim uncertainty reduction. A human-labeled outcome belongs to a separate `outcome_label` event, with its own verified provenance and context.

The workflow regression tests exercise: frozen-question ordering, input/cartridge mismatch, anti-cherry-picking behavior, missing root or invalid pixel delta, same-source deduplication, and refusal to turn observations into beneficial labels. Nothing in AV-076 sends input from the dashboard, publishes ROM bytes, or silently writes to GitHub.

## AV-077: Adaptive question refinement

The new **REFINEMENT** tab is a prospective pixel-response checker, not a reward learner. When AV-076 arms an evidence-gap question, the v77 module looks only at **earlier** locally reviewed experiment-feedback events for the **same ROM, exact screen context, and button**, counting each source-root ancestry once. Three distinct prior roots are required before it freezes a numeric prediction; otherwise the state is `UNTRAINED` and Jane abstains from forecasting.

The pre-action forecast is the median pixel-change measurement and a descriptive empirical span from prior minimum to maximum, expanded by 250 basis points. It is **not a statistically calibrated confidence interval**. After the next rooted action, the observed pixel delta is scored against those frozen values and classified as `WITHIN_BAND`, `BOUNDARY_MISS`, or `NEEDS_ROOTS`. This is measurement-prediction performance, **never** proof of beneficial gameplay or semantic progress. Unknown words and missing contexts still block arming. No second controller is introduced.

Existing `experiment_feedback` events can now optionally carry `refinement_state`; trained forecasts also carry exact integer `predicted_pixel_bp`, `prediction_low_bp`, `prediction_high_bp`, `prediction_error_bp`, and `prior_root_count`. The agent validates consistency with the measured response and refuses post-hoc mismatched error/interval reports. The derived `feedback_summary` tracks numbers of scored predictions and boundary misses without adding them to human-labeled reward associations. Local queue and optional Git publication remain separate, and ROM bytes are never uploaded.

## AV-078: Independent impact verification and memory curator

The **IMPACT** instrument compares an AV-077 baseline pixel-change forecast with a revised numerical forecast, both frozen before a new experiment. A holdout observation is valid only when its `source_root` is absent from the training roots and its cartridge/context/button match. Lower held-out absolute error means **better prediction of pixels on this holdout**, not better gameplay or semantic learning. Training leakage, missing measurements, and invalid context yield abstention. The tool never presses controller buttons.

The **JANE MEMORY CURATOR** is a GitHub Actions worker (`agent/jane_curator.py`, `.github/workflows/jane-curator.yml`) with a public **Memory Curator** tab in GitHub Pages. Every six hours, on relevant pool changes, or when manually dispatched, the worker verifies every immutable event's SHA-256 identifier, cross-checks the pool index, deduplicates evidence by `source_root`, and publishes a **derived** `memory/curation/current.json`. It does **not** overwrite or reinterpret immutable events and does **not** count website mirrors as independent witnesses.

### Optional model-backed AI analyst

The curator works without any model API credentials, publishing deterministic summaries marked `ai.state=NOT_CONFIGURED`. To enable a model to synthesize short, cautious observations about unresolved evidence, add the repository Actions secret **`JANE_AI_KEY`** (an OpenAI API key) under **Settings → Secrets and variables → Actions**; optionally set repository variable **`JANE_AI_MODEL`** (default `gpt-6`). The worker uses the Responses API from inside GitHub Actions and only passes bounded structured public evidence—not ROM data, private files, or free-text event notes. No API key ever belongs in the static GitHub Pages JavaScript.

AI-generated commentary is labeled `MODEL_SYNTHESIS_UNVERIFIED`. It is advisory text and cannot change sourced witness counts, provenance, or controller actions. Missing key or model failure falls back to deterministic curation. **GitHub Models was retired in July 2026 and is not used.**

The current public memory pool may contain only release fingerprints. If it contains no independently labeled learning outcomes, the correct curator status is `INSUFFICIENT_LEARNING_EVIDENCE`, not a success claim. The curator will become more useful only after reviewed gameplay evidence is explicitly submitted to GitHub.

## One-screen watch → learn → play rotation

The Wizard Arena at `dashboard/arena.html` is **one continuous NES machine**, not three separate games. Jane, Toph and Patricia take turns controlling **the single real NES Player 1 port** through the emulator's existing autonomous policy at FAST, CAREFUL and BALANCED reaction profiles. Everyone watches the same exact frame stream while one agent plays. Their observation counters represent shared observations, **not** separate independent source roots or separate trained model identities.

Play order is **Jane → Toph → Patricia → Jane**. A handoff changes the active policy speed and records the event without resetting NES ROM, frame count, or memory. The user can confirm a death with the **Confirm life lost** button. Optional automatic loss detection requires an externally verified game-specific NES internal RAM lives address (`0000–07FF`) and a stable single-life decrement on three samples with a cooldown. No common RAM lives counter exists across cartridges; without a verified address, handoffs remain manual rather than speculatively detecting death from arbitrary pixels.

The session export preserves the shared game-root identifier, controller history, and watcher measurements, with **one source ancestry for every shared frame**. It is a local download; no ROM content or credential is uploaded to GitHub. The arena includes one shared 0–100% volume slider and mute control. The main Play ↔ Learn dashboard links to the arena.

## AV-080: Toph observes, teaches Jane, and Patricia audits

The shared single-screen `dashboard/arena.html` keeps **Jane as the initial Player 1**. Toph and Patricia observe the same NES frames and preserve their common source ancestry. Toph's deterministic teacher (`dashboard/av080_coach.js`) reads the emulator's completed-trial records: cartridge fingerprint, pre-action screen context, button, and measured pixel change. Repeated exact-context trials let Toph ask a bounded exploratory question: which eligible controller button has been tested least on this same screen?

After the boot/title lesson is marked learned, and no more frequently than once per 240 NES frames, the coach can supply a proposed button through the existing `chooseAction()` function. **Jane** remains responsible for the actual button press. The proposal is single-use and withheld on new/unread contexts, while booting, or while the coach is disabled. The resulting completed trial is compared against the proposed question and logged as an unlabeled observation; it is not automatically classified as beneficial or game-winning. Toph therefore learns an observation pattern and teaches an experiment, not an established winning strategy.

Patricia serves as a shared-ancestry audit observer and does not create a third independent witness merely by watching Jane's screen. Coaching can be switched off via **Toph sends bounded experiments**. Source code is public on GitHub, and the local teaching trace can be exported via the existing evidence JSON button. Publishing gameplay evidence into the Git pool still requires explicit review and opt-in GitHub publication. A lesson alone never creates a positive reward vote.

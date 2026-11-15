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

#!/usr/bin/env python3
"""Jane evidence agent: deterministic, append-only, no ROMs or invented outcomes."""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
from collections import defaultdict
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
POOL = ROOT / "memory" / "pool"
EVENTS = POOL / "events"
INBOX = ROOT / "memory" / "inbox"
SCHEMA = "jane.evidence.v1"
KINDS = {"observation", "outcome_label", "checkpoint", "experiment_feedback"}
BUTTONS = {"START", "SELECT", "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "NONE"}
OUTCOMES = {"beneficial", "harmful", "neutral", "unknown"}
SAFE = re.compile(r"^[a-zA-Z0-9_.:/-]{1,128}$")


def canonical(obj: dict) -> bytes:
    return json.dumps(obj, sort_keys=True, ensure_ascii=True, separators=(",", ":")).encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def token(value, field, required=False):
    if value is None and not required:
        return None
    if not isinstance(value, str) or not SAFE.fullmatch(value):
        raise ValueError(f"{field}: expected safe nonempty token of up to 128 characters")
    return value


def validate(raw: object) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("Event must be an object")
    if len(canonical(raw)) > 16000:
        raise ValueError("Event exceeds 16 KB")
    allowed = {"kind", "rom", "source_root", "source", "word", "button", "outcome", "frame", "note", "recorded_at", "context", "question_id", "pixel_change_bp", "status", "refinement_state", "predicted_pixel_bp", "prediction_low_bp", "prediction_high_bp", "prediction_error_bp", "prior_root_count"}
    if set(raw) - allowed:
        raise ValueError("Unexpected event fields")
    kind = raw.get("kind")
    if kind not in KINDS:
        raise ValueError("Unsupported kind")
    doc = {"schema": SCHEMA, "kind": kind, "rom": token(raw.get("rom"), "rom", True),
           "source_root": token(raw.get("source_root"), "source_root", True),
           "source": token(raw.get("source"), "source", True)}
    if raw.get("context") is not None:
        doc["context"] = token(raw["context"], "context", True)
    if kind == "experiment_feedback":
        doc["question_id"] = token(raw.get("question_id"), "question_id", True)
        doc["button"] = token(raw.get("button"), "button", True)
        if doc["button"] not in BUTTONS or doc["button"] == "NONE":
            raise ValueError("Invalid experimental button")
        if "context" not in doc:
            raise ValueError("Experimental feedback requires frozen screen context")
        if raw.get("status") != "OBSERVED_UNLABELED":
            raise ValueError("Feedback must remain unlabeled")
        doc["status"] = "OBSERVED_UNLABELED"
        delta = raw.get("pixel_change_bp")
        if isinstance(delta, bool) or not isinstance(delta, int) or not (0 <= delta <= 10000):
            raise ValueError("pixel_change_bp must be integer from 0 to 10000")
        doc["pixel_change_bp"] = delta
        refinement = raw.get("refinement_state")
        if refinement is not None:
            if refinement not in {"NEEDS_ROOTS", "WITHIN_BAND", "BOUNDARY_MISS"}:
                raise ValueError("Unsupported refinement state")
            doc["refinement_state"] = refinement
            fields = ("predicted_pixel_bp", "prediction_low_bp", "prediction_high_bp",
                      "prediction_error_bp", "prior_root_count")
            if refinement == "NEEDS_ROOTS":
                if any(raw.get(field) is not None for field in fields):
                    raise ValueError("Untrained forecast cannot claim prediction metrics")
            else:
                if any(isinstance(raw.get(field), bool) or
                       not isinstance(raw.get(field), int) for field in fields):
                    raise ValueError("Prediction requires all exact integer metrics")
                if any(not 0 <= raw[field] <= 10000 for field in fields[:-1]):
                    raise ValueError("Prediction basis points outside range")
                if not 3 <= raw["prior_root_count"] <= 100000:
                    raise ValueError("Prediction requires three prior roots")
                if raw["prediction_low_bp"] > raw["prediction_high_bp"]:
                    raise ValueError("Invalid interval")
                if abs(raw["predicted_pixel_bp"] - delta) != raw["prediction_error_bp"]:
                    raise ValueError("Forecast error does not match observation")
                inside = raw["prediction_low_bp"] <= delta <= raw["prediction_high_bp"]
                if inside != (refinement == "WITHIN_BAND"):
                    raise ValueError("Refinement classification contradicts measured response")
                for field in fields:
                    doc[field] = raw[field]
        elif any(raw.get(field) is not None for field in ("predicted_pixel_bp", "prediction_low_bp",
                             "prediction_high_bp", "prediction_error_bp", "prior_root_count")):
            raise ValueError("Forecast metrics require a refinement state")
        if raw.get("outcome") is not None:
            raise ValueError("Experimental feedback cannot assert an outcome label")
        if raw.get("word") is not None:
            doc["word"] = token(raw.get("word"), "word")
    if kind == "outcome_label":
        doc["word"] = token(raw.get("word"), "word", True)
        doc["button"] = token(raw.get("button"), "button", True)
        if doc["button"] not in BUTTONS:
            raise ValueError("Unknown button")
        if raw.get("outcome") not in OUTCOMES:
            raise ValueError("Unknown outcome")
        doc["outcome"] = raw["outcome"]
    else:
        for name in ("word", "button"):
            if raw.get(name) is not None:
                doc[name] = token(raw[name], name)
    frame = raw.get("frame")
    if frame is not None:
        if isinstance(frame, bool) or not isinstance(frame, int) or not (0 <= frame <= 10**12):
            raise ValueError("frame must be nonnegative integer")
        doc["frame"] = frame
    note = raw.get("note")
    if note is not None:
        if not isinstance(note, str) or len(note) > 500:
            raise ValueError("note must be 500 characters or fewer")
        doc["note"] = note
    timestamp = raw.get("recorded_at")
    if timestamp is not None:
        if not isinstance(timestamp, str) or len(timestamp) > 40:
            raise ValueError("invalid recorded_at")
        # A supplied timestamp is a claim from the producer, not a runner clock.
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        doc["recorded_at"] = timestamp
    return doc


def write_event(record: dict) -> bool:
    raw = canonical(record)
    id_ = digest(raw)
    target = EVENTS / f"{id_}.json"
    if target.exists():
        if target.read_bytes().strip() != json.dumps(record, sort_keys=True, ensure_ascii=True, indent=2).encode("utf-8").strip():
            raise ValueError("Existing event hash has different contents")
        return False
    target.write_text(json.dumps(record, indent=2, ensure_ascii=True, sort_keys=True) + "\n", encoding="utf-8")
    return True


def latest_release() -> dict | None:
    index = ROOT / "index.html"
    if not index.exists():
        return None
    match = re.search(r"url=\./(releases/[^\"<>\s]+\.html)", index.read_text(encoding="utf-8"))
    if not match:
        return None
    path = ROOT / match.group(1)
    if not path.is_file():
        raise RuntimeError(f"Launch target missing: {path}")
    data = path.read_bytes()
    return {"schema": SCHEMA, "kind": "release", "path": match.group(1),
            "sha256": digest(data), "size": len(data),
            "jpg_embedded": b"data:image/jpeg;base64," in data,
            "source_root": "owned/jane-emu", "source": "github/main"}
    

def rebuild_index() -> dict:
    records = []
    for path in sorted(EVENTS.glob("*.json")):
        rec = json.loads(path.read_text(encoding="utf-8"))
        if digest(canonical(rec)) != path.stem:
            raise ValueError(f"Tampered memory event: {path}")
        records.append({"id": path.stem, **rec})
    evidence = defaultdict(lambda: defaultdict(list))
    for rec in records:
        if rec.get("kind") == "outcome_label":
            evidence[(rec["rom"], rec["word"], rec["button"], rec.get("context", "UNSPECIFIED"))][rec["source_root"]].append(rec)
    # A pixel-response record is never a beneficial-outcome witness.
    feedback = defaultdict(lambda: defaultdict(list))
    for rec in records:
        if rec.get("kind") == "experiment_feedback":
            feedback[(rec["rom"], rec["question_id"], rec["context"], rec["button"])][rec["source_root"]].append(rec)
    feedback_summary = []
    for (rom, question_id, context, button), roots in sorted(feedback.items()):
        feedback_summary.append({
            "rom": rom, "question_id": question_id, "context": context, "button": button,
            "independent_observation_roots": len(roots),
            "observations": sum(len(events) for events in roots.values()),
            "outcome": "UNLABELED", "semantic_gain": "UNPROVEN",
            "predictions_scored": sum(1 for items in roots.values() for r in items if r.get("refinement_state") in ("WITHIN_BAND", "BOUNDARY_MISS")),
            "boundary_misses": sum(1 for items in roots.values() for r in items if r.get("refinement_state") == "BOUNDARY_MISS")
        })
    associations = []
    for (rom, word, button, context), roots in sorted(evidence.items()):
        # One ancestry, one vote. Contradiction inside a root is not corroboration.
        good, bad, unresolved = 0, 0, 0
        for events in roots.values():
            labels = {e["outcome"] for e in events}
            if labels == {"beneficial"}:
                good += 1
            elif "harmful" in labels:
                bad += 1
            else:
                unresolved += 1
        state = "CONTESTED" if bad else ("SUPPORTED_PROVISIONAL" if good >= 3 else "INSUFFICIENT")
        associations.append({"rom": rom, "word": word, "button": button,
                             "context": context, "context_bound": context != "UNSPECIFIED",
                             "beneficial_roots": good, "harmful_or_conflicting_roots": bad,
                             "other_roots": unresolved, "status": state})
    index = {"schema": SCHEMA, "event_count": len(records),
             "event_ids": [e["id"] for e in records],
             "feedback_summary": feedback_summary,
             "latest_release": next((r for r in reversed(records) if r["kind"] == "release"), None),
             "associations": associations,
             "policy": "No unverified word reading, gameplay benefit, or independent witnesses may be inferred."}
    (POOL / "index.json").write_text(json.dumps(index, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return index


def main():
    EVENTS.mkdir(parents=True, exist_ok=True)
    INBOX.mkdir(parents=True, exist_ok=True)
    created = 0
    rel = latest_release()
    if rel and write_event(rel):
        created += 1
    for path in sorted(INBOX.glob("*.json")):
        if path.stat().st_size > 16384:
            raise ValueError("Oversized input: " + path.name)
        document = json.loads(path.read_text(encoding="utf-8"))
        if write_event(validate(document)):
            created += 1
    manual = os.environ.get("JANE_OBSERVATION_JSON", "").strip()
    if manual:
        if write_event(validate(json.loads(manual))):
            created += 1
    index = rebuild_index()
    print(f"Jane agent: {created} new event(s), {index['event_count']} immutable records, {len(index['associations'])} candidate word/action associations")
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(f"## Jane evidence pool\n\n- New immutable events: **{created}**\n- Total immutable events: **{index['event_count']}**\n- Word/action associations: **{len(index['associations'])}**\n\nNo emulator learning or gameplay success was inferred from this maintenance run.\n")


if __name__ == "__main__":
    main()

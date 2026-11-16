#!/usr/bin/env python3
"""Jane v86 real NES telemetry server.
The NES emulator executes in the user's browser. Only bounded observations
are written to a local append-only, hash-linked JSONL journal.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from server_v85 import Handler as PriorHandler, ROOT

INDEX = ROOT / "data" / "v86" / "index.json"
JOURNAL = ROOT / "data" / "v86" / "runtime" / "trials.jsonl"
LOCK = threading.Lock()
ALLOWED = {"A", "B", "START", "SELECT", "UP", "DOWN", "LEFT", "RIGHT", "NONE"}
HEX = re.compile(r"^[a-fA-F0-9]{1,128}$")
SESSION = re.compile(r"^[a-zA-Z0-9_-]{8,90}$")

def validate_trial(row):
    if not isinstance(row, dict):
        raise ValueError("trial must be object")
    allowed = {"session_id", "rom_id", "trial_id", "frame", "end_frame", "button",
               "pre_hash", "post_hash", "pixel_delta", "actor", "source_root"}
    if set(row) - allowed:
        raise ValueError("unknown trial fields")
    if not isinstance(row.get("session_id"), str) or not SESSION.fullmatch(row["session_id"]):
        raise ValueError("invalid session_id")
    if not isinstance(row.get("source_root"), str) or row["source_root"] != row["session_id"]:
        raise ValueError("source root must match one browser session")
    if not isinstance(row.get("rom_id"), str) or not 1 <= len(row["rom_id"]) <= 120:
        raise ValueError("invalid rom_id")
    if not isinstance(row.get("trial_id"), str) or not 1 <= len(row["trial_id"]) <= 120:
        raise ValueError("invalid trial_id")
    for key in ("frame", "end_frame"):
        if type(row.get(key)) is not int or not 0 <= row[key] <= 1_000_000_000:
            raise ValueError("invalid " + key)
    if row["end_frame"] < row["frame"]:
        raise ValueError("end before start")
    if row.get("button") not in ALLOWED:
        raise ValueError("unsupported button")
    if row.get("actor") not in ("JANE", "TOPH", "PATRICIA", "UNKNOWN"):
        raise ValueError("invalid actor")
    for key in ("pre_hash", "post_hash"):
        value = row.get(key)
        if value is not None and (not isinstance(value, str) or not HEX.fullmatch(value)):
            raise ValueError("invalid " + key)
    delta = row.get("pixel_delta")
    if delta is not None and (type(delta) not in (int, float) or not 0 <= delta <= 1):
        raise ValueError("pixel delta must be 0..1 or null")
    return row

def digest_row(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()

def read_events():
    if not JOURNAL.exists():
        return []
    return [json.loads(line) for line in JOURNAL.read_text(encoding="utf-8").splitlines() if line]

def append_batch(rows):
    if not isinstance(rows, list) or not 1 <= len(rows) <= 30:
        raise ValueError("batch must contain 1..30 trials")
    for row in rows:
        validate_trial(row)
    JOURNAL.parent.mkdir(parents=True, exist_ok=True)
    with LOCK:
        old = read_events()
        keys = {(x["trial"]["session_id"], x["trial"]["trial_id"]) for x in old}
        parent = old[-1]["digest"] if old else "0" * 64
        accepted = []
        skipped = 0
        with JOURNAL.open("a", encoding="utf-8") as out:
            for row in rows:
                key = (row["session_id"], row["trial_id"])
                if key in keys:
                    skipped += 1
                    continue
                keys.add(key)
                record = {"schema": "jane.nes.trial.v86",
                          "time_utc": datetime.now(timezone.utc).isoformat(),
                          "parent_digest": parent, "trial": row}
                record["digest"] = digest_row(record)
                parent = record["digest"]
                out.write(json.dumps(record, sort_keys=True) + "\n")
                accepted.append(record["digest"])
            out.flush()
            os.fsync(out.fileno())
    return {"accepted": len(accepted), "duplicates": skipped,
            "head_digest": parent, "event_digests": accepted}

def verify():
    with LOCK:
        rows = read_events()
    parent = "0" * 64
    for n, event in enumerate(rows):
        body = {k: v for k, v in event.items() if k != "digest"}
        if event.get("parent_digest") != parent or digest_row(body) != event.get("digest"):
            return {"valid": False, "first_error_index": n, "events": len(rows)}
        parent = event["digest"]
    return {"valid": True, "events": len(rows), "head_digest": parent}

class Handler(PriorHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/":
            self.path = "/dashboard/v86.html"
            return super().do_GET()
        if path == "/api/v86/index":
            return self.send_json(json.loads(INDEX.read_text(encoding="utf-8")))
        if path == "/api/v86/verify":
            return self.send_json(verify())
        if path == "/api/v86/trials":
            with LOCK:
                rows = read_events()
            return self.send_json({"schema": "jane.nes.trials.v86",
                                   "count": len(rows), "events": rows[-100:]})
        if path.startswith("/data/v86/runtime/"):
            return self.send_error(403)
        return super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/v86/trials":
            return super().do_POST()
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= 40000:
                raise ValueError("invalid request size")
            data = json.loads(self.rfile.read(size))
            result = append_batch(data.get("trials") if isinstance(data, dict) else None)
            return self.send_json(result)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            return self.send_json({"error": str(error)}, 400)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8786)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), Handler) as server:
        print("Jane v86 NES telemetry: http://%s:%d/" % (args.host, args.port))
        server.serve_forever()

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Jane v84 local arcade server. Python stdlib only; loopback by default."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import random
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "data" / "v84" / "index.json"
LESSONS = ROOT / "data" / "v84" / "lessons.json"
LEDGER = ROOT / "data" / "v84" / "runtime" / "evidence.jsonl"
LOCK = threading.Lock()
FAMILIES = ("STRAIGHT", "ZIGZAG", "MIRROR", "ACCELERATE", "DECOY")
AUDIT_SEEDS = (151, 157, 163, 167, 173)

def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def play(seed: int, family: str, policy: str) -> dict:
    if family not in FAMILIES or policy not in ("control", "original", "repaired"):
        raise ValueError("unknown family or policy")
    rng = random.Random(seed)
    avoided = 0
    trace = []
    for tick in range(20):
        base = rng.randrange(3)
        hazard = {"STRAIGHT": base, "ZIGZAG": (base + tick % 3) % 3,
                  "MIRROR": 2 - base, "ACCELERATE": (base + tick * tick // 13) % 3,
                  "DECOY": (base + 1) % 3}[family]
        prediction = base if family == "DECOY" and policy == "original" else hazard
        if policy == "control":
            lane = (hazard + 1) % 3 if tick % 3 == 0 else rng.randrange(3)
        else:
            lane = (prediction + 1) % 3
        safe = lane != hazard
        avoided += safe
        trace.append({"tick": tick, "hazard": hazard, "lane": lane, "safe": safe})
    return {"seed": seed, "family": family, "policy": policy, "score": avoided, "trace": trace}

def audit() -> dict:
    comparisons = []
    for family, seed in zip(FAMILIES, AUDIT_SEEDS):
        baseline = play(seed, family, "control")["score"]
        old = play(seed, family, "original")["score"]
        revised = play(seed, family, "repaired")["score"]
        comparisons.append({"seed": seed, "family": family, "control": baseline,
                            "original": old, "repaired": revised, "delta": revised - baseline,
                            "regression": revised < old, "source_root": f"seed:{seed}"})
    passed = all(x["delta"] > 0 and not x["regression"] for x in comparisons)
    return {"version": "TE-084", "passed": passed, "comparisons": comparisons,
            "criterion": "each repaired > control AND repaired >= original on all 5 locked seeds",
            "interpretation": "synthetic task only, not measured NES skill"}

def append_record(kind: str, payload: dict) -> dict:
    record = {"schema": "jane-evidence-v84", "event_type": kind,
              "timestamp_utc": datetime.now(timezone.utc).isoformat(), "payload": payload}
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with LOCK:
        previous = "0" * 64
        if LEDGER.exists():
            for line in LEDGER.read_text(encoding="utf-8").splitlines():
                if line:
                    previous = json.loads(line)["digest"]
        record["parent_digest"] = previous
        packed = json.dumps(record, sort_keys=True, separators=(",", ":"))
        record["digest"] = hashlib.sha256(packed.encode()).hexdigest()
        with LEDGER.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, sort_keys=True) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
    return record

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def send_json(self, obj, status=200):
        data = json.dumps(obj, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        url = urlsplit(self.path).path
        if url == "/api/v84/index":
            return self.send_json(load_json(INDEX))
        if url == "/api/v84/lessons":
            return self.send_json(load_json(LESSONS))
        if url == "/api/v84/audit":
            return self.send_json(audit())
        if url == "/api/v84/ledger":
            with LOCK:
                rows = [json.loads(x) for x in LEDGER.read_text(encoding="utf-8").splitlines() if x] if LEDGER.exists() else []
            return self.send_json({"schema": "jane-ledger-v84", "records": rows})
        if url == "/":
            self.path = "/dashboard/v84.html"
        if url.startswith("/data/v84/runtime/") or url.startswith("/.git/"):
            return self.send_error(403)
        return super().do_GET()
    def do_POST(self):
        if urlsplit(self.path).path != "/api/v84/run":
            return self.send_json({"error": "unknown route"}, 404)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 8192:
                raise ValueError("invalid request size")
            request = json.loads(self.rfile.read(size))
            kind = request.get("kind")
            if kind == "audit":
                payload = audit()
            elif kind == "trial":
                seed = request.get("seed")
                if type(seed) is not int or seed < 0 or seed > 1_000_000:
                    raise ValueError("invalid seed")
                family = request.get("family")
                payload = {"control": play(seed, family, "control"),
                           "original": play(seed, family, "original"),
                           "repaired": play(seed, family, "repaired")}
            else:
                raise ValueError("unsupported kind")
            record = append_record(kind, payload)
            return self.send_json({"result": payload, "evidence": {"digest": record["digest"],
                                  "parent_digest": record["parent_digest"]}})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            return self.send_json({"error": str(exc)}, 400)

def main():
    parser = argparse.ArgumentParser(description="Run Jane's v84 local teaching arcade")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8784)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), Handler) as httpd:
        print(f"Jane v84: http://{args.host}:{args.port}/")
        httpd.serve_forever()
if __name__ == "__main__":
    main()

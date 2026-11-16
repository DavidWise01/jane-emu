#!/usr/bin/env python3
"""Jane v85: loopback NES arcade host and metadata-only observation journal.
Actual .nes emulation runs inside the browser's existing Jane NES arena.
ROM bytes are not uploaded to this server.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from server_v84 import Handler as PriorHandler, ROOT

INDEX = ROOT / "data" / "v85" / "index.json"
LEDGER = ROOT / "data" / "v85" / "runtime" / "observations.jsonl"
LOCK = threading.Lock()

def journal(record: dict) -> dict:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with LOCK:
        parent = "0" * 64
        if LEDGER.exists():
            for line in LEDGER.read_text(encoding="utf-8").splitlines():
                if line:
                    parent = json.loads(line)["digest"]
        body = {"schema": "jane.nes.observation.v85",
                "time_utc": datetime.now(timezone.utc).isoformat(),
                "parent_digest": parent, "observation": record}
        payload = json.dumps(body, sort_keys=True, separators=(",", ":"))
        body["digest"] = hashlib.sha256(payload.encode()).hexdigest()
        with LEDGER.open("a", encoding="utf-8") as out:
            out.write(json.dumps(body, sort_keys=True) + "\n")
            out.flush()
            os.fsync(out.fileno())
    return body

class Handler(PriorHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/":
            self.path = "/dashboard/v85.html"
            return super().do_GET()
        if path == "/api/v85/index":
            return self.send_json(json.loads(INDEX.read_text(encoding="utf-8")))
        if path == "/api/v85/ledger":
            with LOCK:
                rows = [json.loads(line) for line in LEDGER.read_text(encoding="utf-8").splitlines() if line] if LEDGER.exists() else []
            return self.send_json({"schema": "jane.nes.ledger.v85", "records": rows})
        if path.startswith("/data/v85/runtime/"):
            return self.send_error(403)
        return super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/v85/observe":
            return super().do_POST()
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= 4096:
                raise ValueError("observation length invalid")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("expected object")
            if set(data) - {"rom_id", "frame", "trials", "running", "actor", "note", "session_id"}:
                raise ValueError("unexpected fields")
            rom_id = data.get("rom_id")
            if not isinstance(rom_id, str) or not 1 <= len(rom_id) <= 120:
                raise ValueError("invalid cartridge identifier")
            if any(type(data.get(k)) is not int or not 0 <= data[k] <= 1000000000 for k in ("frame", "trials")):
                raise ValueError("invalid counters")
            if type(data.get("running")) is not bool:
                raise ValueError("invalid running flag")
            if not isinstance(data.get("actor"), str) or data["actor"] not in {"JANE", "TOPH", "PATRICIA", "UNKNOWN"}:
                raise ValueError("invalid actor")
            for key in ("note", "session_id"):
                if not isinstance(data.get(key, ""), str) or len(data.get(key, "")) > 256:
                    raise ValueError("invalid " + key)
            result = journal(data)
            return self.send_json({"stored": True, "digest": result["digest"], "parent_digest": result["parent_digest"]})
        except (TypeError, ValueError, json.JSONDecodeError) as e:
            return self.send_json({"error": str(e)}, 400)

def main():
    parser = argparse.ArgumentParser(description="Jane's real NES arcade shell and local JSON evidence server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8785)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), Handler) as server:
        print(f"Jane NES arcade: http://{args.host}:{args.port}/")
        server.serve_forever()

if __name__ == "__main__":
    main()

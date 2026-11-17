#!/usr/bin/env python3
"""Serve Jane locally and commit explicit telemetry batches to Git.
Run from a clone: python git_bridge.py --push
No ROMs, images, credentials or arbitrary paths accepted.
"""
import argparse, hashlib, json, os, re, subprocess, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
LOCK = threading.Lock()
MAX = 512 * 1024
PORT = 8765
PUSH = False
def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], check=True,
                          capture_output=True, text=True, timeout=60).stdout.strip()
def normalize(payload):
    if not isinstance(payload, dict) or payload.get("schema") != "jane.git.trace.v1":
        raise ValueError("Unknown schema")
    rows = payload.get("packets")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 208:
        raise ValueError("Expected 1-208 packets")
    clean = []
    for r in rows:
        root, frame, digest = r.get("source_root"), r.get("frame"), r.get("hash")
        if not isinstance(root, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,100}", root):
            raise ValueError("Invalid source root")
        if type(frame) is not int or frame < 0 or not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{8}", digest):
            raise ValueError("Invalid frame or hash")
        delta = r.get("delta")
        if delta is not None and (type(delta) not in (int,float) or not 0 <= delta <= 1):
            raise ValueError("Invalid motion delta")
        hot = r.get("hotspot")
        if hot is not None and (type(hot) is not int or not 0 <= hot < 24):
            raise ValueError("Invalid hotspot")
        regions = r.get("regions")
        if not isinstance(regions, list) or len(regions) != 24:
            raise ValueError("Expected 24 regions")
        values = [x.get("delta") for x in regions]
        if any(type(x) not in (int,float) or not 0 <= x <= 1 for x in values):
            raise ValueError("Invalid regional delta")
        clean.append({"root":root,"frame":frame,"hash":digest,"delta":delta,
                      "hotspot":hot,"regions":values})
    if len({r["root"] for r in clean}) != 1 or any(a["frame"] >= b["frame"] for a,b in zip(clean,clean[1:])):
        raise ValueError("Mixed roots or nonascending frames")
    return {"schema":"jane.git.trace.v1","packets":clean}
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def reply(self,code,obj):
        raw=json.dumps(obj).encode()
        self.send_response(code);self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(raw)));self.send_header("Cache-Control","no-store")
        self.end_headers();self.wfile.write(raw)
    def local(self):
        return self.headers.get("Host") in (f"127.0.0.1:{PORT}",f"localhost:{PORT}")
    def do_GET(self):
        if not self.local(): return self.reply(403,{"error":"local host required"})
        if self.path == "/api/git/status":
            return self.reply(200,{"ready":True,"push":PUSH})
        if any(p.startswith(".") for p in urlsplit(self.path).path.split("/") if p):
            return self.reply(403,{"error":"hidden path"})
        return super().do_GET()
    def do_POST(self):
        if self.path != "/api/git/trace" or not self.local() or self.headers.get("Origin") not in (f"http://127.0.0.1:{PORT}",f"http://localhost:{PORT}"):
            return self.reply(403,{"error":"local same-origin request required"})
        try:
            n=int(self.headers.get("Content-Length","0"))
            if not 0<n<=MAX: raise ValueError("Invalid request size")
            obj=normalize(json.loads(self.rfile.read(n)))
            raw=(json.dumps(obj,sort_keys=True,separators=(",",":"),allow_nan=False)+"\n").encode()
            digest=hashlib.sha256(raw).hexdigest()
            rel=f"evidence/traces/{digest}.json"
            with LOCK:
                path=ROOT/rel;path.parent.mkdir(parents=True,exist_ok=True)
                if path.exists() and path.read_bytes()!=raw: raise ValueError("Digest collision")
                if not path.exists():
                    with path.open("xb") as f: f.write(raw)
                tracked=subprocess.run(["git","-C",str(ROOT),"cat-file","-e","HEAD:"+rel],capture_output=True).returncode==0
                if not tracked:
                    git("add","--",rel);git("commit","--only","-m","Jane trace "+digest[:12],"--",rel)
                commit=git("log","-1","--format=%H","--",rel)
                pushed=False;error=None
                if PUSH:
                    try: git("push");pushed=True
                    except (subprocess.SubprocessError,OSError): error="Push failed; local commit retained. Retry git push."
            return self.reply(200,{"digest":digest,"path":rel,"commit":commit,"pushed":pushed,"warning":error})
        except (ValueError,TypeError,AttributeError,KeyError): return self.reply(400,{"error":"Invalid trace payload"})
        except (subprocess.SubprocessError,OSError): return self.reply(500,{"error":"Git or filesystem operation failed; inspect terminal"})
def main():
    global PORT,PUSH
    p=argparse.ArgumentParser();p.add_argument("--port",type=int,default=8765);p.add_argument("--push",action="store_true");a=p.parse_args()
    PORT,PUSH=a.port,a.push
    git("rev-parse","--is-inside-work-tree")
    print(f"Jane: http://127.0.0.1:{PORT}/dashboard/arena.html",flush=True)
    ThreadingHTTPServer(("127.0.0.1",PORT),Handler).serve_forever()
if __name__=="__main__": main()

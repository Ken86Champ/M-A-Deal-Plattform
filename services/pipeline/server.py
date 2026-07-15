"""
Pipeline HTTP Server — exposes /run/{stage} for Inngest cron triggers.

Start with:  python server.py
Listens on:  http://localhost:8000

Stages: radar · enrichment · scoring · dossier · dedup
"""
import logging
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import threading

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

if not os.environ.get("SUPABASE_URL"):
    os.environ["SUPABASE_URL"] = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger("pipeline.server")

PORT = int(os.environ.get("PIPELINE_PORT", 8000))

VALID_STAGES = {"radar", "enrichment", "scoring", "dossier", "digest", "dedup", "all"}

# Track running stages to prevent concurrent runs
_running: set[str] = set()
_lock = threading.Lock()


def run_stage(stage: str) -> dict:
    if stage == "radar":
        from agents.radar import run
        result = run()
        return result or {"status": "ok"}
    elif stage == "enrichment":
        from agents.enrichment import run
        run()
        return {"status": "ok"}
    elif stage == "scoring":
        from agents.scoring import run
        run()
        return {"status": "ok"}
    elif stage == "dossier":
        from agents.dossier import run
        run()
        return {"status": "ok"}
    elif stage == "digest":
        from agents.digest import run
        result = run()
        return {"status": "ok", **result}
    elif stage == "dedup":
        from dedup import merge_duplicates
        n = merge_duplicates(dry_run=False)
        return {"status": "ok", "merged": n}
    elif stage == "all":
        results = {}
        for s in ("radar", "enrichment", "scoring", "dossier"):
            results[s] = run_stage(s)
        return results
    else:
        raise ValueError(f"Unbekannte Stufe: {stage}")


class PipelineHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log.info(f"{self.address_string()} {format % args}")

    def _send_json(self, code: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok", "running": list(_running)})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if not self.path.startswith("/run/"):
            self._send_json(404, {"error": "Not found"})
            return

        stage = self.path[5:].strip("/")
        if stage not in VALID_STAGES:
            self._send_json(400, {"error": f"Unbekannte Stufe: {stage}"})
            return

        with _lock:
            if stage in _running:
                self._send_json(409, {"error": f"Stufe '{stage}' läuft bereits"})
                return
            _running.add(stage)

        log.info(f"=== Stage '{stage}' gestartet ===")
        t0 = time.time()
        try:
            result = run_stage(stage)
            elapsed = round(time.time() - t0, 1)
            log.info(f"=== Stage '{stage}' fertig in {elapsed}s ===")
            self._send_json(200, {"ok": True, "stage": stage, "elapsed_s": elapsed, **result})
        except Exception as e:
            log.exception(f"Stage '{stage}' fehlgeschlagen: {e}")
            self._send_json(500, {"ok": False, "error": str(e)})
        finally:
            with _lock:
                _running.discard(stage)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), PipelineHandler)
    log.info(f"Pipeline Server läuft auf http://0.0.0.0:{PORT}")
    log.info(f"Stages: {', '.join(sorted(VALID_STAGES))}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Server gestoppt")

"""
Checkpoint Manager — Resume-System für die Pipeline.

Verhindert verlorene Arbeit bei Verbindungsabbruch oder Restart.
Schreibt alle CHECKPOINT_INTERVAL Firmen einen Checkpoint in Supabase.

Verwendung:
    with CheckpointRun("enrichment", total=714646) as run:
        for company in companies[run.start_offset:]:
            process(company)
            run.tick(company["id"])
"""
import logging
import os
import atexit
import signal
from datetime import datetime
from typing import Optional
from db import get_db

log = logging.getLogger(__name__)

CHECKPOINT_INTERVAL = 50   # Alle 50 Firmen speichern


class CheckpointRun:
    """
    Context manager für einen wiederaufnehmbaren Pipeline-Lauf.

    Bei Unterbrechung: status → 'interrupted', last_id gespeichert.
    Bei Neustart: fragt ob ein unterbrochener Lauf existiert.
    """

    def __init__(self, stage: str, total: int = 0, cursor: str | None = None):
        self.stage        = stage
        self.total        = total
        self.run_id: Optional[str] = None
        self.processed    = 0
        self.last_id: Optional[str] = None
        self.resume_from: Optional[str] = None
        self.resume_cursor: Optional[str] = None
        self._db          = get_db()

    def __enter__(self):
        # Check for interrupted run
        try:
            res = self._db.rpc("get_resumable_run", {"p_stage": self.stage}).execute()
            if res.data:
                row = res.data[0]
                self.run_id       = row["run_id"]
                self.resume_from  = row["last_id"]
                self.resume_cursor = row["last_cursor"]
                self.processed    = row["processed"] or 0
                log.info(
                    f"Checkpoint [{self.stage}]: Unterbrochener Lauf gefunden "
                    f"— {self.processed} bereits verarbeitet, Resume ab {self.resume_from}"
                )
                # Mark as running again
                self._db.table("pipeline_runs") \
                    .update({"status": "running", "total": self.total or row["total"]}) \
                    .eq("id", self.run_id) \
                    .execute()
                return self
        except Exception as e:
            log.debug(f"Checkpoint check failed: {e}")

        # New run
        try:
            res = self._db.table("pipeline_runs").insert({
                "stage":  self.stage,
                "status": "running",
                "total":  self.total,
            }).select("id").single().execute()
            self.run_id = res.data["id"]
            log.info(f"Checkpoint [{self.stage}]: Neuer Lauf gestartet — ID {self.run_id}")
        except Exception as e:
            log.warning(f"Checkpoint insert failed: {e}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self._finish("done")
        elif exc_type in (KeyboardInterrupt, SystemExit):
            self._finish("interrupted")
            log.info(f"Checkpoint [{self.stage}]: Lauf unterbrochen bei {self.processed} — kann resumed werden")
        else:
            self._finish("interrupted")
            log.error(f"Checkpoint [{self.stage}]: Fehler bei {self.processed}: {exc_val}")
        return False   # don't suppress exception

    def tick(self, company_id: str, cursor: str | None = None):
        """Nach jeder verarbeiteten Firma aufrufen."""
        self.processed += 1
        self.last_id = company_id
        if cursor:
            self.resume_cursor = cursor

        if self.processed % CHECKPOINT_INTERVAL == 0:
            self._save()

    def _save(self):
        if not self.run_id:
            return
        try:
            self._db.table("pipeline_runs").update({
                "processed":   self.processed,
                "last_id":     self.last_id,
                "last_cursor": self.resume_cursor,
                "total":       self.total,
            }).eq("id", self.run_id).execute()
            log.debug(f"Checkpoint [{self.stage}]: {self.processed}/{self.total or '?'} gespeichert")
        except Exception as e:
            log.warning(f"Checkpoint save failed: {e}")

    def _finish(self, status: str):
        self._save()   # Final save
        if not self.run_id:
            return
        try:
            self._db.table("pipeline_runs").update({
                "status":    status,
                "processed": self.processed,
                "last_id":   self.last_id,
            }).eq("id", self.run_id).execute()
            if status == "done":
                log.info(f"Checkpoint [{self.stage}]: Abgeschlossen ✓ ({self.processed} Firmen)")
        except Exception as e:
            log.warning(f"Checkpoint finish failed: {e}")

    @property
    def can_resume(self) -> bool:
        return self.resume_from is not None

    @staticmethod
    def clear_interrupted(stage: str) -> int:
        """Markiert unterbrochene Läufe als 'interrupted' — für manuelles Reset."""
        db = get_db()
        res = db.table("pipeline_runs") \
            .update({"status": "interrupted"}) \
            .eq("stage", stage) \
            .eq("status", "running") \
            .execute()
        return len(res.data or [])

    @staticmethod
    def get_status(stage: str) -> dict | None:
        """Zeigt Status des letzten Laufs."""
        db = get_db()
        res = db.table("pipeline_runs") \
            .select("*") \
            .eq("stage", stage) \
            .order("started_at", desc=True) \
            .limit(1) \
            .execute()
        return res.data[0] if res.data else None

"""Regression tests for actual NES observation ingestion; no ROMs required."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import server_v86 as v

def row(i=1):
    return {"session_id": "sample_session_100", "source_root": "sample_session_100",
            "rom_id": "nes-cartridge-example", "trial_id": "trial-" + str(i),
            "frame": i * 10, "end_frame": i * 10 + 5, "button": "A+RIGHT",
            "pre_hash": "aabbcc", "post_hash": "ddff11", "pixel_delta": 0.2,
            "actor": "JANE"}

class TrialJournalTests(unittest.TestCase):
    def test_validate_rejects_invalid_root(self):
        r = row()
        r["source_root"] = "fake-independent-witness"
        with self.assertRaises(ValueError):
            v.validate_trial(r)

    def test_validate_rejects_unexpected_rom_bytes(self):
        r = row()
        r["rom_bytes"] = "base64-payload"
        with self.assertRaises(ValueError):
            v.validate_trial(r)

    def test_append_duplicate_and_verify_chain(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(v, "JOURNAL", Path(tmp) / "trials.jsonl"):
                a = v.append_batch([row(1), row(2)])
                self.assertEqual(a["accepted"], 2)
                b = v.append_batch([row(1)])
                self.assertEqual(b["accepted"], 0)
                self.assertEqual(b["duplicates"], 1)
                self.assertTrue(v.verify()["valid"])

    def test_detects_tampering(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "trials.jsonl"
            with patch.object(v, "JOURNAL", path):
                v.append_batch([row(1)])
                data = path.read_text()
                path.write_text(data.replace('"button": "A+RIGHT"', '"button": "B"'))
                self.assertFalse(v.verify()["valid"])

if __name__ == "__main__":
    unittest.main()

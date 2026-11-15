import json
import pathlib
import tempfile
import unittest
from importlib.util import module_from_spec, spec_from_file_location

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "agent" / "jane_agent.py"
spec = spec_from_file_location("jane_agent", SCRIPT)
agent = module_from_spec(spec)
spec.loader.exec_module(agent)

class TestJaneMemory(unittest.TestCase):
    def test_independent_root_required(self):
        with tempfile.TemporaryDirectory() as d:
            original_pool, original_events = agent.POOL, agent.EVENTS
            agent.POOL = pathlib.Path(d)
            agent.EVENTS = agent.POOL / "events"
            agent.EVENTS.mkdir()
            try:
                for n in range(3):
                    rec = agent.validate({"kind":"outcome_label", "rom":"game-1", "source_root":f"root-{n}",
                                          "source":"nes-intervention", "word":"START", "button":"START", "outcome":"beneficial"})
                    self.assertTrue(agent.write_event(rec))
                result = agent.rebuild_index()
                self.assertEqual(result["associations"][0]["status"], "SUPPORTED_PROVISIONAL")
                bad = agent.validate({"kind":"outcome_label", "rom":"game-1", "source_root":"root-bad",
                                      "source":"nes-intervention", "word":"START", "button":"START", "outcome":"harmful"})
                agent.write_event(bad)
                self.assertEqual(agent.rebuild_index()["associations"][0]["status"], "CONTESTED")
            finally:
                agent.POOL, agent.EVENTS = original_pool, original_events

    def test_no_duplicate_votes(self):
        with tempfile.TemporaryDirectory() as d:
            original_pool, original_events = agent.POOL, agent.EVENTS
            agent.POOL = pathlib.Path(d)
            agent.EVENTS = agent.POOL / "events"
            agent.EVENTS.mkdir()
            try:
                for frame in range(3):
                    rec = agent.validate({"kind":"outcome_label", "rom":"game-1", "source_root":"same-root",
                                          "source":"nes-intervention", "word":"START", "button":"START",
                                          "outcome":"beneficial", "frame":frame})
                    agent.write_event(rec)
                value = agent.rebuild_index()["associations"][0]
                self.assertEqual(value["beneficial_roots"], 1)
                self.assertEqual(value["status"], "INSUFFICIENT")
            finally:
                agent.POOL, agent.EVENTS = original_pool, original_events

    def test_context_scoped_evidence_cannot_cross_screen(self):
        with tempfile.TemporaryDirectory() as d:
            old_pool, old_events = agent.POOL, agent.EVENTS
            agent.POOL = pathlib.Path(d)
            agent.EVENTS = agent.POOL / "events"
            agent.EVENTS.mkdir()
            try:
                for n in range(3):
                    agent.write_event(agent.validate({
                        "kind":"outcome_label","rom":"game-1","context":"title-screen",
                        "source_root":f"root-{n}","source":"human-labeled-nes-trial",
                        "word":"START","button":"START","outcome":"beneficial"}))
                agent.write_event(agent.validate({
                    "kind":"outcome_label","rom":"game-1","context":"gameplay-screen",
                    "source_root":"other-state","source":"human-labeled-nes-trial",
                    "word":"START","button":"START","outcome":"harmful"}))
                rows=agent.rebuild_index()["associations"]
                self.assertEqual(len(rows),2)
                rows={r["context"]:r for r in rows}
                self.assertTrue(rows["title-screen"]["context_bound"])
                self.assertEqual(rows["title-screen"]["beneficial_roots"],3)
                self.assertEqual(rows["title-screen"]["status"],"SUPPORTED_PROVISIONAL")
                self.assertEqual(rows["gameplay-screen"]["status"],"CONTESTED")
            finally:
                agent.POOL, agent.EVENTS = old_pool, old_events

    def test_legacy_evidence_does_not_authorize_context_reuse(self):
        with tempfile.TemporaryDirectory() as d:
            old_pool,old_events=agent.POOL,agent.EVENTS
            agent.POOL=pathlib.Path(d)
            agent.EVENTS=agent.POOL / "events"
            agent.EVENTS.mkdir()
            try:
                for n in range(3):
                    agent.write_event(agent.validate({
                        "kind":"outcome_label","rom":"game-1","source_root":f"root-{n}",
                        "source":"human-labeled-nes-trial","word":"START",
                        "button":"START","outcome":"beneficial"}))
                row=agent.rebuild_index()["associations"][0]
                self.assertEqual(row["status"],"SUPPORTED_PROVISIONAL")
                self.assertFalse(row["context_bound"])
            finally:
                agent.POOL,agent.EVENTS=old_pool,old_events

    def test_reject_private_or_unrecognized_fields(self):
        with self.assertRaises(ValueError):
            agent.validate({"kind":"observation", "rom":"game", "source":"test", "source_root":"root", "rom_base64":"AA=="})

if __name__ == "__main__":
    unittest.main()

import hashlib
import json
import pathlib
import tempfile
import unittest
from importlib.util import module_from_spec, spec_from_file_location

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "agent" / "jane_curator.py"
spec = spec_from_file_location("jane_curator", SCRIPT)
agent = module_from_spec(spec)
spec.loader.exec_module(agent)

class TestJaneCurator(unittest.TestCase):
    def test_root_deduplication_and_outcome_separation(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            folder=root/"memory"/"pool"/"events"
            folder.mkdir(parents=True)
            ids=[]
            for n in range(4):
                record={"kind":"experiment_feedback","rom":"demo","context":"screen-1",
                    "question_id":"q1","button":"START","source_root":"one-root" if n<3 else "two-root",
                    "status":"OBSERVED_UNLABELED","pixel_change_bp":100+n}
                id_=hashlib.sha256(agent.compact(record)).hexdigest()
                (folder/(id_+".json")).write_text(json.dumps(record))
                ids.append(id_)
            (folder.parent/"index.json").write_text(json.dumps({"event_ids":ids,"associations":[]}))
            old=agent.POOL
            agent.POOL=folder.parent
            try:
                result=agent.digest()
                self.assertEqual(result["pool_event_count"],4)
                self.assertEqual(result["distinct_source_root_ids"],2)
                self.assertEqual(result["question_gaps"][0]["independent_roots"],2)
                self.assertEqual(result["associations"],[])
            finally:
                agent.POOL=old

    def test_mismatched_index_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            pool=pathlib.Path(d)
            (pool/"events").mkdir()
            (pool/"index.json").write_text(json.dumps({"event_ids":["not-present"],"associations":[]}))
            old=agent.POOL
            agent.POOL=pool
            try:
                with self.assertRaises(ValueError):
                    agent.digest()
            finally:
                agent.POOL=old

if __name__ == "__main__":
    unittest.main()

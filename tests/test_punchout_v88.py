"""Static checks for Jane's first real cartridge profile, no copyrighted ROM needed."""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "dashboard" / "v88.html"
PROFILE = ROOT / "data" / "v88" / "punchout.json"

class PunchOutAssets(unittest.TestCase):
    def test_cartridge_profile(self):
        profile = json.loads(PROFILE.read_text(encoding="utf-8"))
        self.assertEqual(profile["first_opponent"], "Glass Joe")
        self.assertEqual(profile["emulator"], "dashboard/arena.html")
        self.assertFalse(profile["validation"]["automated_knockdown_detection"])

    def test_real_emulator_not_simulated_game(self):
        text = HTML.read_text(encoding="utf-8")
        self.assertIn('id="arena" src="./arena.html"', text)
        self.assertIn('id="rom"', text)
        self.assertIn('id="opponentDown"', text)
        self.assertIn('id="janeDown"', text)
        for tab in ('match', 'coach', 'telemetry', 'evidence', 'system'):
            self.assertIn('id="tab-' + tab + '"', text)
        self.assertIn('class="workspace"', text)

    def test_inline_javascript_syntax(self):
        text = HTML.read_text(encoding="utf-8")
        blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", text, re.S)
        self.assertEqual(len(blocks), 3)
        for block in blocks:
            process = subprocess.run(
                ["node", "--check"], input=block, text=True, capture_output=True,
                check=False)
            self.assertEqual(process.returncode, 0, process.stderr)

if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWardAI - Independent Automated Test Suite for Milestone M1 (H2) & Milestone M2 (H3).
Verifies:
1. File existence and non-zero size for all 6 generated data files and 2 artifact reports.
2. 50 PROCEDURE_INQUIRY mapping: exactly 40 MAPPED, 10 UNMAPPED.
3. All gold chunks exist in legal_inventory.json and belong to the correct procedure.
4. Residence queries S021-S024, S046 have proposed_intent='OUT_OF_SCOPE' without modifying original intent.
5. Strict group_id non-overlap between stress_dev and stress_frozen (zero group leakage).
6. Total row count = 115 (58 dev, 57 frozen).
7. Intent distributions are balanced 50/50.
"""

import json
import csv
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_DATA_DIR = BASE_DIR / "ml" / "data"
ARTIFACTS_DIR = BASE_DIR / ".agents" / "teamwork" / "orchestrator_stage1" / "artifacts"


class TestStepH2H3DataIntegrity(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Load legal inventory
        with open(ML_DATA_DIR / "legal_inventory.json", "r", encoding="utf-8") as f:
            cls.inventory = json.load(f)
        cls.proc_map = {p["code"]: p for p in cls.inventory}
        cls.chunk_map = {c["chunkId"]: c for p in cls.inventory for c in p.get("chunks", [])}

        # Load mapped data
        with open(ML_DATA_DIR / "stress_mapped.json", "r", encoding="utf-8") as f:
            cls.mapped_json = json.load(f)

        # Load split data
        with open(ML_DATA_DIR / "stress_dev.json", "r", encoding="utf-8") as f:
            cls.dev_json = json.load(f)
        with open(ML_DATA_DIR / "stress_frozen.json", "r", encoding="utf-8") as f:
            cls.frozen_json = json.load(f)

    def test_01_all_files_exist_and_non_empty(self):
        """Test all required JSON, CSV, and Markdown artifacts exist and are non-empty."""
        expected_files = [
            ML_DATA_DIR / "stress_mapped.json",
            ML_DATA_DIR / "stress_mapped.csv",
            ML_DATA_DIR / "stress_dev.json",
            ML_DATA_DIR / "stress_dev.csv",
            ML_DATA_DIR / "stress_frozen.json",
            ML_DATA_DIR / "stress_frozen.csv",
            ARTIFACTS_DIR / "m1_h2_mapping_report.md",
            ARTIFACTS_DIR / "m2_h3_split_report.md",
        ]
        for p in expected_files:
            self.assertTrue(p.exists(), f"File does not exist: {p}")
            self.assertGreater(p.stat().st_size, 0, f"File is empty: {p}")

    def test_02_h2_mapping_counts(self):
        """Test exactly 40 mapped and 10 unmapped queries in S001-S050."""
        inquiry_items = [r for r in self.mapped_json if r["id"].startswith("S") and int(r["id"][1:]) <= 50]
        self.assertEqual(len(inquiry_items), 50)

        mapped_items = [r for r in inquiry_items if r["mapping_status"] == "MAPPED"]
        unmapped_items = [r for r in inquiry_items if r["mapping_status"] == "UNMAPPED"]

        self.assertEqual(len(mapped_items), 40, f"Expected 40 mapped, got {len(mapped_items)}")
        self.assertEqual(len(unmapped_items), 10, f"Expected 10 unmapped, got {len(unmapped_items)}")

        unmapped_ids = sorted(r["id"] for r in unmapped_items)
        expected_unmapped_ids = ["S014", "S015", "S016", "S020", "S024", "S028", "S035", "S036", "S038", "S043"]
        self.assertEqual(unmapped_ids, expected_unmapped_ids)

    def test_03_h2_gold_chunks_exist_in_legal_inventory(self):
        """Test every gold chunk exists in legal_inventory.json and matches procedure_code."""
        inquiry_items = [r for r in self.mapped_json if r["id"].startswith("S") and int(r["id"][1:]) <= 50]
        for r in inquiry_items:
            p_code = r["procedure_code"]
            gold_chunks = r["gold_chunk_ids"]
            if p_code != "UNMAPPED":
                self.assertIn(p_code, self.proc_map, f"Unknown procedure_code: {p_code}")
                self.assertGreater(len(gold_chunks), 0, f"Mapped query {r['id']} must have gold chunks")
                for cid in gold_chunks:
                    self.assertIn(cid, self.chunk_map, f"Chunk {cid} not in legal inventory")
                    self.assertTrue(cid.startswith(p_code), f"Chunk {cid} mismatch with {p_code}")
            else:
                self.assertEqual(len(gold_chunks), 0, f"UNMAPPED query {r['id']} must have empty gold_chunks list")

    def test_04_residence_proposed_intent(self):
        """Test S021-S024, S046 have proposed_intent='OUT_OF_SCOPE' and original intent='PROCEDURE_INQUIRY'."""
        residence_ids = ["S021", "S022", "S023", "S024", "S046"]
        for sid in residence_ids:
            item = next(r for r in self.mapped_json if r["id"] == sid)
            self.assertEqual(item["intent"], "PROCEDURE_INQUIRY", f"{sid} original intent must be preserved")
            self.assertEqual(item["proposed_intent"], "OUT_OF_SCOPE", f"{sid} must propose OUT_OF_SCOPE")

    def test_05_h3_zero_leakage_and_counts(self):
        """Test zero group_id leakage and exact 58/57 split."""
        self.assertEqual(len(self.dev_json), 58)
        self.assertEqual(len(self.frozen_json), 57)
        self.assertEqual(len(self.dev_json) + len(self.frozen_json), 115)

        dev_groups = set(r["group_id"] for r in self.dev_json)
        frozen_groups = set(r["group_id"] for r in self.frozen_json)
        self.assertEqual(len(dev_groups & frozen_groups), 0, "Leakage detected between dev and frozen groups!")

        dev_ids = set(r["id"] for r in self.dev_json)
        frozen_ids = set(r["id"] for r in self.frozen_json)
        self.assertEqual(len(dev_ids & frozen_ids), 0, "ID overlap detected between dev and frozen!")

    def test_06_h3_intent_balance(self):
        """Test intent distribution is balanced 50/50."""
        from collections import Counter
        dev_c = Counter(r["intent"] for r in self.dev_json)
        frozen_c = Counter(r["intent"] for r in self.frozen_json)

        self.assertEqual(dev_c["PROCEDURE_INQUIRY"], 25)
        self.assertEqual(frozen_c["PROCEDURE_INQUIRY"], 25)
        self.assertEqual(dev_c["OUT_OF_SCOPE"], 10)
        self.assertEqual(frozen_c["OUT_OF_SCOPE"], 10)
        self.assertEqual(dev_c["AMBIGUOUS"], 8)
        self.assertEqual(frozen_c["AMBIGUOUS"], 7)
        self.assertEqual(dev_c["GREETING"], 5)
        self.assertEqual(frozen_c["GREETING"], 5)
        self.assertEqual(dev_c["COMMUNE_INFO"], 5)
        self.assertEqual(frozen_c["COMMUNE_INFO"], 5)
        self.assertEqual(dev_c["PROCEDURE_CATALOG"], 5)
        self.assertEqual(frozen_c["PROCEDURE_CATALOG"], 5)

    def test_07_csv_and_json_consistency(self):
        """Test that exported CSV rows match JSON records exactly."""
        with open(ML_DATA_DIR / "stress_mapped.csv", "r", encoding="utf-8") as f:
            csv_rows = list(csv.DictReader(f))
        self.assertEqual(len(csv_rows), len(self.mapped_json))
        for csv_r, json_r in zip(csv_rows, self.mapped_json):
            self.assertEqual(csv_r["id"], json_r["id"])
            self.assertEqual(csv_r["intent"], json_r["intent"])
            self.assertEqual(csv_r["proposed_intent"], json_r["proposed_intent"])


if __name__ == "__main__":
    unittest.main()

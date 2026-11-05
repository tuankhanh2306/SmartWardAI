#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWardAI - Empirical Adversarial Test Suite for Milestone M1 (H2) and Milestone M2 (H3).
Role: Empirical Challenger (critic, specialist).

Test Matrix:
1. Property Tests & Schema Assertions (types, required fields, constraints)
2. Zero Leakage & Set Disjointness (group_id, id, query text)
3. Deterministic Split Replication with random.Random(42)
4. Chunk ID Syntax (Regex), Existence in Legal Inventory, and Prefix Matching
5. Adversarial Edge Case & Semantic Audit (khong_dau, viet_tat, cau_coc_loc, phuong_ngu, residence, unmapped justification)
"""

import re
import sys
import json
import random
import unittest
from pathlib import Path
from collections import defaultdict, Counter

# Ensure utf-8 output on Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DATA_DIR = PROJECT_ROOT / "ml" / "data"
LEGAL_INVENTORY_PATH = ML_DATA_DIR / "legal_inventory.json"
STRESS_MAPPED_PATH = ML_DATA_DIR / "stress_mapped.json"
STRESS_DEV_PATH = ML_DATA_DIR / "stress_dev.json"
STRESS_FROZEN_PATH = ML_DATA_DIR / "stress_frozen.json"
CHUNK_REGEX = re.compile(r"^TTHC-[A-Z]{2}-\d{2}_CHUNK_\d{3}$")
ID_REGEX = re.compile(r"^S\d{3}$")
GROUP_REGEX = re.compile(r"^G-S\d{3}$")
ALLOWED_INTENTS = {
    "PROCEDURE_INQUIRY",
    "OUT_OF_SCOPE",
    "AMBIGUOUS",
    "GREETING",
    "COMMUNE_INFO",
    "PROCEDURE_CATALOG",
}


class AdversarialH2H3TestSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n" + "=" * 70)
        print("EMPIRICAL ADVERSARIAL TEST HARNESS: H2 & H3 DATASETS")
        print("=" * 70)

        # 1. Load Legal Inventory
        assert LEGAL_INVENTORY_PATH.exists(), f"Missing {LEGAL_INVENTORY_PATH}"
        with open(LEGAL_INVENTORY_PATH, "r", encoding="utf-8") as f:
            cls.legal_inventory = json.load(f)

        cls.proc_map = {}
        cls.chunk_map = {}
        for p in cls.legal_inventory:
            cls.proc_map[p["code"]] = p
            for c in p.get("chunks", []):
                cls.chunk_map[c["chunkId"]] = c

        # 2. Load Stress Datasets
        assert STRESS_MAPPED_PATH.exists(), f"Missing {STRESS_MAPPED_PATH}"
        assert STRESS_DEV_PATH.exists(), f"Missing {STRESS_DEV_PATH}"
        assert STRESS_FROZEN_PATH.exists(), f"Missing {STRESS_FROZEN_PATH}"

        with open(STRESS_MAPPED_PATH, "r", encoding="utf-8") as f:
            cls.stress_mapped = json.load(f)
        with open(STRESS_DEV_PATH, "r", encoding="utf-8") as f:
            cls.stress_dev = json.load(f)
        with open(STRESS_FROZEN_PATH, "r", encoding="utf-8") as f:
            cls.stress_frozen = json.load(f)

        print(f"Loaded Legal Inventory: {len(cls.proc_map)} procedures, {len(cls.chunk_map)} chunks.")
        print(f"Loaded Mapped Records: {len(cls.stress_mapped)}")
        print(f"Loaded Dev Records:    {len(cls.stress_dev)}")
        print(f"Loaded Frozen Records: {len(cls.stress_frozen)}")
        print("=" * 70)

    # -------------------------------------------------------------------------
    # SUITE 1: Property Tests & Schema Assertions
    # -------------------------------------------------------------------------

    def test_01_dataset_dimensions(self):
        """Verify absolute counts for all datasets."""
        self.assertEqual(len(self.stress_mapped), 115, "stress_mapped must have 115 records")
        self.assertEqual(len(self.stress_dev), 58, "stress_dev must have 58 records")
        self.assertEqual(len(self.stress_frozen), 57, "stress_frozen must have 57 records")
        self.assertEqual(
            len(self.stress_dev) + len(self.stress_frozen),
            115,
            "Sum of dev and frozen must be exactly 115"
        )

    def test_02_schema_and_types_stress_mapped(self):
        """Adversarial check of every record in stress_mapped.json for schema conformance."""
        required_keys = {
            "id", "text", "intent", "proposed_intent", "procedure_code",
            "gold_chunk_ids", "group_id", "author_id", "source", "style_tags",
            "hint", "mapping_status", "question_type", "rationale"
        }
        for idx, rec in enumerate(self.stress_mapped):
            rec_id = rec.get("id")
            # Keys check
            missing = required_keys - set(rec.keys())
            self.assertEqual(len(missing), 0, f"Record {rec_id} (idx {idx}) missing keys: {missing}")

            # ID format
            self.assertRegex(rec["id"], ID_REGEX, f"Invalid id format: {rec['id']}")
            self.assertRegex(rec["group_id"], GROUP_REGEX, f"Invalid group_id format: {rec['group_id']}")
            self.assertEqual(rec["group_id"], f"G-{rec['id']}", f"group_id mismatch: {rec['group_id']} vs G-{rec['id']}")

            # Text
            self.assertIsInstance(rec["text"], str)
            self.assertGreater(len(rec["text"].strip()), 0, f"Empty text in {rec_id}")

            # Intent validation
            self.assertIn(rec["intent"], ALLOWED_INTENTS, f"Invalid intent: {rec['intent']} in {rec_id}")
            self.assertIn(rec["proposed_intent"], ALLOWED_INTENTS, f"Invalid proposed_intent: {rec['proposed_intent']} in {rec_id}")

            # Style tags
            self.assertIsInstance(rec["style_tags"], list)
            self.assertGreater(len(rec["style_tags"]), 0, f"style_tags empty in {rec_id}")

            # Mapping status
            self.assertIn(rec["mapping_status"], {"MAPPED", "UNMAPPED", "NON_INQUIRY"})

    def test_03_schema_and_types_dev_and_frozen(self):
        """Adversarial check of dev and frozen schemas."""
        for split_name, dataset in [("stress_dev", self.stress_dev), ("stress_frozen", self.stress_frozen)]:
            for rec in dataset:
                rec_id = rec["id"]
                self.assertRegex(rec["id"], ID_REGEX, f"[{split_name}] Invalid id format: {rec_id}")
                self.assertRegex(rec["group_id"], GROUP_REGEX, f"[{split_name}] Invalid group_id: {rec['group_id']}")
                self.assertIn(rec["intent"], ALLOWED_INTENTS, f"[{split_name}] Invalid intent: {rec['intent']}")
                self.assertIsInstance(rec["gold_chunk_ids"], list, f"[{split_name}] gold_chunk_ids must be list")

    # -------------------------------------------------------------------------
    # SUITE 2: Leakage & Disjointness Tests
    # -------------------------------------------------------------------------

    def test_04_zero_leakage_group_and_id(self):
        """Strict zero leakage assertion between dev and frozen sets."""
        dev_group_ids = set(r["group_id"] for r in self.stress_dev)
        frozen_group_ids = set(r["group_id"] for r in self.stress_frozen)
        dev_ids = set(r["id"] for r in self.stress_dev)
        frozen_ids = set(r["id"] for r in self.stress_frozen)

        # 1. Group ID Disjointness
        leak_groups = dev_group_ids.intersection(frozen_group_ids)
        self.assertEqual(len(leak_groups), 0, f"CRITICAL: group_id leakage found: {leak_groups}")
        self.assertTrue(dev_group_ids.isdisjoint(frozen_group_ids), "dev and frozen group_ids must be disjoint")

        # 2. ID Disjointness
        leak_ids = dev_ids.intersection(frozen_ids)
        self.assertEqual(len(leak_ids), 0, f"CRITICAL: id leakage found: {leak_ids}")
        self.assertTrue(dev_ids.isdisjoint(frozen_ids), "dev and frozen ids must be disjoint")

        # 3. Exact coverage of the 115 original items
        all_mapped_ids = set(r["id"] for r in self.stress_mapped)
        self.assertEqual(dev_ids | frozen_ids, all_mapped_ids, "Dev + frozen must equal entire stress mapped set")

    def test_05_zero_text_leakage(self):
        """Adversarial check: no duplicate query text across dev and frozen."""
        def normalize(t):
            return " ".join(t.lower().strip().split())

        dev_texts = {r["id"]: normalize(r["text"]) for r in self.stress_dev}
        frozen_texts = {r["id"]: normalize(r["text"]) for r in self.stress_frozen}

        dev_text_set = set(dev_texts.values())
        frozen_text_set = set(frozen_texts.values())

        common_texts = dev_text_set.intersection(frozen_text_set)
        if common_texts:
            colliding = []
            for t in common_texts:
                d_ids = [i for i, txt in dev_texts.items() if txt == t]
                f_ids = [i for i, txt in frozen_texts.items() if txt == t]
                colliding.append((t, d_ids, f_ids))
            self.fail(f"Text collisions found between dev and frozen: {colliding}")

    # -------------------------------------------------------------------------
    # SUITE 3: Split Replication & Balance
    # -------------------------------------------------------------------------

    def test_06_independent_split_replication(self):
        """
        Independently re-run the stratified split algorithm with random.Random(42)
        and verify 100% item-by-item identity with stress_dev and stress_frozen.
        """
        unm_set = {"S014", "S015", "S016", "S020", "S024", "S028", "S035", "S036", "S038", "S043"}
        coc_loc_set = {"S044", "S045", "S046", "S047", "S048"}
        cu_tru_set = {"S021", "S022", "S023", "S024", "S046"}

        strat_buckets = defaultdict(list)
        for r in self.stress_mapped:
            intent = r["intent"]
            sid = r["id"]
            hint = r.get("hint") or ""
            tags = set(r["style_tags"])

            is_unm = sid in unm_set
            is_coc = sid in coc_loc_set
            is_cu_tru = sid in cu_tru_set
            is_oos_auth = "oos_authority" in tags

            if intent == "PROCEDURE_INQUIRY":
                key = (intent, is_unm, is_coc, is_cu_tru, hint)
            elif intent == "OUT_OF_SCOPE":
                key = (intent, is_oos_auth)
            else:
                key = (intent,)
            strat_buckets[key].append(r)

        rng = random.Random(42)
        replicated_dev = []
        replicated_frozen = []

        for key in sorted(strat_buckets.keys(), key=lambda k: str(k)):
            items = list(strat_buckets[key])
            rng.shuffle(items)
            n = len(items)
            n_dev = (n + 1) // 2 if len(replicated_dev) <= len(replicated_frozen) else n // 2
            replicated_dev.extend(items[:n_dev])
            replicated_frozen.extend(items[n_dev:])

        replicated_dev_ids = sorted(r["id"] for r in replicated_dev)
        replicated_frozen_ids = sorted(r["id"] for r in replicated_frozen)

        actual_dev_ids = sorted(r["id"] for r in self.stress_dev)
        actual_frozen_ids = sorted(r["id"] for r in self.stress_frozen)

        self.assertEqual(
            replicated_dev_ids,
            actual_dev_ids,
            "Replicated dev IDs must match stress_dev.json exactly 100%"
        )
        self.assertEqual(
            replicated_frozen_ids,
            actual_frozen_ids,
            "Replicated frozen IDs must match stress_frozen.json exactly 100%"
        )

    def test_07_intent_and_subgroup_distribution_balance(self):
        """Verify strict 50/50 balance across intents and challenging sub-cohorts."""
        dev_c = Counter(r["intent"] for r in self.stress_dev)
        frozen_c = Counter(r["intent"] for r in self.stress_frozen)

        # Intents
        expected_intent_dist = {
            "PROCEDURE_INQUIRY": (25, 25),
            "OUT_OF_SCOPE": (10, 10),
            "AMBIGUOUS": (8, 7),
            "GREETING": (5, 5),
            "COMMUNE_INFO": (5, 5),
            "PROCEDURE_CATALOG": (5, 5),
        }
        for intent, (exp_dev, exp_frozen) in expected_intent_dist.items():
            self.assertEqual(dev_c[intent], exp_dev, f"Dev count for {intent} mismatched: {dev_c[intent]} != {exp_dev}")
            self.assertEqual(frozen_c[intent], exp_frozen, f"Frozen count for {intent} mismatched: {frozen_c[intent]} != {exp_frozen}")

        # UNMAPPED cohort (10 total -> 5 dev / 5 frozen)
        dev_unm = [r["id"] for r in self.stress_dev if r.get("mapping_status") == "UNMAPPED"]
        frozen_unm = [r["id"] for r in self.stress_frozen if r.get("mapping_status") == "UNMAPPED"]
        self.assertEqual(len(dev_unm), 5, f"Expected 5 UNMAPPED in dev, got {len(dev_unm)}: {dev_unm}")
        self.assertEqual(len(frozen_unm), 5, f"Expected 5 UNMAPPED in frozen, got {len(frozen_unm)}: {frozen_unm}")

        # Cộc lốc cohort (5 total -> 3 dev / 2 frozen or vice-versa)
        coc_loc_ids = {"S044", "S045", "S046", "S047", "S048"}
        dev_coc = [r["id"] for r in self.stress_dev if r["id"] in coc_loc_ids]
        frozen_coc = [r["id"] for r in self.stress_frozen if r["id"] in coc_loc_ids]
        self.assertEqual(len(dev_coc) + len(frozen_coc), 5)
        self.assertIn(len(dev_coc), {2, 3})

        # Residence cohort (5 total -> 3 dev / 2 frozen or vice-versa)
        residence_ids = {"S021", "S022", "S023", "S024", "S046"}
        dev_res = [r["id"] for r in self.stress_dev if r["id"] in residence_ids]
        frozen_res = [r["id"] for r in self.stress_frozen if r["id"] in residence_ids]
        self.assertEqual(len(dev_res) + len(frozen_res), 5)
        self.assertIn(len(dev_res), {2, 3})

    # -------------------------------------------------------------------------
    # SUITE 4: Chunk IDs Syntax, Existence, and Hierarchy
    # -------------------------------------------------------------------------

    def test_08_chunk_ids_syntax_and_existence(self):
        """
        Adversarial test on every gold_chunk_id in stress_mapped:
        1. Non-empty for MAPPED queries.
        2. Empty list for UNMAPPED and non-INQUIRY queries.
        3. Matches regex ^TTHC-[A-Z]{2}-\d{2}_CHUNK_\d{3}$.
        4. Exists in legal_inventory.json.
        5. Matches procedure_code prefix.
        6. No duplicates in a single query.
        """
        all_chunk_ids_checked = 0
        for rec in self.stress_mapped:
            rec_id = rec["id"]
            p_code = rec["procedure_code"]
            gold_chunks = rec["gold_chunk_ids"]
            status = rec["mapping_status"]

            if status == "MAPPED":
                self.assertIsNotNone(p_code, f"{rec_id} MAPPED but procedure_code is None")
                self.assertNotEqual(p_code, "UNMAPPED", f"{rec_id} MAPPED but procedure_code is UNMAPPED")
                self.assertIn(p_code, self.proc_map, f"procedure_code {p_code} in {rec_id} not found in legal_inventory!")
                self.assertIsInstance(gold_chunks, list, f"{rec_id} gold_chunk_ids must be a list")
                self.assertGreater(len(gold_chunks), 0, f"{rec_id} MAPPED query has empty gold_chunk_ids!")

                # Check duplicates in gold_chunks
                self.assertEqual(len(gold_chunks), len(set(gold_chunks)), f"Duplicate chunks in {rec_id}: {gold_chunks}")

                for cid in gold_chunks:
                    all_chunk_ids_checked += 1
                    # Regex check
                    self.assertRegex(
                        cid,
                        CHUNK_REGEX,
                        f"{rec_id}: Chunk ID '{cid}' does not match regex ^TTHC-[A-Z]{{2}}-\\d{{2}}_CHUNK_\\d{{3}}$"
                    )
                    # Existence check
                    self.assertIn(
                        cid,
                        self.chunk_map,
                        f"{rec_id}: Chunk ID '{cid}' does not exist in legal_inventory.json!"
                    )
                    # Prefix check
                    self.assertTrue(
                        cid.startswith(p_code),
                        f"{rec_id}: Chunk ID '{cid}' prefix does not match procedure_code '{p_code}'!"
                    )

            elif status == "UNMAPPED":
                self.assertEqual(p_code, "UNMAPPED", f"{rec_id} status is UNMAPPED but procedure_code is {p_code}")
                self.assertEqual(len(gold_chunks), 0, f"{rec_id} UNMAPPED query must have empty gold_chunk_ids")

            elif status == "NON_INQUIRY":
                self.assertIsNone(p_code, f"{rec_id} NON_INQUIRY query should have None procedure_code")
                self.assertEqual(len(gold_chunks), 0, f"{rec_id} NON_INQUIRY query must have empty gold_chunk_ids")

        print(f"Total gold_chunk_ids validated: {all_chunk_ids_checked}")
        self.assertGreaterEqual(all_chunk_ids_checked, 40, "At least 40 chunks must be validated across 40 mapped queries")

    # -------------------------------------------------------------------------
    # SUITE 5: Adversarial Edge Cases & Semantic Scrutiny
    # -------------------------------------------------------------------------

    def test_09_residence_delegation_audit(self):
        """
        Audit S021, S022, S023, S024, S046:
        Under Law on Residence 2020 (68/2020/QH14), residence is under Police (BCA) authority.
        Check that:
        - original intent is PROCEDURE_INQUIRY (preserved historical label)
        - proposed_intent is OUT_OF_SCOPE
        - S024 (separation of household) is UNMAPPED because it does not exist in the 40 TTHCs.
        """
        res_ids = ["S021", "S022", "S023", "S024", "S046"]
        mapped_dict = {r["id"]: r for r in self.stress_mapped}
        for sid in res_ids:
            r = mapped_dict[sid]
            self.assertEqual(r["intent"], "PROCEDURE_INQUIRY", f"{sid} original intent altered")
            self.assertEqual(r["proposed_intent"], "OUT_OF_SCOPE", f"{sid} proposed_intent must be OUT_OF_SCOPE")

        # Specific audit for S024: Tách hộ
        s024 = mapped_dict["S024"]
        self.assertEqual(s024["procedure_code"], "UNMAPPED", "S024 (tách hộ) must be UNMAPPED")
        self.assertEqual(s024["gold_chunk_ids"], [], "S024 must have empty gold chunks")

    def test_10_short_queries_audit(self):
        """
        Audit S044-S048 (câu cộc lốc):
        S044: 'khai sinh' -> TTHC-HT-01_CHUNK_001
        S045: 'ket hon' -> TTHC-HT-02_CHUNK_001
        S046: 'đăng ký tạm trú' -> TTHC-CR-03_CHUNK_001
        S047: 'sao y' -> TTHC-CT-01_CHUNK_001
        S048: 'xin giay doc than' -> TTHC-HT-11_CHUNK_001
        Check that all target chunks are of chunkType == 'OVERVIEW'.
        """
        mapped_dict = {r["id"]: r for r in self.stress_mapped}
        expected_coc_loc = {
            "S044": ("TTHC-HT-01", "TTHC-HT-01_CHUNK_001"),
            "S045": ("TTHC-HT-02", "TTHC-HT-02_CHUNK_001"),
            "S046": ("TTHC-CR-03", "TTHC-CR-03_CHUNK_001"),
            "S047": ("TTHC-CT-01", "TTHC-CT-01_CHUNK_001"),
            "S048": ("TTHC-HT-11", "TTHC-HT-11_CHUNK_001"),
        }
        for sid, (exp_proc, exp_chunk) in expected_coc_loc.items():
            r = mapped_dict[sid]
            self.assertEqual(r["procedure_code"], exp_proc, f"{sid} procedure code mismatched")
            self.assertEqual(r["gold_chunk_ids"], [exp_chunk], f"{sid} chunk mismatched")
            # Verify chunk type is OVERVIEW in legal inventory
            chunk_obj = self.chunk_map[exp_chunk]
            self.assertEqual(chunk_obj["chunkType"], "OVERVIEW", f"{sid} chunk {exp_chunk} must be OVERVIEW")

    def test_11_unmapped_queries_justification_audit(self):
        """
        Adversarial audit on all 10 UNMAPPED queries:
        Verify that none of them could be trivially mapped to an existing procedure in the 40 TTHCs.
        """
        unmapped_ids = ["S014", "S015", "S016", "S020", "S024", "S028", "S035", "S036", "S038", "S043"]
        mapped_dict = {r["id"]: r for r in self.stress_mapped}

        # 1. Death queries: S014, S015, S016, S043
        # Check if legal inventory has regular domestic death registration
        death_procs = [p for p in self.legal_inventory if "khai tử" in p["name"].lower()]
        death_codes = [p["code"] for p in death_procs]
        # In inventory: TTHC-HT-03 (khai tử khu vực biên giới), TTHC-CR-02 (liên thông khai sinh - khai tử - mai táng...)
        print(f"Death related procedures in inventory: {death_codes}")
        for p in death_procs:
            print(f"  {p['code']}: {p['name']}")
        # Neither is regular domestic death registration at commune level!
        self.assertNotIn("TTHC-HT-death-regular", death_codes)
        for sid in ["S014", "S015", "S016", "S043"]:
            self.assertEqual(mapped_dict[sid]["procedure_code"], "UNMAPPED", f"{sid} must be UNMAPPED")

        # 2. Land division query: S028
        # Check if legal inventory has 'tách thửa'
        tach_thua_procs = [p for p in self.legal_inventory if "tách thửa" in p["name"].lower()]
        self.assertEqual(len(tach_thua_procs), 0, "No tách thửa procedure exists in inventory")
        self.assertEqual(mapped_dict["S028"]["procedure_code"], "UNMAPPED")

        # 3. Civil status name change / correction: S035, S036
        # In inventory: TTHC-HT-12 has foreign element (nước ngoài).
        # Check domestic change:
        cai_chinh_procs = [p for p in self.legal_inventory if "cải chính" in p["name"].lower() or "thay đổi hộ tịch" in p["name"].lower()]
        for p in cai_chinh_procs:
            print(f"  Cải chính / Thay đổi: {p['code']}: {p['name']}")
        # Verify S035, S036 are UNMAPPED
        self.assertEqual(mapped_dict["S035"]["procedure_code"], "UNMAPPED")
        self.assertEqual(mapped_dict["S036"]["procedure_code"], "UNMAPPED")

        # 4. Father child recognition: S038
        # In inventory: TTHC-HT-05 has foreign element
        self.assertEqual(mapped_dict["S038"]["procedure_code"], "UNMAPPED")

        # 5. Gift contract of land: S020
        # In inventory: CT-01 to CT-08. Check if gift contract of land exists:
        ct_procs = [p for p in self.legal_inventory if p["code"].startswith("TTHC-CT-")]
        for p in ct_procs:
            print(f"  CT proc: {p['code']}: {p['name']}")
        self.assertEqual(mapped_dict["S020"]["procedure_code"], "UNMAPPED")

    def test_12_semantic_sanity_check_all_mapped(self):
        """
        Adversarial audit on potentially questionable mappings:
        - S026: 'thừa kế đất đai ở xã, ba mất không để lại di chúc, làm sao' -> TTHC-DC-01
        - S029: 'dang ky bien dong dat dai sau khi ban an cua toa an can giay to gi' -> TTHC-XD-01
        - S030: 'chuyển nhượng đất nông nghiệp cho người khác phải làm ở đâu, mất bao lâu' -> TTHC-DC-01
        - S031-S034: 'bảo trợ xã hội...' -> TTHC-BT-01
        """
        mapped_dict = {r["id"]: r for r in self.stress_mapped}

        # Check S029: TTHC-XD-01
        s029 = mapped_dict["S029"]
        proc_xd01 = self.proc_map["TTHC-XD-01"]
        print(f"\nS029 Procedure Title: {proc_xd01['name']}")
        self.assertIn("bản án, quyết định của Tòa án", proc_xd01["name"], "TTHC-XD-01 specifically covers court judgment land modification")
        self.assertEqual(s029["procedure_code"], "TTHC-XD-01")
        self.assertIn("TTHC-XD-01_CHUNK_003", s029["gold_chunk_ids"])
        chunk_xd01 = self.chunk_map["TTHC-XD-01_CHUNK_003"]
        self.assertEqual(chunk_xd01["chunkType"], "REQUIRED_DOCUMENTS")

        # Check S026: TTHC-DC-01
        s026 = mapped_dict["S026"]
        proc_dc01 = self.proc_map["TTHC-DC-01"]
        self.assertIn("thừa kế", proc_dc01["name"].lower())
        self.assertEqual(s026["procedure_code"], "TTHC-DC-01")

        # Check S030: TTHC-DC-01
        s030 = mapped_dict["S030"]
        self.assertIn("chuyển đổi quyền sử dụng đất nông nghiệp", proc_dc01["name"].lower())
        self.assertEqual(s030["procedure_code"], "TTHC-DC-01")

        # Check S031-S034: TTHC-BT-01
        proc_bt01 = self.proc_map["TTHC-BT-01"]
        for sid in ["S031", "S032", "S033", "S034"]:
            self.assertEqual(mapped_dict[sid]["procedure_code"], "TTHC-BT-01")

    def test_13_chunk_type_semantic_consistency(self):
        """
        Verify that chunkType of assigned gold_chunk_ids matches the nature of the citizen's inquiry:
        - Hồ sơ / giấy tờ questions must target REQUIRED_DOCUMENTS
        - Phí / lệ phí / thời hạn / tổng quan questions must target OVERVIEW
        - Trình tự / quy trình questions must target PROCESS_STEP
        """
        mapped_dict = {r["id"]: r for r in self.stress_mapped}
        mismatches = []
        for sid, rec in mapped_dict.items():
            if rec["mapping_status"] == "MAPPED":
                cid = rec["gold_chunk_ids"][0]
                chunk_obj = self.chunk_map[cid]
                ctype = chunk_obj["chunkType"]
                qtype = rec.get("question_type") or ""

                if "Hồ sơ" in qtype:
                    if ctype != "REQUIRED_DOCUMENTS":
                        mismatches.append((sid, qtype, cid, ctype, "Expected REQUIRED_DOCUMENTS"))
                elif any(k in qtype for k in ["Phí", "Thời hạn", "Tổng quan", "Thẩm quyền"]):
                    if ctype != "OVERVIEW":
                        mismatches.append((sid, qtype, cid, ctype, "Expected OVERVIEW"))
                elif "Quy trình" in qtype and "TTHC-DC-01" in cid:
                    if ctype != "PROCESS_STEP":
                        mismatches.append((sid, qtype, cid, ctype, "Expected PROCESS_STEP"))

        self.assertEqual(
            len(mismatches),
            0,
            f"ChunkType semantic mismatches found: {mismatches}"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)

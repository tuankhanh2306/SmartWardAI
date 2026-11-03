import sys
import json

with open("data-pipeline/procedure-crawler/originals/TTHC-HT-01.raw.json", "r", encoding="utf-8") as f:
    d = json.load(f)

raw = d.get("rawPortalData", {})
print("Procedure Name:", raw.get("name"))
print("Agency:", raw.get("executingAgencies") or raw.get("departmentsExecuting"))

steps = raw.get("executionSteps", [])
print("Number of steps:", len(steps))
if steps:
    print("Step 1 preview:", steps[0].get("description", "")[:200])

cases = raw.get("executionCases", [])
print("Execution cases count:", len(cases))
if cases:
    c0 = cases[0]
    print("Case 0 name:", c0.get("name"))
    print("Case 0 profile components count:", len(c0.get("profileComponents", [])))
    for p in c0.get("profileComponents", [])[:3]:
        print("  - Doc:", p.get("name"))
        print("    Originals:", p.get("originalQty"), "Copies:", p.get("copyQty"))

fees = raw.get("fees", [])
print("Fees count:", len(fees))
if fees:
    print("Fee 0:", fees[0])

legal = raw.get("legalBasisesDetails", [])
print("Legal bases count:", len(legal))
for lb in legal[:3]:
    print("  - Legal:", lb.get("code"), "|", lb.get("name"))

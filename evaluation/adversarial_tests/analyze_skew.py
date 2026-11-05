import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

for name, path in [('dev', 'ml/data/stress_dev.json'), ('frozen', 'ml/data/stress_frozen.json')]:
    with open(path, mode='r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"\n=== {name.upper()} (N={len(data)}) ===")
    for r in data:
        tags = r.get('style_tags', [])
        if 'cau_coc_loc' in tags:
            print(f"  [cau_coc_loc] {r['id']} ({r['intent']}): '{r['text']}' | tags={tags}")
        if 'phuong_ngu' in tags:
            print(f"  [phuong_ngu]  {r['id']} ({r['intent']}): '{r['text']}' | tags={tags}")

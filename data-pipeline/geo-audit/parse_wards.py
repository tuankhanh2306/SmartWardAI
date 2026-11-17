import json
import re

def parse_ts_wards():
    with open('frontend/src/data/anGiangWards.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match each ward item in AN_GIANG_WARDS array
    item_pattern = re.compile(
        r'\{\s*code:\s*[\'"](?P<code>[^\'"]+)[\'"].*?'
        r'name:\s*[\'"](?P<name>[^\'"]+)[\'"].*?'
        r'type:\s*[\'"](?P<type>[^\'"]+)[\'"].*?'
        r'area:\s*[\'"](?P<area>[^\'"]+)[\'"].*?'
        r'province:\s*[\'"](?P<province>[^\'"]+)[\'"].*?'
        r'officeAddress:\s*[\'"](?P<officeAddress>[^\'"]+)[\'"].*?'
        r'phoneNumber:\s*[\'"](?P<phoneNumber>[^\'"]+)[\'"].*?'
        r'lat:\s*(?P<lat>[0-9\.\-]+).*?'
        r'lon:\s*(?P<lon>[0-9\.\-]+)',
        re.DOTALL
    )

    wards = []
    for match in item_pattern.finditer(content):
        d = match.groupdict()
        d['lat'] = float(d['lat'])
        d['lon'] = float(d['lon'])
        wards.append(d)

    print(f"Parsed {len(wards)} wards from anGiangWards.ts")
    return wards

if __name__ == '__main__':
    wards = parse_ts_wards()
    for w in wards[:5]:
        print(w['code'], w['name'], w['lat'], w['lon'])

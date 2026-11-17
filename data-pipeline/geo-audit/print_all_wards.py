from parse_wards import parse_ts_wards

wards = parse_ts_wards()

for w in wards:
    # Print address, name, lat, lon
    print(f"[{w['code']}] {w['name']}: {w['officeAddress']} -> ({w['lat']}, {w['lon']})")

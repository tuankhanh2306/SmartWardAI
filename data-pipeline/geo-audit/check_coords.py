import json
import math
from parse_wards import parse_ts_wards

wards = parse_ts_wards()

print(f"{'Code':20} | {'Name':30} | {'Lat':8} | {'Lon':8} | Category")
print("-" * 80)
for w in wards:
    code = w['code']
    name = w['name']
    lat = w['lat']
    lon = w['lon']
    
    # Check general bbox
    is_mainland = (10.15 <= lat <= 11.00) and (104.70 <= lon <= 105.70)
    is_phuquoc = (10.00 <= lat <= 10.45) and (103.80 <= lon <= 104.10)
    is_kienhai = (9.60 <= lat <= 10.00) and (104.60 <= lon <= 105.00)
    is_thochau = (9.15 <= lat <= 9.45) and (103.35 <= lon <= 103.65)
    
    status = "OK"
    if not (is_mainland or is_phuquoc or is_kienhai or is_thochau):
        status = "OUT_OF_BBOX"
    
    print(f"{code:20} | {name:30} | {lat:8.4f} | {lon:8.4f} | {status}")

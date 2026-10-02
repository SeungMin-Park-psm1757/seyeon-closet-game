#!/usr/bin/env python3
from pathlib import Path
import re, json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
REG=(ROOT/"assets/assetRegistry.js").read_text(encoding="utf-8")
THRESHOLD=32

def bbox(path):
    im=Image.open(ROOT/path).convert("RGBA")
    a=im.getchannel("A")
    strong=a.point(lambda p: 255 if p >= THRESHOLD else 0)
    b=strong.getbbox()
    if not b:
        return None
    x0,y0,x1,y1=b
    w,h=im.size
    return {
        "path":path,"canvas":[w,h],"bbox":[x0,y0,x1,y1],
        "bboxNorm":[round(x0/w,4),round(y0/h,4),round(x1/w,4),round(y1/h,4)],
        "size":[x1-x0,y1-y0],
        "center":[round((x0+x1)/2,1),round((y0+y1)/2,1)]
    }

paths=[]
for m in re.finditer(r"""['"](assets/custom/(?:characters|clothes)/[^'"]+\.png)['"]""", REG):
    p=m.group(1)
    if p not in paths: paths.append(p)

focus=("girl01","hair_","hat_","top_","dress_","skirt_","pants_","shoes_")
rows=[]
for p in paths:
    name=Path(p).stem
    if any(k in name for k in focus):
        meta=bbox(p)
        if meta: rows.append(meta)

print(f"ALPHA_BOUNDS threshold={THRESHOLD}")
for row in rows:
    print(f"{Path(row['path']).stem}|bbox={row['bbox']}|norm={row['bboxNorm']}|size={row['size']}|center={row['center']}")
print("ALPHA_BOUNDS_JSON_BEGIN")
print(json.dumps(rows, ensure_ascii=False))
print("ALPHA_BOUNDS_JSON_END")

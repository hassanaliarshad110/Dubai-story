#!/usr/bin/env python3
"""Dubai City Stories - real ground colours from the Sentinel-2 satellite (10 m per pixel, free and open data).

Writes data/s2/<rx>_<ry>.jpg (one 8 km region per image, 800 x 800 px, north at the top) and data/s2/far.jpg (the whole
map at 20 m per pixel), and records them in data/world.json ("s2"). Pixels are placed with the game's own projection,
so the imagery lines up with the roads and buildings.

Source: Copernicus Sentinel-2 L2A true-colour images (Element 84 Earth Search STAC, AWS open data).
Usage: python tools/build_s2.py [--data data]
Needs: numpy, rasterio, pyproj, pillow
"""
import argparse, json, math, os, sys, urllib.request
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import Transformer
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('--data', default='data'); args = ap.parse_args()
W = json.load(open(os.path.join(args.data, 'world.json')))
p = W['proj']; LAT0, LON0, KX, KY = p['lat0'], p['lon0'], p['kx'], p['ky']
RG, RPX = 8000, 800                      # region size (m) and pixels -> 10 m per pixel
xs = [pt[0] for poly in W['city'] for pt in poly[0]]; ys = [pt[1] for poly in W['city'] for pt in poly[0]]
X0, X1, Y0, Y1 = min(xs) - 1500, max(xs) + 1500, min(ys) - 1500, max(ys) + 1500
lonlat = lambda x, y: (LON0 + x / KX, LAT0 + y / KY)

# ---- find the clearest recent scenes over the map
w, s = lonlat(X0, Y0); e, n = lonlat(X1, Y1)
req = {'collections': ['sentinel-2-l2a'], 'bbox': [w, s, e, n], 'datetime': '2025-06-01T00:00:00Z/2026-12-31T00:00:00Z',
       'query': {'eo:cloud_cover': {'lt': 2}}, 'limit': 60}
r = urllib.request.Request('https://earth-search.aws.element84.com/v1/search', data=json.dumps(req).encode(), headers={'Content-Type': 'application/json'})
items = json.load(urllib.request.urlopen(r, timeout=120))['features']
items.sort(key=lambda it: (it['properties'].get('eo:cloud_cover', 99), it['properties'].get('s2:nodata_pixel_percentage', 100)))
print('scenes:', len(items)); items = items[:12]
srcs = []
for it in items:
    href = it['assets'].get('visual', {}).get('href')
    if not href: continue
    try:
        ds = rasterio.open(href); srcs.append((ds, Transformer.from_crs('EPSG:4326', ds.crs, always_xy=True)))
        print('  using', it['id'], it['properties'].get('eo:cloud_cover'), it['properties'].get('datetime'))
    except Exception as ex:
        print('  skip', it['id'], ex)

def render(x0, y1, w_m, h_m, px_w, px_h):
    """RGB image of the ground: x0 = west edge, y1 = north edge (game metres), row 0 = north."""
    out = np.zeros((px_h, px_w, 3), np.uint8); filled = np.zeros((px_h, px_w), bool)
    gx = x0 + (np.arange(px_w) + 0.5) * w_m / px_w; gy = y1 - (np.arange(px_h) + 0.5) * h_m / px_h
    GX, GY = np.meshgrid(gx, gy); LON, LAT = LON0 + GX / KX, LAT0 + GY / KY
    for ds, tr in srcs:
        if filled.all(): break
        ex, ny = tr.transform(LON, LAT)
        inv = ~ds.transform; cols, rows = inv * (ex, ny)
        cols = np.floor(cols).astype(np.int64); rows = np.floor(rows).astype(np.int64)
        need = ~filled & (cols >= 0) & (rows >= 0) & (cols < ds.width) & (rows < ds.height)
        if not need.any(): continue
        c0, c1, r0, r1 = cols[need].min(), cols[need].max() + 1, rows[need].min(), rows[need].max() + 1
        try: arr = ds.read([1, 2, 3], window=Window(c0, r0, c1 - c0, r1 - r0))
        except Exception as ex: print('  read failed', ex); continue
        v = arr[:, rows[need] - r0, cols[need] - c0].T
        ok = v.sum(axis=1) > 0                                   # no-data edges of a scene are black
        idx = np.argwhere(need)[ok]
        out[idx[:, 0], idx[:, 1]] = v[ok]; filled[idx[:, 0], idx[:, 1]] = True
    # brighten the true-colour image a little (desert haze makes it flat), keep it natural
    f = out.astype(np.float32) / 255.0
    f = np.clip((f ** 0.85) * 1.12, 0, 1)
    return Image.fromarray((f * 255).astype(np.uint8)), filled.mean()

os.makedirs(os.path.join(args.data, 's2'), exist_ok=True)
n = 0
for rx in range(math.floor(X0 / RG), math.floor(X1 / RG) + 1):
    for ry in range(math.floor(Y0 / RG), math.floor(Y1 / RG) + 1):
        im, cov = render(rx * RG, (ry + 1) * RG, RG, RG, RPX, RPX)
        if cov < 0.01: continue
        im.save(os.path.join(args.data, 's2', '%d_%d.jpg' % (rx, ry)), quality=86); n += 1
        print('region', rx, ry, 'covered %.0f%%' % (cov * 100))
fw, fh = X1 - X0, Y1 - Y0
far, cov = render(X0, Y1, fw, fh, int(fw / 20), int(fh / 20))
far.save(os.path.join(args.data, 's2', 'far.jpg'), quality=82)
W['s2'] = {'x0': round(X0), 'y1': round(Y1), 'w': round(fw), 'h': round(fh), 'rg': RG, 'source': 'Copernicus Sentinel-2'}
cr = 'Ground imagery: contains modified Copernicus Sentinel-2 data'
if cr not in W['credits']['data']: W['credits']['data'].append(cr)
json.dump(W, open(os.path.join(args.data, 'world.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('regions:', n, 'far covered %.0f%%' % (cov * 100))

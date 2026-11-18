#!/usr/bin/env python3
"""Dubai City Stories - where the trees are, from ESA WorldCover (10 m land cover from Sentinel satellites, CC BY 4.0).

Every 10 m pixel classed as tree cover inside the enabled phases becomes a tree point (game metres, slightly jittered).
build_dubai.py then drops the ones on roads or inside buildings and puts the rest in the map tiles.
Usage: python tools/worldcover_trees.py out.json
Needs: numpy, rasterio
"""
import json, math, os, sys
import numpy as np
import rasterio
from rasterio.windows import from_bounds

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'phases.json'))); O = CFG['origin']
_A, _E2 = 6378137.0, 0.00669437999014
_phi = math.radians(O['lat']); _s2 = math.sin(_phi) ** 2
KX = math.pi / 180 * _A * math.cos(_phi) / math.sqrt(1 - _E2 * _s2)
KY = math.pi / 180 * _A * (1 - _E2) / (1 - _E2 * _s2) ** 1.5
bbs = [p['bbox'] for p in CFG['phases'] if p.get('enabled')]
w, s, e, n = min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs)
# WorldCover 3 x 3 degree tiles are named by their south-west corner
url = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N%02dE%03d_Map.tif' % (int(s // 3 * 3), int(w // 3 * 3))
print('reading', url)
with rasterio.open(url) as ds:
    win = from_bounds(w, s, e, n, ds.transform)
    a = ds.read(1, window=win)
    tr = ds.window_transform(win)
rows, cols = np.nonzero(a == 10)                  # 10 = tree cover
lon, lat = rasterio.transform.xy(tr, rows, cols)
lon, lat = np.array(lon), np.array(lat)
rng = np.random.default_rng(7)
x = (lon - O['lon']) * KX + rng.uniform(-3, 3, lon.size); y = (lat - O['lat']) * KY + rng.uniform(-3, 3, lat.size)
pts = np.round(np.stack([x, y], 1), 1).tolist()
json.dump(pts, open(sys.argv[1], 'w'))
print('tree pixels:', len(pts))

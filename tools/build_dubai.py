#!/usr/bin/env python3
# (gates and bins on villa walls)
"""Dubai City Stories - map builder.

Turns OpenStreetMap data for the enabled phases in tools/phases.json into the game's map:
  data/world.json      the always-loaded city layers (far roads, big areas, skyline, landmarks, ...)
  data/p/<pack>.wasm   8 x 8 packs of 500 m tiles (same binary format as YYC City Stories)

Every feature is placed from its real latitude/longitude into ONE world grid (metres east/north of a fixed
origin in Al Garhoud, the same projection the game engine uses), and tiles are a fixed 500 m grid. So any
phase built later joins its neighbours exactly where it does in the real city.

Usage:  python tools/build_dubai.py [--out data] [--cache .cache]
Needs:  shapely (pip install shapely). Runs where the internet is open (e.g. GitHub Actions).
"""
import argparse, datetime, json, math, os, re, struct, sys, time, urllib.parse, urllib.request
from collections import defaultdict

from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import linemerge, polygonize, unary_union
from shapely.validation import make_valid

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'phases.json')))
O = CFG['origin']; TS = CFG['tile_size']; PACK = CFG['pack']

# ------------------------------------------------------------------ projection (identical to the engine)
_A, _E2 = 6378137.0, 0.00669437999014
_phi = math.radians(O['lat']); _s2 = math.sin(_phi) ** 2
KX = math.pi / 180 * _A * math.cos(_phi) / math.sqrt(1 - _E2 * _s2)
KY = math.pi / 180 * _A * (1 - _E2) / (1 - _E2 * _s2) ** 1.5
def P(lon, lat): return ((lon - O['lon']) * KX, (lat - O['lat']) * KY)
def geom_xy(g): return [P(p['lon'], p['lat']) for p in g if p]

# ------------------------------------------------------------------ download (Overpass API)
ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
             'https://overpass.private.coffee/api/interpreter']
QUERY = """[out:json][timeout:900][maxsize:2000000000];
(
  way["highway"]({b}); way["railway"]({b}); way["aeroway"]({b});
  way["building"]({b}); way["building:part"]({b});
  way["landuse"]({b}); way["leisure"]({b}); way["natural"]({b}); way["amenity"]({b});
  way["waterway"]({b}); way["water"]({b}); way["man_made"~"^(pier|breakwater|bridge)$"]({b});
  way["barrier"~"^(fence|wall|hedge|retaining_wall)$"]({b}); way["place"~"^(island|islet)$"]({b});
  way["tourism"]({b});
  relation["type"="multipolygon"]({b});
  relation["boundary"="administrative"]["admin_level"~"^(8|9|10)$"]({b});
  node["natural"="tree"]({b});
  node["highway"~"^(bus_stop|traffic_signals)$"]({b});
  node["railway"~"^(station|halt)$"]({b}); node["public_transport"="station"]({b});
  node["amenity"]({b}); node["shop"]({b}); node["tourism"]({b});
  node["leisure"~"^(fitness_centre|sports_centre)$"]({b});
);
out geom qt;"""

def overpass(bbox, cache):
    w, s, e, n = bbox
    key = os.path.join(cache, 'osm_%.4f_%.4f_%.4f_%.4f.json' % (w, s, e, n))
    if os.path.exists(key):
        return json.load(open(key))
    q = QUERY.replace('{b}', '%.6f,%.6f,%.6f,%.6f' % (s, w, n, e))
    last = None
    for attempt in range(6):
        url = ENDPOINTS[attempt % len(ENDPOINTS)]
        try:
            print('  overpass', url, bbox, flush=True)
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'DubaiCityStories/1.0 (game map builder)'})
            with urllib.request.urlopen(req, timeout=1000) as r:
                d = json.load(r)
            if d.get('remark') and 'error' in d['remark'].lower():
                raise RuntimeError(d['remark'])
            os.makedirs(cache, exist_ok=True)
            json.dump(d, open(key, 'w'))
            return d
        except Exception as ex:          # busy servers: wait and try the next one
            last = ex; print('   failed:', ex, flush=True); time.sleep(20 + attempt * 30)
    raise RuntimeError('Overpass download failed: %s' % last)

def fetch(bboxes, cache, step=0.045):
    els, stamp = {}, None
    for bb in bboxes:
        w, s, e, n = bb
        nx, ny = max(1, math.ceil((e - w) / step)), max(1, math.ceil((n - s) / step))
        for i in range(nx):
            for j in range(ny):
                cell = (w + (e - w) * i / nx, s + (n - s) * j / ny, w + (e - w) * (i + 1) / nx, s + (n - s) * (j + 1) / ny)
                d = overpass(cell, cache)
                stamp = stamp or d.get('osm3s', {}).get('timestamp_osm_base')
                for el in d['elements']:
                    els[(el['type'], el['id'])] = el
    return list(els.values()), stamp

# ------------------------------------------------------------------ helpers
def num(v):
    if v is None: return None
    try: return float(str(v).split(';')[0].replace(',', '.').replace('m', '').strip())
    except ValueError: return None

def name_of(t):
    return t.get('name:en') or t.get('name') or t.get('ref') or None

def ring_area(r):
    a = 0
    for i in range(len(r)):
        x1, y1 = r[i - 1]; x2, y2 = r[i]; a += x1 * y2 - x2 * y1
    return a / 2

def relation_polys(el):
    outer, inner = [], []
    for m in el.get('members', []):
        if m.get('type') != 'way' or not m.get('geometry'): continue
        pts = geom_xy(m['geometry'])
        if len(pts) < 2: continue
        (inner if m.get('role') == 'inner' else outer).append(LineString(pts))
    if not outer: return None
    try:
        op = list(polygonize(linemerge(unary_union(outer))))
        if not op: return None
        g = unary_union(op)
        if inner:
            ip = list(polygonize(linemerge(unary_union(inner))))
            if ip: g = g.difference(unary_union(ip))
        g = make_valid(g)
        return g if not g.is_empty else None
    except Exception:
        return None

def way_poly(el):
    pts = geom_xy(el.get('geometry') or [])
    if len(pts) < 4 or el['nodes'][0] != el['nodes'][-1]: return None
    try:
        g = Polygon(pts)
        if not g.is_valid: g = make_valid(g)
        return g if not g.is_empty and g.area > 0.5 else None
    except Exception:
        return None

def polys_of(g):
    if g is None or g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, MultiPolygon): return list(g.geoms)
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in polys_of(x)]
    return []

# ------------------------------------------------------------------ classification (codes match the engine's tiles.js)
L_BLD, L_ROAD, L_PATH, L_RAIL, L_AREA, L_WATER, L_WWAY, L_POI, L_STOP, L_BARR, L_TREE = range(1, 12)
ROAD = {'motorway': 1, 'trunk': 2, 'primary': 3, 'secondary': 4, 'tertiary': 5, 'unclassified': 6, 'residential': 6,
        'living_street': 6, 'road': 6, 'service': 7, 'motorway_link': 8, 'trunk_link': 9, 'primary_link': 9,
        'secondary_link': 9, 'tertiary_link': 9, 'busway': 10, 'bus_guideway': 10}
PATH = {'footway': 1, 'path': 1, 'corridor': 1, 'pedestrian': 2, 'cycleway': 3, 'track': 4, 'bridleway': 4, 'steps': 5}
SKIP_LIFE = ('construction', 'proposed', 'abandoned', 'disused', 'razed', 'demolished', 'planned')

def oneway(t, hw):
    o = t.get('oneway')
    if o in ('yes', '1', 'true'): return 1
    if o == '-1': return -1
    if o == 'no': return 0
    if t.get('junction') in ('roundabout', 'circular') or hw in ('motorway', 'motorway_link'): return 1
    return 0

def road_width(k, t, ow):
    w = num(t.get('width'))
    if w and 3 <= w <= 60: return w
    lanes = num(t.get('lanes'))
    if lanes and 1 <= lanes <= 12: return min(3.5 * lanes + 1, 44)
    if k == 1: return 11.5 if ow else 22
    if k == 2: return 11.5 if ow else 15
    if k == 3: return 8 if ow else 15
    if k in (4, 5): return 8
    if k == 6: return 7.5
    if k == 7: return 4.5
    if k in (8, 9): return 4.5
    if k == 10: return 7
    return 6

def deck_height(t, rail=False):
    """Height of a raised way above the ground (0 = on the ground). Bridges and flyovers are raised by layer."""
    if t.get('tunnel') in ('yes', 'culvert', 'flooded') or t.get('location') == 'underground': return 0
    layer = num(t.get('layer')) or 0
    br = t.get('bridge') not in (None, 'no')
    if not br and layer < 1: return 0
    lv = max(1, int(layer))
    return max(10.0, 8.0 * lv) if rail else 7.0 * lv

BLD_KIND = {'house': 1, 'detached': 1, 'villa': 1, 'semidetached_house': 18, 'terrace': 19, 'residential': 4,
            'apartments': 4, 'dormitory': 4, 'hotel': 4, 'garage': 2, 'garages': 2, 'shed': 2, 'carport': 13,
            'commercial': 3, 'office': 3, 'industrial': 5, 'warehouse': 5, 'hangar': 5, 'service': 5,
            'transportation': 5, 'train_station': 5, 'terminal': 5, 'retail': 6, 'supermarket': 6, 'kiosk': 13,
            'school': 7, 'university': 7, 'college': 7, 'kindergarten': 7, 'mosque': 8, 'church': 8, 'temple': 8,
            'religious': 8, 'civic': 9, 'public': 9, 'government': 9, 'fire_station': 9, 'parking': 10,
            'stadium': 11, 'sports_centre': 11, 'hospital': 12, 'roof': 13, 'hut': 13, 'construction': 16}
BLD_H = {1: 7.5, 2: 3.2, 3: 12, 4: 13, 5: 10, 6: 6, 7: 10, 8: 10, 9: 9, 10: 12, 11: 20, 12: 16, 13: 3.5, 14: 7,
         16: 6, 18: 7.5, 19: 8}
TOWER_H = 38.0          # like Calgary: every building this tall or taller is also in the always-visible skyline

def bld_kind(t):
    b = t.get('building') or t.get('building:part') or 'yes'
    k = BLD_KIND.get(b, 14)
    if k == 14 and t.get('amenity') == 'place_of_worship': k = 8
    return k

def bld_height(t, k):
    h = num(t.get('height')) or num(t.get('building:height'))
    if not h:
        lv = num(t.get('building:levels'))
        if lv is not None and lv >= 0: h = max(3.0, lv * 3.3 + (num(t.get('roof:levels')) or 0) * 2.5 + 0.8)
    if not h or h < 2 or h > 900: h = BLD_H.get(k, 7)
    mh = num(t.get('min_height'))
    if mh is None:
        ml = num(t.get('building:min_level'))
        mh = ml * 3.3 if ml else 0
    mh = max(0.0, min(mh, h - 1))
    return h, mh

# area kind -> engine draw-order flags (as in the Calgary data); 24 sand and 25 airfield are new for Dubai
AREA_FLAGS = {1: 1, 2: 2, 3: 2, 4: 2, 16: 2, 19: 2, 5: 5, 6: 6, 18: 6, 7: 4, 8: 4, 9: 3, 11: 3, 12: 3, 10: 7, 13: 7,
              20: 7, 14: 8, 15: 8, 21: 8, 22: 8, 23: 9, 24: 1, 25: 1}
def area_kind(t):
    lu, le, na, am, ae = t.get('landuse'), t.get('leisure'), t.get('natural'), t.get('amenity'), t.get('aeroway')
    if ae == 'aerodrome': return 25
    if ae in ('apron', 'helipad'): return 22
    if le == 'swimming_pool' or am == 'swimming_pool': return 23
    if le == 'golf_course': return 7
    if le in ('pitch',): return 13
    if le in ('playground',): return 14
    if le in ('track',): return 15
    if le in ('stadium', 'sports_centre'): return 2
    if le in ('park', 'garden', 'recreation_ground', 'dog_park'): return 5
    if le in ('nature_reserve',): return 6
    if le in ('marina',): return 22
    if am == 'parking' or lu == 'garages': return 10
    if am in ('school', 'college', 'university', 'kindergarten') or lu == 'education': return 11
    if am in ('hospital', 'clinic'): return 12
    if am in ('grave_yard',) or lu == 'cemetery': return 8
    if am in ('marketplace',): return 20
    if t.get('highway') in ('pedestrian', 'footway') and t.get('area') == 'yes': return 20
    if t.get('railway') == 'platform' or t.get('public_transport') == 'platform': return 21
    if t.get('man_made') in ('pier', 'breakwater'): return 20
    if na in ('sand', 'beach', 'bare_rock', 'scree', 'shingle', 'desert'): return 24
    if na in ('wood', 'scrub', 'heath', 'tree_row') or lu in ('forest', 'orchard', 'plant_nursery'): return 6
    if na in ('grassland',) or lu in ('grass', 'village_green', 'recreation_ground', 'meadow', 'flowerbed'): return 5
    if na in ('wetland',): return 18
    if lu == 'residential': return 1
    if lu == 'commercial': return 2
    if lu in ('industrial', 'railway', 'port', 'landfill', 'quarry', 'depot'): return 3
    if lu == 'retail': return 4
    if lu in ('construction', 'brownfield', 'greenfield'): return 16
    if lu in ('military',): return 19
    if lu in ('farmland', 'farmyard', 'allotments'): return 9
    if lu in ('religious',): return 12
    return 0

def is_water(t):
    return (t.get('natural') in ('water', 'bay', 'strait') or t.get('waterway') in ('riverbank', 'dock', 'canal_area')
            or t.get('landuse') in ('reservoir', 'basin') or t.get('water') is not None and t.get('natural') == 'water')

POI_KIND = [  # (tag, values, kind, places-category)
    ('shop', ('supermarket', 'hypermarket', 'greengrocer'), 1, 'grocery'), ('shop', ('convenience', 'kiosk'), 2, 'convenience'),
    ('shop', ('mall', 'department_store'), 3, 'mall'), ('amenity', ('library',), 4, 'library'),
    ('amenity', ('school', 'kindergarten'), 5, 'school'), ('amenity', ('university', 'college'), 6, 'college'),
    ('amenity', ('hospital',), 7, 'hospital'), ('amenity', ('clinic', 'doctors', 'dentist'), 8, 'clinic'),
    ('amenity', ('pharmacy',), 9, 'pharmacy'), ('amenity', ('police',), 10, 'police'),
    ('amenity', ('fire_station',), 11, 'fire'), ('amenity', ('place_of_worship',), 12, 'worship'),
    ('amenity', ('community_centre',), 13, 'community'), ('amenity', ('restaurant', 'cafe', 'fast_food', 'food_court'), 14, 'food'),
    ('amenity', ('fuel',), 15, 'fuel'), ('amenity', ('bank',), 16, 'bank'),
    ('amenity', ('theatre', 'cinema', 'arts_centre'), 17, 'arts'), ('tourism', ('attraction', 'museum', 'viewpoint', 'gallery'), 18, 'attraction'),
    ('tourism', ('hotel', 'hostel', 'guest_house', 'apartment'), 19, 'hotel'), ('leisure', ('fitness_centre', 'sports_centre'), 20, 'fitness'),
]
def poi_kind(t):
    for tag, vals, k, c in POI_KIND:
        if t.get(tag) in vals: return k, c
    if t.get('shop'): return 22, 'shop'
    return None, None

# hero landmarks for the first phases: label -> name patterns to look for in the map data
LANDMARKS = {
    'Dubai International Airport (DXB)': ['dubai international airport'],
    'DXB Terminal 1': ['terminal 1'], 'DXB Terminal 3': ['terminal 3'],
    'Al Garhoud Bridge': ['garhoud bridge'], 'Deira City Centre': ['city centre deira', 'deira city centre'],
    'Dubai Creek Golf & Yacht Club': ['dubai creek golf'], 'Dubai Festival City': ['festival city mall', 'dubai festival city'],
    'Deira Clock Tower': ['clock tower'], 'Al Mamzar Beach Park': ['mamzar beach park'],
    'Dubai Frame': ['dubai frame'], 'Museum of the Future': ['museum of the future'], 'Burj Khalifa': ['burj khalifa'],
    'The Dubai Mall': ['the dubai mall', 'dubai mall'], 'Dubai Opera': ['dubai opera'],
    'Dubai World Trade Centre': ['world trade centre'], 'Emirates Towers': ['emirates tower'],
    'Dubai Fountain': ['dubai fountain'], 'Address Downtown': ['address downtown'], 'Souk Al Bahar': ['souk al bahar'],
    'Business Bay': ['bay square'], 'DIFC Gate Building': ['the gate', 'gate building'], 'Rose Tower': ['rose rayhaan', 'rose tower'],
    'Zabeel Park': ['zabeel park'], 'Al Fahidi Historical Neighbourhood': ['al fahidi historical', 'bastakiya', 'al bastakiya'],
    'Al Fahidi Fort (Dubai Museum)': ['al fahidi fort', 'dubai museum'], 'Gold Souk': ['gold souk'], 'Spice Souk': ['spice souk'],
    'Dubai Creek Park': ['creek park'], 'Wafi City': ['wafi'], 'BurJuman': ['burjuman'], 'Al Ghurair Centre': ['al ghurair centre'],
    'Dubai Healthcare City': ['healthcare city'], 'Al Seef': ['al seef'], 'Union Metro Station': ['union metro', 'union station'],
    'Etisalat Tower (Deira)': ['etisalat tower', 'etisalat building'], 'Al Mamzar Beach': ['mamzar beach'], 'Al Qusais': ['al qusais metro', 'al qusais station'],
    'Dubai Frame': ['dubai frame'],
}

# ------------------------------------------------------------------ tiling
def tkey(ix, iy): return '%d_%d' % (ix, iy)

def clip_line(pts, zs, x0, y0, x1, y1):
    """Liang-Barsky clip of a polyline (with optional heights) to a box; returns the pieces inside."""
    out, cur = [], None
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        az = zs[i] if zs else 0; bz = zs[i + 1] if zs else 0
        dx, dy = bx - ax, by - ay
        t0, t1, ok = 0.0, 1.0, True
        for p, q in ((-dx, ax - x0), (dx, x1 - ax), (-dy, ay - y0), (dy, y1 - ay)):
            if p == 0:
                if q < 0: ok = False; break
            else:
                r = q / p
                if p < 0:
                    if r > t1: ok = False; break
                    t0 = max(t0, r)
                else:
                    if r < t0: ok = False; break
                    t1 = min(t1, r)
        if not ok or t1 - t0 < 1e-9:
            if cur: out.append(cur); cur = None
            continue
        A = (ax + dx * t0, ay + dy * t0, az + (bz - az) * t0); B = (ax + dx * t1, ay + dy * t1, az + (bz - az) * t1)
        if cur is None: cur = [A]
        elif abs(cur[-1][0] - A[0]) > 1e-6 or abs(cur[-1][1] - A[1]) > 1e-6:
            out.append(cur); cur = [A]
        cur.append(B)
        if t1 < 1.0: out.append(cur); cur = None
    if cur: out.append(cur)
    return [c for c in out if len(c) >= 2]

class Tiles:
    def __init__(self, allowed=None):
        self.t = defaultdict(lambda: defaultdict(list))      # key -> layer -> features
        self.allowed = allowed                               # tiles that touch the enabled phases

    def add(self, ix, iy, layer, kind, flags, a, b, name, rings):
        if self.allowed is not None and (ix, iy) not in self.allowed: return
        self.t[tkey(ix, iy)][layer].append((kind, flags, int(max(0, min(65535, a))), int(max(0, min(65535, b))), name, rings))

    def line(self, layer, kind, flags, a, b, name, pts, zs=None):
        if len(pts) < 2: return
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        raised = zs is not None and any(z > 0.05 for z in zs)
        for ix in range(math.floor(min(xs) / TS), math.floor(max(xs) / TS) + 1):
            for iy in range(math.floor(min(ys) / TS), math.floor(max(ys) / TS) + 1):
                ox, oy = ix * TS, iy * TS
                for piece in clip_line(pts, zs if raised else None, ox, oy, ox + TS, oy + TS):
                    ring = [(x - ox, y - oy, z) for x, y, z in piece]
                    self.add(ix, iy, layer, kind, flags | (16 if raised else 0), a, b, name, [ring])

    def area(self, layer, kind, flags, a, b, name, geom, simplify=0.3):
        if geom.is_empty: return
        x0, y0, x1, y1 = geom.bounds
        for ix in range(math.floor(x0 / TS), math.floor(x1 / TS) + 1):
            for iy in range(math.floor(y0 / TS), math.floor(y1 / TS) + 1):
                ox, oy = ix * TS, iy * TS
                try: g = geom.intersection(box(ox, oy, ox + TS, oy + TS))
                except Exception: continue
                for p in polys_of(g):
                    if p.area < 1: continue
                    p = p.simplify(simplify, preserve_topology=True)
                    rings = [[(x - ox, y - oy, 0) for x, y in list(p.exterior.coords)[:-1]]]
                    rings += [[(x - ox, y - oy, 0) for x, y in list(h.coords)[:-1]] for h in p.interiors if Polygon(h).area > 1]
                    if len(rings[0]) >= 3: self.add(ix, iy, layer, kind, flags, a, b, name, rings)

    def point(self, layer, kind, flags, a, b, name, x, y):
        ix, iy = math.floor(x / TS), math.floor(y / TS)
        self.add(ix, iy, layer, kind, flags, a, b, name, [[(x - ix * TS, y - iy * TS, 0)]])

    def encode(self, key):
        layers, strs, sidx = self.t[key], [], {}
        def sid(n):
            if not n: return 0xFFFF
            if n not in sidx:
                if len(strs) >= 0xFFFE: return 0xFFFF
                sidx[n] = len(strs); strs.append(n)
            return sidx[n]
        out = bytearray(b'YYC1' + struct.pack('<HH', len(layers), 0))
        for lid in sorted(layers):
            body = bytearray()
            for kind, flags, a, b, name, rings in layers[lid]:
                rings = [r[:65535] for r in rings if r][:65535]
                body += struct.pack('<BBHHHH', kind, flags, a, b, sid(name), len(rings))
                for r in rings:
                    body += struct.pack('<H', len(r))
                    for x, y, z in r:
                        body += struct.pack('<hh', max(-32768, min(32767, round(x * 10))), max(-32768, min(32767, round(y * 10))))
                    if flags & 16:
                        for x, y, z in r: body += struct.pack('<h', max(-32768, min(32767, round(z * 10))))
            out += struct.pack('<B3xII', lid, len(layers[lid]), len(body)) + body
        sj = json.dumps(strs, ensure_ascii=False, separators=(',', ':')).encode()
        out += struct.pack('<I', len(sj)) + sj
        return bytes(out)

# ------------------------------------------------------------------ build
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, '..', '.cache'))
    ap.add_argument('--trees', help='tree points (JSON [[x, y], ...]) from ESA WorldCover, made by worldcover_trees.py')
    ap.add_argument('--overture', help='Overture Maps buildings (GeoJSON) to fill in buildings OpenStreetMap is missing')
    ap.add_argument('--osm-json', help='read OSM data from this file (made by pbf_to_json.py) instead of the Overpass API')
    args = ap.parse_args()
    phases = [p for p in CFG['phases'] if p.get('enabled')]
    print('Phases:', ', '.join('%d %s' % (p['id'], p['name']) for p in phases))
    extent = unary_union([box(*P(p['bbox'][0], p['bbox'][1]), *P(p['bbox'][2], p['bbox'][3])) for p in phases])
    if args.osm_json:
        d = json.load(open(args.osm_json)); els, stamp = d['elements'], d.get('osm3s', {}).get('timestamp_osm_base')
    else:
        els, stamp = fetch([p['bbox'] for p in phases], args.cache)
    print('OSM elements:', len(els), 'data as of', stamp)
    # the real border: the parts of the phase boxes that lie in another emirate (Sharjah, ...) are left out
    for r in (e for e in els if e['type'] == 'relation'):
        t = r.get('tags', {})
        if t.get('boundary') == 'administrative' and t.get('admin_level') == '4':
            nm = (t.get('name:en') or t.get('name') or '')
            if 'dubai' in nm.lower() or 'دبي' in nm: continue
            g = relation_polys(r)
            if g is not None and g.intersects(extent):
                extent = extent.difference(g); print('  outside Dubai, left out:', nm)

    ex0, ey0, ex1, ey1 = extent.bounds
    allowed = {(ix, iy) for ix in range(math.floor(ex0 / TS), math.floor(ex1 / TS) + 1) for iy in range(math.floor(ey0 / TS), math.floor(ey1 / TS) + 1)
               if extent.intersects(box(ix * TS, iy * TS, (ix + 1) * TS, (iy + 1) * TS))}
    T = Tiles(allowed)
    inside = lambda g: g.intersects(extent)
    ways = [e for e in els if e['type'] == 'way' and e.get('geometry')]
    rels = [e for e in els if e['type'] == 'relation']
    nodes = [e for e in els if e['type'] == 'node']
    stats = defaultdict(int)

    # ---- raised roads, rails and paths: node heights, then ramps down along the connecting ground ways
    linear = []
    for w in ways:
        t = w.get('tags', {})
        if any(t.get(k) in SKIP_LIFE or k in t for k in ()) or t.get('highway') in SKIP_LIFE or t.get('railway') in SKIP_LIFE: continue
        hw, rw, ae = t.get('highway'), t.get('railway'), t.get('aeroway')
        if t.get('area') == 'yes': continue
        if hw in ROAD: linear.append((w, 'road')); continue
        if hw in PATH: linear.append((w, 'path')); continue
        if rw in ('subway', 'light_rail', 'monorail', 'tram', 'rail', 'narrow_gauge'): linear.append((w, 'rail')); continue
        if ae in ('runway', 'taxiway', 'taxilane'): linear.append((w, 'air'))
    NH = defaultdict(float)
    for w, typ in linear:
        h = deck_height(w['tags'], typ == 'rail')
        if h > 0:
            for nid in w['nodes']: NH[nid] = max(NH[nid], h)

    # ramps carry on from one way to the next: a short link road that leaves a flyover half-way down hands its height to
    # the road it joins, so no ramp ends in a step a car cannot climb
    def ramp_z(w, typ, H):
        raisedIdx = [i for i, n in enumerate(w['nodes']) if H.get(n, 0) > 0]
        if not raisedIdx: return None, None
        pts = geom_xy(w['geometry']); grade = 0.035 if typ == 'rail' else 0.055
        if len(pts) != len(w['nodes']): return None, None
        d = [0.0]
        for i in range(1, len(pts)): d.append(d[-1] + math.dist(pts[i - 1], pts[i]))
        return pts, [max(0.0, max(H[w['nodes'][r]] - grade * abs(d[i] - d[r]) for r in raisedIdx)) for i in range(len(pts))]
    PH = dict(NH)
    ground_ways = [(w, typ) for w, typ in linear if typ != 'air' and deck_height(w['tags'], typ == 'rail') <= 0 and w['tags'].get('tunnel') not in ('yes', 'culvert', 'flooded') and len(w['nodes']) == len(w['geometry'])]
    for _pass in range(8):
        changed = 0
        for w, typ in ground_ways:
            if not any(PH.get(n, 0) > 0 for n in w['nodes']): continue
            _, zs = ramp_z(w, typ, PH)
            if zs is None: continue
            for n, z in zip(w['nodes'], zs):
                if z > 0.15 and z > PH.get(n, 0) + 0.05: PH[n] = z; changed += 1
        if not changed: break
    stats['ramp_nodes'] = len(PH) - len(NH)

    def heights(w, typ):
        t = w['tags']; pts = geom_xy(w['geometry'])
        if t.get('tunnel') in ('yes', 'culvert', 'flooded'): return pts, None
        h = deck_height(t, typ == 'rail')
        if h > 0: return pts, [max(h, NH[n]) if NH[n] else h for n in w['nodes']]
        if len(w['nodes']) != len(pts): return pts, None
        p2, zs = ramp_z(w, typ, PH)
        if zs is None or max(zs) <= 0.02: return pts, None
        return pts, zs

    overview, ctrl, streets = [], [], {}
    road_polys = []      # road surfaces, to keep satellite trees off the roads
    for w, typ in linear:
        t = w['tags']; pts, zs = heights(w, typ)
        if len(pts) < 2 or not inside(LineString(pts)): continue
        nm = name_of(t); layer = int(num(t.get('layer')) or 0)
        tunnel = 4 if (t.get('tunnel') in ('yes', 'culvert', 'flooded') or t.get('location') == 'underground') else 0
        if typ == 'road' and nm and not tunnel:
            streets.setdefault(nm, {'alt': t.get('name:ar'), 'pts': []})['pts'].extend(pts)
        if typ == 'road':
            k = ROAD[t['highway']]; ow = oneway(t, t['highway'])
            if ow == -1: pts = pts[::-1]; zs = zs[::-1] if zs else zs
            wdt = road_width(k, t, ow)
            if not tunnel: road_polys.append(LineString(pts).buffer(wdt / 2 + 1.5, cap_style=2))
            T.line(L_ROAD, k, (1 if ow else 0) | tunnel, wdt * 10, 8 + max(-8, min(7, layer)), nm, pts, zs)
            if k in (1, 2, 3, 4, 5, 6, 8, 9, 10) and not tunnel:
                overview.append({'c': k, 'n': nm, 'p': [[round(x), round(y)] for x, y in pts]})
        elif typ == 'air':
            k = 11 if t['aeroway'] == 'runway' else 12
            wdt = num(t.get('width')) or (45 if k == 11 else 23 if t['aeroway'] == 'taxiway' else 15)
            T.line(L_ROAD, k, 0, wdt * 10, 8, nm or t.get('ref'), pts, None)
            overview.append({'c': k, 'n': nm, 'p': [[round(x), round(y)] for x, y in pts]})
        elif typ == 'path':
            k = PATH[t['highway']]
            T.line(L_PATH, k, tunnel, 35 if k == 5 else 25, 0, nm, pts, zs)
        else:
            k = 2 if t['railway'] in ('subway', 'light_rail', 'monorail', 'tram') else 1
            T.line(L_RAIL, k, tunnel, 40 if k == 2 else 35, 0, nm, pts, zs)
        stats[typ] += 1

    # ---- areas, water, buildings
    big, skyline, comms = [], [], []
    bld = []         # (geom, tags, is_part)
    named = []       # (name, x, y) for landmark lookup
    search = []      # [name, x, y, kind, alt]  (snapped to the nearest street at the end)
    def addr_of(t):
        hn = t.get('addr:housenumber') or t.get('addr:unit')
        if hn and t.get('addr:street'): return '%s %s' % (hn, t['addr:street'])
        if t.get('addr:housename'): return t['addr:housename'] + (', ' + t['addr:street'] if t.get('addr:street') else '')
        return None
    def area_feature(geom, t):
        nm = name_of(t)
        if nm: c = geom.representative_point(); named.append((nm, c.x, c.y, geom.area))
        if inside(geom):
            c = geom.representative_point(); ad = addr_of(t)
            if nm: search.append([nm, c.x, c.y, 'building' if (t.get('building') or t.get('building:part')) else 'place', t.get('name:ar') or ad])
            if ad: search.append([ad, c.x, c.y, 'address', nm])
        if t.get('building') or t.get('building:part'):
            bld.append((geom, t, 'building:part' in t and not t.get('building'))); return
        if not inside(geom): return
        if is_water(t):
            T.area(L_WATER, 1, 0, 0, 0, nm, geom)
            if geom.area > 5000: big.append({'k': 99, 'n': nm, 'g': geom})
            stats['water'] += 1; return
        k = area_kind(t)
        if k:
            T.area(L_AREA, k, AREA_FLAGS.get(k, 2), min(65535, geom.area / 100), 0, nm, geom)
            if geom.area > 40000 and k not in (1, 2, 3, 4): big.append({'k': k, 'n': nm, 'g': geom})
            stats['area'] += 1
    for w in ways:
        t = w.get('tags', {})
        if t.get('natural') == 'coastline': continue
        if w['nodes'][0] == w['nodes'][-1]:
            g = way_poly(w)
            if g is not None and (t.get('building') or t.get('building:part') or is_water(t) or area_kind(t)
                                  or t.get('highway') in ('pedestrian', 'footway') and t.get('area') == 'yes'):
                area_feature(g, t); continue
        # open ways that are not roads: rivers, canals, barriers
        pts = geom_xy(w['geometry'])
        if len(pts) < 2 or not inside(LineString(pts)): continue
        wwy = {'river': (1, 300), 'canal': (2, 80), 'stream': (3, 30), 'drain': (4, 20), 'ditch': (4, 20)}.get(t.get('waterway'))
        if wwy: T.line(L_WWAY, wwy[0], 0, num(t.get('width')) and num(t.get('width')) * 10 or wwy[1], 0, name_of(t), pts); continue
        bar = {'fence': 1, 'wall': 2, 'hedge': 3, 'retaining_wall': 4}.get(t.get('barrier'))
        if bar: T.line(L_BARR, bar, 0, 15, 0, None, pts)
    for r in rels:
        t = r.get('tags', {})
        if t.get('boundary') == 'administrative':
            g = relation_polys(r)
            if g is not None and t.get('admin_level') in ('9', '10') and name_of(t):
                comms.append({'n': name_of(t), 'code': str(r['id']), 'sector': '', 'class': 'Residential', 'g': g})
            continue
        if t.get('type') != 'multipolygon': continue
        g = relation_polys(r)
        if g is not None: area_feature(g, t)

    # ---- public transport: Dubai Metro and bus routes from the OpenStreetMap route relations
    routes, stops, metro_lines = [], [], []
    clipzone = extent.buffer(300)
    def chain(geoms):
        shapes, cur = [], []
        for g in geoms:
            if len(g) < 2: continue
            if not cur: cur = list(g); continue
            if math.dist(cur[-1], g[0]) < 30: cur += g[1:]
            elif math.dist(cur[-1], g[-1]) < 30: cur += g[::-1][1:]
            elif len(shapes) == 0 and len(cur) and math.dist(cur[0], g[0]) < 30: cur = cur[::-1] + g[1:]
            elif len(shapes) == 0 and len(cur) and math.dist(cur[0], g[-1]) < 30: cur = cur[::-1] + g[::-1][1:]
            else: shapes.append(cur); cur = list(g)
        if cur: shapes.append(cur)
        out = []
        for sh in shapes:          # keep the runs inside the built phases
            run = []
            for p in sh:
                if clipzone.contains(Point(p)): run.append(p)
                elif run: (out.append(run) if len(run) > 1 else None); run = []
            if len(run) > 1: out.append(run)
        return [[[round(x, 1), round(y, 1)] for x, y in r] for r in out if LineString(r).length > 200]
    seen_stop = set()
    for r in rels:
        t = r.get('tags', {})
        if t.get('type') != 'route' or t.get('route') not in ('bus', 'subway', 'light_rail', 'tram', 'monorail'): continue
        rail = t['route'] != 'bus'
        ways_g = [geom_xy(m['geometry']) for m in r.get('members', []) if m.get('type') == 'way' and m.get('role', '') in ('', 'forward', 'backward', 'main') and m.get('geometry')]
        shapes = chain(ways_g)
        if not shapes: continue
        nm = t.get('name:en') or t.get('name') or ''
        routes.append({'r': t.get('ref') or ('Metro' if rail else 'Bus'), 'n': nm, 't': '1' if rail else '3', 'colour': t.get('colour'), 'shapes': shapes})
        if rail: metro_lines += shapes
        for m in r.get('members', []):
            if m.get('type') != 'node' or 'lat' not in m: continue
            role = m.get('role', '')
            if not (role.startswith('stop') or role.startswith('platform')): continue
            x, y = P(m['lon'], m['lat'])
            if not clipzone.contains(Point(x, y)): continue
            mt = m.get('tags', {}); sn = mt.get('name:en') or mt.get('name') or ''
            if rail:
                sn = re.sub(r'\s*(metro\s*)?station\s*$', '', sn, flags=re.I).strip() or 'Metro'
                sn += ' Station'
            key = (sn, round(x / 40), round(y / 40))
            if key in seen_stop: continue
            seen_stop.add(key); stops.append([round(x, 1), round(y, 1), sn, str(m['ref'])])
    for sh in metro_lines: overview.append({'c': 22, 'n': 'Dubai Metro', 'p': [[round(x), round(y)] for x, y in sh]})
    stats['routes_bus'] = sum(1 for r in routes if r['t'] == '3'); stats['routes_metro'] = sum(1 for r in routes if r['t'] == '1'); stats['stops'] = len(stops)

    # ---- local businesses (shops, restaurants, services) for storefront signs and the phone's Nearby app
    biz = []
    def biz_cat(t):
        am, sh = t.get('amenity'), t.get('shop')
        if am in ('restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream', 'juice_bar') or sh in ('bakery', 'pastry', 'confectionery', 'coffee'): return 'food'
        if sh in ('car', 'car_repair', 'car_parts', 'tyres', 'motorcycle') or am in ('car_wash', 'fuel', 'car_rental'): return 'auto'
        if am in ('school', 'college', 'university', 'kindergarten', 'language_school', 'driving_school', 'library', 'training') : return 'learn'
        if sh: return 'shop'
        if t.get('office') or t.get('craft') or am in ('bank', 'clinic', 'doctors', 'dentist', 'pharmacy', 'bureau_de_change', 'money_transfer', 'post_office', 'veterinary') \
           or t.get('healthcare') or t.get('beauty') or sh in ('hairdresser', 'beauty', 'laundry', 'dry_cleaning'): return 'service'
        return None
    def biz_add(t, x, y):
        nm = name_of(t); c = biz_cat(t)
        if nm and c and extent.contains(Point(x, y)):
            biz.append([round(x, 1), round(y, 1), nm, c, ' '.join(v for v in (t.get('addr:housenumber'), t.get('addr:street')) if v) or ''])
    for w in ways:
        t = w.get('tags', {})
        if (t.get('shop') or t.get('amenity') or t.get('office')) and w['nodes'][0] == w['nodes'][-1]:
            g = way_poly(w)
            if g is not None: c = g.representative_point(); biz_add(t, c.x, c.y)

    # ---- the sea: split the map extent by the coastline (land is on the left of a coastline way)
    coast = [LineString(geom_xy(w['geometry'])) for w in ways if w.get('tags', {}).get('natural') == 'coastline' and len(w['geometry']) > 1]
    if coast:
        ext = extent.buffer(1500, join_style=2)
        cl = [c.intersection(ext) for c in coast]
        cl = [c for c in cl if not c.is_empty]
        faces = list(polygonize(unary_union([ext.exterior] + [g for c in cl for g in (c.geoms if hasattr(c, 'geoms') else [c])])))
        probes = []
        for c in coast:
            cs = list(c.coords)
            for i in range(len(cs) - 1):
                (ax, ay), (bx, by) = cs[i], cs[i + 1]; ln = math.hypot(bx - ax, by - ay)
                if ln < 2: continue
                mx, my, nx, ny = (ax + bx) / 2, (ay + by) / 2, (by - ay) / ln, -(bx - ax) / ln     # (nx, ny) points right = sea
                probes.append((Point(mx + nx * 0.8, my + ny * 0.8), 1)); probes.append((Point(mx - nx * 0.8, my - ny * 0.8), -1))
        for f in faces:
            score = sum(s for p, s in probes if f.contains(p))
            if score > 0:
                sea = f.intersection(extent.buffer(1000, join_style=2))
                if not sea.is_empty:
                    T.area(L_WATER, 1, 0, 0, 0, 'Arabian Gulf', sea, simplify=1.0)
                    big.append({'k': 99, 'n': 'Arabian Gulf', 'g': sea})
                    stats['sea'] += 1

    # ---- Overture Maps buildings (OpenStreetMap plus machine-traced footprints) fill in buildings OSM is missing
    if args.overture and os.path.exists(args.overture):
        from shapely.geometry import shape
        from shapely.strtree import STRtree as _ST
        osm_geoms = [g for g, t, p in bld if not p]
        oidx = _ST(osm_geoms) if osm_geoms else None
        added = 0
        gj = json.load(open(args.overture))
        for ft in gj.get('features', []):
            pr = ft.get('properties') or {}
            src = pr.get('sources')
            if isinstance(src, str):
                try: src = json.loads(src)
                except Exception: src = []
            if any(d.get('dataset') == 'OpenStreetMap' for d in (src or []) if isinstance(d, dict)): continue
            try: g0 = shape(ft['geometry'])
            except Exception: continue
            for p in polys_of(g0):
                try:
                    g = Polygon([P(x, y) for x, y in p.exterior.coords])
                    if not g.is_valid: g = make_valid(g)
                except Exception: continue
                if g.is_empty or g.area < 12 or not inside(g): continue
                if oidx is not None:
                    hit = False
                    for i in oidx.query(g, predicate='intersects'):
                        o = osm_geoms[i]
                        try: ov = g.intersection(o).area
                        except Exception: ov = 0
                        if ov > 0.25 * min(g.area, o.area): hit = True; break
                    if hit: continue
                cls = pr.get('class') or pr.get('subtype') or ''
                t = {'building': cls or ('house' if g.area < 700 else 'yes')}
                if pr.get('height'): t['height'] = str(pr['height'])
                elif pr.get('num_floors'): t['building:levels'] = str(pr['num_floors'])
                bld.append((g, t, False)); added += 1
        stats['overture_buildings'] = added
        print('Overture buildings added:', added)

    # ---- buildings (whole, in the tile that holds their centre). Outlines with parts inside give way to the parts.
    parts = [b for b in bld if b[2]]
    from shapely.strtree import STRtree
    pidx = STRtree([p[0] for p in parts]) if parts else None
    for geom, t, is_part in bld:
        if not inside(geom): continue
        if not is_part and pidx is not None:       # an outline gives way to its parts only when they cover most of it
            hits = pidx.query(geom, predicate='intersects')
            if len(hits):
                try: cover = unary_union([parts[i][0] for i in hits]).intersection(geom).area
                except Exception: cover = 0
                if cover >= 0.6 * geom.area: continue
        k = bld_kind(t); h, mh = bld_height(t, k)
        flags = 0
        for p in polys_of(geom):
            if p.area < 4: continue
            p = p.simplify(0.2, preserve_topology=True)
            c = p.representative_point(); ix, iy = math.floor(c.x / TS), math.floor(c.y / TS)
            ox, oy = ix * TS, iy * TS
            kk, fl = k, flags
            if h >= TOWER_H:
                kk, fl = 15, 5
                skyline.append({'r': [[round(x - 0, 1), round(y, 1)] for x, y in list(p.exterior.coords)[:-1]], 'h': round(h, 1), 'mh': round(mh, 1), 'k': 15, 'n': name_of(t)})
            ring = [(x - ox, y - oy, 0) for x, y in list(p.exterior.coords)[:-1]]
            if len(ring) >= 3:
                T.add(ix, iy, L_BLD, kk, fl, h * 10, mh * 10, name_of(t), [ring]); stats['building'] += 1

    # ---- boundary walls: around villa compounds (one wall round each group of homes, a gate gap by every home),
    #      and round schools, hospitals and mosques' grounds. Real walls and fences mapped in OpenStreetMap are kept as well.
    try:
        from shapely.strtree import STRtree as _STW
        from shapely.ops import nearest_points
        homes, others = [], []
        for geom, t, is_part in bld:
            if is_part or not inside(geom): continue
            k = bld_kind(t); h, _mh = bld_height(t, k); a = geom.area
            if (k in (1, 18, 19) or (k == 14 and a < 700)) and 60 <= a <= 1200 and h < 14: homes.append(geom)
            else: others.append(geom)
        road_u = unary_union(road_polys) if road_polys else None
        road_lines_w = [g.exterior for g in polys_of(road_u)] if road_u is not None else []
        ridx_w = _STW(road_lines_w) if road_lines_w else None
        oidx_w = _STW(others) if others else None
        plots = unary_union([g.minimum_rotated_rectangle.buffer(3.2, join_style=2) for g in homes]) if homes else None
        if plots is not None and road_u is not None: plots = plots.difference(road_u.buffer(0.8))
        hidx = _STW(homes) if homes else None
        nwall = [0]
        def emit(line, kind=2):
            for ln in (line.geoms if hasattr(line, 'geoms') else [line]):
                if ln.is_empty or ln.geom_type != 'LineString' or ln.length < 3: continue
                ln = ln.simplify(0.25); T.line(L_BARR, kind, 0, 15, 0, None, list(ln.coords)); nwall[0] += 1
        for blk in polys_of(plots):
            if blk.area < 150: continue
            ring = LineString(blk.exterior.coords); gaps = []
            for i in (hidx.query(blk, predicate='intersects') if hidx is not None else []):
                c = homes[i].centroid
                if ridx_w is not None:        # the gate faces the nearest road
                    rl = road_lines_w[ridx_w.nearest(c)]; c = nearest_points(rl, c)[0]
                gp = ring.interpolate(ring.project(c)).buffer(2.0); gaps.append(gp)
                # the gate itself (kind 5), drawn so the street is on its left: the engine puts the bins on that side
                try:
                    gl_ = ring.intersection(gp); hc = homes[i].centroid
                    for ln in (gl_.geoms if hasattr(gl_, 'geoms') else [gl_]):
                        if ln.geom_type != 'LineString' or ln.length < 2: continue
                        cs = list(ln.coords); (ax, ay), (bx, by) = cs[0], cs[-1]; mx, my = (ax + bx) / 2, (ay + by) / 2
                        if (-(by - ay)) * (mx - hc.x) + (bx - ax) * (my - hc.y) < 0: cs = cs[::-1]
                        T.line(L_BARR, 5, 0, 15, 0, None, [cs[0], cs[-1]])
                except Exception: pass
            wall = ring.difference(unary_union(gaps)) if gaps else ring
            if oidx_w is not None:
                hit = [others[i] for i in oidx_w.query(ring, predicate='intersects')]
                if hit: wall = wall.difference(unary_union(hit).buffer(0.4))
            emit(wall)
        # grounds of schools, hospitals, places of worship
        for w in ways:
            t = w.get('tags', {})
            if t.get('building') or w['nodes'][0] != w['nodes'][-1]: continue
            if t.get('amenity') not in ('school', 'kindergarten', 'college', 'university', 'hospital', 'place_of_worship') and t.get('landuse') not in ('education', 'religious'): continue
            g = way_poly(w)
            if g is None or g.area < 800 or g.area > 400000 or not inside(g): continue
            for p in polys_of(g.buffer(-0.6)):
                ring = LineString(p.exterior.coords); gaps = []
                if ridx_w is not None:
                    c = p.centroid; rl = road_lines_w[ridx_w.nearest(c)]; gaps.append(ring.interpolate(ring.project(nearest_points(rl, c)[0])).buffer(4.0))
                wall = ring.difference(unary_union(gaps)) if gaps else ring
                if road_u is not None: wall = wall.difference(road_u)
                emit(wall)
        stats['walls'] = nwall[0]
        print('boundary walls:', nwall[0])
    except Exception as ex:
        import traceback; traceback.print_exc(); print('boundary walls failed:', ex)

    # ---- trees seen from space (ESA WorldCover tree cover, 10 m): off the roads and out of the buildings
    if args.trees and os.path.exists(args.trees):
        import numpy as np, shapely
        from shapely.strtree import STRtree as _ST3
        pts = np.array(json.load(open(args.trees)), dtype=float)
        if len(pts):
            P_ = shapely.points(pts)
            keep = shapely.contains_xy(extent, pts[:, 0], pts[:, 1])
            blocks = road_polys + [g for g, t, p in bld]
            if blocks:
                hit = _ST3(blocks).query(P_, predicate='intersects')[0]
                keep[hit] = False
            rng = np.random.default_rng(11)
            for (x, y), k in zip(pts, keep):
                if not k: continue
                h = rng.uniform(5.5, 10.5)
                T.point(L_TREE, 3, 0, h * 10, rng.uniform(2.2, 3.6) * 10, None, x, y); stats['tree_sat'] += 1
        print('satellite trees placed:', stats['tree_sat'])

    # ---- points: trees, stops, signals, places
    places, areas = [], []
    for n in nodes:
        t = n.get('tags', {}); x, y = P(n['lon'], n['lat'])
        if t.get('place') in ('suburb', 'neighbourhood', 'quarter', 'village', 'town') and name_of(t) and extent.buffer(4000).contains(Point(x, y)):
            areas.append({'n': name_of(t), 'x': round(x), 'y': round(y), 'k': t['place']})
        if not extent.contains(Point(x, y)): continue
        nm = name_of(t)
        if nm: named.append((nm, x, y, 0))
        if t.get('natural') == 'tree':
            h = num(t.get('height')) or 7; palm = t.get('leaf_type') == 'palm' or 'phoenix' in (t.get('species') or '').lower() or 'palm' in (t.get('taxon') or t.get('species') or '').lower()
            T.point(L_TREE, 6 if palm else 2, 0, h * 10, (num(t.get('diameter_crown')) or 5) * 5, None, x, y); stats['tree'] += 1; continue
        if t.get('highway') == 'traffic_signals': ctrl.append([round(x, 1), round(y, 1), 'signals']); continue
        if t.get('highway') == 'bus_stop': T.point(L_STOP, 1, 0, 0, 0, nm, x, y); continue
        ad = addr_of(t)
        if ad: search.append([ad, x, y, 'address', nm])
        if t.get('railway') in ('station', 'halt') or t.get('public_transport') == 'station':
            T.point(L_STOP, 2, 0, 0, 0, nm, x, y)
            if nm: search.append([nm, x, y, 'metro', t.get('name:ar')])
            continue
        k, c = poi_kind(t)
        if k:
            T.point(L_POI, k, 0, 0, 0, nm, x, y)
            if nm: places.append({'c': c, 'n': nm, 'x': round(x, 1), 'y': round(y, 1), 'a': t.get('addr:street'), 'b': None}); search.append([nm, x, y, 'place', t.get('name:ar') or c])
        if t.get('shop') or t.get('amenity') or t.get('office') or t.get('craft') or t.get('healthcare'): biz_add(t, x, y)

    # ---- landmarks found in the data
    landmarks = []
    for label, pats in LANDMARKS.items():
        best = None
        for nm, x, y, ar in named:
            low = nm.lower()
            if any(p in low for p in pats) and extent.buffer(200).contains(Point(x, y)):
                sc = (2 if low == label.lower() or low in pats else 1, ar)
                if best is None or sc > best[2]: best = (x, y, sc)
        if best: landmarks.append({'label': label, 'x': round(best[0]), 'y': round(best[1]), 'downtown': False, 'full': False})
    print('Landmarks found:', ', '.join(l['label'] for l in landmarks) or 'none')

    # ---- spawn: a quiet road near the origin
    spawn = None
    for key in sorted(T.t, key=lambda k: abs(int(k.split('_')[0]) + 0.5) + abs(int(k.split('_')[1]) + 0.5)):
        for kind, flags, a, b, nm, rings in T.t[key].get(L_ROAD, []):
            if kind in (5, 6) and not flags & 20 and len(rings[0]) >= 2:
                ix, iy = map(int, key.split('_')); (x0, y0, _), (x1, y1, _) = rings[0][0], rings[0][1]
                spawn = {'x': round(ix * TS + x0, 1), 'y': round(iy * TS + y0, 1), 'h': round(math.atan2(y1 - y0, x1 - x0), 3), 'road': nm}
                break
        if spawn: break

    # ---- write packs
    out = args.out; pdir = os.path.join(out, 'p'); os.makedirs(pdir, exist_ok=True)
    for f in os.listdir(pdir):
        if f.endswith('.wasm'): os.remove(os.path.join(pdir, f))
    packs = defaultdict(dict); tiles = []
    for key in T.t:
        ix, iy = map(int, key.split('_'))
        packs['%d_%d' % (ix // PACK, iy // PACK)][key] = T.encode(key)
    for pk, ts in packs.items():
        idx, body = {}, bytearray()
        for key, buf in ts.items():
            idx[key] = [len(body), len(buf)]; body += buf
            ix, iy = map(int, key.split('_')); tiles.append([ix, iy, len(buf)])
        ij = json.dumps(idx, separators=(',', ':')).encode()
        open(os.path.join(pdir, pk + '.wasm'), 'wb').write(b'YYCP' + struct.pack('<I', len(ij)) + ij + bytes(body))

    def ring_out(p, nd=1):
        return [[[round(x, nd), round(y, nd)] for x, y in list(p.exterior.coords)[:-1]]] + \
               [[[round(x, nd), round(y, nd)] for x, y in list(h.coords)[:-1]] for h in p.interiors]
    bigo = []
    wat = [b['g'] for b in big if b['k'] == 99]          # overlapping water (the sea and the Creek's own outline) as one shape,
    if wat:                                                # so the map's even-odd fill doesn't cut holes in it
        try: big = [b for b in big if b['k'] != 99] + [{'k': 99, 'n': None, 'g': unary_union([make_valid(g) for g in wat])}]
        except Exception as ex: print('water union failed', ex)
    for b in big:
        for p in polys_of(b['g'].simplify(2.0)):
            if p.area > 1000: bigo.append({'k': b['k'], 'n': b['n'], 'rings': ring_out(p)})
    city = [[[[round(x), round(y)] for x, y in list(p.exterior.coords)[:-1]]] for p in polys_of(extent)]
    communities = []
    for c in comms:
        g = c.pop('g').intersection(extent.buffer(3000))
        polys = [[[[round(x), round(y)] for x, y in list(p.exterior.coords)[:-1]]] for p in polys_of(g.simplify(5)) if p.area > 1e4]
        if polys:
            c['polys'] = polys
            xs = [pt[0] for po in polys for pt in po[0]]; ys = [pt[1] for po in polys for pt in po[0]]
            c['lx'], c['ly'] = round(sum(xs) / len(xs)), round(sum(ys) / len(ys))
            communities.append(c)
    # ---- search list: streets, areas, landmarks, buildings, places and addresses, each snapped to a nearby street spot
    from shapely.strtree import STRtree as _ST2
    road_lines = []
    for key in T.t:
        ix, iy = map(int, key.split('_'))
        for kind, flags, a, b, nm_, rings in T.t[key].get(L_ROAD, []):
            if kind in (3, 4, 5, 6, 9) and not flags & 20 and len(rings[0]) >= 2:      # real streets, not parking aisles
                road_lines.append(LineString([(ix * TS + x, iy * TS + y) for x, y, z in rings[0]]))
    ridx = _ST2(road_lines) if road_lines else None
    def snap(x, y):
        if ridx is None: return x, y
        i = ridx.nearest(Point(x, y)); ln = road_lines[i]; p = ln.interpolate(ln.project(Point(x, y)))
        return (p.x, p.y) if p.distance(Point(x, y)) < 400 else (x, y)
    for nm_, st in streets.items():
        pts = st['pts']; mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
        bx, by = min(pts, key=lambda p: (p[0] - mx) ** 2 + (p[1] - my) ** 2)
        if extent.contains(Point(bx, by)): search.append([nm_, bx, by, 'street', st['alt']])
    for l in landmarks: search.append([l['label'], l['x'], l['y'], 'landmark', None])
    for a in areas: search.append([a['n'], a['x'], a['y'], 'area', None])
    for c in communities: search.append([c['n'], c['lx'], c['ly'], 'area', None])
    seen, sout = set(), []
    for nm_, x, y, k, alt in search:
        key = (nm_.lower(), k, round(x / 150), round(y / 150))
        if key in seen: continue
        seen.add(key); rx, ry = snap(x, y)
        e = [nm_, round(x, 1), round(y, 1), k, round(rx, 1), round(ry, 1)]
        if alt and alt != nm_: e.append(alt)
        sout.append(e)
    json.dump(sout, open(os.path.join(out, 'search.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'credit': 'Businesses: \u00a9 OpenStreetMap contributors, ODbL', 'b': biz}, open(os.path.join(out, 'biz.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    stats['businesses'] = len(biz)
    stats['search_entries'] = len(sout)

    world = {
        'v': 1, 'ts': TS, 'cityId': 'dubai', 'cityName': 'Dubai',
        'proj': {'lat0': O['lat'], 'lon0': O['lon'], 'kx': KX, 'ky': KY},
        'osm_date': stamp, 'built': datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'phases': [{'id': p['id'], 'name': p['name'], 'areas': p['areas'], 'bbox': p['bbox']} for p in phases],
        'tiles': tiles, 'city': city, 'communities': communities, 'wards': [], 'overview': overview, 'big': bigo,
        'skyline': skyline, 'ctrain': [], 'routes': routes, 'stops': stops, 'ctrl': ctrl, 'places': places,
        'landmarks': landmarks, 'areas': areas, 'help': {'checked': '', 'places': []}, 'spawn': spawn,
        'credits': {'by': 'Hassan Ali', 'data': ['Map data © OpenStreetMap contributors, Open Database Licence (ODbL)']},
        'pack': PACK, 'decks': 1, 'addr': 0, 'trees': 2, 'photoHeight': -25,
    }
    json.dump(world, open(os.path.join(out, 'world.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    report = {'built': world['built'], 'osm_date': stamp, 'phases': world['phases'], 'tiles': len(tiles), 'packs': len(packs),
              'counts': dict(stats), 'skyline_towers': len(skyline), 'landmarks': [l['label'] for l in landmarks],
              'communities': [c['n'] for c in communities], 'areas': [a['n'] for a in areas], 'spawn': spawn,
              'towers_without_height': sorted({name_of(t) or '(unnamed)' for g, t, _ in bld if inside(g) and not (t.get('height') or t.get('building:levels')) and g.area > 1500})[:200]}
    json.dump(report, open(os.path.join(out, 'build-report.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != 'towers_without_height'}, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()

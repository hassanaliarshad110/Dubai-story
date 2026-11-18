#!/usr/bin/env python3
"""Turns an OpenStreetMap .pbf extract into the same JSON shape the Overpass API returns with `out geom`
(tagged nodes; ways with node ids and geometry; multipolygon/boundary relations with member geometry),
so build_dubai.py can read it. Needs pyosmium (pip install osmium).

Usage: python tools/pbf_to_json.py extract.osm.pbf out.json
"""
import json, sys
import osmium

src, dst = sys.argv[1], sys.argv[2]
REL_TYPES = ('multipolygon', 'boundary')

class Rels(osmium.SimpleHandler):           # pass 1: which ways do the relations need?
    def __init__(self):
        super().__init__(); self.rels = []; self.need = set()
    def relation(self, r):
        t = dict(r.tags)
        if t.get('type') not in REL_TYPES: return
        if t.get('type') == 'boundary' and not (t.get('boundary') == 'administrative' and t.get('admin_level') in ('8', '9', '10')): return
        mem = [(m.type, m.ref, m.role) for m in r.members]
        self.rels.append({'type': 'relation', 'id': r.id, 'tags': t, 'mem': mem})
        for ty, ref, _ in mem:
            if ty == 'w': self.need.add(ref)

class Main(osmium.SimpleHandler):           # pass 2: nodes, ways (with locations) and the relation members
    def __init__(self, need):
        super().__init__(); self.need = need; self.els = []; self.wgeom = {}
    def node(self, n):
        if len(n.tags) and n.location.valid():
            self.els.append({'type': 'node', 'id': n.id, 'lat': n.location.lat, 'lon': n.location.lon, 'tags': dict(n.tags)})
    def way(self, w):
        try: geom = [{'lat': nd.location.lat, 'lon': nd.location.lon} for nd in w.nodes]
        except osmium.InvalidLocationError: geom = [{'lat': nd.location.lat, 'lon': nd.location.lon} if nd.location.valid() else None for nd in w.nodes]
        if w.id in self.need: self.wgeom[w.id] = [g for g in geom if g]
        if len(w.tags):
            self.els.append({'type': 'way', 'id': w.id, 'tags': dict(w.tags), 'nodes': [nd.ref for nd in w.nodes], 'geometry': geom})

r = Rels(); r.apply_file(src)
m = Main(r.need); m.apply_file(src, locations=True, idx='flex_mem')
for rel in r.rels:
    members = []
    for ty, ref, role in rel.pop('mem'):
        if ty == 'w' and ref in m.wgeom: members.append({'type': 'way', 'ref': ref, 'role': role, 'geometry': m.wgeom[ref]})
    rel['members'] = members
    m.els.append(rel)
ts = None
try:
    ts = osmium.io.Reader(src, osmium.osm.osm_entity_bits.NOTHING).header().get('osmosis_replication_timestamp')
except Exception:
    pass
json.dump({'osm3s': {'timestamp_osm_base': ts}, 'elements': m.els}, open(dst, 'w'))
print('elements:', len(m.els), 'relations:', len(r.rels), 'as of', ts)

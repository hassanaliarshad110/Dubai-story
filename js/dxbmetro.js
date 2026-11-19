// Dubai City Stories: a Metro station at every stop of the Red and Green lines.
// Each one is the gold shell the real stations are known for: a long curved roof of gold panels over the tracks,
// glass end walls the trains run through, platforms inside, and on the raised line a concrete base,
// covered footbridges and entrance pods on both sides.
import * as THREE from 'three';
import { ground } from './terrain.js?v=11190630';

const LH = 62, RW = 15.5, RH = 13.5, TAPER = 0.7;      // half length, half width and height of the shell
const f = u => Math.sqrt(1 - (TAPER * u) * (TAPER * u));
const DS = THREE.DoubleSide;
let MATS = null;
function canvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function mats() {
  if (MATS) return MATS;
  // gold roof panels: rows of long plates, each a slightly different gold, with dark joints
  const gold = canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#b98a2e'; g.fillRect(0, 0, w, h); let r = 7;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { r = (r * 73 + 19) % 101; const l = 52 + r % 16, s = 62 + r % 14; g.fillStyle = `hsl(${40 + r % 6},${s}%,${l}%)`; g.fillRect(x * 64 + (y % 2 ? 32 : 0) - 64 + 1.5, y * 32 + 1.5, 61, 29); g.fillRect(x * 64 + (y % 2 ? 32 : 0) + 192 + 1.5, y * 32 + 1.5, 61, 29); }
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,240,190,.18)'); sh.addColorStop(1, 'rgba(90,50,0,.12)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  });
  gold.repeat.set(14, 5);
  const glass = canvas(256, 256, (g, w, h) => { g.fillStyle = '#16303c'; g.fillRect(0, 0, w, h); for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = (x * 3 + y * 5) % 4 ? '#1d4656' : '#27596b'; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29); } });
  const glassLit = canvas(256, 256, (g, w, h) => { g.fillStyle = '#3a2c12'; g.fillRect(0, 0, w, h); for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = (x * 3 + y * 5) % 4 ? '#ffd98a' : '#fff1c4'; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29); } });
  const louvre = canvas(128, 128, (g, w, h) => { g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, w, h); for (let x = 0; x < 16; x++) { g.fillStyle = x % 2 ? '#a39d90' : '#c9c3b6'; g.fillRect(x * 8, 0, 7, h); } g.fillStyle = '#8f897c'; g.fillRect(0, 0, w, 5); });
  louvre.repeat.set(10, 1);
  MATS = {
    gold: new THREE.MeshStandardMaterial({ map: gold, metalness: 0.35, roughness: 0.42, side: DS, emissive: 0x6b4a10, emissiveIntensity: 0.12 }),
    inner: new THREE.MeshLambertMaterial({ color: 0xe9e4d6, side: THREE.BackSide, emissive: 0xfff0c8, emissiveIntensity: 0 }),
    glass: new THREE.MeshLambertMaterial({ map: glass, emissive: 0xffffff, emissiveMap: glassLit, emissiveIntensity: 0, transparent: true, opacity: 0.86, side: DS }),
    rim: new THREE.MeshStandardMaterial({ color: 0xaeb4b8, metalness: 0.5, roughness: 0.4 }),
    conc: new THREE.MeshLambertMaterial({ map: louvre }),
    plain: new THREE.MeshLambertMaterial({ color: 0xbdb8ac }),
    plat: new THREE.MeshLambertMaterial({ color: 0xd8d4ca }),
    edge: new THREE.MeshLambertMaterial({ color: 0xf2c200 }),
    tube: new THREE.MeshLambertMaterial({ map: glass, emissive: 0xffffff, emissiveMap: glassLit, emissiveIntensity: 0 }),
  };
  return MATS;
}
function signTex(name, colour) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0b2f5c'; g.fillRect(0, 0, 1024, 256); g.fillStyle = colour; g.fillRect(0, 226, 1024, 30);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 112, 78, 0, 7); g.fill(); g.fillStyle = colour; g.font = '900 120px "Segoe UI", Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', 128, 120);
  g.fillStyle = '#fff'; g.textAlign = 'left'; let fs = 104; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(name).width > 760 && fs > 44) { fs -= 4; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; }
  g.fillText(name, 236, 96); g.font = '600 40px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#bcd3ee'; g.fillText('Metro Station  ·  محطة المترو', 238, 180);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// the roof: a long shell, widest and highest in the middle; a0..a1 is how far round the cross-section goes
function shellGeo(y0, a0, a1, floor, k = 1) {
  const NU = 40, NV = 18, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = -1 + 2 * i / NU, s = f(u) * k; for (let j = 0; j <= NV; j++) { const a = a0 + (a1 - a0) * j / NV; pos.push(u * LH, Math.max(floor, y0 + RH * s * Math.sin(a)), RW * s * Math.cos(a)); uv.push(i / NU, j / NV); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const boxAt = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); return b; };

export class MetroStations {
  constructor(game, scene, world, transit, tiles) {
    this.g = game; this.scene = scene; this.tiles = tiles; this.t = 0; this.list = [];
    const ok = n => / Station$/.test(n || '') && !/Trolley|Concourse|Police|Taxi|Marine|Terminal 1 Station$|^Terminal/.test(n);
    for (const p of transit.paths) {
      if (!p.rail || !/^(Red|Green)/.test(p.route.r || '')) continue; const colour = /^Red/.test(p.route.r) ? '#d0182b' : '#1e9a4a', line = /^Red/.test(p.route.r) ? 'R' : 'G';
      for (const s of world.stops) {
        if (!ok(s[2])) continue; const pr = p.project(s[0], s[1]); if (pr.d > 45) continue; const a = p.at(pr.s);
        const name = s[2].replace(/ Station$/, '').trim(), latin = /^[\x20-\x7e]+$/.test(name);
        let st = this.list.find(o => Math.hypot(o.x - a.x, o.y - a.y) < (o.line === line ? 170 : 230));
        if (!st) { this.list.push(st = { x: a.x, y: a.y, h: a.h, pts: [], name, line, colour, grp: null }); }
        if (st.line !== line) continue;          // an interchange gets one station, on the line found first
        if (latin && !/^[\x20-\x7e]+$/.test(st.name)) st.name = name;
        if (!st.pts.some(q => Math.hypot(q[0] - a.x, q[1] - a.y) < 1.5)) st.pts.push([a.x, a.y]);
      }
    }
    // the middle of the station is between the two tracks
    for (const st of this.list) { const n = st.pts.length; st.x = st.pts.reduce((a, q) => a + q[0], 0) / n; st.y = st.pts.reduce((a, q) => a + q[1], 0) / n; const rx = Math.cos(st.h), ry = -Math.sin(st.h); st.gap = Math.min(7, Math.max(...st.pts.map(q => Math.abs((q[0] - st.x) * rx + (q[1] - st.y) * ry)))); }
  }
  deckAt(st) { const g0 = ground(st.x, st.y); let d = g0; for (const q of st.pts) { const v = this.g.transit.groundY(q[0], q[1], null, true); if (v != null && v > d) d = v; } return { g0, deck: d }; }
  build(st) {
    const M = mats(), grp = new THREE.Group(), { g0, deck } = this.deckAt(st), up = deck - g0 > 2.5, D = deck - g0;
    st.deck = deck; grp.position.set(st.x, g0, -st.y); grp.rotation.y = Math.PI / 2 - st.h;
    const y0 = D + 1.2, a0 = up ? -0.42 : 0, a1 = Math.PI - a0, floor = up ? D - 6 : 0;
    const shell = new THREE.Mesh(shellGeo(y0, a0, a1, floor), M.gold); shell.castShadow = true; grp.add(shell);
    grp.add(new THREE.Mesh(shellGeo(y0, a0, a1, floor, 0.985), M.inner));
    // glass end walls with the opening the trains run through, and a silver rim round each end
    const s = f(1), half = st.gap + 3.4, pts = [];
    for (let j = 0; j <= 24; j++) { const a = a0 + (a1 - a0) * j / 24; pts.push(new THREE.Vector2(RW * s * Math.cos(a), Math.max(floor, y0 + RH * s * Math.sin(a)))); }
    const shape = new THREE.Shape(pts), hole = new THREE.Path(); hole.moveTo(-half, D - 0.4); hole.lineTo(half, D - 0.4); hole.lineTo(half, D + 5.8); hole.lineTo(-half, D + 5.8); hole.closePath(); shape.holes.push(hole);
    const wallG = new THREE.ShapeGeometry(shape); { const p = wallG.attributes.position, uv = wallG.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 8, p.getY(i) / 8); }
    const rimG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0))), 40, 0.55, 6, false);
    for (const e of [-1, 1]) {
      const w = new THREE.Mesh(wallG, M.glass); w.rotation.y = Math.PI / 2; w.position.x = e * LH; grp.add(w);
      const r = new THREE.Mesh(rimG, M.rim); r.rotation.y = Math.PI / 2; r.position.x = e * LH; grp.add(r);
      grp.add(boxAt(0.5, 0.5, half * 2 + 1, e * LH, D + 5.8, 0, M.rim));
    }
    // platforms on both sides of the tracks, with the yellow safety edge
    for (const sd of [-1, 1]) { const zi = st.gap + 1.75, zo = Math.min(RW * s - 1.2, zi + 5); grp.add(boxAt(LH * 2 - 6, 1.1, zo - zi, 0, D - 0.1, sd * (zi + zo) / 2, M.plat)); grp.add(boxAt(LH * 2 - 6, 0.04, 0.5, 0, D + 1.0, sd * (zi + 0.3), M.edge)); }
    const sign = signTex(st.name, st.colour), signM = new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }); st.tex = sign;
    const addSign = (x, y, z, ry, w = 14) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), signM); m.position.set(x, y, z); m.rotation.y = ry; grp.add(m); };
    for (const e of [-1, 1]) addSign(e * (LH + 0.4), D + 8.6, 0, e * Math.PI / 2, 12);
    if (up) {
      // the concrete base under the raised station, with a glass entrance hall at street level
      grp.add(boxAt(LH * 1.5, D - 5.5, 17, 0, 0, 0, M.conc)); grp.add(boxAt(LH * 1.5 + 0.6, 4.2, 17.6, 0, 0, 0, M.tube));
      for (const sd of [-1, 1]) {
        addSign(0, 6.6, sd * 8.9, sd > 0 ? 0 : Math.PI, 16);
        // a covered footbridge out to an entrance pod, where there is room for one
        let L = 0; for (const tryL of [44, 30]) { const z = sd * (RW + tryL), wx = st.x + Math.sin(st.h) * 0 + Math.cos(st.h) * z, wy = st.y - Math.sin(st.h) * z; if ([[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]].every(([ox, oy]) => this.tiles.roofAt(wx + ox, wy + oy) == null)) { L = tryL; break; } }
        if (!L) continue; const z0 = sd * (RW - 3), z1 = sd * (RW + L);
        grp.add(boxAt(5, 4.4, Math.abs(z1 - z0), 0, D + 0.6, (z0 + z1) / 2, M.tube)); grp.add(boxAt(5.6, 0.5, Math.abs(z1 - z0), 0, D + 5.0, (z0 + z1) / 2, M.gold)); grp.add(boxAt(5.6, 0.6, Math.abs(z1 - z0), 0, D, (z0 + z1) / 2, M.plain));
        for (let k = 1; k * 22 < L; k++) grp.add(boxAt(1.2, D, 1.2, 0, 0, sd * (RW + k * 22 - 8), M.plain));
        grp.add(boxAt(7, D + 5.2, 7, 0, 0, z1, M.tube));
        const pod = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.gold); pod.scale.set(8.5, 4.5, 6.5); pod.position.set(0, D + 5.2, z1); grp.add(pod);
        addSign(0, 5.4, z1 + sd * 3.6, sd > 0 ? 0 : Math.PI, 6.6);
      }
    } else for (const sd of [-1, 1]) addSign(0, 4.2, sd * (RW + 0.35), sd > 0 ? 0 : Math.PI, 16);
    grp.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    this.scene.add(grp); st.grp = grp; st.age = 0;
  }
  drop(st) { if (!st.grp) return; this.scene.remove(st.grp); st.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (st.tex) st.tex.dispose(); st.grp = null; }
  update(dt, px, py, day) {
    if ((this.t -= dt) > 0) return; this.t = 0.7;
    for (const st of this.list) {
      const d = Math.hypot(st.x - px, st.y - py);
      if (d < 620 && !st.grp) this.build(st);
      else if (d > 900 && st.grp) this.drop(st);
      // the track's height is only known once that part of the city has loaded: check again for a while
      else if (st.grp && st.age < 30) { st.age += 0.7; const { deck } = this.deckAt(st); if (Math.abs(deck - st.deck) > 1.2) { this.drop(st); this.build(st); } }
    }
    if (MATS) { const n = Math.max(0, Math.min(1, (0.55 - (day ?? 1)) / 0.3)); MATS.glass.emissiveIntensity = 0.85 * n; MATS.tube.emissiveIntensity = 0.7 * n; MATS.inner.emissiveIntensity = 0.5 * n; MATS.gold.emissiveIntensity = 0.12 + 0.25 * n; }
  }
}

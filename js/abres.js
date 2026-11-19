// Dubai City Stories: AB Residence 2 in Warsan Fourth, Farah's home, built from photographs of the real building:
// a long white car-park podium with dark grey bands, open parking bays and planters at street level, a railed terrace
// on top, and white apartment blocks above it with blue glass, glass balconies, dark grey frames and slatted roof canopies.
// Across the road is the fenced, sandy building site with its drilling rig, and the road is lined with barriers.
import * as THREE from 'three';
import { ground } from './terrain.js?v=11190630';
import { BLOCKS } from './stagekit.js?v=11190630';
import { HIDE_FEAT } from './tiles.js?v=11190630';

export const AB = { x: 4925.7, y: -10455.3, b: 0.3658, L: 48, D: 52, road: 36.5 };
HIDE_FEAT.push([5, 4931, -10456, 14], [10, 4932, -10461, 14], [10, 4923, -10488, 8]);      // the empty plot and its wall on the map: the building stands there now      // centre, bearing of its long side, size, distance to the road's middle
const DS = THREE.DoubleSide, WHITE = '#eeebe4', GREY = '#5c5e60', DARK = '#3d3f42';
function tex(w, h, draw, rx = 1, ry = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }
const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = true; b.receiveShadow = true; return b; };
// one 6 m bay of the podium wall, 9.2 m tall: open parking bay or louvres below, white and dark grey bands above
function podiumTex(lit) {
  return tex(512, 256, (g, w, h) => {
    const Y = m => h - m / 9.2 * h;
    g.fillStyle = lit ? '#000' : WHITE; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {                      // four bays across the tile
      const x = k * 128;
      if (k === 2) { g.fillStyle = lit ? '#000' : '#cfd0cd'; g.fillRect(x + 14, Y(3.3), 100, Y(0) - Y(3.3)); if (!lit) { g.fillStyle = '#a9aaa7'; for (let i = 0; i < 22; i++) g.fillRect(x + 14, Y(3.3) + 4 + i * 4.1, 100, 1.4); } }
      else { g.fillStyle = lit ? '#3a3320' : '#1b1d20'; g.fillRect(x + 12, Y(3.1), 104, Y(0) - Y(3.1)); if (!lit) { g.fillStyle = '#2b2e33'; g.fillRect(x + 12, Y(3.1), 104, 8); g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x + 30, Y(1.5), 40, Y(0.1) - Y(1.5)); } else { g.fillStyle = '#ffe9b0'; g.fillRect(x + 40, Y(3.0), 46, 4); } }
    }
    if (lit) return;
    g.fillStyle = GREY; g.fillRect(0, Y(6.3), w, Y(4.4) - Y(6.3)); g.fillRect(0, 0, w, Y(7.7));
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, Y(4.4), w, 2); g.fillRect(0, Y(7.7), w, 2);
  });
}
// one 8 m bay and one 3.3 m floor of an apartment block: blue glass on one side, a recessed balcony with a glass rail on the other
function flatTex(lit, style) {
  return tex(256, 128, (g, w, h) => {
    g.fillStyle = lit ? '#000' : WHITE; g.fillRect(0, 0, w, h);
    const gx = style ? 22 : 14, gw = 78;
    if (lit) { if (style) { g.fillStyle = '#ffd98a'; g.fillRect(gx, 14, gw, 96); } g.fillStyle = '#ffe9b0'; g.fillRect(140, 14, 44, 56); return; }
    const gl = g.createLinearGradient(0, 0, 0, h); gl.addColorStop(0, '#3f6fb8'); gl.addColorStop(1, '#1f3f7c'); g.fillStyle = gl; g.fillRect(gx, 10, gw, 108);
    g.fillStyle = '#16233c'; for (const x of [gx, gx + gw / 3, gx + gw * 2 / 3, gx + gw - 3]) g.fillRect(x, 10, 3, 108); g.fillRect(gx, 10, gw, 3); g.fillRect(gx, 62, gw, 3);
    g.fillStyle = '#2a2f37'; g.fillRect(140, 14, 90, 74);                                   // the balcony recess
    g.fillStyle = '#3566ad'; g.fillRect(146, 18, 44, 68); g.fillStyle = '#16233c'; g.fillRect(167, 18, 2, 68);
    g.fillStyle = 'rgba(205,228,236,.9)'; g.fillRect(134, 70, 104, 38); g.fillStyle = '#ffffff'; g.fillRect(134, 68, 104, 3);   // glass rail
    g.fillStyle = '#f6f4ee'; g.fillRect(130, 108, 112, 10);                                  // balcony slab
    g.fillStyle = '#c9c6be'; g.fillRect(0, 124, w, 4); if (style) g.fillRect(118, 0, 8, h);
  });
}
function slats() { return tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = DARK; for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 4.5, h); g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); }); }
function rail() { return tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#4a4c4f'; for (let i = 0; i < 8; i++) g.fillRect(i * 8, 6, 2.5, h - 6); g.fillRect(0, 0, w, 7); }); }
function label(text, bg, fg, w = 512, h = 96) { return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 62; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(text).width > w - 30 && fs > 20) { fs -= 3; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; } g.fillText(text, w / 2, h / 2 + 2); }); }

export class ABResidence {
  constructor(game, scene) { this.g = game; this.scene = scene; this.grp = null; this.t = 0; this.lit = []; this.blocked = false; }
  // a point in the building's own frame (a along its length, c across: negative is towards the road) as a place on the map
  static at(a, c) { const s = Math.sin(AB.b), k = Math.cos(AB.b); return { x: AB.x + s * a + k * c, y: AB.y + k * a - s * c }; }
  build() {
    const grp = this.grp = new THREE.Group(), g0 = ground(AB.x, AB.y), { L, D } = AB, PH = 9.2, FL = 3.3;
    grp.position.set(AB.x, g0, -AB.y); grp.rotation.y = Math.PI / 2 - AB.b;
    const M = c => new THREE.MeshLambertMaterial({ color: c }), white = M(0xeeebe4), grey = M(0x5c5e60), dark = M(0x3d3f42), deck = M(0xb8b5ad), sand = M(0xd9c08e), conc = M(0x9a9b98);
    const lm = (day, night, k) => { const m = new THREE.MeshLambertMaterial({ map: day, emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0 }); this.lit.push([m, k]); return m; };
    // ---- the podium: long sides repeat the bay tile, the roof is the terrace
    const pd = podiumTex(false), pn = podiumTex(true), side = (len) => { const a = pd.clone(), b = pn.clone(); a.repeat.set(len / 24, 1); b.repeat.set(len / 24, 1); a.needsUpdate = b.needsUpdate = true; return lm(a, b, 0.55); };
    const pod = new THREE.Mesh(new THREE.BoxGeometry(L, PH, D), [side(D), side(D), deck, deck, side(L), side(L)]); pod.position.y = PH / 2; pod.castShadow = pod.receiveShadow = true; grp.add(pod);
    const railM = new THREE.MeshBasicMaterial({ map: rail(), transparent: true, alphaTest: 0.4, side: DS });
    const railAt = (len, x, z, ry) => { const m = railM.clone(); m.map = railM.map.clone(); m.map.repeat.set(len / 1.1, 1); m.map.needsUpdate = true; const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.15), m); p.position.set(x, PH + 0.57, z); p.rotation.y = ry; grp.add(p); };
    railAt(L, 0, -D / 2 + 0.1, 0); railAt(L, 0, D / 2 - 0.1, 0); railAt(D, -L / 2 + 0.1, 0, Math.PI / 2); railAt(D, L / 2 - 0.1, 0, Math.PI / 2);
    // ---- the apartment blocks on the terrace: [middle along, middle across, length, depth, floors, grey frame?]
    const fa = [flatTex(false, 0), flatTex(false, 1)], fn = [flatTex(true, 0), flatTex(true, 1)], sl = slats();
    const wall = (len, fl, st) => { const a = fa[st].clone(), b = fn[st].clone(); a.repeat.set(Math.max(1, Math.round(len / 8)), fl); b.repeat.set(Math.max(1, Math.round(len / 8)), fl); a.needsUpdate = b.needsUpdate = true; return lm(a, b, 0.5); };
    for (const [bx, bz, bl, bd, fl, frame] of [[-16.5, -17, 13, 16, 6, 1], [0.5, -18.5, 17, 13, 5, 0], [16.5, -17, 13, 16, 6, 1], [-11, 14, 22, 20, 6, 0], [13.5, 14, 19, 20, 5, 1]]) {
      const H = fl * FL, st = frame ? 1 : 0, b = new THREE.Mesh(new THREE.BoxGeometry(bl, H, bd), [wall(bd, fl, st), wall(bd, fl, st), white, white, wall(bl, fl, st), wall(bl, fl, st)]);
      b.position.set(bx, PH + H / 2, bz); b.castShadow = true; grp.add(b);
      grp.add(box(bl + 0.5, 0.45, bd + 0.5, bx, PH + H, bz, white));
      const out = bz < 0 ? -1 : 1;
      if (frame) {      // the dark grey frame round the block: two fins up the corners and a roof slab over the top
        for (const e of [-1, 1]) grp.add(box(1.0, H + 3.4, 1.8, bx + e * (bl / 2 + 0.2), PH, bz + out * (bd / 2 + 0.2), grey));
        grp.add(box(bl + 2.4, 0.6, bd * 0.6, bx, PH + H + 2.9, bz + out * (bd * 0.2 + 1.1), grey));
      }
      // the slatted canopy on the roof
      const pm = new THREE.MeshBasicMaterial({ map: sl.clone(), transparent: true, alphaTest: 0.4, side: DS }); pm.map.repeat.set(bl * 0.7 / 2.4, 1); pm.map.needsUpdate = true;
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(bl * 0.7, bd * 0.5), pm); pg.rotation.x = -Math.PI / 2; pg.position.set(bx, PH + H + (frame ? 2.5 : 2.7), bz - out * bd * 0.1); grp.add(pg);
      if (!frame) for (const e of [-1, 1]) for (const f of [-1, 1]) grp.add(box(0.25, 2.5, 0.25, bx + e * bl * 0.33, PH + H + 0.3, bz - out * bd * 0.1 + f * bd * 0.22, dark));
    }
    // a strip of blue glass up the stair core between the first two blocks
    grp.add(box(2.6, 5 * FL + 2, 0.4, -9, PH, -D / 2 + 3.2, M(0x2a4f93))); grp.add(box(3.4, 5 * FL + 2.6, 2.2, -9, PH, -D / 2 + 4.4, grey));
    // ---- the name on the podium, and the shops at the south end
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(15, 1.5), new THREE.MeshBasicMaterial({ map: label('AB RESIDENCE 2', GREY, '#ffffff', 1024, 100), toneMapped: false })); nm.position.set(0, 5.35, -D / 2 - 0.06); nm.rotation.y = Math.PI; grp.add(nm);
    [['Blended Queens Beauty Salon', '#b0206e'], ['AlBaik Butchery', '#a31621'], ['Ghosties Pet Grooming', '#1f6f8f']].forEach(([n, c], i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.3), new THREE.MeshBasicMaterial({ map: label(n, c, '#ffffff'), toneMapped: false })); s.position.set(-L / 2 - 0.06, 3.75, -13 + i * 12); s.rotation.y = -Math.PI / 2; grp.add(s); });
    // ---- street level in front: planters with small trees, the car-park barriers, the low white wall by the ramp
    const leaf = M(0x4f8a3c), trunk = M(0x7a6248), plant = M(0x8b8d8a), soil = M(0x6b5a3e);
    for (const px of [-17, -4, 9]) {
      grp.add(box(10.5, 1.1, 2.0, px, 0, -D / 2 - 1.6, plant)); grp.add(box(10, 0.1, 1.5, px, 1.1, -D / 2 - 1.6, soil));
      for (const tx of [-3.6, 0.3, 3.8]) { grp.add(box(0.18, 2.3, 0.18, px + tx, 1.1, -D / 2 - 1.6, trunk)); for (const [ox, oy, r] of [[0, 3.7, 1.0], [0.7, 3.2, 0.7], [-0.6, 3.3, 0.75]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leaf); s.position.set(px + tx + ox, oy, -D / 2 - 1.6); s.castShadow = true; grp.add(s); } }
    }
    const orange = M(0xf07a1f), red = M(0xd8312a), wht = M(0xf3f3f1), blk = M(0x202225);
    const gate = (x, z, ry) => { const q = new THREE.Group(); q.add(box(0.5, 1.15, 0.5, 0, 0, 0, orange)); for (let i = 0; i < 6; i++) q.add(box(0.95, 0.12, 0.08, 0.7 + i * 0.95, 0.95, 0, i % 2 ? wht : red)); q.position.set(x, 0, z); q.rotation.y = ry; grp.add(q); };
    gate(18, -D / 2 - 1.0, 0); gate(-L / 2 - 1.0, 12, -Math.PI / 2);
    // ---- the road: water-filled barriers on the building's side, striped concrete ones across it
    const inst = (geo, mat, list, cols) => { const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(), c = new THREE.Color(); list.forEach(([x, z, ry], i) => { o.position.set(x, geo.parameters.height / 2, z); o.rotation.set(0, ry || 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (cols) im.setColorAt(i, c.set(cols[i % cols.length])); }); im.castShadow = true; grp.add(im); };
    const zr = -AB.road, wb = [], jb = [];
    for (let x = -22; x <= 44; x += 2.15) { if (!(x > 14.5 && x < 33)) wb.push([x, zr + 4.7 + Math.sin(x * 1.3) * 0.25, Math.sin(x * 2.1) * 0.12]); jb.push([x, zr - 5.4, 0]); }
    inst(new THREE.BoxGeometry(2.0, 0.95, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), wb, [0xf2f2f0, 0xf2f2f0, 0xe8492c, 0xf2f2f0, 0xe8492c, 0xf2f2f0, 0xf2f2f0, 0xc9352b]);
    inst(new THREE.BoxGeometry(2.05, 0.85, 0.55), new THREE.MeshLambertMaterial({ map: tex(64, 32, (g) => { g.fillStyle = '#e9e6e0'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#b5524a'; g.fillRect(0, 0, 22, 32); g.fillRect(44, 0, 20, 32); }) }), jb);
    // ---- across the road: the building site. A fence of grey panels, sand heaps, the drilling rig and a trailer, street lights
    const fenceT = tex(128, 64, (g) => { g.fillStyle = '#c9cbc8'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#a9aba8'; for (let i = 0; i < 16; i++) g.fillRect(i * 8, 0, 1.5, 64); g.fillStyle = '#8d8f8c'; g.fillRect(0, 0, 3, 64); g.fillRect(0, 0, 128, 3); }, 28, 1);
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(70, 2.4), new THREE.MeshLambertMaterial({ map: fenceT, side: DS })); fence.position.set(13, 1.2, zr - 24); grp.add(fence);
    for (const [x, z, r, h] of [[34, zr - 15, 7, 2.6], [22, zr - 13, 4, 1.4], [-14, zr - 13, 5, 1.6]]) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), sand); m.position.set(x, h / 2 - 0.1, z); grp.add(m); }
    const yel = M(0xe0b020), steel = M(0xcfd2d2), rig = new THREE.Group();
    rig.add(box(6.5, 1.0, 3.4, 0, 0, 0, blk)); rig.add(box(4.2, 1.6, 2.8, -0.8, 1.0, 0, steel)); rig.add(box(1.8, 1.7, 1.6, -2.2, 2.6, 0.5, M(0x2a2d31)));
    rig.add(box(0.9, 19, 0.9, 2.6, 0.6, 0, steel)); rig.add(box(1.5, 0.8, 1.5, 2.6, 19.4, 0, steel)); rig.add(box(0.35, 14, 0.35, 3.5, 2, 0, M(0x8a8d8f)));
    const stay = box(0.14, 17.5, 0.14, 0, 0, 0, blk); stay.position.set(0.4, 10.5, 0); stay.rotation.z = -0.26; rig.add(stay);
    rig.position.set(6, 0, zr - 16); rig.rotation.y = 0.5; grp.add(rig);
    const tr = new THREE.Group(); tr.add(box(5.2, 0.35, 2.3, 0, 0.75, 0, steel)); tr.add(box(1.6, 0.12, 0.12, 3.3, 0.8, 0, steel)); for (const [x, z] of [[-0.6, 1.2], [-0.6, -1.2], [0.7, 1.2], [0.7, -1.2]]) { const wl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), blk); wl.rotation.x = Math.PI / 2; wl.position.set(x, 0.42, z); tr.add(wl); const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), yel); hb.rotation.x = Math.PI / 2; hb.position.set(x, 0.42, z); tr.add(hb); }
    tr.position.set(-6, 0, zr - 12); tr.rotation.y = -0.2; grp.add(tr);
    for (const x of [-20, 10, 40]) { grp.add(box(0.22, 10.5, 0.22, x, 0, zr - 9, conc)); const arm = box(3.6, 0.14, 0.14, x, 10.3, zr - 7.4, conc); arm.rotation.y = Math.PI / 2; grp.add(arm); grp.add(box(0.5, 0.14, 1.1, x, 10.25, zr - 5.4, M(0x70736f))); }
    this.scene.add(grp);
    // you can't walk or drive through the podium
    if (!this.blocked) { this.blocked = true; BLOCKS.push({ x: AB.x, y: AB.y, fx: Math.sin(AB.b), fy: Math.cos(AB.b), hl: L / 2, hw: D / 2, top: g0 + PH, R: Math.hypot(L, D) / 2 }); }
  }
  update(dt, px, py, day) {
    if ((this.t -= dt) > 0) return; this.t = 1;
    const d = Math.hypot(AB.x - px, AB.y - py);
    if (d < 900 && !this.grp) this.build();
    else if (d > 1300 && this.grp) { this.scene.remove(this.grp); this.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); } }); this.grp = null; this.lit = []; }
    const n = Math.max(0, Math.min(1, (0.55 - (day ?? 1)) / 0.3)); for (const [m, k] of this.lit) m.emissiveIntensity = k * n;
  }
}

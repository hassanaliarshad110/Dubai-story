// Dubai City Stories: landmark buildings modelled by hand from photographs, standing on their real footprints.
//   The Opus by OMNIYAT (the glass cube with the free-form void), the Museum of the Future (the silver ring with the
//   calligraphy windows), the Emirates Towers (triangular, slanted tops, spires) and the Sheikh Rashid Tower at the Trade Centre
import * as THREE from 'three';
import { ground } from './terrain.js?v=11190630';
import { HIDE_BLD } from './tiles.js?v=11190630';

// the map's plain blocks these replace: [x, y, radius, taller than]
const HIDE = [[-7376, -6305, 46, 100], [-6067, -3057, 15, 200], [-6388, -3581, 12, 200], [-6332, -3504, 14, 200], [-6043, -3017, 12, 150], [-6440, -3664, 16, 150], [-6754, -4186, 15, 100], [-7370, -6134, 62, 40], [-5860, -2757, 45, 30], [-5159, -1815, 20, 100], [-5683, -2919, 30, 200]];
export function prepLandmarks(world) {
  HIDE_BLD.push(...HIDE);
  const gone = s => { let cx = 0, cy = 0; for (const p of s.r) { cx += p[0]; cy += p[1]; } cx /= s.r.length; cy /= s.r.length; return HIDE.some(h => Math.hypot(h[0] - cx, h[1] - cy) < h[2] && s.h > h[3]); };
  if (world.skyline) world.skyline = world.skyline.filter(s => !gone(s));
}

function tex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
}
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(4711);
// curtain wall: one tile is 8 m wide and 8 m (two floors) tall; lit = the same pattern with only the lit rooms, for the night
function glass(base, band, mull, lit) {
  return tex(128, 128, (g, w, h) => {
    g.fillStyle = lit ? '#000' : base; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
      const r = rnd();
      if (lit) { if (r < 0.28) { g.fillStyle = r < 0.1 ? '#ffe2a8' : '#d6e8ff'; g.fillRect(b * 32 + 2, f * 32 + 8, 28, 22); } }
      else { g.fillStyle = `rgba(190,215,255,${0.02 + r * 0.16})`; g.fillRect(b * 32 + 1, f * 32 + 7, 30, 24); }
    }
    if (!lit) { g.fillStyle = band; for (let f = 0; f < 4; f++) g.fillRect(0, f * 32, w, 6); g.fillStyle = mull; for (let b = 0; b < 4; b++) g.fillRect(b * 32, 0, 1.5, h); }
  }, 1 / 16, 1 / 16);
}
// a prism on any footprint whose roof can slope: P = [[x, z], ...] (counter-clockwise from above), y0, tops = height per corner
function prism(P, y0, tops) {
  const pos = [], uv = [], n = P.length; let run = 0;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], ha = tops[i], hb = tops[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], hb, b[1], a[0], y0, a[1], b[0], hb, b[1], a[0], ha, a[1]);
    uv.push(run, y0, run + l, y0, run + l, hb, run, y0, run + l, hb, run, ha); run += l;
  }
  for (let i = 1; i < n - 1; i++) { pos.push(P[0][0], tops[0], P[0][1], P[i][0], tops[i], P[i][1], P[i + 1][0], tops[i + 1], P[i + 1][1]); uv.push(0, 0, 0, 0, 0, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
// a skin stretched over a stack of outlines (all with the same number of points): rings[i] = [[x, z], ...] at height ys[i]
function loft(rings, ys, cap = true) {
  const pos = [], uv = [], n = rings[0].length;
  for (let k = 0; k < rings.length - 1; k++) { let run = 0; const A = rings[k], B = rings[k + 1], y0 = ys[k], y1 = ys[k + 1];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, l = Math.hypot(A[j][0] - A[i][0], A[j][1] - A[i][1]);
      pos.push(A[i][0], y0, A[i][1], A[j][0], y0, A[j][1], B[j][0], y1, B[j][1], A[i][0], y0, A[i][1], B[j][0], y1, B[j][1], B[i][0], y1, B[i][1]);
      uv.push(run, y0, run + l, y0, run + l, y1, run, y0, run + l, y1, run, y1); run += l; } }
  if (cap) { const T = rings[rings.length - 1], y = ys[ys.length - 1]; for (let i = 1; i < n - 1; i++) { pos.push(T[0][0], y, T[0][1], T[i][0], y, T[i][1], T[i + 1][0], y, T[i + 1][1]); uv.push(0, 0, 0, 0, 0, 0); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
const rect = (w, d) => [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2]];
const DS = THREE.DoubleSide;

export class DubaiLandmarks {
  constructor(game, scene) {
    this.g = game; this.lit = []; const add = (x, y, rot, grp) => { grp.position.set(x, ground(x, y) - 0.05, -y); grp.rotation.y = rot * Math.PI / 180; scene.add(grp); return grp; };

    // ---------------------------------------------------------------- The Opus by OMNIYAT: 113 x 66 m, 93 m tall
    {
      const W = 114, D = 67, Y0 = 9, Y1 = 93.5, H = Y1 - Y0, grp = new THREE.Group();
      const V = [[.40, .86], [.52, .875], [.66, .87], [.735, .84], [.757, .75], [.752, .6], [.742, .43], [.712, .31], [.668, .262], [.622, .285], [.587, .36], [.55, .44], [.47, .5], [.39, .555], [.347, .65], [.34, .75], [.36, .82]]
        .map(([u, v]) => new THREE.Vector2((u - 0.5) * W, Y0 + v * H));
      const curve = new THREE.SplineCurve([...V, V[0]]), hole = curve.getPoints(72);
      const sh = new THREE.Shape([new THREE.Vector2(-W / 2, Y0), new THREE.Vector2(W / 2, Y0), new THREE.Vector2(W / 2, Y1), new THREE.Vector2(-W / 2, Y1)]); sh.holes.push(new THREE.Path(hole));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 4 }); geo.translate(0, 0, -D / 2);
      const day = glass('#13233f', '#3d5378', '#22355a'), night = glass(0, 0, 0, true);
      const mat = new THREE.MeshLambertMaterial({ map: day, emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0 }); this.lit.push([mat, 0.3]);
      const cube = new THREE.Mesh(geo, mat); cube.castShadow = true; grp.add(cube);
      // the void's own skin: dark curved glass studded with lights
      const dots = tex(128, 128, (g, w, h) => { g.fillStyle = '#0b1020'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,150,210,.18)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32, w, 1.5); g.fillStyle = '#e8f0ff'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(j * 32 + (i % 2 ? 16 : 0) + 6, i * 32 + 16, 2.3, 0, 7); g.fill(); } }, 1 / 10, 1 / 10);
      const dotsLit = tex(128, 128, (g, w, h) => { g.fillStyle = '#060a18'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.shadowColor = '#9fc0ff'; g.shadowBlur = 6; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(j * 32 + (i % 2 ? 16 : 0) + 6, i * 32 + 16, 2.6, 0, 7); g.fill(); } }, 1 / 10, 1 / 10);
      const lp = [], lu = []; let run = 0;
      for (let i = 0; i < hole.length - 1; i++) { const a = hole[i], b = hole[i + 1], l = a.distanceTo(b), z0 = -D / 2 - 0.2, z1 = D / 2 + 0.2; lp.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1); lu.push(run, 0, run + l, 0, run + l, D, run, 0, run + l, D, run, D); run += l; }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(lu, 2)); lg.computeVertexNormals();
      const lm = new THREE.MeshLambertMaterial({ map: dots, emissive: 0xffffff, emissiveMap: dotsLit, emissiveIntensity: 0.25, side: DS }); this.lit.push([lm, 0.7, 0.2]);
      const liner = new THREE.Mesh(lg, lm); liner.scale.set(0.992, 0.992, 1); liner.position.y = (Y0 + H * 0.56) * 0.008; grp.add(liner);
      // the glass podium the cube floats on, and the white canopy line
      const pod = new THREE.Mesh(new THREE.BoxGeometry(W - 9, Y0, D - 8), new THREE.MeshLambertMaterial({ color: 0x9fc4d8, emissive: 0x6fa8c8, emissiveIntensity: 0 })); pod.position.y = Y0 / 2; grp.add(pod); this.lit.push([pod.material, 0.35]);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.9, D + 0.6), new THREE.MeshLambertMaterial({ color: 0xe9edf0 })); lip.position.y = Y0 - 0.3; grp.add(lip);
      add(-7369.6, -6133.8, 23, grp);
    }

    // ---------------------------------------------------------------- Museum of the Future: the silver ring on its green hill
    {
      const grp = new THREE.Group();
      const calli = lit => tex(512, 256, (g, w, h) => {
        g.fillStyle = lit ? '#000' : '#c9ced4'; g.fillRect(0, 0, w, h); if (!lit) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(90,100,115,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
        g.fillStyle = lit ? '#fff3d6' : '#141a24'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.direction = 'rtl';
        const L = ['لن نعيش مئات السنين ولكن يمكن أن نبدع شيئاً يستمر لمئات السنين', 'المستقبل سيكون لمن يستطيع تخيله وتصميمه وتنفيذه', 'سر تجدد الحياة وتطور الحضارة وتقدم البشرية هو في كلمة واحدة: الابتكار'];
        for (let i = 0; i < 3; i++) { g.font = `700 ${58 + i * 6}px "Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma, serif`; g.save(); g.translate(w / 2 + (i - 1) * 30, 44 + i * 84); g.transform(1, 0, -0.25, 1, 0, 0); g.fillText(L[i], 0, 0); g.fillText(L[i], -w, 0); g.fillText(L[i], w, 0); g.restore(); }
      }, 3, 2);
      const m = new THREE.MeshLambertMaterial({ map: calli(false), emissive: 0xffffff, emissiveMap: calli(true), emissiveIntensity: 0 }); this.lit.push([m, 0.45]);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.43, 26, 64), m); ring.scale.set(36.5, 22.4, 44); ring.position.y = 14 + 32; ring.castShadow = true; grp.add(ring);
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, 6.2832, 0, 1.5708), new THREE.MeshLambertMaterial({ color: 0x4f8a45 })); hill.scale.set(66, 15.5, 30); grp.add(hill);
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 28), new THREE.MeshLambertMaterial({ color: 0xdfe3e6 })); deck.scale.set(30, 1, 16); deck.position.y = 15; grp.add(deck);
      add(-5861, -2758, 52, grp);
    }

    // ---------------------------------------------------------------- Emirates Towers: the triangular office tower (355 m with its spire)
    {
      const grp = new THREE.Group(), R = 31, tri = [0, 1, 2].map(i => [Math.sin(i * 2.0944) * R, Math.cos(i * 2.0944) * R]);
      const day = glass('#8f9aa6', '#d3d8dd', '#eef1f3'), night = glass(0, 0, 0, true);
      const mat = new THREE.MeshLambertMaterial({ map: day, emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0, side: DS }); this.lit.push([mat, 0.3]);
      const body = new THREE.Mesh(prism(tri, 0, [311, 262, 262]), mat); body.castShadow = true; grp.add(body);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 3, R + 5, 26, 3), new THREE.MeshLambertMaterial({ color: 0xbfc5cb })); base.position.y = 13; base.rotation.y = Math.PI; grp.add(base);
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.5, 46, 8), new THREE.MeshLambertMaterial({ color: 0xe6e9ec })); spire.position.set(tri[0][0] * 0.82, 311 + 21, tri[0][1] * 0.82); grp.add(spire);
      add(-5683, -2919, 35, grp);
      // the hotel tower already has its shape from the map: give it its sloped cap and spire
      const cap = new THREE.Group(), t2 = [0, 1, 2].map(i => [Math.sin(i * 2.0944) * 20, Math.cos(i * 2.0944) * 20]);
      const c2 = new THREE.Mesh(prism(t2, 0, [29, 4, 4]), mat); cap.add(c2); const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.1, 32, 8), spire.material); s2.position.set(t2[0][0] * 0.8, 29 + 14, t2[0][1] * 0.8); cap.add(s2);
      const q = add(-5807, -2921, 35, cap); q.position.y += 280;
    }

    // ---------------------------------------------------------------- Sheikh Rashid Tower (Dubai World Trade Centre, 1979): white concrete, arched window bays
    {
      const grp = new THREE.Group(), S = 40, Hh = 149;
      const arches = lit => tex(128, 128, (g, w, h) => {
        g.fillStyle = lit ? '#000' : '#ece7dc'; g.fillRect(0, 0, w, h);
        for (let f = 0; f < 2; f++) for (let b = 0; b < 4; b++) { const x = b * 32 + 5, y = f * 64 + 8, r = rnd(); g.fillStyle = lit ? (r < 0.3 ? '#ffe2a6' : '#000') : '#3a4652'; g.beginPath(); g.moveTo(x, y + 52); g.lineTo(x, y + 14); g.quadraticCurveTo(x + 11, y - 6, x + 22, y + 14); g.lineTo(x + 22, y + 52); g.closePath(); g.fill(); if (!lit) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + 52, 22, 3); } }
        if (!lit) { g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, 3); g.fillRect(0, 64, w, 3); }
      }, 1 / 10, 1 / 7.6);
      const mat = new THREE.MeshLambertMaterial({ map: arches(false), emissive: 0xffffff, emissiveMap: arches(true), emissiveIntensity: 0, side: DS }); this.lit.push([mat, 0.35]);
      const sq = [[-S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S / 2], [S / 2, -S / 2]];
      const tower = new THREE.Mesh(prism(sq, 10, [Hh, Hh, Hh, Hh]), mat); tower.castShadow = true; grp.add(tower);
      const white = new THREE.MeshLambertMaterial({ color: 0xf1ede4 });
      const crown = new THREE.Mesh(new THREE.BoxGeometry(S + 3, 5, S + 3), white); crown.position.y = Hh - 1; grp.add(crown);
      const plant = new THREE.Mesh(new THREE.BoxGeometry(S * 0.55, 7, S * 0.55), white); plant.position.y = Hh + 5; grp.add(plant);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(S + 12, 10, S + 12), white); pod.position.y = 5; grp.add(pod);
      for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(2.2, Hh - 6, 2.2), white); fin.position.set((i & 1 ? 1 : -1) * (S / 2 + 0.3), Hh / 2 + 3, (i & 2 ? 1 : -1) * (S / 2 + 0.3)); grp.add(fin); }
      add(-5159, -1815, 41, grp);
    }
    // ---------------------------------------------------------------- The Binary by OMNIYAT: the green glass sail and its dark twin
    {
      const grp = new THREE.Group(), day = glass('#1f7f78', '#c9d6d6', '#3fa39a'), night = glass(0, 0, 0, true);
      const mat = new THREE.MeshLambertMaterial({ map: day, emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0, side: DS }); this.lit.push([mat, 0.3]);
      const dark = new THREE.MeshLambertMaterial({ map: glass('#0f3b3a', '#1c5552', '#145049'), emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0, side: DS }); this.lit.push([dark, 0.3]);
      const almond = (L, Wd) => { const P = [], N = 14; for (let i = 0; i <= N; i++) { const t = i / N; P.push([-30 + L * t, Wd / 2 * Math.pow(Math.sin(Math.PI * t), 0.55)]); } for (let i = N - 1; i > 0; i--) { const t = i / N; P.push([-30 + L * t, -Wd / 2 * Math.pow(Math.sin(Math.PI * t), 0.55)]); } return P; };
      const R = [], Y = []; for (let k = 0; k <= 30; k++) { const t = k / 30, y = 22 + t * 110; let L = 21 + 40 * Math.pow(1 - t, 2.1), Wd = 17; if (t > 0.9) { const q = (t - 0.9) / 0.1, c = Math.sqrt(Math.max(0.02, 1 - q * q)); L *= c; Wd *= c; } R.push(almond(L, Wd)); Y.push(y); }
      const sail = new THREE.Mesh(loft(R, Y), mat); sail.castShadow = true; grp.add(sail);
      const base = new THREE.Mesh(loft([almond(61, 17), almond(61, 17)], [0, 22], false), mat); grp.add(base);
      const ell = (a, b, n = 20) => Array.from({ length: n }, (_, i) => [Math.cos(-i / n * 6.2832) * a, Math.sin(-i / n * 6.2832) * b]);
      const twin = new THREE.Mesh(loft([ell(15, 9.5), ell(15, 9.5), ell(14.2, 9)], [0, 106, 110]), dark); twin.position.set(-20, 0, -14.6); twin.castShadow = true; grp.add(twin);
      // the podium: glass floors behind white bands on round columns, and the name over the door
      const white = new THREE.MeshLambertMaterial({ color: 0xeef0f1 }), pg = new THREE.MeshLambertMaterial({ map: glass('#1a6f6a', '#e6eaea', '#2f8f88') });
      const pod = new THREE.Mesh(prism(rect(44, 30), 5, [22, 22, 22, 22]), pg); pod.material.side = DS; pod.position.set(18, 0, 22); grp.add(pod);
      for (const y of [5, 22]) { const band = new THREE.Mesh(new THREE.BoxGeometry(45.5, 1.2, 31.5), white); band.position.set(18, y, 22); grp.add(band); }
      for (let i = 0; i < 6; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 5, 10), white); col.position.set(-2 + i * 8, 2.5, 36.4); grp.add(col); }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.6), new THREE.MeshBasicMaterial({ map: tex(512, 140, (g, w, h) => { g.fillStyle = '#2a2d30'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '300 62px "Segoe UI", Roboto, Arial, sans-serif'; try { g.letterSpacing = '6px'; } catch (e) { } g.fillText('THE BINARY', w / 2, 50); g.font = '400 30px "Segoe UI", Roboto, Arial, sans-serif'; try { g.letterSpacing = '10px'; } catch (e) { } g.fillText('BY OMNIYAT', w / 2, 106); }), toneMapped: false })); sign.position.set(18, 9.2, 37.2); grp.add(sign);
      add(-7370.6, -6296.8, 102, grp);
    }

    // ---------------------------------------------------------------- Sheikh Zayed Road: the towers you know by their tops
    const tower = (x, y, rot, build) => { const grp = new THREE.Group(); build(grp); add(x, y, rot, grp); };
    const gm = (base, band, mull, k = 0.3) => { const m = new THREE.MeshLambertMaterial({ map: glass(base, band, mull), emissive: 0xffffff, emissiveMap: glass(0, 0, 0, true), emissiveIntensity: 0, side: DS }); this.lit.push([m, k]); return m; };
    const pm = c => new THREE.MeshLambertMaterial({ color: c, side: DS });
    const box = (grp, w, d, y0, y1, m, w1 = w, d1 = d) => { const b = new THREE.Mesh(loft([rect(w, d), rect(w1, d1)], [y0, y1]), m); b.castShadow = true; grp.add(b); return b; };
    const needle = (grp, y0, y1, r, m, x = 0, z = 0) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15, r, y1 - y0, 8), m); s.position.set(x, (y0 + y1) / 2, z); grp.add(s); };
    // Al Yaqoub Tower: the clock tower (328 m)
    tower(-6067.5, -3057.1, 56, g => {
      const stone = gm('#8d7a5e', '#c9b892', '#a8946f'), cap = pm(0x6f6a5c), gold = pm(0xc9a85a);
      box(g, 36, 36, 0, 30, stone); box(g, 30, 30, 30, 222, stone); box(g, 33, 33, 222, 228, cap); box(g, 31, 31, 228, 256, stone);
      const face = tex(256, 256, (c, w, h) => { c.fillStyle = '#b9a67e'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4efe0'; c.beginPath(); c.arc(128, 128, 108, 0, 7); c.fill(); c.strokeStyle = '#2a2418'; c.lineWidth = 9; c.stroke(); c.lineWidth = 7; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); c.lineTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); c.stroke(); } c.lineWidth = 9; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 50, 128 - 30); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 - 18, 128 - 88); c.stroke(); });
      const fm = new THREE.MeshLambertMaterial({ map: face, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0 }); this.lit.push([fm, 0.8]);
      for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), fm); f.position.set(Math.sin(i * 1.5708) * 15.7, 242, Math.cos(i * 1.5708) * 15.7); f.rotation.y = i * 1.5708; g.add(f); }
      box(g, 33, 33, 256, 261, cap); box(g, 24, 24, 261, 276, stone); box(g, 24, 24, 276, 318, cap, 1.5, 1.5); needle(g, 316, 328, 0.8, gold);
      for (let i = 0; i < 4; i++) box(g, 4, 4, 261, 274, cap, 0.4, 0.4).position.set((i & 1 ? 1 : -1) * 14, 0, (i & 2 ? 1 : -1) * 14);
    });
    // Rose Rayhaan by Rotana: the slim blue one (333 m)
    tower(-6388.3, -3581.4, -122, g => { const m = gm('#3f6fa8', '#c8d6e6', '#5b8cc4'), s = pm(0xdfe5ea); box(g, 30, 27, 0, 24, m); box(g, 26, 23, 24, 262, m); box(g, 26, 23, 262, 296, m, 8, 7); box(g, 8, 7, 296, 304, s, 3, 3); needle(g, 302, 333, 1.3, s); });
    // Gevora Hotel: gold, with the pyramid crown (356 m)
    tower(-6332.7, -3503.9, -31, g => { const m = gm('#7a6a3a', '#d8c27a', '#b39a4c'), gold = pm(0xd4b25a); box(g, 36, 34, 0, 28, m); box(g, 32, 30, 28, 292, m); box(g, 35, 33, 292, 298, gold); box(g, 28, 26, 298, 312, m); box(g, 28, 26, 312, 346, gold, 2, 2); needle(g, 344, 356, 0.9, gold); for (let i = 0; i < 4; i++) { box(g, 6, 6, 298, 318, gold, 0.5, 0.5).position.set((i & 1 ? 1 : -1) * 14.5, 0, (i & 2 ? 1 : -1) * 13.5); } });
    // The Tower: stepped steel crown and a long spire (243 m)
    tower(-6042.5, -3017.1, 57, g => { const m = gm('#5f7486', '#c7d0d8', '#8296a6'), s = pm(0xcfd6dc); box(g, 29, 27, 0, 178, m); box(g, 24, 22, 178, 192, m); box(g, 18, 17, 192, 203, m); box(g, 18, 17, 203, 216, s, 3, 3); needle(g, 214, 243, 1.2, s); });
    // 21st Century Tower: white and blue, mast on the roof (269 m)
    tower(-6436.5, -3661.4, 58, g => { const m = gm('#4a78b0', '#f1f3f5', '#dfe6ee'), s = pm(0xe9edf0), red = pm(0xc8202c); box(g, 42, 26, 0, 222, m); box(g, 44, 28, 222, 226, s); box(g, 30, 18, 226, 236, m); needle(g, 236, 262, 1.1, s); needle(g, 260, 269, 0.5, red); });
    // Dusit Thani: two legs leaning in to meet, like hands pressed together (153 m)
    tower(-6753.8, -4185.6, -119, g => {
      const m = gm('#3c78b4', '#dfe7ee', '#6aa0d4'), s = pm(0xe6ebef);
      for (const sx of [-1, 1]) { const leg = new THREE.Mesh(loft([rect(15, 36), rect(15, 30), rect(13, 20)], [0, 80, 128]), m); leg.geometry.translate(0, 0, 0); const P = leg.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + sx * (15.5 - Math.min(1, y / 128) * 9)); } P.needsUpdate = true; leg.geometry.computeVertexNormals(); leg.castShadow = true; g.add(leg); }
      box(g, 26, 20, 112, 140, m, 12, 10); box(g, 12, 10, 140, 146, s, 3, 3); needle(g, 144, 153, 0.8, s); box(g, 50, 40, 0, 12, m);
    });
    this.crowns(game.world, scene, add);
  }
  // ---------------------------------------------------------------- every other tower: no more flat-topped boxes
  // each tall tower in the map gets a roof of its own (spire, pyramid, setbacks, sloped cap, fins, turrets, plant floor),
  // the known ones the top they really have. Everything is merged into one mesh per colour, so it costs almost nothing
  crowns(world, scene) {
    const NAMED = [[-8288, -6493, 'palm'], [-8223, -6418, 'palm'], [-5958, -2523, 'spire'], [-6029, -2613, 'pyramid'], [-5627, -1938, 'turrets'], [-5676, -2073, 'fins'], [-6854, -3974, 'setback'],
      [-6307, -3453, 'spire'], [-6097, -3093, 'slant'], [-6111, -3133, 'flat'], [-5944, -2472, 'slant'], [-5491, -1697, 'setback'], [-5809, -3637, 'slant'], [-6510, -3784, 'flat'], [-6793, -3872, 'slant'],
      [-5726, -2162, 'flat'], [-6001, -3549, 'flat'], [-5706, -1972, 'slant'], [-5800, -2248, 'slant'], [-6233, -3332, 'spire'], [-6426, -3277, 'pyramid'], [-6290, -3063, 'setback'], [-6094, -2726, 'fins'], [-6122, -2783, 'fins'], [-6942, -4110, 'spire']];
    const SKIP = [[-6635, -5183, 150], [-5807, -2921, 45], [-6613, -3583, 30], [-6271, -4051, 60], ...HIDE.map(h => [h[0], h[1], h[2] + 6])];
    const STYLES = ['flat', 'flat', 'spire', 'pyramid', 'setback', 'setback', 'slant', 'slant', 'fins', 'turrets', 'ring'];
    const info = S => { const r = S.r, n = r.length; let cx = 0, cy = 0, ar = 0; for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; cx += a[0]; cy += a[1]; ar += a[0] * b[1] - b[0] * a[1]; } cx /= n; cy /= n;
      let best = null; for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const p of r) { const u = p[0] * ux + p[1] * uy, v = -p[0] * uy + p[1] * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } const w = u1 - u0, d = v1 - v0; if (!best || w * d < best.w * best.d) { const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; best = { w, d, ang: Math.atan2(uy, ux), x: cu * ux - cv * uy, y: cu * uy + cv * ux }; } }
      return best && { ...best, cx, cy, area: Math.abs(ar) / 2 }; };
    const T = (world.skyline || []).filter(q => q.h >= 105 && q.r && q.r.length >= 3).map(q => ({ q, i: info(q) })).filter(t => t.i && t.i.area > 220 && t.i.area > t.i.w * t.i.d * 0.55 && !SKIP.some(k => Math.hypot(k[0] - t.i.cx, k[1] - t.i.cy) < k[2]));
    const buf = { silver: [], white: [], dark: [], gold: [], red: [] }, M4 = new THREE.Matrix4(), E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
    let cur = null; const put = (geo, col, x = 0, y = 0, z = 0) => { const g = geo.index ? geo.toNonIndexed() : geo; g.translate(x, y, z); g.applyMatrix4(cur); const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) buf[col].push(p[i]); };
    const bx = (w, d, y0, y1, col, w1 = w, d1 = d, x = 0, z = 0) => put(loft([rect(w, d), rect(w1, d1)], [y0, y1]), col, x, 0, z);
    const mast = (y0, y1, r, col, x = 0, z = 0) => put(new THREE.CylinderGeometry(0.12, r, y1 - y0, 6), col, x, (y0 + y1) / 2, z);
    let count = 0;
    for (const { q, i } of T) {
      // only the top of a stack gets the roof
      if (T.some(o => o.q !== q && o.q.h > q.h + 1 && (o.q.mh || 0) >= q.h - 2 && Math.hypot(o.i.cx - i.cx, o.i.cy - i.cy) < Math.max(i.w, i.d) * 0.6)) continue;
      const w = i.w, d = i.d, s = Math.min(w, d), H = q.h, hsh = Math.abs(Math.sin(i.cx * 12.9898 + i.cy * 78.233) * 43758.5453) % 1, nm = NAMED.find(k => Math.hypot(k[0] - i.cx, k[1] - i.cy) < 26);
      const style = nm ? nm[2] : STYLES[Math.floor(hsh * STYLES.length)], col = hsh > 0.86 ? 'gold' : hsh > 0.5 ? 'silver' : hsh > 0.25 ? 'white' : 'dark', k = Math.min(1.5, Math.max(0.7, H / 180));
      const gy = ground(i.cx, i.cy); E.set(0, i.ang, 0); Q.setFromEuler(E); V.set(i.x, gy + H - 0.3, -i.y); cur = M4.clone().compose(V, Q, ONE); count++;
      bx(w + 0.8, d + 0.8, 0, 1.4, 'white');                                   // the parapet band every one of them has
      if (style === 'flat') { bx(w * 0.5, d * 0.45, 1.4, 6, 'dark'); bx(w * 0.2, d * 0.2, 6, 9, 'silver'); if (hsh > 0.4) mast(9, 9 + s * 0.7 * k, 0.5, 'white'); if (hsh > 0.7) mast(20, 24, 0.3, 'red'); }
      else if (style === 'spire') { bx(w * 0.72, d * 0.72, 1.4, s * 0.45, col); bx(w * 0.72, d * 0.72, s * 0.45, s * 1.25 * k, col, 1.2, 1.2); mast(s * 1.2 * k, s * 2.3 * k, 0.8, 'silver'); }
      else if (style === 'pyramid') { bx(w, d, 1.4, s * 0.85 * k, col, 1, 1); mast(s * 0.8 * k, s * 1.3 * k, 0.5, 'silver'); }
      else if (style === 'setback') { bx(w * 0.8, d * 0.8, 1.4, s * 0.38, 'silver'); bx(w * 0.84, d * 0.84, s * 0.38, s * 0.42, 'white'); bx(w * 0.58, d * 0.58, s * 0.42, s * 0.76, 'silver'); bx(w * 0.36, d * 0.36, s * 0.76, s * 1.05, col); mast(s * 1.05, s * 1.8 * k, 0.6, 'white'); }
      else if (style === 'slant') { put(prism(rect(w, d), 1.4, [s * 0.9 * k, s * 0.9 * k, 1.5, 1.5]), col); if (hsh > 0.5) mast(s * 0.9 * k, s * 1.5 * k, 0.5, 'silver', -w / 2 + 1.5, 0); }
      else if (style === 'fins') { for (const sz of [-1, 1]) bx(w, 1.4, 1.4, s * 0.8 * k, col, w * 0.5, 1.4, 0, sz * (d / 2 - 0.7)); bx(w * 0.4, d * 0.5, 1.4, 5, 'dark'); mast(5, s * 1.1 * k, 0.5, 'silver'); }
      else if (style === 'turrets') { for (let c = 0; c < 4; c++) { const x = (c & 1 ? 1 : -1) * (w / 2 - s * 0.14), z = (c & 2 ? 1 : -1) * (d / 2 - s * 0.14); bx(s * 0.28, s * 0.28, 1.4, s * 0.5, 'white', s * 0.28, s * 0.28, x, z); bx(s * 0.3, s * 0.3, s * 0.5, s * 0.85, col, 0.6, 0.6, x, z); } bx(w * 0.4, d * 0.4, 1.4, 6, 'dark'); }
      else if (style === 'ring') { for (let c = 0; c < 4; c++) bx(1.6, 1.6, 1.4, s * 0.55, 'white', 1.6, 1.6, (c & 1 ? 1 : -1) * (w / 2 - 0.8), (c & 2 ? 1 : -1) * (d / 2 - 0.8)); bx(w + 0.6, d + 0.6, s * 0.55, s * 0.55 + 1.6, 'white'); bx(w * 0.45, d * 0.45, 1.4, s * 0.4, 'dark'); mast(s * 0.4, s * 1.2 * k, 0.5, col === 'dark' ? 'silver' : col); }
      else if (style === 'palm') { bx(w * 0.85, d * 0.85, 1.4, s * 0.5, 'silver'); for (let c = 0; c < 8; c++) { const a = c / 8 * 6.2832; bx(1.4, s * 0.5, s * 0.3, s * 1.3, 'silver', 0.5, 2, Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3); } bx(w * 0.5, d * 0.5, s * 0.5, s * 1.4, 'white', 2, 2); mast(s * 1.35, s * 2.2, 0.9, 'silver'); }
    }
    const COL = { silver: 0xc9d1d8, white: 0xf0f1f0, dark: 0x3d4650, gold: 0xc8a85a, red: 0xd02a2a };
    for (const c in buf) { if (!buf[c].length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(buf[c], 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: COL[c], side: DS })); m.frustumCulled = false; scene.add(m); }
    this.crownCount = count;
  }
  // the windows come on at dusk
  update() {
    const h = this.g.clock ?? 12, n = h > 18.6 || h < 5.6 ? 1 : h > 17.6 ? (h - 17.6) : h < 6.4 ? (6.4 - h) / 0.8 : 0;
    if (n === this.n) return; this.n = n; for (const [m, k, min] of this.lit) m.emissiveIntensity = Math.max(min || 0, n * k);
  }
}

// Dubai City Stories: landmark buildings modelled by hand from photographs, standing on their real footprints.
//   The Opus by OMNIYAT (the glass cube with the free-form void), the Museum of the Future (the silver ring with the
//   calligraphy windows), the Emirates Towers (triangular, slanted tops, spires) and the Sheikh Rashid Tower at the Trade Centre
import * as THREE from 'three';
import { ground } from './terrain.js?v=11112231';
import { HIDE_BLD } from './tiles.js?v=11112231';

// the map's plain blocks these replace: [x, y, radius, taller than]
const HIDE = [[-7370, -6134, 62, 40], [-5860, -2757, 45, 30], [-5159, -1815, 20, 100], [-5683, -2919, 30, 200]];
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
  }
  // the windows come on at dusk
  update() {
    const h = this.g.clock ?? 12, n = h > 18.6 || h < 5.6 ? 1 : h > 17.6 ? (h - 17.6) : h < 6.4 ? (6.4 - h) / 0.8 : 0;
    if (n === this.n) return; this.n = n; for (const [m, k, min] of this.lit) m.emissiveIntensity = Math.max(min || 0, n * k);
  }
}

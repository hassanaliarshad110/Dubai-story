// Dubai City Stories: Muhaisnah 4, dressed from photographs of its streets. The map's plain blocks get the fronts the real
// buildings have: beige four-storey blocks with projecting bays and curved glass balconies, white ones with green glass,
// older brown blocks with air-conditioner cages and grey gables. The three mosques get their domes and minarets, the
// streets get centre lines, lamp posts, big grey rubbish skips and parked cars, and the corner shops by the last mosque
// carry the Abdulla Kutait Grocery and Mohammed Al Helo Restaurant boards.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { ground } from './terrain.js?v=11190752';
import { makeCar } from './actors.js?v=11190752';
import { plateOpt } from './cars3d.js?v=11190752';
import { TYRE_Y, rotY } from './player.js?v=11190752';
import { HIDE_BLD } from './tiles.js?v=11190752';
import { BLOCKS } from './stagekit.js?v=11190752';

HIDE_BLD.push([7118.5, 3992.2, 6, 0]);   // the grocery strip is one storey, built here by hand

const C = { x: 6850, y: 4120 }, DS = THREE.DoubleSide;
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
// one 8 m bay of a block, full height: st = 'beige' | 'white' | 'old'
function facade(st) {
  const H = st === 'old' ? 7.5 : 13, px = 32;
  return tex(256, Math.round(H * px), (g, w, h) => {
    const X = m => m * px, Y = m => h - m * px, base = st === 'beige' ? '#e2d0b1' : st === 'white' ? '#f0eee8' : '#b9a084', lite = st === 'beige' ? '#ecdfc6' : st === 'white' ? '#fbfaf6' : '#c9b196', dark = st === 'beige' ? '#cdb893' : st === 'white' ? '#d9d6ce' : '#a38a6f';
    g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = dark; g.fillRect(0, Y(1.1), w, Y(0) - Y(1.1));
    const rect = (c, x, y0, x1, y1) => { g.fillStyle = c; g.fillRect(X(x), Y(y1), X(x1 - x), Y(y0) - Y(y1)); };
    if (st === 'old') {
      g.fillStyle = '#c4a57e'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3946d'; g.fillRect(0, Y(0.5), w, Y(0) - Y(0.5));
      for (let f = 0; f < 3; f++) { const z = 0.9 + f * 2.25;
        for (const x of [0.8, 3.2, 5.6]) { rect('#2f3438', x, z, x + 1.3, z + 1.25); rect('#e9e4d6', x - 0.06, z - 0.08, x + 1.36, z); rect('#55616a', x + 0.62, z, x + 0.68, z + 1.25); }
        rect('#d8d5cc', 2.35, z + 0.15, 2.95, z + 0.6); rect('#9aa0a4', 2.4, z + 0.2, 2.9, z + 0.55); }
      g.fillStyle = '#d2b48c'; g.fillRect(0, 0, w, 10); g.fillStyle = '#a98a63'; g.beginPath(); g.moveTo(X(3.2), 0); g.lineTo(X(4), 22); g.lineTo(X(4.8), 0); g.fill();
      return;
    }
    const glass = st === 'beige' ? '#6f9fb4' : '#8fcdb6';
    rect('#f4f3ee', 0.5, 1.1, 2.4, 3.0); g.fillStyle = '#cfcdc6'; for (let i = 0; i < 14; i++) g.fillRect(X(0.5), Y(3.0) + i * 4.3, X(1.9), 1.5);      // louvred store doors
    rect('#2a3138', 3.2, 1.2, 5.4, 3.0); rect('#4a5a66', 6.1, 1.6, 7.4, 2.8);
    for (let f = 0; f < 3; f++) { const z = 3.5 + f * 3.1;
      rect(lite, 0.35, z - 0.15, 2.55, z + 2.95);                                                   // the projecting bay with two tall slots
      for (const sx of [0.65, 1.6]) { rect('#4b4a44', sx, z + 0.2, sx + 0.6, z + 2.6); if (st === 'white') { g.fillStyle = '#4b4a44'; g.beginPath(); g.arc(X(sx + 0.3), Y(z + 2.6), X(0.3), Math.PI, 0); g.fill(); } rect('#cfc9bb', sx, z + 0.2, sx + 0.6, z + 0.9); }
      rect('#3a3a36', 3.0, z + 1.0, 5.7, z + 2.7); rect('#59636b', 3.2, z + 1.0, 4.3, z + 2.5); rect('#59636b', 4.5, z + 1.0, 5.5, z + 2.5);   // the balcony recess and its doors
      g.fillStyle = glass; g.beginPath(); g.ellipse(X(4.35), Y(z + 1.0), X(1.55), 15, 0, 0, Math.PI); g.fill(); rect(glass, 2.8, z + 1.0, 5.9, z + 1.75);
      g.fillStyle = lite; g.beginPath(); g.ellipse(X(4.35), Y(z + 0.3), X(1.6), 16, 0, 0, Math.PI); g.fill(); rect(lite, 2.75, z + 0.3, 5.95, z + 1.0); rect('rgba(255,255,255,.7)', 2.8, z + 1.72, 5.9, z + 1.78);
      rect('#f4f3ee', 6.15, z + 0.75, 7.45, z + 2.25); rect('#4f7186', 6.25, z + 0.85, 7.35, z + 2.15); rect('#f4f3ee', 6.78, z + 0.85, 6.82, z + 2.15); rect('#d9d6ce', 6.4, z + 0.1, 7.2, z + 0.6);
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, Y(z - 0.2)); g.lineTo(w, Y(z - 0.2)); g.stroke(); }
    rect(lite, 0, 12.55, 8, 13); rect(dark, 0, 12.45, 8, 12.55);
  });
}
const plate = (lines, bg, fg, w = 512, h = 128) => tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((t, i) => { let fs = Math.min(h / lines.length * 0.74, 80); g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(t).width > w - 30 && fs > 14) { fs -= 2; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; } g.fillText(t, w / 2, h * (i + 0.5) / lines.length + 2); }); });

export class Muhaisnah {
  constructor(game, scene) { this.g = game; this.scene = scene; this.grp = null; this.t = 0; this.cars = null; this.data = null; fetch('data/muh4.json').then(r => r.json()).then(d => { this.data = d; }).catch(() => { }); }
  build() {
    const D = this.data, grp = this.grp = new THREE.Group(), bins = {}, M = {}, mat = (k, c) => M[k] ||= new THREE.MeshLambertMaterial({ color: c });
    const box = (k, col, x, y, w, d, z0, z1, ang = 0) => { mat(k, col); const g = new THREE.BoxGeometry(w, z1 - z0, d); g.rotateY(ang); g.translate(x, ground(x, y) + (z0 + z1) / 2, -y); (bins[k] ||= []).push(g); };
    const cyl = (k, col, x, y, r, z0, z1, r2, seg = 8) => { mat(k, col); const g = new THREE.CylinderGeometry(r2 ?? r, r, z1 - z0, seg); g.translate(x, ground(x, y) + (z0 + z1) / 2, -y); (bins[k] ||= []).push(g); };
    // ---- the fronts: a skin over every wall of every block, one mesh per style
    const W = { beige: [[], [], []], white: [[], [], []], old: [[], [], []] };
    D.b.forEach((b, bi) => {
      const P = b.p.slice(); if (P.length > 2 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1]) P.pop();
      let A = 0, cx = 0, cy = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; cx += p[0]; cy += p[1]; } cx /= P.length; cy /= P.length;
      const s = A > 0 ? 1 : -1, g0 = ground(cx, cy), st = b.h >= 12 ? (/^A-/.test(b.n || '') ? 'white' : 'beige') : 'old', [pos, uv, idx] = W[st]; if (bi === 60) return;
      for (let i = 0; i < P.length; i++) {
        const p = P[i], q = P[(i + 1) % P.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 1.2) continue;
        const nx = dy / l * s * 0.09, ny = -dx / l * s * 0.09, n = Math.max(1, Math.round(l / 8)), i0 = pos.length / 3;
        pos.push(p[0] + nx, g0 - 0.3, -(p[1] + ny), q[0] + nx, g0 - 0.3, -(q[1] + ny), q[0] + nx, g0 + b.h + 0.03, -(q[1] + ny), p[0] + nx, g0 + b.h + 0.03, -(p[1] + ny));
        uv.push(0, 0, n, 0, n, 1, 0, 1); idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      }
    });
    for (const st in W) { const [pos, uv, idx] = W[st]; if (!pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: facade(st), side: DS })); m.receiveShadow = true; grp.add(m); }
    // ---- the mosques: dome on a drum, and a minaret with its balcony
    D.m.forEach((m, k) => {
      const big = m.a > 2000, r = big ? 9 : k === 2 ? 6.2 : 5.5, gy = ground(m.x, m.y), col = 0xd9bf86, stone = 0xe3cfa6;
      cyl('stone', stone, m.x, m.y, r * 1.02, m.h, m.h + r * 0.45, r * 1.02, 20);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex(128, 64, (g) => { g.fillStyle = '#d9bf86'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#bfa368'; g.lineWidth = 2; for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) { g.beginPath(); g.arc(x * 16 + (y % 2 ? 8 : 0), y * 16, 9, 0, Math.PI); g.stroke(); } }) }));
      dome.material.map.repeat.set(3, 1); dome.scale.y = 1.18; dome.position.set(m.x, gy + m.h + r * 0.45, -m.y); grp.add(dome);
      cyl('gold', 0xc9a44a, m.x, m.y, 0.12, m.h + r * 1.6, m.h + r * 1.6 + 2.2); { mat('gold', 0xc9a44a); const t = new THREE.TorusGeometry(0.55, 0.09, 6, 14); t.translate(m.x, gy + m.h + r * 1.6 + 2.6, -m.y); bins.gold.push(t); }
      // the minaret stands at the corner of the mosque nearest the road
      const c0 = m.p[0], mx = c0[0] + (m.x - c0[0]) * 0.12, my = c0[1] + (m.y - c0[1]) * 0.12, H = big ? 34 : k === 2 ? 36 : 24;
      if (k === 2) { const P = m.p, wt = tex(256, 320, (g) => { g.fillStyle = '#e3cfa6'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#a8443a'; g.fillRect(0, 296, 256, 24); g.fillStyle = '#d3bd90'; g.fillRect(0, 0, 256, 14); for (const cx of [64, 192]) { g.fillStyle = '#cdb689'; g.beginPath(); g.moveTo(cx - 44, 296); g.lineTo(cx - 44, 150); g.quadraticCurveTo(cx - 44, 70, cx, 50); g.quadraticCurveTo(cx + 44, 70, cx + 44, 150); g.lineTo(cx + 44, 296); g.fill(); g.fillStyle = '#5b4a36'; g.beginPath(); g.moveTo(cx - 26, 296); g.lineTo(cx - 26, 170); g.quadraticCurveTo(cx - 26, 110, cx, 96); g.quadraticCurveTo(cx + 26, 110, cx + 26, 170); g.lineTo(cx + 26, 296); g.fill(); } }), pos = [], uv = [], idx = [];
        let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } const sg = A > 0 ? 1 : -1;
        for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 1) continue; const ox = dy / l * sg * 0.1, oy = -dx / l * sg * 0.1, n = Math.max(1, Math.round(l / 9)), i0 = pos.length / 3; pos.push(p[0] + ox, gy - 0.3, -(p[1] + oy), q[0] + ox, gy - 0.3, -(q[1] + oy), q[0] + ox, gy + m.h + 0.05, -(q[1] + oy), p[0] + ox, gy + m.h + 0.05, -(p[1] + oy)); uv.push(0, 0, n, 0, n, 1, 0, 1); idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3); }
        const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx); bg.computeVertexNormals(); grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ map: wt, side: DS })));
        const sx = m.x - 9, sy = m.y + 4; cyl('stone', stone, sx, sy, 3.1, m.h, m.h + 1.2, 3.1, 16); const d2 = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome.material); d2.scale.y = 1.15; d2.position.set(sx, gy + m.h + 1.2, -sy); grp.add(d2); }
      box('stone', stone, mx, my, 2.6, 2.6, 0, H * 0.45); cyl('stone', stone, mx, my, 1.15, H * 0.45, H * 0.72, 1.05, 8); cyl('stone', stone, mx, my, 1.75, H * 0.72, H * 0.76, 1.75, 8); cyl('stone', stone, mx, my, 0.85, H * 0.76, H * 0.92, 0.8, 8);
      cyl('stone', stone, mx, my, 1.25, H * 0.44, H * 0.47, 1.6, 8); cyl('domeS', col, mx, my, 0.95, H * 0.92, H, 0.1, 10); cyl('gold', 0xc9a44a, mx, my, 0.07, H, H + 1.6);
      for (const [px, py] of [[m.x + r + 4, m.y - r], [m.x - r - 3, m.y + r + 2]]) { cyl('palmt', 0x8a7458, px, py, 0.25, 0, 6.5, 0.2); for (let i = 0; i < 8; i++) { const g = new THREE.BoxGeometry(0.5, 0.08, 3.2); g.translate(0, 0, 1.6); g.rotateX(0.5); g.rotateY(i / 8 * 6.283); g.translate(px, ground(px, py) + 6.5, -py); mat('palml', 0x3f8a3a); (bins.palml ||= []).push(g); } }
    });
    // ---- the streets: yellow centre dashes, lamp posts, the big grey rubbish skips
    const done = new Set(); let n = 0;
    for (const R of D.r) {
      let acc = 3;
      for (let i = 1; i < R.length; i++) {
        const a = R[i - 1], b = R[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue; const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, ang = Math.atan2(uy, ux);
        for (let s = (7 - acc % 7) % 7; s < l; s += 7) {
          const x = a[0] + ux * s, y = a[1] + uy * s, key = Math.round(x / 4) + ',' + Math.round(y / 4); if (done.has(key)) continue; done.add(key); n++;
          box('yellow', 0xe2b53a, x, y, 2.6, 0.15, 0.035, 0.05, ang);
          if (n % 8 === 0) { const lx = x + uy * 5.6, ly = y - ux * 5.6; cyl('pole', 0x9aa0a4, lx, ly, 0.1, 0, 8.5, 0.07); box('pole', 0, lx - uy * 0.9, ly + ux * 0.9, 0.1, 1.9, 8.4, 8.52, ang); box('lampH', 0xe9ecef, lx - uy * 1.7, ly + ux * 1.7, 0.5, 0.5, 8.3, 8.42, ang); }
          if (n % 11 === 5) { const sx = x - uy * 5.0, sy = y + ux * 5.0; box('skip', 0x8f9498, sx, sy, 2.4, 1.3, 0.25, 1.35, ang); box('skipl', 0x7c8185, sx, sy, 2.5, 1.4, 1.35, 1.45, ang); for (const e of [-0.9, 0.9]) cyl('skipw', 0x202224, sx + ux * e, sy + uy * e, 0.13, 0, 0.26); }
        }
        acc += l;
      }
    }
    // ---- the shop strip beside the mosque: one storey, red name boards along the top, a flat canopy over the pavement
    const a = [7107.3, 4003.8], b = [7133.7, 3986.6], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = 0.546, ny = 0.838, cx = 7118.5, cy = 3992.2, ang = Math.atan2(uy, ux);
    box('shopw', 0xefe9da, cx, cy, L, 7.2, 0, 4.6, ang); box('shoproof', 0xd9d3c4, cx, cy, L + 0.4, 7.6, 4.6, 4.8, ang);
    BLOCKS.push({ x: cx, y: cy, fx: ux, fy: uy, hl: L / 2, hw: 3.6, top: 5, R: L / 2 + 4 });
    const front = tex(512, 128, (g) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 4; i++) { g.fillStyle = '#27323a'; g.fillRect(i * 128 + 10, 14, 108, 110); g.fillStyle = '#c9342c'; g.fillRect(i * 128 + 10, 14, 108, 10); g.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 6; k++) g.fillRect(i * 128 + 16 + k * 17, 40 + (k % 3) * 22, 12, 16); g.fillStyle = '#e8c93a'; g.fillRect(i * 128 + 56, 30, 4, 94); } });
    const names = [[['MOHAMMED AL HELO RESTAURANT', 'مطعم محمد الحلو'], '#d6252c', '#ffffff'], [['ABDULLA KUTAIT GROCERY', 'بقالة عبدالله كتيت'], '#d6252c', '#ffe45c'], [['GENTS SALOON', 'صالون رجالي'], '#d6252c', '#ffffff']];
    for (const sd of [1, -1]) {
      const face = Math.atan2(sd * nx, -sd * ny), fx = cx + sd * nx * 3.66, fy = cy + sd * ny * 3.66, gy = ground(fx, fy);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(L - 1, 3.1), new THREE.MeshBasicMaterial({ map: front, toneMapped: false })); gl.position.set(fx, gy + 1.6, -fy); gl.rotation.y = face; grp.add(gl);
      names.forEach((nm, i) => { const t = (i - 1) * sd * (L / 3), x = fx + ux * t + sd * nx * 0.05, y = fy + uy * t + sd * ny * 0.05, pl = new THREE.Mesh(new THREE.PlaneGeometry(L / 3 - 0.4, 1.35), new THREE.MeshBasicMaterial({ map: plate(nm[0], nm[1], nm[2]), toneMapped: false })); pl.position.set(x, gy + 3.85, -y); pl.rotation.y = face; grp.add(pl); });
      box('shoproof', 0, cx + sd * nx * 5.0, cy + sd * ny * 5.0, L, 2.7, 3.05, 3.17, ang);
      for (const t of [-L / 2 + 0.5, -L / 6, L / 6, L / 2 - 0.5]) cyl('pole', 0x9aa0a4, cx + ux * t + sd * nx * 6.2, cy + uy * t + sd * ny * 6.2, 0.06, 0, 3.05);
    }
    for (const k in bins) { const m = new THREE.Mesh(mergeGeometries(bins[k]), M[k]); m.castShadow = true; m.receiveShadow = true; grp.add(m); for (const g of bins[k]) g.dispose(); }
    this.scene.add(grp);
  }
  // parked cars along the kerbs, as in the photographs (any of them can be taken)
  park() {
    const g = this.g, kinds = ['sentra', 'tiida', 'yaris', 'lexus', 'patrol', 'sentra', 'landcruiser', 'tiida', 'yaris', 'sentra', 'sorento', 'lexus', 'tiida', 'patrol']; this.cars = []; let k = 0;
    const put = (kind, x, y, h) => { plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(kind); } finally { plateOpt.dubaiOnly = false; } const gy = ground(x, y), car = { mesh, parked: true, x, y, h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200, x0: x, y0: y }; mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(h); this.scene.add(mesh); g.traffic.cars.push(car); this.cars.push(car); };
    { const ux = 0.838, uy = -0.546, nx = 0.546, ny = 0.838, h0 = Math.atan2(nx, ny); ['yaris', 'sentra', 'tiida', 'lexus', 'sentra'].forEach((kd, i) => put(kd, 7118.5 + ux * (i - 2) * 3.1 - nx * 11.5, 3992.2 + uy * (i - 2) * 3.1 - ny * 11.5, h0)); ['tiida', 'yaris', 'patrol', 'sentra'].forEach((kd, i) => put(kd, 7050 + i * 3.2, 3948 - i * 0.6, 0.2)); }
    for (let ri = 0; ri < this.data.r.length && k < kinds.length; ri += 4) {
      const R = this.data.r[ri], i = Math.floor(R.length / 2), a = R[i - 1], b = R[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, x = (a[0] + b[0]) / 2 + uy * 4.9, y = (a[1] + b[1]) / 2 - ux * 4.9, h = Math.atan2(ux, uy);
      if (g.tiles && g.tiles.collide && g.tiles.collide(x, y, 1.2).hit) continue;
      plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(kinds[k++]); } finally { plateOpt.dubaiOnly = false; }
      const gy = ground(x, y), car = { mesh, parked: true, x, y, h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200, x0: x, y0: y };
      mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(h); this.scene.add(mesh); g.traffic.cars.push(car); this.cars.push(car);
    }
  }
  unpark() { const g = this.g; for (const c of this.cars || []) if (!c.dead && Math.hypot(c.x - c.x0, c.y - c.y0) < 2) { this.scene.remove(c.mesh); const i = g.traffic.cars.indexOf(c); if (i >= 0) g.traffic.cars.splice(i, 1); } this.cars = null; }
  update(dt, px, py) {
    if ((this.t -= dt) > 0) return; this.t = 1; if (!this.data) return;
    const d = Math.hypot(C.x - px, C.y - py);
    if (d < 900 && !this.grp) this.build();
    if (d < 620 && !this.cars && this.g.traffic && this.g.traffic.pieces && this.g.traffic.pieces.length) this.park();
    if (d > 1000 && this.cars) this.unpark();
  }
}

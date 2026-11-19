// Dubai City Stories: 27C Street in Al Garhoud and the way out to 31A Street, dressed from photographs of the real streets.
// From the villa: the old beige villas with slatted gates and big trees on the north side; the row of white modern
// townhouses behind their white wall, brown doors and red brick parking on the south side; the bend with the red-roofed
// villa and its gold gates; the site fence and scaffold going north; the brick island at 31A Street; and 31A Street west
// with its parking bays, lamp posts, phone mast, shade canopy and the shop signs down to Eat & Drink.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { ground } from './terrain.js?v=11190630';
import { HIDE_BLD } from './tiles.js?v=11190630';
import { BLOCKS } from './stagekit.js?v=11190630';
import { makeCar } from './actors.js?v=11190630';
import { plateOpt } from './cars3d.js?v=11190630';
import { TYRE_Y, rotY } from './player.js?v=11190630';

// the map's plain blocks on the south side of 27C Street and at the bend: the townhouses and the red-roofed villa stand there
for (let x = 1090; x <= 1210; x += 10) HIDE_BLD.push([x, -184, 13.5, 0]);
HIDE_BLD.push([1073, -147, 11, 0], [1069, -165, 6, 0]);
const C = { x: 1000, y: -95 }, DS = THREE.DoubleSide;
const y27 = x => -160.5 + (x - 1118.7) * 0.03385;                       // the middle of 27C Street
const y31 = x => x >= 1000 ? -30.6 + (x - 1000) * 0.0356 : x >= 843 ? -35.3 + (x - 843.1) * 0.03 : -36.2 + (x - 815) * 0.031;   // and of 31A Street
function tex(w, h, draw, rx = 1, ry = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }
const brick = (a, b, c) => tex(128, 128, (g) => { g.fillStyle = c; g.fillRect(0, 0, 128, 128); let r = 5; for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { r = (r * 73 + 11) % 97; g.fillStyle = r % 3 ? a : b; g.fillRect(x * 32 + (y % 2 ? 16 : 0) + 1, y * 16 + 1, 30, 14); } });
function plate(lines, bg, fg, w = 512, h = 128, border) { return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); } g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((t, i) => { let fs = Math.min(h / lines.length * 0.72, 90); g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(t).width > w - 36 && fs > 14) { fs -= 2; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; } g.fillText(t, w / 2, h * (i + 0.5) / lines.length + 2); }); }); }

export class Garhoud {
  constructor(game, scene) { this.g = game; this.scene = scene; this.grp = null; this.t = 0; this.cars = null; this.blocked = false; }
  build() {
    const grp = this.grp = new THREE.Group(), bins = {}, self = this;
    const M = {}, mat = (k, c) => M[k] ||= new THREE.MeshLambertMaterial({ color: c });
    // a box given by its corners on the map and its height above the ground there; boxes of one colour become one mesh
    const box = (k, col, x0, x1, y0, y1, z0, z1, g0) => { mat(k, col); const g = new THREE.BoxGeometry(Math.abs(x1 - x0), z1 - z0, Math.abs(y1 - y0)); const gy = g0 ?? ground((x0 + x1) / 2, (y0 + y1) / 2); g.translate((x0 + x1) / 2, gy + (z0 + z1) / 2, -(y0 + y1) / 2); (bins[k] ||= []).push(g); };
    const cyl = (k, col, x, y, r, z0, z1, r2) => { mat(k, col); const g = new THREE.CylinderGeometry(r2 ?? r, r, z1 - z0, 8); g.translate(x, ground(x, y) + (z0 + z1) / 2, -y); (bins[k] ||= []).push(g); };
    const ball = (k, col, x, y, z, r, sy = 1) => { mat(k, col); const g = new THREE.SphereGeometry(r, 7, 5); g.scale(1, sy, 1); g.translate(x, ground(x, y) + z, -y); (bins[k] ||= []).push(g); };
    // a flat panel standing on the map: middle x,y, facing angle (0 = faces south, PI/2 = faces west...), width, height, bottom
    const panel = (m, x, y, face, w, h, z0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, ground(x, y) + z0 + h / 2, -y); p.rotation.y = face; grp.add(p); return p; };
    // paving laid on the ground
    const pave = (t, x0, x1, y0, y1, tile = 2.4, lift = 0.05) => { const m = new THREE.MeshLambertMaterial({ map: t.clone() }); m.map.repeat.set(Math.abs(x1 - x0) / tile, Math.abs(y1 - y0) / tile); m.map.needsUpdate = true; const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0)), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, ground((x0 + x1) / 2, (y0 + y1) / 2) + lift, -(y0 + y1) / 2); p.receiveShadow = true; grp.add(p); };
    const tree = (x, y, h = 6.5, r = 2.6) => { cyl('trunk', 0x6e5a44, x, y, 0.22, 0, h * 0.55, 0.14); for (const [ox, oy, oz, k] of [[0, 0, 0.8, 1], [1.1, 0.5, 0.62, 0.72], [-1.0, -0.6, 0.66, 0.78], [0.3, -1.1, 0.72, 0.66], [-0.4, 1.0, 0.9, 0.6]]) ball('leaf', 0x4f9140, x + ox * r * 0.55, y + oy * r * 0.55, h * oz, r * k, 0.85); };
    const palm = (x, y, h = 7.5) => { cyl('palmt', 0x8a7458, x, y, 0.26, 0, h, 0.2); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, g = new THREE.BoxGeometry(0.5, 0.08, 3.4); g.translate(0, 0, 1.7); g.rotateX(0.5); g.rotateY(a); g.translate(x, ground(x, y) + h, -y); mat('palml', 0x3f8a3a); (bins.palml ||= []).push(g); } };
    const lamp = (x, y, ax, ay) => { cyl('pole', 0x9aa0a4, x, y, 0.11, 0, 9, 0.08); box('pole', 0, x + Math.min(0, ax * 1.8), x + Math.max(0.12, ax * 1.8), y + Math.min(0, ay * 1.8), y + Math.max(0.12, ay * 1.8), 8.9, 9.02); box('lampH', 0xe9ecef, x + ax * 1.5 - 0.25, x + ax * 1.5 + 0.25, y + ay * 1.5 - 0.25, y + ay * 1.5 + 0.25, 8.78, 8.9); };
    const bin = (x, y) => { box('bin', 0x3a3d40, x - 0.3, x + 0.3, y - 0.35, y + 0.35, 0, 1.0); box('binl', 0x2a2c2e, x - 0.33, x + 0.33, y - 0.38, y + 0.38, 1.0, 1.08); };
    const dash = (x0, x1, yf, step = 6, len = 2.4) => { for (let x = x0; x < x1; x += step) box('yellow', 0xe2b53a, x, x + len, yf(x) - 0.07, yf(x) + 0.07, 0.035, 0.05); };
    const signPost = (x, y, lines, face, bg = '#f2f2f0', fg = '#1a1a1a') => { cyl('pole', 0x9aa0a4, x, y, 0.04, 0, 2.7); const m = new THREE.MeshBasicMaterial({ map: plate(lines, bg, fg, 256, 96, '#1a1a1a'), side: DS, toneMapped: false }); panel(m, x, y, face, 0.95, 0.36, 2.25); };

    // ============ 27C Street ============
    const redPave = brick('#8f4038', '#7d352f', '#5e2a26'), hexPave = brick('#a66a5c', '#96594d', '#70463e'), tanPave = brick('#b9a58c', '#ad9a82', '#8f8069');
    dash(1121, 1222, y27);
    // ---- south side: the row of white modern townhouses behind a white wall, brown doors, red brick parking in front
    pave(redPave, 1109, 1208, -164.3, -169.3); box('kerb', 0xb8b6b0, 1109, 1208, -164.3, -164.1, 0, 0.12);
    box('white', 0xeeece6, 1108.6, 1208, -169.3, -169.6, 0, 2.35); box('white', 0, 1108.6, 1208, -169.25, -169.65, 2.35, 2.5);
    const face = tex(512, 420, (g, w, h) => {                 // one townhouse front: 9.8 m wide, 8.2 m tall
      const X = m => m / 9.8 * w, Y = m => h - m / 8.2 * h; g.fillStyle = '#ecebe5'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; for (const m of [3.3, 6.5]) { g.beginPath(); g.moveTo(0, Y(m)); g.lineTo(w, Y(m)); g.stroke(); } for (const m of [4.9]) { g.beginPath(); g.moveTo(X(m), 0); g.lineTo(X(m), h); g.stroke(); }
      for (const bx of [1.0, 5.7]) {
        g.fillStyle = '#5b3a2c'; g.fillRect(X(bx), Y(7.3), X(3.1), Y(0.6) - Y(7.3)); g.strokeStyle = '#4a2e22'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(X(bx) + i * 3 + 2, Y(7.3)); g.lineTo(X(bx) + i * 3 + 2, Y(0.6)); g.stroke(); g.beginPath(); g.moveTo(X(bx + 3.1) - i * 3 - 2, Y(7.3)); g.lineTo(X(bx + 3.1) - i * 3 - 2, Y(0.6)); g.stroke(); }
        for (const [a, b] of [[4.7, 7.2], [1.0, 3.4]]) { g.fillStyle = '#1d2733'; g.fillRect(X(bx + 0.5), Y(b), X(2.1), Y(a) - Y(b)); const gl = g.createLinearGradient(0, Y(b), 0, Y(a)); gl.addColorStop(0, '#5d7f9c'); gl.addColorStop(1, '#2e4458'); g.fillStyle = gl; g.fillRect(X(bx + 0.58), Y(b) + 4, X(1.94), Y(a) - Y(b) - 8); g.fillStyle = '#1d2733'; g.fillRect(X(bx + 1.52), Y(b), 4, Y(a) - Y(b)); g.fillRect(X(bx + 0.5), (Y(a) + Y(b)) / 2 - 2, X(2.1), 4); }
        g.fillStyle = '#e4e2db'; g.fillRect(X(bx + 0.45), Y(4.65), X(2.2), Y(3.45) - Y(4.65));
      }
      g.fillStyle = '#dcdad3'; g.fillRect(0, 0, w, 7);
    });
    const faceM = new THREE.MeshLambertMaterial({ map: face });
    for (let i = 0, x = 1088; x + 9.8 <= 1208; x += 9.8, i++) {
      const fwd = i % 2 ? 0 : 1.1, top = i % 2 ? 7.6 : 8.2, yN = -173.4 + fwd;
      box('white', 0, x, x + 9.8, yN, -188.5, 0, top); panel(faceM, x + 4.9, yN + 0.03, Math.PI, 9.8, top, 0).scale.x = -1;
      // the door in the wall, its number, a parking sign and a bin
      const dx = x + (i % 2 ? 2.2 : 7.4);
      if (x > 1108) { box('door', 0x5b3a2c, dx - 0.55, dx + 0.55, -169.22, -169.3, 0, 2.15); box('meter', 0x2b2d30, dx + 1.3, dx + 1.48, -169.22, -169.3, 1.2, 1.5); if (i % 3 === 0) bin(dx - 1.5, -168.7); if (i % 2) panel(new THREE.MeshBasicMaterial({ map: plate(['P'], '#2a3f9d', '#ffffff', 96, 128, '#ffffff'), toneMapped: false }), dx - 2.6, -169.2, Math.PI, 0.45, 0.6, 1.45); panel(new THREE.MeshBasicMaterial({ map: plate([String(i).padStart(2, '0')], '#eeece6', '#222222', 96, 64), toneMapped: false }), dx + 0.9, -169.2, Math.PI, 0.36, 0.24, 1.95); }
    }
    BLOCKS.push({ x: 1148, y: -181, fx: 1, fy: 0, hl: 60, hw: 8, top: 60, R: 61 }, { x: 1158, y: -169.45, fx: 1, fy: 0, hl: 49.7, hw: 0.25, top: 60, R: 50 });
    lamp(1128, -164.9, 0, 1); lamp(1186, -164.9, 0, 1);
    // ---- north side: the old beige villas. Low white walls, beige slatted gates in black frames, wheelie bins, big shady trees
    const slat = tex(128, 128, (g) => { g.fillStyle = '#17181a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#b79a6c'; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 3, 10, 11, 108); g.fillStyle = '#17181a'; g.fillRect(0, 60, 128, 5); });
    const gateM = (w) => { const m = new THREE.MeshLambertMaterial({ map: slat.clone(), side: DS }); m.map.repeat.set(w / 1.6, 1); m.map.needsUpdate = true; return m; };
    for (const [x0, x1] of [[1111, 1130.5], [1159, 1180], [1184, 1205]]) {
      const gx = x0 + 6.5; box('cream', 0xe9e2d0, x0, gx - 0.3, -148.6, -148.85, 0, 1.5); box('cream', 0, gx + 7.5, x1, -148.6, -148.85, 0, 1.5);
      for (const px of [gx - 0.3, gx + 3.6, gx + 7.5]) box('cream', 0, px - 0.25, px + 0.25, -148.5, -148.95, 0, 2.05);
      panel(gateM(3.4), gx + 1.65, -148.72, 0, 3.4, 1.75, 0.08); panel(gateM(3.4), gx + 5.55, -148.72, 0, 3.4, 1.75, 0.08);
      bin(gx - 1.4, -149.6); bin(gx + 8.6, -149.6); pave(tanPave, x0, x1, -149, -156.3, 2.4, 0.04);
    }
    tree(1132.6, -150.2, 7.2, 3.0); tree(1157.2, -149.8, 7.6, 3.2); tree(1182, -150.4, 6.4, 2.6); tree(1109.5, -151.5, 6, 2.4);
    // a traffic cone by the parked cars, as in the photo
    cyl('cone', 0xe8632a, 1147.6, -153.2, 0.2, 0, 0.6, 0.04); box('cone', 0, 1147.35, 1147.85, -153.45, -152.95, 0, 0.04);

    // ============ the bend, and north to 29C Street ============
    signPost(1108.4, -165.6, ['27C  شارع'], Math.PI * 0.75);
    // the red-roofed villa on the outside of the bend: white walls, clay-tile roofs, balconies, gold wrought-iron gates
    const tile = tex(64, 64, (g) => { g.fillStyle = '#b9523f'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c96450' : '#a94836'; g.beginPath(); g.ellipse(x * 16 + 8, y * 16 + 12, 8, 9, 0, Math.PI, 0); g.fill(); } }), tileM = (w) => { const m = new THREE.MeshLambertMaterial({ map: tile.clone(), side: DS }); m.map.repeat.set(w / 1.2, 2); m.map.needsUpdate = true; return m; };
    box('white', 0, 1062, 1081.5, -137, -158, 0, 7.4); box('white', 0, 1066, 1078, -141, -154, 7.4, 8.6);
    const villaF = tex(512, 256, (g, w, h) => { g.fillStyle = '#f1efe9'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { const x = 30 + i * 122; g.fillStyle = '#35424f'; g.fillRect(x, 28, 86, 70); g.fillRect(x + 8, 160, 70, 66); g.fillStyle = '#f7f6f2'; g.fillRect(x + 41, 28, 4, 70); g.fillRect(x, 60, 86, 4); g.fillRect(x - 8, 98, 102, 26); g.fillStyle = '#c9c7c0'; for (let k = 0; k < 9; k++) g.fillRect(x - 6 + k * 11.5, 101, 5, 20); } });
    panel(new THREE.MeshLambertMaterial({ map: villaF }), 1081.56, -147.5, Math.PI / 2, 21, 7.4, 0);
    const roofBand = (z, out, yc, len) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.9), tileM(len)); p.position.set(1081.5 + out, ground(1081, yc) + z, -yc); p.rotation.order = 'YXZ'; p.rotation.y = Math.PI / 2; p.rotation.x = -1.05; grp.add(p); };
    roofBand(3.65, 0.8, -147.5, 21.6); roofBand(7.5, 0.7, -147.5, 22); roofBand(2.9, 1.7, -141.6, 4.2);
    box('white', 0, 1086.3, 1086.6, -134, -146.2, 0, 2.2); box('white', 0, 1086.3, 1086.6, -151.6, -168.5, 0, 2.2); for (const py of [-146.4, -151.4]) box('white', 0, 1086.1, 1086.8, py - 0.35, py + 0.35, 0, 3.1);
    const ornate = tex(256, 256, (g) => { g.fillStyle = '#141414'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#c9a44a'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16, 256); g.stroke(); } g.lineWidth = 4; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 64 + 32, y * 64 + 32, 22, 0, 7); g.stroke(); g.beginPath(); g.arc(x * 64 + 32, y * 64 + 32, 10, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x * 64, y * 64 + 32); g.quadraticCurveTo(x * 64 + 32, y * 64 - 6, x * 64 + 64, y * 64 + 32); g.stroke(); } g.strokeStyle = '#e0bf66'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); });
    panel(new THREE.MeshLambertMaterial({ map: ornate, side: DS }), 1086.45, -148.9, Math.PI / 2, 4.4, 2.9, 0.05);
    pave(hexPave, 1086.7, 1094.6, -133, -168.5, 2.0); bin(1087.4, -152.6);
    BLOCKS.push({ x: 1071.7, y: -147.5, fx: 1, fy: 0, hl: 9.8, hw: 10.5, top: 60, R: 15 });
    // the corner villa's side wall, and the lamp post on the bend
    box('cream', 0, 1108.3, 1108.6, -126, -148.4, 0, 1.8); lamp(1094.6, -131, 1, 0); tree(1107, -134, 6.5, 2.6);
    // going north: a salmon wall and parked cars on the left, the building site's white fence and scaffold on the right
    for (let y = -146; y < -86; y += 6) box('yellow', 0xe2b53a, 1097.22 - (y + 85) * 0.035, 1097.37 - (y + 85) * 0.035, y, y + 2.4, 0.035, 0.05);
    box('salmon', 0xd9b5a2, 1090.9, 1091.2, -92, -131, 0, 2.0); pave(redPave, 1091.3, 1094.8, -92, -131);
    const hoard = tex(64, 64, (g) => { g.fillStyle = '#e7e9ea'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#cfd3d5'; for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 2.5, 64); g.fillStyle = '#b9bdbf'; g.fillRect(0, 0, 64, 3); }), hm = new THREE.MeshLambertMaterial({ map: hoard, side: DS }); hoard.repeat.set(26, 1);
    panel(hm, 1103.9, -107, -Math.PI / 2, 38, 2.5, 0);
    for (let z = 0; z < 12; z += 2) { box('scaf', 0x9c6b4a, 1106, 1109, -94.2, -91, z + 1.9, z + 2.0); for (const [sx, sy] of [[1106, -94.2], [1109, -94.2], [1106, -91], [1109, -91]]) box('steel', 0xa9adb0, sx - 0.05, sx + 0.05, sy - 0.05, sy + 0.05, z, z + 2); }
    lamp(1094.4, -100, 1, 0);
    // 29C Street corner and up 28C Street: palms on the villa side, a wall with potted plants opposite
    for (const [px, py] of [[1103.6, -72], [1104.8, -63], [1103.4, -54], [1106.5, -46]]) palm(px, py, 7 + (px % 2));
    box('cream', 0, 1089.6, 1089.9, -42, -74, 0, 1.9); for (let y = -72; y < -44; y += 3.2) { cyl('pot', 0x8f5a3c, 1090.7, y, 0.28, 0, 0.5, 0.36); ball('leaf', 0x4f9140, 1090.7, y, 0.95, 0.5); }
    for (let y = -76; y < -36; y += 6) box('yellow', 0, 1096.5, 1096.65, y, y + 2.4, 0.035, 0.05);
    // the little brick island at 31A Street with its sign, and the stop sign
    box('kerbs', 0xcfcfca, 1094.0, 1095.3, -36.6, -32.2, 0, 0.22); box('islandb', 0xa8584c, 1094.15, 1095.15, -36.4, -32.4, 0.22, 0.25); signPost(1094.65, -33.6, ['31A St'], 0, '#1f5fa8', '#ffffff');
    cyl('pole', 0, 1101.6, -37.5, 0.04, 0, 2.4); { const m = new THREE.MeshBasicMaterial({ map: tex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.fillStyle = '#c8202c'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * 6.283; g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); } g.fill(); g.fillStyle = '#fff'; g.font = '800 34px Arial'; g.textAlign = 'center'; g.fillText('STOP', 64, 62); g.font = '800 26px Arial'; g.fillText('قف', 64, 94); }), transparent: true, alphaTest: 0.5, side: DS, toneMapped: false }); panel(m, 1101.6, -37.5, Math.PI, 0.7, 0.7, 1.85); }

    // ============ 31A Street, west to Eat & Drink ============
    dash(742, 1088, y31, 7, 3);
    const bay = (x0, x1, side) => { for (let x = x0; x <= x1; x += 2.6) box('line', 0xe8e8e4, x - 0.06, x + 0.06, y31(x) + side * 4.2, y31(x) + side * 9.2, 0.035, 0.05); box('line', 0, x0, x1, y31((x0 + x1) / 2) + side * 4.14, y31((x0 + x1) / 2) + side * 4.26, 0.035, 0.05); pave(tanPave, x0 - 1, x1 + 1, y31((x0 + x1) / 2) + side * 9.3, y31((x0 + x1) / 2) + side * 11.6, 2.4, 0.04); };
    bay(1034, 1078, 1); bay(932, 992, 1); bay(846, 904, 1); bay(1004, 1060, -1); bay(884, 930, -1); bay(742, 786, 1);
    for (let x = 1070; x > 745; x -= 46) lamp(x, y31(x) + 9.8, 0, -1);
    // the phone mast, and the long beige shade canopy over a row of parked cars
    cyl('mast', 0xc9cdd0, 936, y31(936) + 13, 0.45, 0, 27, 0.22); for (const z of [22, 24.5, 26.5]) for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; box('ant', 0xe9ebec, 936 + Math.cos(a) * 0.7 - 0.12, 936 + Math.cos(a) * 0.7 + 0.12, y31(936) + 13 + Math.sin(a) * 0.7 - 0.12, y31(936) + 13 + Math.sin(a) * 0.7 + 0.12, z, z + 1.8); }
    { const cx = 890, cy = y31(890) + 7, g = new THREE.CylinderGeometry(3.4, 3.4, 22, 14, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(0); g.scale(1, 0.42, 1); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xd8c3a0, side: DS })); m.rotation.x = -Math.PI / 2; m.rotation.order = 'YXZ'; m.position.set(cx, ground(cx, cy) + 2.4, -cy); grp.add(m); for (const px of [-10, 0, 10]) for (const py of [-3.2, 3.2]) cyl('pole', 0, cx + px, cy + py, 0.07, 0, 2.5); }
    // the shop signs near 20C Street and beyond: One Day Market, Century Express, Choithrams, Balsam Pharmacy, Eat & Drink
    const shop = (x, w, lines, bg, fg) => { const y = y31(x) + 12.2; box('fascia', 0x3a3a3a, x - w / 2 - 0.15, x + w / 2 + 0.15, y, y + 0.2, 3.0, 4.5); panel(new THREE.MeshBasicMaterial({ map: plate(lines, bg, fg, 512, 128), toneMapped: false }), x, y - 0.03, 0, w, 1.3, 3.1); };
    shop(828, 13, ['One Day Market'], '#1f8a3b', '#ffffff'); shop(812, 9, ['one day  ·  Day to Day'], '#c62828', '#fff36b');
    shop(774, 9, ['Century Express'], '#101010', '#ffcf33'); shop(759, 10, ['Choithrams'], '#0f6b3a', '#ffffff'); shop(748, 7, ['Balsam Pharmacy'], '#ffffff', '#0a8f6a'); shop(736.5, 11, ['EAT & DRINK', 'Restaurant'], '#b3131b', '#ffe45c');
    signPost(797.5, y31(797) + 5.2, ['20C St'], 0, '#1f5fa8', '#ffffff');

    for (const k in bins) { const m = new THREE.Mesh(mergeGeometries(bins[k]), M[k]); m.castShadow = true; m.receiveShadow = true; grp.add(m); for (const g of bins[k]) g.dispose(); }
    this.scene.add(grp);
  }
  // cars parked the way they are in the photographs (you can take any of them)
  park() {
    const g = this.g; this.cars = [];
    const L = [['landcruiser', 1178, -166.6, Math.PI / 2], ['patrol', 1150, -166.7, Math.PI / 2], ['lexus', 1160.5, -154.3, 0], ['jeep', 1090.6, -155.5, -2.2], ['sentra', 1093.1, -118, 0], ['yaris', 1093.1, -110, 0], ['tiida', 1091.6, -58, 0.05],
      ['lexus', 1046, y31(1046) + 6.6, 0], ['patrol', 1051.2, y31(1051) + 6.6, 0], ['sentra', 962, y31(962) + 6.6, 0], ['landcruiser', 967.2, y31(967) + 6.6, 0], ['yaris', 1020, y31(1020) - 6.6, Math.PI], ['tiida', 895, y31(895) - 6.6, Math.PI], ['sorento', 760, y31(760) + 6.6, 0], ['patrol', 752.2, y31(752) + 6.6, 0]];
    for (const [k, x, y, h] of L) {
      plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(k); } finally { plateOpt.dubaiOnly = false; }
      const gy = ground(x, y), car = { mesh, parked: true, x, y, h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200, x0: x, y0: y };
      mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(h); this.scene.add(mesh); g.traffic.cars.push(car); this.cars.push(car);
    }
  }
  unpark() { const g = this.g; for (const c of this.cars || []) if (!c.dead && Math.hypot(c.x - c.x0, c.y - c.y0) < 2) { this.scene.remove(c.mesh); const i = g.traffic.cars.indexOf(c); if (i >= 0) g.traffic.cars.splice(i, 1); } this.cars = null; }
  update(dt, px, py) {
    if ((this.t -= dt) > 0) return; this.t = 1;
    const d = Math.hypot(C.x - px, C.y - py);
    if (d < 620 && !this.grp) this.build();
    if (d < 480 && !this.cars && this.g.traffic && this.g.traffic.pieces && this.g.traffic.pieces.length) this.park();
    if (d > 800 && this.cars) this.unpark();
  }
}

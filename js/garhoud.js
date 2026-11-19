// Dubai City Stories: 27C Street in Al Garhoud and the way out to 31A Street, dressed from photographs of the real streets.
// From the villa: the old beige villas with slatted gates and big trees on the north side; the row of white modern
// townhouses behind their white wall, brown doors and red brick parking on the south side; the bend with the red-roofed
// villa and its gold gates; the site fence and scaffold going north; the brick island at 31A Street; and 31A Street west
// with its parking bays, lamp posts, phone mast, shade canopy and the shop signs down to Eat & Drink.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { ground } from './terrain.js?v=11190752';
import { HIDE_BLD } from './tiles.js?v=11190752';
import { BLOCKS } from './stagekit.js?v=11190752';
import { makeCar } from './actors.js?v=11190752';
import { plateOpt } from './cars3d.js?v=11190752';
import { TYRE_Y, rotY } from './player.js?v=11190752';
import { Character } from './rig.js?v=11190752';
import { standY } from './tiles.js?v=11190752';
import { toast } from './hud.js?v=11190752';

// the map's plain blocks on the south side of 27C Street and at the bend: the townhouses and the red-roofed villa stand there
for (let x = 1090; x <= 1210; x += 10) HIDE_BLD.push([x, -184, 13.5, 0]);
HIDE_BLD.push([1073, -147, 11, 0], [1069, -165, 6, 0]);
// on 31A Street: the Eat & Drink block, the Emirates Co-operative Society and Al Kabayel Centre are built by hand
HIDE_BLD.push([759.2, -11.2, 5, 0], [688.5, -10.8, 5, 0], [593.5, -15, 5, 0]);
const C = { x: 900, y: -80 }, DS = THREE.DoubleSide;
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
    cyl('cone', 0xe8632a, 1148.6, -152.4, 0.2, 0, 0.6, 0.04); box('cone', 0, 1148.35, 1148.85, -152.65, -152.15, 0, 0.04);

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
    bay(1034, 1078, 1); bay(932, 992, 1); bay(846, 904, 1); bay(1004, 1060, -1); bay(884, 930, -1);
    for (let x = 1070; x > 745; x -= 46) lamp(x, y31(x) + 9.8, 0, -1);
    // the phone mast, and the long beige shade canopy over a row of parked cars
    cyl('mast', 0xc9cdd0, 936, y31(936) + 13, 0.45, 0, 27, 0.22); for (const z of [22, 24.5, 26.5]) for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; box('ant', 0xe9ebec, 936 + Math.cos(a) * 0.7 - 0.12, 936 + Math.cos(a) * 0.7 + 0.12, y31(936) + 13 + Math.sin(a) * 0.7 - 0.12, y31(936) + 13 + Math.sin(a) * 0.7 + 0.12, z, z + 1.8); }
    { const cx = 890, cy = y31(890) + 7, g = new THREE.CylinderGeometry(3.4, 3.4, 22, 14, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(0); g.scale(1, 0.42, 1); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xd8c3a0, side: DS })); m.rotation.x = -Math.PI / 2; m.rotation.order = 'YXZ'; m.position.set(cx, ground(cx, cy) + 2.4, -cy); grp.add(m); for (const px of [-10, 0, 10]) for (const py of [-3.2, 3.2]) cyl('pole', 0, cx + px, cy + py, 0.07, 0, 2.5); }
    signPost(797.5, y31(797) + 5.2, ['20C St'], 0, '#1f5fa8', '#ffffff');
    this.shops({ grp, box, cyl, ball, panel, pave, mat, bins, tanPave });

    for (const k in bins) { const m = new THREE.Mesh(mergeGeometries(bins[k]), M[k]); m.castShadow = true; m.receiveShadow = true; grp.add(m); for (const g of bins[k]) g.dispose(); }
    this.scene.add(grp);
  }
  // ---- 31A Street west of 20C Street, from photographs: the Eat & Drink block with its terrace, the Co-op and Al Kabayel Centre
  shops({ grp, box, cyl, ball, panel, pave, tanPave }) {
    const greyPave = brick('#a9a7a2', '#9c9a95', '#7f7d79');
    const front = (w, h, pxm, draw) => new THREE.MeshLambertMaterial({ map: tex(Math.round(w * pxm), Math.round(h * pxm), (g, W, H) => draw(g, m => m * pxm, m => H - m * pxm, W, H)) });
    const roofText = (text, col, x, y, z, w, h) => { const t = tex(1024, 96, (g) => { g.clearRect(0, 0, 1024, 96); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 82; g.font = `900 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(text).width > 1000 && fs > 20) { fs -= 2; g.font = `900 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; } g.fillText(text, 512, 50); }); panel(new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, side: DS, toneMapped: false }), x, y, 0, w, h, z); for (const e of [-0.45, 0, 0.45]) box('steel', 0xa9adb0, x + e * w - 0.05, x + e * w + 0.05, y + 0.05, y + 0.9, z - 0.1, z + h * 0.6); };
    const txt = (g, t, x, y, px, col, font = '800') => { g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${font} ${px}px "Segoe UI", Roboto, Arial, sans-serif`; g.fillText(t, x, y); };

    // ======== the Eat & Drink block (x 735..772, wall at y -24): white panels, red pillars, red and green name boards
    box('white', 0xeeece6, 735, 777, -24, 4, 0, 8); box('white', 0, 735, 740, -24.6, -19, 0, 10.6); box('white', 0, 734.6, 740.4, -25, -18.6, 10.6, 11.5);
    panel(front(37, 8, 36, (g, X, Y, W, H) => {
      g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; for (let m = 0; m < 37; m += 2.4) { g.beginPath(); g.moveTo(X(m), 0); g.lineTo(X(m), Y(4.4)); g.stroke(); }
      g.fillStyle = '#7f95a6'; g.fillRect(X(6), Y(6.7), X(31), Y(4.9) - Y(6.7)); g.fillStyle = '#e9e7e1'; for (let m = 6; m < 37; m += 2.2) g.fillRect(X(m), Y(6.7), 5, Y(4.9) - Y(6.7));
      g.fillStyle = '#20252b'; g.fillRect(X(5), Y(3.1), X(32), Y(0) - Y(3.1)); g.fillStyle = '#39424b'; for (let m = 5.3; m < 37; m += 2.6) g.fillRect(X(m), Y(2.9), X(2.3), Y(0.2) - Y(2.9)); g.fillStyle = 'rgba(255,220,150,.25)'; g.fillRect(X(5), Y(2.9), X(13), Y(0.9) - Y(2.9));
      g.fillStyle = '#e2433f'; for (const m of [6.2, 12.6, 19.6]) g.fillRect(X(m), 0, X(0.95), Y(4.4)); g.fillRect(X(5), Y(4.6), X(32), Y(4.4) - Y(4.6));
      // name boards: red in English, green in Arabic, then the pharmacy and the supermarket
      g.fillStyle = '#d8403c'; g.fillRect(X(5), Y(4.4), X(8.6), Y(3.1) - Y(4.4)); txt(g, 'Eat & Drink', X(9.2), Y(3.86), 34, '#fff3d6', 'italic 800'); txt(g, 'RESTAURANT', X(9.2), Y(3.32), 12, '#fff3d6');
      g.fillStyle = '#1f7a4a'; g.fillRect(X(14.4), Y(4.4), X(10.2), Y(3.1) - Y(4.4)); txt(g, 'مطعم كل واشرب', X(19.6), Y(3.75), 36, '#f3e6c0');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(14), Y(3.75), 24, 0, 7); g.fill(); g.strokeStyle = '#d8403c'; g.lineWidth = 5; g.beginPath(); g.arc(X(14), Y(3.75), 21, 0, 7); g.stroke(); txt(g, 'E&D', X(14), Y(3.75), 15, '#d8403c');
      g.fillStyle = '#ffffff'; g.fillRect(X(24.8), Y(4.4), X(5.4), Y(3.1) - Y(4.4)); txt(g, 'Balsam Pharmacy', X(27.5), Y(3.95), 18, '#0a8f6a'); txt(g, 'صيدلية بلسم', X(27.5), Y(3.45), 18, '#c62828');
      g.fillStyle = '#0f6b3a'; g.fillRect(X(30.4), Y(4.4), X(6.6), Y(3.1) - Y(4.4)); txt(g, 'Choithrams', X(33.7), Y(3.75), 26, '#ffffff');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(22.6), Y(6.5), 30, 0, 7); g.fill(); g.strokeStyle = '#c9a44a'; g.lineWidth = 5; g.beginPath(); g.arc(X(22.6), Y(6.5), 28, 0, 7); g.stroke(); txt(g, 'E&D', X(22.6), Y(6.5), 20, '#d8403c');
    }), 753.5, -24.06, 0, 37, 8, 0);
    // the stair tower at the west end with its pierced screen and the small red sign
    panel(new THREE.MeshLambertMaterial({ map: tex(128, 128, (g) => { g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#8a8f93'; for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) g.fillRect(14 + x * 18, 12 + y * 18, 9, 9); }) }), 737.5, -24.66, 0, 2.6, 2.6, 7.2);
    panel(new THREE.MeshBasicMaterial({ map: plate(['Eat & Drink'], '#d8403c', '#fff3d6', 256, 128, '#ffffff'), toneMapped: false }), 737.5, -24.66, 0, 3.0, 1.5, 2.9);
    panel(new THREE.MeshBasicMaterial({ map: plate(['Century Express'], '#101010', '#ffcf33', 512, 128), toneMapped: false }), 775.1, -19.4, 0.72, 6.5, 1.2, 3.2);
    // red awnings over the terrace
    for (const [x0, x1] of [[740.6, 746.8], [747.2, 753.4]]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 3.0), new THREE.MeshLambertMaterial({ color: 0xd8473f, side: DS })); a.position.set((x0 + x1) / 2, ground(745, -25.5) + 2.72, 25.45); a.rotation.x = -Math.PI / 2 + 0.27; grp.add(a); box('awn', 0xc23a33, x0, x1, -26.95, -26.85, 2.15, 2.4); for (const px of [x0 + 0.1, x1 - 0.1]) cyl('rail', 0x1c1c1c, px, -26.8, 0.04, 0, 2.3); }
    // the terrace: a black railing round it, tables and red chairs, two food counters
    pave(tanPave, 740.2, 754, -24.1, -29.4, 2.0, 0.06);
    for (const z of [0.5, 0.95]) { box('rail', 0x1c1c1c, 740.2, 754, -29.4, -29.34, z, z + 0.05); box('rail', 0, 754, 754.06, -29.4, -26.2, z, z + 0.05); } for (let x = 740.2; x <= 754; x += 1.15) cyl('rail', 0, x, -29.37, 0.03, 0, 1.0);
    for (const [tx, ty] of [[742, -26], [745.2, -27.6], [748.6, -26.1], [751.8, -27.7], [744, -28.6], [750, -28.6]]) {
      cyl('ttop', 0xf3f1ea, tx, ty, 0.46, 0.7, 0.75); cyl('rail', 0, tx, ty, 0.04, 0, 0.7);
      for (const [ox, oy] of [[0.75, 0], [-0.75, 0], [0, 0.75]]) { box('chair', 0xc93a32, tx + ox - 0.2, tx + ox + 0.2, ty + oy - 0.2, ty + oy + 0.2, 0.38, 0.45); box('chair', 0, tx + ox * 1.25 - 0.2, tx + ox * 1.25 + 0.2, ty + oy * 1.25 - 0.03, ty + oy * 1.25 + 0.03, 0.45, 0.85); for (const [lx, ly] of [[-0.16, -0.16], [0.16, 0.16]]) cyl('rail', 0, tx + ox + lx, ty + oy + ly, 0.02, 0, 0.38); }
    }
    box('counter', 0xb8bcc0, 755, 757.4, -25.9, -24.9, 0, 0.95); box('crate', 0x2a66c9, 755.3, 756.1, -25.7, -25.2, 0.95, 1.2); box('redbox', 0xc93a32, 735.4, 736.6, -25.6, -24.8, 0, 1.5);
    pave(greyPave, 754.5, 778, -24.2, -33.5, 2.0, 0.045); for (let x = 757.3; x <= 776; x += 2.7) box('line', 0xe8e8e4, x - 0.06, x + 0.06, -32.2, -27, 0.05, 0.065);
    BLOCKS.push({ x: 756, y: -10, fx: 1, fy: 0, hl: 21, hw: 14, top: 60, R: 26 });

    // ======== Emirates Co-operative Society (x 652..725, wall at y -26): white, with a row of tall pointed arches
    box('white', 0, 652.5, 725, -26, 5, 0, 8.2);
    const arches = (g, X, Y, n, w, hgt, pitch, x0, inside) => { for (let i = 0; i < n; i++) { const cx = x0 + i * pitch; g.fillStyle = inside; g.beginPath(); g.moveTo(X(cx - w / 2), Y(0)); g.quadraticCurveTo(X(cx - w / 2 + 0.3), Y(hgt * 0.9), X(cx), Y(hgt)); g.quadraticCurveTo(X(cx + w / 2 - 0.3), Y(hgt * 0.9), X(cx + w / 2), Y(0)); g.fill(); } };
    panel(front(72.5, 8.2, 20, (g, X, Y, W, H) => {
      g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, W, H); arches(g, X, Y, 6, 8.6, 5.6, 12, 6.2, '#cfd2d2');
      for (let i = 0; i < 6; i++) { const cx = 6.2 + i * 12; g.fillStyle = '#e9e8e3'; g.fillRect(X(cx - 2.6), Y(3.0), X(5.2), Y(0) - Y(3.0)); g.fillStyle = '#39424b'; g.fillRect(X(cx - 2.2), Y(2.5), X(1.9), Y(0.1) - Y(2.5)); g.fillRect(X(cx + 0.3), Y(2.5), X(1.9), Y(0.1) - Y(2.5)); g.fillStyle = (i % 2 ? '#c62828' : '#2a7a4a'); g.fillRect(X(cx - 2.2), Y(3.0), X(4.4), Y(2.6) - Y(3.0)); }
      g.fillStyle = '#6f8796'; for (let m = 1.5; m < 72; m += 3) g.fillRect(X(m), Y(7.0), X(0.9), Y(6.5) - Y(7.0));
      g.fillStyle = '#e8e6e0'; for (let i = 0; i < 6; i++) { g.fillRect(X(11.4 + i * 12), Y(7.6), X(1.6), Y(6.0) - Y(7.6)); }
      g.fillStyle = '#c62828'; g.fillRect(X(35.2), Y(5.2), X(1.9), Y(3.4) - Y(5.2)); txt(g, 'PRISM', X(36.15), Y(4.9), 9, '#fff'); txt(g, 'OPTICAL', X(36.15), Y(3.8), 8, '#fff'); g.fillStyle = '#fff'; g.beginPath(); g.arc(X(35.85), Y(4.35), 5, 0, 7); g.arc(X(36.5), Y(4.35), 5, 0, 7); g.fill();
      g.fillStyle = '#f7f5ee'; g.fillRect(X(35.1), Y(3.2), X(2.1), Y(2.4) - Y(3.2)); txt(g, 'FLOWERS', X(36.15), Y(2.8), 9, '#3d6b3a');
    }), 688.75, -26.06, 0, 72.5, 8.2, 0);
    roofText('EMIRATES CO-OPERATIVE SOCIETY', '#2f7d4f', 672, -25.2, 8.5, 34, 2.1); roofText('جمعية الإمارات التعاونية', '#2f7d4f', 707, -25.2, 8.5, 28, 2.6);
    pave(greyPave, 652.5, 725, -26.2, -37.2, 2.0, 0.045); for (let x = 656; x <= 722; x += 2.7) box('line', 0xe8e8e4, x - 0.06, x + 0.06, -34.2, -29, 0.05, 0.065);
    box('paym', 0x2a52b8, 693.6, 694.1, -27.2, -26.8, 0, 1.7);
    BLOCKS.push({ x: 688.75, y: -10.5, fx: 1, fy: 0, hl: 36.25, hw: 15.5, top: 60, R: 40 });

    // ======== Al Kabayel Centre (x 557..630, wall at y -30): brown boarded front, white arches, black banners, red roof letters
    box('white', 0, 557.5, 630, -29.5, 0, 0, 8.4);
    panel(front(72.5, 8.4, 20, (g, X, Y, W, H) => {
      g.fillStyle = '#a66b4c'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(60,30,15,.5)'; g.lineWidth = 2; for (let m = 0.3; m < 6.6; m += 0.42) { g.beginPath(); g.moveTo(0, Y(m)); g.lineTo(W, Y(m)); g.stroke(); }
      g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, Y(6.6)); arches(g, X, Y, 6, 7.4, 5.9, 12, 6.2, '#f4f2ec');
      for (let i = 0; i < 6; i++) { const cx = 6.2 + i * 12; g.fillStyle = '#e3e0d8'; g.fillRect(X(cx - 2.2), Y(3.3), X(4.4), Y(0) - Y(3.3)); g.fillStyle = '#c93a32'; g.fillRect(X(cx - 0.5), Y(2.6), X(1.0), Y(0.6) - Y(2.6)); }
      for (let i = 0; i < 5; i++) { const cx = 12.2 + i * 12; for (const [ox, c] of [[-1.3, '#111111'], [0, '#2b2b2b'], [1.3, '#111111']]) { g.fillStyle = c; g.fillRect(X(cx + ox - 0.5), Y(5.6), X(1.0), Y(0.9) - Y(5.6)); } g.fillStyle = '#d8232c'; g.beginPath(); g.arc(X(cx + 1.3), Y(4.9), 9, 0, 7); g.fill(); txt(g, '24', X(cx + 1.3), Y(4.88), 10, '#fff'); g.beginPath(); g.fillStyle = '#d8232c'; g.arc(X(cx - 1.3), Y(4.9), 9, 0, 7); g.fill(); txt(g, '24', X(cx - 1.3), Y(4.88), 10, '#fff'); txt(g, '29', X(cx), Y(2.6), 13, '#fff'); }
    }), 593.75, -29.56, 0, 72.5, 8.4, 0);
    roofText('AL KABAYEL', '#d8232c', 578, -28.6, 8.7, 22, 2.6); roofText('القبايل', '#d8232c', 610, -28.6, 8.7, 18, 4.2);
    pave(greyPave, 557.5, 630, -29.7, -38.5, 2.0, 0.045); for (let x = 561; x <= 627; x += 2.7) box('line', 0xe8e8e4, x - 0.06, x + 0.06, -37.6, -32.4, 0.05, 0.065);
    BLOCKS.push({ x: 593.75, y: -14.75, fx: 1, fy: 0, hl: 36.25, hw: 14.75, top: 60, R: 40 });
  }
  // cars parked the way they are in the photographs (you can take any of them)
  park() {
    const g = this.g; this.cars = [];
    const L = [['landcruiser', 1178, -166.6, Math.PI / 2], ['patrol', 1150, -166.7, Math.PI / 2], ['lexus', 1160.5, -154.3, 0], ['jeep', 1090.6, -155.5, -2.2], ['sentra', 1093.1, -118, 0], ['yaris', 1093.1, -110, 0], ['tiida', 1091.6, -58, 0.05],
      ['lexus', 1046, y31(1046) + 6.6, 0], ['patrol', 1051.2, y31(1051) + 6.6, 0], ['sentra', 962, y31(962) + 6.6, 0], ['landcruiser', 967.2, y31(967) + 6.6, 0], ['yaris', 1020, y31(1020) - 6.6, Math.PI], ['tiida', 895, y31(895) - 6.6, Math.PI], ['sorento', 760, -29.6, 0], ['yaris', 765.4, -29.5, 0], ['patrol', 676, -31.6, 0], ['sentra', 684, -31.5, 0], ['tiida', 700.2, -31.4, 0], ['landcruiser', 600, -35, 0], ['lexus', 611, -34.9, 0]];
    for (const [k, x, y, h] of L) {
      plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(k); } finally { plateOpt.dubaiOnly = false; }
      const gy = ground(x, y), car = { mesh, parked: true, x, y, h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200, x0: x, y0: y };
      mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(h); this.scene.add(mesh); g.traffic.cars.push(car); this.cars.push(car);
    }
  }
  unpark() { const g = this.g; for (const c of this.cars || []) if (!c.dead && Math.hypot(c.x - c.x0, c.y - c.y0) < 2) { this.scene.remove(c.mesh); const i = g.traffic.cars.indexOf(c); if (i >= 0) g.traffic.cars.splice(i, 1); } this.cars = null; }
  // Kakina walks up and down right in front of the villa's gate on 27C Street, and a child runs rings round her
  family(dt, px, py) {
    const near = Math.hypot(1144 - px, -154 - py) < 220;
    if (!near) { if (this.kak) { this.scene.remove(this.kak.g); this.scene.remove(this.kid.g); this.kak = this.kid = null; } return; }
    if (!this.kak) {
      this.kak = new Character({ glb: 'npc_hijab', skin: 0xc99a76, shirt: 0x7a2f5a, pants: 0x2a2a30, hair: 0x15100d, fem: true }); this.kid = new Character({ glb: 'kid_boy', skin: 0xc99a76, shirt: 0xe0a020, pants: 0x2b3a55, hair: 0x15100d });
      this.kid.g.scale.multiplyScalar(0.62); this.scene.add(this.kak.g); this.scene.add(this.kid.g); this.kx = 1144; this.kdir = 1; this.ka = 0; this.kwait = 0;
    }
    // she strolls between the two ends of the villa's front, pausing now and then to watch the child
    let sp = 0; if (this.kwait > 0) this.kwait -= dt; else { sp = 0.8; this.kx += this.kdir * sp * dt; if (this.kx > 1146.8 || this.kx < 1142.2) { this.kdir *= -1; this.kwait = 2.5; } else if (Math.random() < dt * 0.06) this.kwait = 3; }
    const ky = -154.3, kz = standY(this.kx, ky); this.kak.animate(dt, { speed: sp }); this.kak.g.position.set(this.kx, kz + 0.02, -ky); this.kak.g.rotation.y = Math.PI - (sp ? (this.kdir > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI);
    this.ka += dt * 2.1; const r = 1.2, cx = this.kx + Math.sin(this.ka) * r, cy = ky + Math.cos(this.ka) * r, ch = this.ka + Math.PI / 2;
    this.kid.animate(dt, { speed: 3.3, run: true }); this.kid.g.position.set(cx, standY(cx, cy) + 0.02, -cy); this.kid.g.rotation.y = Math.PI - ch;
    if (!this.kHi && Math.hypot(this.kx - px, ky - py) < 7) { this.kHi = true; toast('👋 Kakina is out in front of 27C with the little one.', 3500); }
  }
  update(dt, px, py) {
    this.family(dt, px, py);
    if ((this.t -= dt) > 0) return; this.t = 1;
    const d = Math.hypot(C.x - px, C.y - py);
    if (d < 760 && !this.grp) this.build();
    if (d < 560 && !this.cars && this.g.traffic && this.g.traffic.pieces && this.g.traffic.pieces.length) this.park();
    if (d > 900 && this.cars) this.unpark();
  }
}

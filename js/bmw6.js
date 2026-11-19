// Dubai City Stories: a red BMW 6 Series coupé (650i), built in code from photographs: the body is a skin stretched
// over cross-sections from nose to tail, and the grille, lamps, glass, door lines and badges are painted on.
import * as THREE from 'three';

export const BMW = { L: 4.89, W: 1.89, H: 1.37, wheelR: 0.345, axF: 1.565, axR: -1.285 };
// stations from the nose (+z) to the tail: [z, underside, half width at the sill, at the shoulder, shoulder height, top height, half width of the top]
// between z = 0.95 and -1.95 the top is the cabin (glass and roof); elsewhere it is the bonnet or the boot lid
const ST = [
  [2.445, 0.34, 0.50, 0.56, 0.60, 0.64, 0.40], [2.38, 0.24, 0.74, 0.80, 0.66, 0.71, 0.55], [2.2, 0.18, 0.88, 0.915, 0.72, 0.78, 0.62], [1.9, 0.17, 0.925, 0.94, 0.76, 0.83, 0.66],
  [1.565, 0.17, 0.94, 0.945, 0.80, 0.865, 0.68], [1.2, 0.17, 0.94, 0.945, 0.84, 0.895, 0.70], [0.95, 0.17, 0.94, 0.945, 0.87, 0.92, 0.71],
  [0.6, 0.17, 0.94, 0.945, 0.885, 1.10, 0.62], [0.25, 0.17, 0.94, 0.945, 0.89, 1.27, 0.60], [-0.2, 0.17, 0.94, 0.945, 0.895, 1.36, 0.60], [-0.6, 0.17, 0.94, 0.945, 0.90, 1.37, 0.60],
  [-1.05, 0.17, 0.94, 0.945, 0.91, 1.31, 0.58], [-1.45, 0.17, 0.94, 0.945, 0.92, 1.18, 0.56], [-1.8, 0.18, 0.935, 0.94, 0.925, 1.02, 0.56], [-1.98, 0.19, 0.93, 0.935, 0.925, 0.965, 0.62],
  [-2.2, 0.21, 0.90, 0.91, 0.91, 0.945, 0.62], [-2.38, 0.27, 0.82, 0.85, 0.88, 0.91, 0.58], [-2.445, 0.36, 0.66, 0.72, 0.84, 0.86, 0.50],
];
function ring([z, yb, w0, wb, hb, ht, wt]) {
  const cab = ht - hb > 0.09, half = [[0, yb], [w0 * 0.86, yb], [w0, yb + 0.1], [wb, hb * 0.55], [wb, hb - 0.05], [cab ? wb - 0.07 : wb - 0.05, hb], [cab ? wt + 0.05 : wt + 0.1, cab ? ht - 0.06 : (hb + ht) / 2 + 0.01], [wt * 0.72, ht - 0.008], [0, ht]];
  return half.map(p => [p[0], p[1], z]).concat(half.slice(1, -1).reverse().map(p => [-p[0], p[1], z]));
}
function skin() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const RED = '#a01226', DK = '#7d0c1c', HI = '#c52239', GL = '#141a22', CH = '#d9dde2', BLK = '#121316';
  g.fillStyle = RED; g.fillRect(0, 0, 1024, 1024);
  // ---- side (top half of the sheet): u = z (nose on the right), v = height
  const SX = z => (z + 2.5) / 5 * 1024, SY = y => 512 - y / 1.45 * 500;
  let gr = g.createLinearGradient(0, SY(1.4), 0, SY(0)); gr.addColorStop(0, HI); gr.addColorStop(0.35, RED); gr.addColorStop(0.62, HI); gr.addColorStop(0.7, RED); gr.addColorStop(1, DK); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = BLK; g.fillRect(0, SY(0.3), 1024, SY(0) - SY(0.3) + 12);                                    // sill and underside
  g.fillStyle = RED; g.fillRect(SX(-2.45), SY(0.3), SX(2.45) - SX(-2.45), SY(0.2) - SY(0.3)); g.fillStyle = BLK; g.fillRect(SX(-1.0), SY(0.27), SX(1.3) - SX(-1.0), 6);
  for (const az of [BMW.axF, BMW.axR]) { g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(SX(az), SY(BMW.wheelR), (SX(0.43) - SX(0)), 0, 7); g.fill(); }
  // side glass: long, low, frameless, with a chrome line round it
  const glass = () => { g.beginPath(); g.moveTo(SX(0.86), SY(0.905)); g.lineTo(SX(0.38), SY(1.20)); g.quadraticCurveTo(SX(-0.3), SY(1.33), SX(-0.95), SY(1.27)); g.quadraticCurveTo(SX(-1.45), SY(1.14), SX(-1.62), SY(0.955)); g.closePath(); };
  g.fillStyle = CH; glass(); g.fill(); g.save(); g.translate(0, 3); g.scale(1, 0.985); g.fillStyle = GL; glass(); g.fill(); g.restore();
  g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(SX(0.5), SY(1.1)); g.lineTo(SX(0.2), SY(1.25)); g.lineTo(SX(-0.2), SY(1.29)); g.lineTo(SX(0.2), SY(0.95)); g.fill();
  g.strokeStyle = 'rgba(40,0,8,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(SX(0.82), SY(0.9)); g.lineTo(SX(0.86), SY(0.34)); g.moveTo(SX(-0.5), SY(0.93)); g.quadraticCurveTo(SX(-0.62), SY(0.6), SX(-0.5), SY(0.32)); g.stroke();   // door
  g.strokeStyle = 'rgba(255,170,180,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(SX(2.0), SY(0.70)); g.quadraticCurveTo(SX(0), SY(0.84), SX(-2.2), SY(0.80)); g.stroke();              // the crease along the flank
  g.fillStyle = CH; g.fillRect(SX(-0.42), SY(0.80), 34, 6); g.fillStyle = '#e8eaec'; g.fillRect(SX(1.02), SY(0.66), 30, 7);                                                              // handle, side gill
  g.fillStyle = '#aebccb'; g.beginPath(); g.moveTo(SX(2.4), SY(0.6)); g.lineTo(SX(1.95), SY(0.74)); g.lineTo(SX(1.9), SY(0.68)); g.lineTo(SX(2.36), SY(0.55)); g.fill();                  // headlamp wrapping round
  g.fillStyle = '#d0101c'; g.beginPath(); g.moveTo(SX(-2.44), SY(0.8)); g.lineTo(SX(-1.95), SY(0.86)); g.lineTo(SX(-1.95), SY(0.78)); g.lineTo(SX(-2.42), SY(0.7)); g.fill();              // tail lamp wrapping round
  g.fillStyle = BLK; g.beginPath(); g.ellipse(SX(0.9), SY(0.95), 20, 9, 0, 0, 7); g.fill(); g.fillStyle = RED; g.beginPath(); g.ellipse(SX(0.93), SY(0.955), 15, 7, 0, 0, 7); g.fill();     // mirror
  // ---- top (bottom-left quarter... the whole lower-left 1024 x 256 strip): u = z, v = x
  const TX = SX, TY = x => 640 + x / 1.0 * 120;
  gr = g.createLinearGradient(0, TY(-1), 0, TY(1)); gr.addColorStop(0, DK); gr.addColorStop(0.3, HI); gr.addColorStop(0.5, RED); gr.addColorStop(0.7, HI); gr.addColorStop(1, DK); g.fillStyle = gr; g.fillRect(0, 512, 1024, 256);
  g.fillStyle = GL; g.beginPath(); g.moveTo(TX(0.98), TY(-0.74)); g.lineTo(TX(0.98), TY(0.74)); g.lineTo(TX(0.3), TY(0.6)); g.lineTo(TX(0.3), TY(-0.6)); g.fill();                         // windscreen
  g.beginPath(); g.moveTo(TX(-1.02), TY(-0.57)); g.lineTo(TX(-1.02), TY(0.57)); g.lineTo(TX(-1.86), TY(0.6)); g.lineTo(TX(-1.86), TY(-0.6)); g.fill();                                     // rear window
  g.fillStyle = '#1b222b'; g.fillRect(TX(-0.75), TY(-0.42), TX(0.15) - TX(-0.75), TY(0.42) - TY(-0.42));                                                                                  // glass roof panel
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(TX(0.4), TY(-0.5), TX(0.9) - TX(0.4), 26);
  g.strokeStyle = 'rgba(50,0,10,.6)'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(TX(1.0), TY(s * 0.62)); g.quadraticCurveTo(TX(1.8), TY(s * 0.5), TX(2.35), TY(s * 0.3)); g.stroke(); }   // bonnet creases
  g.strokeStyle = 'rgba(255,180,190,.35)'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(TX(1.0), TY(s * 0.3)); g.lineTo(TX(2.3), TY(s * 0.16)); g.stroke(); }
  g.strokeStyle = 'rgba(50,0,10,.6)'; g.beginPath(); g.moveTo(TX(-1.95), TY(-0.7)); g.lineTo(TX(-1.95), TY(0.7)); g.stroke();
  const roundel = (x, y, r) => { g.fillStyle = '#0d0f12'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(x, y, r * 0.66, 0, 7); g.fill(); g.fillStyle = '#2f7fd6'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r * 0.66, -Math.PI / 2, 0); g.fill(); g.beginPath(); g.moveTo(x, y); g.arc(x, y, r * 0.66, Math.PI / 2, Math.PI); g.fill(); g.strokeStyle = CH; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); };
  roundel(TX(2.3), TY(0), 9);
  // ---- front (lower left) and rear (lower right): u = x, v = height
  const face = (ox, draw) => { g.save(); g.translate(ox, 768); const X = x => 256 + x / 1.0 * 250, Y = y => 256 - y / 1.0 * 256; const b = g.createLinearGradient(0, Y(0.95), 0, Y(0.2)); b.addColorStop(0, HI); b.addColorStop(0.5, RED); b.addColorStop(1, DK); g.fillStyle = b; g.fillRect(0, 0, 512, 256); draw(X, Y); g.restore(); };
  face(0, (X, Y) => {
    g.fillStyle = BLK; g.fillRect(X(-0.95), Y(0.36), X(0.95) - X(-0.95), Y(0.16) - Y(0.36));                           // lower air intakes
    g.fillStyle = RED; g.fillRect(X(-0.28), Y(0.36), 6, Y(0.2) - Y(0.36)); g.fillRect(X(0.28) - 6, Y(0.36), 6, Y(0.2) - Y(0.36)); g.fillStyle = '#2a2d31'; for (let i = 0; i < 5; i++) g.fillRect(X(-0.9), Y(0.34) + i * 9, X(0.9) - X(-0.9), 2);
    for (const s of [-1, 1]) {
      // kidney grille: chrome ring, black inside, upright chrome bars
      const kx = X(s * 0.175), ky = Y(0.555), kw = X(0.29) - X(0), kh = Y(0.46) - Y(0.65);
      g.fillStyle = CH; g.beginPath(); g.roundRect(kx - kw / 2, ky - kh / 2, kw, kh, 14); g.fill(); g.fillStyle = '#0c0d0f'; g.beginPath(); g.roundRect(kx - kw / 2 + 5, ky - kh / 2 + 5, kw - 10, kh - 10, 10); g.fill();
      g.fillStyle = '#aeb4ba'; for (let i = 1; i < 8; i++) g.fillRect(kx - kw / 2 + 5 + i * (kw - 10) / 8 - 1.2, ky - kh / 2 + 7, 2.4, kh - 14);
      // headlamp: a long dark lens with two bright rings
      g.fillStyle = '#20252b'; g.beginPath(); g.moveTo(X(s * 0.36), Y(0.60)); g.lineTo(X(s * 0.86), Y(0.70)); g.lineTo(X(s * 0.9), Y(0.60)); g.lineTo(X(s * 0.4), Y(0.53)); g.fill();
      for (const hx of [0.5, 0.7]) { g.strokeStyle = '#f2f7ff'; g.lineWidth = 3.5; g.beginPath(); g.arc(X(s * hx), Y(0.605 + (hx - 0.5) * 0.12), 10, 0, 7); g.stroke(); g.fillStyle = '#c9d6e6'; g.beginPath(); g.arc(X(s * hx), Y(0.605 + (hx - 0.5) * 0.12), 5, 0, 7); g.fill(); }
    }
    roundel(X(0), Y(0.685), 9);
  });
  face(512, (X, Y) => {
    g.fillStyle = BLK; g.fillRect(X(-0.95), Y(0.50), X(0.95) - X(-0.95), Y(0.16) - Y(0.50));                           // diffuser
    for (const s of [-1, 1]) {
      g.fillStyle = CH; g.beginPath(); g.roundRect(X(s * 0.52) - 26, Y(0.47), 52, 15, 5); g.fill(); g.fillStyle = '#0a0a0b'; g.beginPath(); g.roundRect(X(s * 0.52) - 21, Y(0.47) + 3, 42, 9, 3); g.fill();   // exhaust tip
      g.fillStyle = '#c40d18'; g.beginPath(); g.moveTo(X(s * 0.24), Y(0.80)); g.lineTo(X(s * 0.74), Y(0.83)); g.lineTo(X(s * 0.74), Y(0.72)); g.lineTo(X(s * 0.24), Y(0.74)); g.fill();
      g.fillStyle = '#ff6a60'; g.fillRect(Math.min(X(s * 0.27), X(s * 0.71)), Y(0.79), Math.abs(X(0.44) - X(0)), 4); g.fillStyle = '#7a0810'; g.fillRect(Math.min(X(s * 0.27), X(s * 0.71)), Y(0.755), Math.abs(X(0.44) - X(0)), 3);
    }
    g.fillStyle = DK; g.beginPath(); g.roundRect(X(-0.3), Y(0.68), X(0.6) - X(0), Y(0.54) - Y(0.68), 6); g.fill();   // number plate recess
    roundel(X(0), Y(0.775), 8);
    g.fillStyle = CH; g.font = '700 14px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('650i', X(0.5), Y(0.845));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// the finished car: { geo, mat, wheels } in the same form as the loaded models (nose towards +z, standing on y = 0)
export function buildBMW6() {
  // more stations in between, so the skin is smooth
  const S = []; for (let i = 0; i < ST.length - 1; i++) { const a = ST[i], b = ST[i + 1], n = Math.max(1, Math.round(Math.abs(a[0] - b[0]) / 0.14)); for (let k = 0; k < n; k++) { const t = k / n, u = t * t * (3 - 2 * t); S.push(a.map((v, j) => j === 0 ? v + (b[j] - v) * t : v + (b[j] - v) * u)); } } S.push(ST[ST.length - 1]);
  const R = S.map(ring), N = R[0].length, pos = [], idx = [];
  for (const r of R) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * N + j, b = i * N + (j + 1) % N, c = a + N, d = b + N; idx.push(a, c, b, b, c, d); }
  // close the nose and the tail
  for (const [i, flip] of [[0, false], [R.length - 1, true]]) { const r = R[i], cy = r.reduce((s, p) => s + p[1], 0) / N, ci = pos.length / 3; pos.push(0, cy, r[0][2] + (flip ? -0.03 : 0.03)); for (let j = 0; j < N; j++) { const a = i * N + j, b = i * N + (j + 1) % N; flip ? idx.push(ci, b, a) : idx.push(ci, a, b); } }
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  geo = geo.toNonIndexed();
  // paint: each triangle takes the view it faces (side, top, front or rear)
  const P = geo.attributes.position, uv = new Float32Array(P.count * 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < P.count; t += 3) {
    a.fromBufferAttribute(P, t); b.fromBufferAttribute(P, t + 1); c.fromBufferAttribute(P, t + 2); n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), zc = (a.z + b.z + c.z) / 3;
    const view = az > 0.62 && Math.abs(zc) > 2.05 ? (zc > 0 ? 'f' : 'r') : ay > ax ? (n.y > 0 ? 't' : 'u') : 's';
    for (let k = 0; k < 3; k++) { const p = [a, b, c][k]; let u, v;
      if (view === 's') { u = (p.z + 2.5) / 5; v = (512 - p.y / 1.45 * 500) / 1024; }
      else if (view === 't') { u = (p.z + 2.5) / 5; v = (640 + p.x * 120) / 1024; }
      else if (view === 'u') { u = (p.z + 2.5) / 5; v = 505 / 1024; }
      else { const ox = view === 'f' ? 0 : 512; u = (ox + 256 + (view === 'f' ? p.x : -p.x) * 250) / 1024; v = (768 + 256 - p.y * 256) / 1024; }
      uv[(t + k) * 2] = u; uv[(t + k) * 2 + 1] = 1 - v; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeBoundingBox(); geo.computeBoundingSphere(); geo.userData.shared = true;
  const mat = new THREE.MeshLambertMaterial({ map: skin() }), w = 0.26, wheels = [];
  for (const az of [BMW.axF, BMW.axR]) for (const sd of [1, -1]) wheels.push({ p: [sd * (BMW.W / 2 - w / 2 + 0.035), BMW.wheelR, az], r: BMW.wheelR, w, side: sd, front: az === BMW.axF });
  return { geo, mat, wheels: { body: geo, wheels, overlay: true } };
}

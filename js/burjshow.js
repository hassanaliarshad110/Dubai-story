// Burj Khalifa at night: an LED show running up the facade, lasers from the tower and the plaza, sky beams,
// fireworks, and the Dubai Fountain dancing on the lake below. Starts at dusk and runs all night.
import * as THREE from 'three';
import { ground } from './terrain.js?v=11112231';

// the tower's outline (radius at height), a little outside the map's stepped model, up to the tip of the spire
const PROFILE = [[55, 0], [55, 70], [50, 130], [46, 200], [40, 270], [37, 360], [29, 405], [28, 520], [23, 560], [19, 605], [16, 680], [12, 710], [8, 740], [4.5, 760], [2.2, 790], [0.5, 828]];
const LASER = [0x35ff6a, 0xff3ad2, 0x39d5ff, 0xffffff, 0xffd23a, 0x9a5cff];

export class BurjShow {
  constructor(game, scene, world) {
    this.g = game; this.scene = scene; this.t = 0; this.on = 0;
    // the tower is the tallest thing on the map
    let top = null; for (const s of world.skyline || []) if (!top || s.h > top.h) top = s;
    if (!top || top.h < 500) { this.off = true; return; }
    const cx = top.r.reduce((a, p) => a + p[0], 0) / top.r.length, cy = top.r.reduce((a, p) => a + p[1], 0) / top.r.length;
    this.x = cx; this.y = cy; const gy = ground(cx, cy); this.gy = gy;
    const lm = (world.landmarks || []).find(l => l.label === 'Burj Khalifa'); if (lm) { lm.x = Math.round(cx); lm.y = Math.round(cy); }
    const root = this.root = new THREE.Group(); root.position.set(cx, gy, -cy); scene.add(root);
    // the spire (the map's model stops at 760 m)
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.6, 70, 8), new THREE.MeshLambertMaterial({ color: 0xcfd6dc })); spire.position.y = 760 + 35; root.add(spire);
    // LED skin
    this.u = { uT: { value: 0 }, uOn: { value: 0 }, uScene: { value: 0 } };
    // the LED skin hugs the real tower: one thin sheet just outside every wall of the model, so the wings, the setbacks and
    // the spire keep their shape and the lights sit on the facade like the real show
    const P = [], parts = (world.skyline || []).filter(q => q.h > 60 && Math.hypot(q.r[0][0] - cx, q.r[0][1] - cy) < 130);
    for (const q of parts) {
      const r = q.r, y0 = q.mh || 0, y1 = q.h; let ar = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; ar += a[0] * b[1] - b[0] * a[1]; }
      const sg = ar > 0 ? 1 : -1;
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 0.3) continue;
        const nx = dy / l * sg * 0.45, ny = -dx / l * sg * 0.45, ax = a[0] - cx + nx, az = -(a[1] - cy + ny), bx = b[0] - cx + nx, bz = -(b[1] - cy + ny);
        P.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
      }
    }
    const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sgeo.computeBoundingSphere();
    const skin = new THREE.Mesh(sgeo, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uT; uniform float uOn; uniform float uScene; varying vec3 vP;
        vec3 hsv(float h, float s, float v) { vec3 k = abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0; return v * mix(vec3(1.0), clamp(k, 0.0, 1.0), s); }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float y = vP.y / 828.0, a = atan(vP.z, vP.x), t = uT; vec3 c = vec3(0.0); float sc = mod(uScene, 5.0);
          vec2 cell = vec2(floor(a * 14.0), floor(vP.y / 3.4)); float px = 0.55 + 0.45 * hash(cell);            // LED pixels
          if (sc < 1.0) { float b = fract(y * 6.0 - t * 0.45 + 0.08 * sin(a * 3.0)); c = hsv(y * 0.6 + t * 0.05, 0.85, 1.0) * smoothstep(0.0, 0.15, b) * smoothstep(0.75, 0.4, b); }          // colour bands climbing
          else if (sc < 2.0) { float sp = step(0.965, hash(cell + floor(t * 9.0))); c = vec3(1.0, 0.95, 0.8) * sp * 2.2 + hsv(0.62, 0.7, 0.25); }                                         // sparkle
          else if (sc < 3.0) { float b = fract(a / 6.2832 * 3.0 + y * 2.0 - t * 0.2); c = b < 0.25 ? vec3(1.0, 0.05, 0.1) : b < 0.5 ? vec3(0.05, 0.75, 0.2) : b < 0.75 ? vec3(1.0) : vec3(0.08); }   // UAE colours spiralling
          else if (sc < 4.0) { float w = fract(t * 0.35), d = abs(y - w); c = hsv(0.5 + w * 0.5, 0.8, 1.0) * (smoothstep(0.12, 0.0, d) * 1.6 + 0.12); }                                    // a pulse racing to the tip
          else { float d = sin(a * 4.0 + y * 40.0 - t * 3.0) * 0.5 + 0.5; c = hsv(0.9 - y * 0.4 + 0.1 * sin(t * 0.7), 0.8, 1.0) * d * d; }                                               // ribbons
          // the lights are rows of LED strips between the floors, with dark glass in between: the building stays readable
          float row = fract(vP.y / 3.4), strip = smoothstep(0.0, 0.12, row) * smoothstep(0.42, 0.3, row), col = 0.35 + 0.65 * step(0.3, hash(cell * 1.7 + 3.0));
          float fadeIn = smoothstep(0.0, 0.03, y);
          c = min(c, vec3(1.6));
          gl_FragColor = vec4(c * px * strip * col * uOn * fadeIn * 0.5, 1.0);
        }` }));
    skin.renderOrder = 6; root.add(skin); this.skin = skin;
    // lasers: from the crown and from the plaza
    const beamGeo = new THREE.CylinderGeometry(2.2, 0.2, 1, 6, 1, true); beamGeo.translate(0, 0.5, 0);
    this.beams = [];
    const beam = (y, len, col, i, low) => { const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.scale.set(low ? 2.2 : 1, len, low ? 2.2 : 1); const piv = new THREE.Group(); piv.position.y = y; piv.rotation.order = 'YXZ'; piv.add(m); root.add(piv); this.beams.push({ piv, m, i, low, ph: i * 1.37 }); };
    for (let i = 0; i < 12; i++) beam(560 + (i % 4) * 55, 2200, LASER[i % LASER.length], i, false);
    for (let i = 0; i < 8; i++) beam(3, 1500, i % 2 ? 0xffffff : LASER[(i + 2) % LASER.length], i, true);
    // fireworks: one pool of points
    const N = 900; this.fw = { n: N, pos: new Float32Array(N * 3), col: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0, t: 0 };
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(this.fw.pos, 3)); fg.setAttribute('color', new THREE.BufferAttribute(this.fw.col, 3)); fg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 400, 0), 1500);
    this.fwPts = new THREE.Points(fg, new THREE.PointsMaterial({ size: 9, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); this.fwPts.frustumCulled = false; root.add(this.fwPts);
    for (let i = 0; i < N; i++) this.fw.pos[i * 3 + 1] = -9999;
    // the Dubai Fountain: a long arc of jets on the lake
    const f = (world.landmarks || []).find(l => l.label === 'Dubai Fountain'); this.jets = [];
    if (f) {
      const jg = new THREE.CylinderGeometry(0.08, 0.42, 1, 6, 1, true); jg.translate(0, 0.5, 0);
      this.jetMat = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
      const fg2 = this.fountain = new THREE.Group(); fg2.position.set(f.x, ground(f.x, f.y) + 0.2, -f.y); scene.add(fg2);
      const ax = Math.atan2(cy - f.y, cx - f.x) + Math.PI / 2;        // the arc lies across the view to the tower
      for (let i = 0; i < 44; i++) { const u = i / 43 - 0.5, r = 110, a = u * 1.5, lx = Math.sin(a) * r, ly = (1 - Math.cos(a)) * r - 20; const j = new THREE.Mesh(jg, this.jetMat); j.position.set(lx * Math.cos(ax) - ly * Math.sin(ax), 0, -(lx * Math.sin(ax) + ly * Math.cos(ax))); fg2.add(j); this.jets.push({ j, u }); }
      this.fx = f.x; this.fy = f.y;
    }
  }
  burst(x, y, z, hue) {
    const F = this.fw, c = new THREE.Color().setHSL(hue, 1, 0.6), n = 70;
    for (let k = 0; k < n; k++) { const i = F.next = (F.next + 1) % F.n, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = 28 + Math.random() * 14; F.pos[i * 3] = x; F.pos[i * 3 + 1] = z; F.pos[i * 3 + 2] = y; F.vel[i * 3] = Math.sin(b) * Math.cos(a) * s; F.vel[i * 3 + 1] = Math.cos(b) * s; F.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s; F.life[i] = 1.6 + Math.random() * 0.8; F.col[i * 3] = c.r; F.col[i * 3 + 1] = c.g; F.col[i * 3 + 2] = c.b; }
  }
  update(dt, px, py, night) {
    if (this.off) return; this.t += dt; const t = this.t;
    const d = Math.hypot(px - this.x, py - this.y), want = night > 0.45 ? 1 : 0; this.on += (want - this.on) * Math.min(1, dt * 0.8);
    const on = this.on, vis = on > 0.02 && d < 12000;
    this.skin.visible = vis; this.fwPts.visible = vis && d < 5000; for (const b of this.beams) b.piv.visible = vis;
    if (vis) {
      this.u.uT.value = t; this.u.uOn.value = on; this.u.uScene.value = Math.floor(t / 14);
      const mode = Math.floor(t / 10) % 3;
      for (const b of this.beams) {
        const k = b.i, sp = b.low ? 0.25 : 0.4;
        if (mode === 0) { b.piv.rotation.y = t * sp * (k % 2 ? 1 : -1) + b.ph; b.piv.rotation.x = b.low ? 0.5 + 0.35 * Math.sin(t * 0.6 + b.ph) : 1.25 + 0.3 * Math.sin(t * 0.8 + b.ph); }           // sweeping fans
        else if (mode === 1) { b.piv.rotation.y = k / (b.low ? 8 : 12) * 6.283 + Math.sin(t * 0.5) * 0.6; b.piv.rotation.x = b.low ? 0.25 + 0.2 * Math.sin(t * 1.4 + k) : 1.0 + 0.5 * Math.sin(t * 1.1 + k * 0.5); }   // a crown opening and closing
        else { b.piv.rotation.y = t * 0.9 + k * 0.5236; b.piv.rotation.x = b.low ? 0.7 : 1.45 + 0.1 * Math.sin(t * 3 + k); }                                                                 // a spinning wheel
        b.m.material.opacity = on * (b.low ? 0.1 : 0.2) * (0.75 + 0.25 * Math.sin(t * 6 + k * 2.1));
      }
      // fireworks around the tower
      const F = this.fw;
      if (this.fwPts.visible) {
        if ((F.t -= dt) <= 0 && on > 0.8) { F.t = 0.5 + Math.random() * 1.3; const a = Math.random() * 6.283, r = 60 + Math.random() * 160; this.burst(Math.cos(a) * r, Math.sin(a) * r, 180 + Math.random() * 520, Math.random()); }
        for (let i = 0; i < F.n; i++) { if (F.life[i] <= 0) continue; F.life[i] -= dt; if (F.life[i] <= 0) { F.pos[i * 3 + 1] = -9999; continue; } F.vel[i * 3 + 1] -= 9 * dt; const dr = 1 - dt * 0.9; F.vel[i * 3] *= dr; F.vel[i * 3 + 1] *= dr; F.vel[i * 3 + 2] *= dr; F.pos[i * 3] += F.vel[i * 3] * dt; F.pos[i * 3 + 1] += F.vel[i * 3 + 1] * dt; F.pos[i * 3 + 2] += F.vel[i * 3 + 2] * dt; }
        this.fwPts.geometry.attributes.position.needsUpdate = true; this.fwPts.geometry.attributes.color.needsUpdate = true;
      }
    }
    // the fountain plays day and night, lit warm after dark
    if (this.fountain) {
      const near = Math.hypot(px - this.fx, py - this.fy) < 2500; this.fountain.visible = near;
      if (near) {
        const m = Math.floor(t / 9) % 4; this.jetMat.color.setHex(on > 0.5 ? 0xffe7b0 : 0xeaf6ff); this.jetMat.opacity = 0.5 + 0.2 * on;
        for (const { j, u } of this.jets) {
          let h = m === 0 ? 30 + 26 * Math.sin(t * 2 + u * 14) : m === 1 ? 62 * Math.max(0, Math.sin(t * 1.3 - Math.abs(u) * 9)) : m === 2 ? (Math.sin(t * 5 + u * 60) > 0 ? 44 : 9) : 22 + 60 * Math.pow(Math.max(0, Math.sin(t * 0.9 + u * 3.1416)), 4);
          j.scale.set(1, Math.max(0.5, h), 1); j.rotation.z = m === 0 ? 0.25 * Math.sin(t * 1.5 + u * 10) : 0;
        }
      }
    }
  }
}

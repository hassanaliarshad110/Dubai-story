// Dubai City Stories: the things only Dubai does to a driver.
//   speed radars that flash you (with the famous 20 km/h grace), a running total of fines you can pay off
//   Salik toll gates, rush-hour jams, karak chai brought to your car window when you honk outside a cafeteria
//   parking fines, summer heat, and OMNIYAT's buildings signed on the skyline
import * as THREE from 'three';
import { toast } from './hud.js?v=11112231';
import { ground } from './terrain.js?v=11112231';
import { SPEED_LIMIT } from './tiles.js?v=11112231';
import { sfx } from './sound.js?v=11112231';
import { heal } from './health.js?v=11112231';
import { loader } from './gltf.js?v=11112231';
import { makeCar } from './actors.js?v=11112231';
import { TYRE_Y, rotY } from './player.js?v=11112231';

// 25, 27C Street, Al Garhoud: the cream villa with the arched windows and the breeze-block parapet, on its real plot
const HOME = { x0: 1136.1, x1: 1154.4, y0: -148.5, y1: -126.7, h: 5.7 };

// OMNIYAT's buildings on this map (positions from the map itself)
export const OMNIYAT = [
  { label: 'The Opus by OMNIYAT', x: -7360, y: -6136, note: 'Zaha Hadid\'s cube with the hole through it. Business Bay.' },
  { label: 'One by OMNIYAT', x: -7883, y: -6226, note: 'Business Bay tower by OMNIYAT.' },
  { label: 'The Binary by OMNIYAT', x: -7368, y: -6290, note: 'Office tower, Business Bay.' },
  { label: 'The Pad by OMNIYAT', x: -5847, y: -6572, note: 'The leaning tower of Business Bay.' },
  { label: 'The Sterling by OMNIYAT', x: -5832, y: -6086, note: 'Twin residences on the canal.' },
  { label: 'Bayswater by OMNIYAT', x: -7622, y: -6645, note: 'Office tower on Al Abraj Street.' },
  { label: 'Vela by OMNIYAT', x: -5141, y: -5975, note: 'Dorchester Collection residences on the water.' },
];
const EXTRA = [
  { label: '27C Street, Al Garhoud', x: 1137, y: -160 },
  { label: 'Karakccino', x: 1113, y: -1188 },
  { label: 'Karak House', x: -6377, y: -5871 },
  { label: 'FiLLi Café', x: -3682, y: 604 },
  { label: 'Arabian Tea House', x: -4058, y: 2145 },
  { label: 'Rashid Hospital', x: -2166, y: 72 },
];
const SALIK = [['Al Garhoud Bridge', -265, -1236], ['Al Maktoum Bridge', -1894, 856], ['Business Bay Crossing', 951, -1796], ['Airport Tunnel', 3020, 610], ['Al Safa', -7700, -5560], ['Infinity Bridge', -3959, 3756]];
const FINE = over => over > 80 ? 3000 : over > 60 ? 2000 : over > 50 ? 1500 : over > 40 ? 1000 : over > 30 ? 700 : 600;
const fmt = n => 'AED ' + Math.round(n).toLocaleString('en-US');
const CSS = `#fines { position: fixed; right: 10px; top: calc(env(safe-area-inset-top) + 92px); z-index: 22; background: rgba(15,23,32,.86); color: #fff; border: 0; border-right: 4px solid #ff3b3b; border-radius: 10px; padding: 6px 10px; font: 800 13px system-ui, sans-serif; text-align: right; }
#fines small { display: block; font-weight: 600; font-size: 10.5px; opacity: .8; } #fines[hidden] { display: none; } body.cine #fines { display: none; }
#fines.bump { animation: finesBump .5s; } @keyframes finesBump { 30% { transform: scale(1.25); background: #b00014; } }
#radar-flash { position: fixed; inset: 0; z-index: 60; background: #fff; opacity: 0; pointer-events: none; }
#radar-flash.go { animation: radarFlash .55s linear; } @keyframes radarFlash { 0% { opacity: .95; } 18% { opacity: 0; } 30% { opacity: .9; } 100% { opacity: 0; } }`;

// call before the missions are made: the places they use
export function addDubaiPlaces(world) {
  const L = world.landmarks || (world.landmarks = []), have = new Set(L.map(l => l.label));
  for (const o of [...OMNIYAT, ...EXTRA]) if (!have.has(o.label)) L.push({ label: o.label, x: o.x, y: o.y, downtown: false, full: false });
}

function signTex(text, sub) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, 1024, 256); g.strokeStyle = '#c9a45c'; g.lineWidth = 6; g.strokeRect(8, 8, 1008, 240);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c984'; g.font = '300 132px Georgia, "Times New Roman", serif';
  try { g.letterSpacing = '26px'; } catch (e) { }
  g.fillText(text, 512, sub ? 108 : 128); if (sub) { try { g.letterSpacing = '6px'; } catch (e) { } g.font = '500 40px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#ffffff'; g.fillText(sub, 512, 206); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class DubaiFun {
  constructor(game, scene, world, tiles) {
    this.g = game; this.scene = scene; this.tiles = tiles; this.t = 0;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.el = document.createElement('button'); this.el.id = 'fines'; this.el.hidden = true; document.body.appendChild(this.el);
    this.el.onclick = () => this.pay();
    this.fl = document.createElement('div'); this.fl.id = 'radar-flash'; document.body.appendChild(this.fl);
    try { this.s = JSON.parse(localStorage.getItem('dcs-fines') || 'null') || {}; } catch (e) { this.s = {}; }
    this.s = { due: 0, n: 0, salik: 0, paid: 0, ...this.s }; this.count = this.s.n; this.draw();
    // ---- radars: one about every 1.3 km along the motorways and main roads, on the right shoulder
    this.radars = []; const G = new Map();
    let n = 0;
    for (const r of world.overview || []) {
      if (![1, 2].includes(r.c) || r.p.length < 2) continue; let acc = 500 + (n * 311) % 700;
      for (let i = 1; i < r.p.length; i++) {
        const a = r.p[i - 1], b = r.p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; acc += l; if (acc < 1300) continue; acc = 0;
        const dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l, x = (a[0] + b[0]) / 2 + dy * 10.5, y = (a[1] + b[1]) / 2 - dx * 10.5, k = Math.floor(x / 500) + ',' + Math.floor(y / 500);
        if (G.has(k)) continue; G.set(k, 1); this.radars.push({ x, y, h: Math.atan2(-dx, -dy), cool: 0 }); n++;
      }
    }
    const pole = new THREE.CylinderGeometry(0.09, 0.11, 3.2, 8); pole.translate(0, 1.6, 0);
    const box = new THREE.BoxGeometry(0.55, 0.9, 0.5); box.translate(0, 3.5, 0);
    const lens = new THREE.CircleGeometry(0.13, 12); lens.translate(0, 3.62, 0.26);
    this.radarGeo = [pole, box, lens];
    this.radarMat = [new THREE.MeshLambertMaterial({ color: 0x8c9196 }), new THREE.MeshLambertMaterial({ color: 0xd9dcdf }), new THREE.MeshBasicMaterial({ color: 0x1a1a1a })];
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flashBall = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), this.flashMat); this.flashBall.visible = false; scene.add(this.flashBall);
    // ---- karak: cafeterias that bring the tea to your window
    this.caf = []; fetch('data/karak.json').then(r => r.json()).then(d => { this.caf = d; }).catch(() => { });
    const horn = sfx.horn && sfx.horn.bind(sfx); if (horn) sfx.horn = (...a) => { horn(...a); this.honk(); };
    // ---- OMNIYAT signs on the roofs
    this.signs = OMNIYAT.map(o => ({ ...o, mesh: null }));
    this.home = null;
    this.salikCool = {}; this.jamT = 0; this.heatT = 90; this.parkT = 0; this.quipT = 40;
  }
  save() { try { localStorage.setItem('dcs-fines', JSON.stringify(this.s)); } catch (e) { } }
  draw(bump) {
    const s = this.s; this.el.hidden = !(s.due > 0 || s.n > 0 || s.salik > 0);
    this.el.innerHTML = `📸 Fines ${fmt(s.due)}<small>${s.n} radar${s.n === 1 ? '' : 's'} · Salik ${fmt(s.salik)}${s.due > 0 ? ' · tap to pay' : ''}</small>`;
    if (bump) { this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump'); }
  }
  pay() {
    const s = this.s, M = this.g.missions; if (!(s.due > 0)) return toast('No fines to pay. For now.');
    const have = M ? M.money : 0; if (have < 1) return toast(`You owe ${fmt(s.due)} and your wallet is empty. Do a mission.`);
    const p = Math.min(have, s.due); M.earn(-p); s.due -= p; s.paid += p; this.save(); this.draw(true);
    toast(s.due > 0 ? `Paid ${fmt(p)}. Still ${fmt(s.due)} to go.` : `✅ All fines paid (${fmt(p)}). Dubai Police thanks you.`);
  }
  fine(n, why) { this.s.due += n; this.save(); this.draw(true); if (why) toast(why); }
  // honk outside a cafeteria while stopped in a car: karak to the window
  honk() {
    const p = this.g.player; if (!p || p.mode !== 'car' || Math.abs(p.v) > 2 || this.t - (this.lastKarak || -99) < 8) return;
    let best = null, bd = 45; for (const c of this.caf) { const d = Math.hypot(c[1] - p.x, c[2] - p.y); if (d < bd) { bd = d; best = c; } }
    if (!best) return; this.lastKarak = this.t; this.karaks = (this.karaks || 0) + 1; this.lastKarakAt = best[0];
    const M = this.g.missions; if (M && M.money >= 1.5) M.earn(-1.5); heal(15);
    toast(`☕ ${best[0]}: one karak to your window. AED 1.50. ${['Extra sugar, as always.', 'Zaafran? Next time.', 'The boy ran. In this heat.', 'Chips Oman paratha tomorrow.'][this.karaks % 4]}`);
    if (sfx.chime) sfx.chime();
  }
  radarMesh(r) {
    const g = new THREE.Group(); for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(this.radarGeo[i], this.radarMat[i]));
    g.position.set(r.x, ground(r.x, r.y), -r.y); g.rotation.y = r.h + Math.PI; this.scene.add(g); return g;
  }
  update(dt) {
    const g = this.g, p = g.player; if (!p || !g.started) return; this.t += dt; const car = p.mode === 'car';
    const st = car ? this.tiles.streetAt(p.x, p.y, 25) : null, lim = st ? SPEED_LIMIT[st.kind] : null, kmh = car ? p.dialKmh : 0;
    // ---- radars
    if (this.flashMat.opacity > 0) { this.flashMat.opacity = Math.max(0, this.flashMat.opacity - dt * 5); if (this.flashMat.opacity <= 0) this.flashBall.visible = false; }
    for (const r of this.radars) {
      const d = Math.hypot(r.x - p.x, r.y - p.y);
      if (d < 420) { if (!r.mesh) r.mesh = this.radarMesh(r); } else if (r.mesh && d > 520) { this.scene.remove(r.mesh); r.mesh = null; }
      if (r.cool > 0) r.cool -= dt;
      if (car && d < 34 && r.cool <= 0 && lim && kmh > lim + 20 && !(g.deadT > 0)) {
        r.cool = 25; const over = Math.round(kmh - lim), f = FINE(over); this.s.n++; this.count = this.s.n;
        this.fl.classList.remove('go'); void this.fl.offsetWidth; this.fl.classList.add('go'); if (sfx.camera) sfx.camera();
        this.flashBall.position.set(r.x, ground(r.x, r.y) + 3.6, -r.y); this.flashBall.visible = true; this.flashMat.opacity = 1;
        this.fine(f, `📸 FLASH! ${Math.round(kmh)} in a ${lim} zone. ${fmt(f)}${over > 60 ? ' and 12 black points' : over > 40 ? ' and 6 black points' : ''}. ${['Smile.', 'The radar never sleeps.', 'That is one expensive selfie.', 'Habibi, slow down.', 'Limit + 20, not limit + ' + over + '.'][this.s.n % 5]}`);
        if (this.s.n === 1) setTimeout(() => toast('Tap the red Fines box (top right) to pay them off.'), 5000);
      }
    }
    // ---- Salik
    if (car && st && st.kind <= 3) for (const s of SALIK) {
      const d = Math.hypot(s[1] - p.x, s[2] - p.y);
      if (d < 110 && !(this.salikCool[s[0]] > this.t)) { this.salikCool[s[0]] = this.t + 60; const peak = this.rush(); const f = peak ? 6 : 4; this.s.salik += f; const M = g.missions; if (M && M.money >= f) M.earn(-f); this.save(); this.draw(true); toast(`🟥 Salik · ${s[0]} gate: ${fmt(f)}${peak ? ' (peak hours)' : ''}. Beep.`); if (sfx.chime) sfx.chime(); }
    }
    // ---- rush hour: the big roads crawl
    const rush = this.rush(), tr = g.traffic;
    if (tr) {
      if (this.baseMax == null) this.baseMax = tr.max;
      tr.max = Math.round(this.baseMax * (rush ? 2.2 : 1)); tr.jam = rush ? 0.3 : 1;
      if (rush && car && st && st.kind <= 2 && (this.jamT -= dt) <= 0) { this.jamT = 150; toast(['🚗🚗🚗 Rush hour. Sheikh Zayed Road is a car park again.', '🚗🚗🚗 Google Maps says 9 minutes. It is lying.', '🚗🚗🚗 Everyone left the office at the same time. Again.', '🚗🚗🚗 Sharjah traffic. Nothing to add.'][Math.floor(this.t / 150) % 4]); }
    }
    // ---- parking: leave a car on a street in the old town and forget to pay
    if (car) { this.wasCar = true; this.parkT = 0; }
    else if (this.wasCar) { this.parkT += dt; if (this.parkT > 75) { this.wasCar = false; if (Math.random() < 0.45 && p.mode === 'foot') this.fine(150, '🅿️ RTA: parking fine AED 150. You forgot to SMS 7275.'); } }
    // ---- heat
    const hr = g.clock ?? 12;
    if (p.mode === 'foot' && hr > 11.5 && hr < 15.5 && (this.heatT -= dt) <= 0) { this.heatT = 240; toast(['🥵 46°C, feels like 54. Find a mall.', '🥵 The steering wheel will be 80°C when you get back.', '🥵 Nobody walks at this hour. Nobody.'][Math.floor(this.t / 240) % 3]); }
    // ---- home: the villa on 27C Street and the cars outside it
    const hx = (HOME.x0 + HOME.x1) / 2, hy = (HOME.y0 + HOME.y1) / 2, hd = Math.hypot(hx - p.x, hy - p.y);
    if (!this.home && hd < 700) {
      this.home = 'loading';
      loader.loadAsync('data/models/villa27c.glb').then(gl => {
        const o = gl.scene, bb = new THREE.Box3().setFromObject(o), s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
        o.traverse(m => { if (m.isMesh) { m.material = new THREE.MeshLambertMaterial({ map: m.material.map }); m.castShadow = true; m.receiveShadow = true; } });
        const grp = new THREE.Group(); o.position.set(-c.x, -bb.min.y, -c.z); grp.add(o);
        grp.scale.set((HOME.x1 - HOME.x0 + 0.7) / s.x, HOME.h / s.y, (HOME.y1 - HOME.y0 + 0.7) / s.z);
        grp.position.set(hx, ground(hx, hy) - 0.05, -hy); this.scene.add(grp); this.home = grp;
      }).catch(() => { this.home = 'none'; });
    }
    if (!this.homeCars && hd < 260 && g.traffic && g.traffic.pieces && g.traffic.pieces.length) {
      this.homeCars = true;
      for (const [k, x] of [['sentra', 1139.6], ['jeep', 1144.4], ['lexus', 1149.2]]) {      // as in the street photo: grey Nissan, black Jeep, white Lexus, nose to the wall
        const y = -153.2, mesh = makeCar(k), gy = ground(x, y), car = { mesh, parked: true, x, y, h: 0, gy, v: 0, s: 0, dir: 1, piece: g.traffic.pieces[0], mission: true, hp: 200 };
        mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(0); this.scene.add(mesh); g.traffic.cars.push(car);
      }
    }
    // ---- OMNIYAT signs: put one on the roof once that tower has loaded
    for (const s of this.signs) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (!s.mesh && d < 1500) {
        const h = this.tiles.roofAt ? this.tiles.roofAt(s.x, s.y) : -1e9; if (!(h > -1e8)) continue;
        const grp = new THREE.Group(), tex = signTex('OMNIYAT', s.label.replace(' by OMNIYAT', '').toUpperCase()), mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
        for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), mat); m.position.y = 5.5; m.rotation.y = k * Math.PI; m.position.z = k ? -0.3 : 0.3; grp.add(m); }
        for (const sx of [-12, 12]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), this.radarMat[0]); leg.position.set(sx, 0.9, 0); grp.add(leg); }
        grp.position.set(s.x, h, -s.y); grp.rotation.y = Math.atan2(p.x - s.x, -(-(p.y - s.y))) ; this.scene.add(grp); s.mesh = grp;
      } else if (s.mesh && d > 2600) { this.scene.remove(s.mesh); s.mesh = null; }
      if (s.mesh && d < 90 && !s.seen) { s.seen = true; toast(`🏙️ ${s.label}. ${s.note}`); }
    }
  }
  rush() { const h = this.g.clock ?? 12; return (h >= 7 && h < 9) || (h >= 17 && h < 19.5); }
}

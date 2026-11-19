// Dubai City Stories: the things only Dubai does to a driver.
//   speed radars that flash you (with the famous 20 km/h grace), a running total of fines you can pay off
//   Salik toll gates, rush-hour jams, karak chai brought to your car window when you honk outside a cafeteria
//   parking fines, summer heat, and OMNIYAT's buildings signed on the skyline
import * as THREE from 'three';
import { toast } from './hud.js?v=11190630';
import { ground } from './terrain.js?v=11190630';
import { SPEED_LIMIT } from './tiles.js?v=11190630';
import { sfx } from './sound.js?v=11190630';
import { heal } from './health.js?v=11190630';
import { loader } from './gltf.js?v=11190630';
import { makeCar } from './actors.js?v=11190630';
import { plateOpt } from './cars3d.js?v=11190630';
import { Character } from './rig.js?v=11190630';
import { standY } from './tiles.js?v=11190630';
import { TYRE_Y, rotY } from './player.js?v=11190630';

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
  { label: 'AB Residence 2, Al Warsan', x: 4902.8, y: -10429.4 },
  { label: '27C Street, Al Garhoud', x: 1137, y: -160 },
  { label: 'Karakccino', x: 1113, y: -1188 },
  { label: 'Karak House', x: -6377, y: -5871 },
  { label: 'FiLLi Café', x: -3682, y: 604 },
  { label: 'Arabian Tea House', x: -4058, y: 2145 },
  { label: 'Rashid Hospital', x: -2166, y: 72 },
];
// where each character lives, and the car that waits outside
export const HOMES = {
  ali: { x: 1146, y: -158.5, h: 0, name: '27C Street, Al Garhoud' },
  farah: { x: 4902.8, y: -10429.4, h: 0.3658, name: 'AB Residence 2, Warsan Fourth', car: 'tiida', carAt: [4905.8, -10425.2, 0.3658] },      // her black Tiida waits outside
};
const SALIK = [['Al Garhoud Bridge', -265, -1236], ['Al Maktoum Bridge', -1894, 856], ['Business Bay Crossing', 951, -1796], ['Airport Tunnel', 3020, 610], ['Al Safa', -7700, -5560], ['Infinity Bridge', -3959, 3756]];
// Ali's lines: [Arabic as spoken, what it means]
export const ALI = {
  karak: [['يا محمد! واحد كرك!', 'Muhammad! Wahid karak!'], ['يا محمد! واحد كرك، سكر زيادة!', 'Muhammad! One karak, extra sugar!']],
  flash: [['لا لا لا! مخالفة ثانية؟ والله حرام!', 'No no no! Another fine? Wallah, haram!'], ['يا سلام! صورة حلوة، بس غالية!', 'Ya salam! Nice photo, but expensive!']],
  jam: [['يا الله، شو هالزحمة! كل يوم نفس الشي!', 'Ya Allah, this traffic! Same thing every day!'], ['يلا يلا يلا! تحرك يا حبيبي!', 'Yalla yalla yalla! Move, habibi!']],
  police: [['يا ساتر! الشرطة! يلا يلا!', 'Ya satir! Police! Yalla yalla!'], ['أنا ما سويت شي، والله!', 'I did nothing, wallah!']],
  steal: [['معليش حبيبي، بس استعارة! برجعها بكرة إن شاء الله!', 'Sorry habibi, just borrowing! Back tomorrow, inshallah!']],
  lost: [['خلاص! راحوا! أنا الأسطورة!', 'Khalas! They are gone! I am the legend!']],
  salik: [['سالك مرة ثانية؟ أدفع عشان أوقف في الزحمة!', 'Salik again? I pay to sit in traffic!']],
  hot: [['حر! حر! وين المكيف؟', 'Hot! Hot! Where is the AC?']],
  pay: [['خذوا فلوسي كلها، خلاص!', 'Take all my money, khalas!']],
  wasted: [['آخ... قولوا لأمي إني كنت ولد زين.', 'Akh... tell my mother I was a good boy.']],
};
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
    fetch('data/biz.json').then(r => r.json()).then(d => { const P = game.people; if (!P) return; const G = new Map(); for (const b of d.b) { if (!/shop|food|cafe|restaurant/i.test(b[3])) continue; const k = Math.floor(b[0] / 150) + ',' + Math.floor(b[1] / 150); (G.get(k) || G.set(k, []).get(k)).push(b); } P.shops = G; }).catch(() => { });
    this.caf = []; fetch('data/karak.json').then(r => r.json()).then(d => { this.caf = d; }).catch(() => { });
    const horn = sfx.horn && sfx.horn.bind(sfx); if (horn) sfx.horn = (...a) => { horn(...a); this.honk(); };
    // ---- OMNIYAT signs on the roofs
    this.signs = OMNIYAT.map(o => ({ ...o, mesh: null }));
    this.home = null;
    this.salikCool = {}; this.jamT = 0; this.heatT = 90; this.parkT = 0; this.quipT = 40;
  }
  homeFor(story) { return HOMES[story] || null; }
  // the character's own car, parked beside where they start
  stockCar(x, y, h, kind) { this.stock = { x, y, h, kind }; }
  save() { try { localStorage.setItem('dcs-fines', JSON.stringify(this.s)); } catch (e) { } }
  draw(bump) {
    const s = this.s; this.el.hidden = !(s.due > 0 || s.n > 0 || s.salik > 0);
    this.el.innerHTML = `📸 Fines ${fmt(s.due)}<small>${s.n} radar${s.n === 1 ? '' : 's'} · Salik ${fmt(s.salik)}${s.due > 0 ? ' · tap to pay' : ''}</small>`;
    if (bump) { this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump'); }
  }
  pay() {
    const s = this.s, M = this.g.missions; if (!(s.due > 0)) return toast('No fines to pay. For now.');
    const have = M ? M.money : 0; if (have < 1) return toast(`You owe ${fmt(s.due)} and your wallet is empty. Do a mission.`);
    const p = Math.min(have, s.due); M.earn(-p); this.say('pay', true); s.due -= p; s.paid += p; this.save(); this.draw(true);
    toast(s.due > 0 ? `Paid ${fmt(p)}. Still ${fmt(s.due)} to go.` : `✅ All fines paid (${fmt(p)}). Dubai Police thanks you.`);
  }
  fine(n, why) { this.s.due += n; this.save(); this.draw(true); if (why) toast(why); }
  // honk outside a cafeteria while stopped in a car: karak to the window
  honk() {
    const p = this.g.player; if (!p || p.mode !== 'car' || Math.abs(p.v) > 2 || this.t - (this.lastKarak || -99) < 8) return;
    let best = null, bd = 45; for (const c of this.caf) { const d = Math.hypot(c[1] - p.x, c[2] - p.y); if (d < bd) { bd = d; best = c; } }
    const SH = this.g.people && this.g.people.shops;      // any restaurant will do
    if (!best && SH) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const b of SH.get((Math.floor(p.x / 150) + i) + ',' + (Math.floor(p.y / 150) + j)) || []) { if (b[3] !== 'food') continue; const d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d < bd) { bd = d; best = [b[2], b[0], b[1]]; } }
    if (!best) return; this.lastKarak = this.t; this.karaks = (this.karaks || 0) + 1; this.lastKarakAt = best[0];
    this.say('karak', true);
    // the cafeteria boy runs out with the tray, hands it over at the window and walks back
    if (!this.waiter) { const ch = new Character({ glb: 'npc_teen', skin: 0xb98260, shirt: 0xc8102e, pants: 0x1c1c1c, hair: 0x15100d }); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.11, 8), new THREE.MeshLambertMaterial({ color: 0xf5f0e6 })); cup.position.set(0.24, 1.08, 0.3); ch.g.add(cup); this.waiter = { ch, cup }; }
    const w = this.waiter, ang = Math.atan2(best[1] - p.x, best[2] - p.y), d0 = Math.min(Math.max(bd, 12), 22);
    Object.assign(w, { on: true, sx: p.x + Math.sin(ang) * d0, sy: p.y + Math.cos(ang) * d0, tx: p.x + Math.sin(p.h + Math.PI / 2) * 1.6, ty: p.y + Math.cos(p.h + Math.PI / 2) * 1.6, u: 0, st: 'out', wait: 0 }); w.cup.visible = true; this.scene.add(w.ch.g);
    const M = this.g.missions; if (M && M.money >= 1.5) M.earn(-1.5); heal(15);
    toast(`☕ ${best[0]}: one karak to your window. AED 1.50. ${['Extra sugar, as always.', 'Zaafran? Next time.', 'The boy ran. In this heat.', 'Chips Oman paratha tomorrow.'][this.karaks % 4]}`);
    if (sfx.chime) sfx.chime();
  }
  // Ali talks. Arabic, loudly. (played only when you are Ali; the words are shown too)
  say(key, force) {
    if (this.g.story !== 'ali' || (!force && this.t - (this.saidT || -99) < 9)) return; this.saidT = this.t;
    const L = ALI[key]; if (!L) return; const i = Math.floor(Math.random() * L.length), l = L[i];
    try { if (this.voice) this.voice.pause(); const a = this.voice = new Audio(`audio/ali/${key}${i}.mp3`); a.volume = 1; a.play().catch(() => { }); } catch (e) { }
    toast(`🗣️ Ali: “${l[1]}”  ${l[0]}`, 4200);
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
        this.say('flash');
        if (this.s.n === 1) setTimeout(() => toast('Tap the red Fines box (top right) to pay them off.'), 5000);
      }
    }
    // ---- Salik
    if (car && st && st.kind <= 3) for (const s of SALIK) {
      const d = Math.hypot(s[1] - p.x, s[2] - p.y);
      if (d < 110 && !(this.salikCool[s[0]] > this.t)) { this.salikCool[s[0]] = this.t + 60; const peak = this.rush(); const f = peak ? 6 : 4; this.s.salik += f; const M = g.missions; if (M && M.money >= f) M.earn(-f); this.save(); this.draw(true); toast(`🟥 Salik · ${s[0]} gate: ${fmt(f)}${peak ? ' (peak hours)' : ''}. Beep.`); this.say('salik'); if (sfx.chime) sfx.chime(); }
    }
    // ---- rush hour: the big roads crawl
    const rush = this.rush(), tr = g.traffic;
    if (tr) {
      if (this.baseMax == null) this.baseMax = tr.max;
      tr.max = Math.round(this.baseMax * (rush ? 2.2 : 1)); tr.jam = rush ? 0.3 : 1;
      if (rush && car && st && st.kind <= 2 && (this.jamT -= dt) <= 0) { this.jamT = 150; this.say('jam'); toast(['🚗🚗🚗 Rush hour. Sheikh Zayed Road is a car park again.', '🚗🚗🚗 Google Maps says 9 minutes. It is lying.', '🚗🚗🚗 Everyone left the office at the same time. Again.', '🚗🚗🚗 Sharjah traffic. Nothing to add.'][Math.floor(this.t / 150) % 4]); }
    }
    // ---- parking: leave a car on a street in the old town and forget to pay
    if (car) { this.wasCar = true; this.parkT = 0; }
    else if (this.wasCar) { this.parkT += dt; if (this.parkT > 75) { this.wasCar = false; if (Math.random() < 0.45 && p.mode === 'foot') this.fine(150, '🅿️ RTA: parking fine AED 150. You forgot to SMS 7275.'); } }
    // ---- heat
    const hr = g.clock ?? 12;
    if (p.mode === 'foot' && hr > 11.5 && hr < 15.5 && (this.heatT -= dt) <= 0) { this.heatT = 240; this.say('hot'); toast(['🥵 46°C, feels like 54. Find a mall.', '🥵 The steering wheel will be 80°C when you get back.', '🥵 Nobody walks at this hour. Nobody.'][Math.floor(this.t / 240) % 3]); }
    // ---- Ali reacts to the police, to losing them, to dying
    const cr = g.crime, stars = cr ? cr.stars : 0;
    if (stars > (this.pStars || 0)) this.say(stars === 1 && cr.lastWhy && /car/i.test(cr.lastWhy) ? 'steal' : 'police'); else if (!stars && this.pStars && !(g.deadT > 0)) this.say('lost', true);
    this.pStars = stars; if (g.deadT > 0 && !this.wasDead) this.say('wasted', true); this.wasDead = g.deadT > 0;
    // ---- the karak boy
    const w = this.waiter;
    if (w && w.on) {
      const A = w.st === 'out' ? [w.sx, w.sy, w.tx, w.ty] : [w.tx, w.ty, w.sx, w.sy], L = Math.hypot(A[2] - A[0], A[3] - A[1]) || 1;
      if (w.st === 'give') { w.ch.animate(dt, { speed: 0 }); if ((w.wait += dt) > 1.4) { w.st = 'back'; w.u = 0; w.cup.visible = false; } }
      else { w.u += 3.4 * dt / L; w.ch.animate(dt, { speed: 3.4, run: true }); if (w.u >= 1) { w.u = 1; if (w.st === 'out') { w.st = 'give'; w.wait = 0; } else { w.on = false; this.scene.remove(w.ch.g); } } }
      const x = A[0] + (A[2] - A[0]) * w.u, y = A[1] + (A[3] - A[1]) * w.u; w.ch.g.position.set(x, standY(x, y) + 0.05, -y); w.ch.g.rotation.y = Math.PI - Math.atan2(A[2] - A[0], A[3] - A[1]);
    }
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
        // the gate in the front wall: sand-coloured boards in a dark brown frame, two leaves, cream posts
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d');
        x.fillStyle = '#3b2a1c'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#d2bd8a'; for (let i = 0; i < 2; i++) for (let s = 0; s < 14; s++) x.fillRect(14 + i * 250 + s * 17, 16, 13, 224);
        x.fillStyle = '#3b2a1c'; x.fillRect(250, 0, 12, 256); x.fillStyle = '#1c1c1c'; x.fillRect(236, 120, 8, 26); x.fillRect(268, 120, 8, 26);
        const gt = new THREE.CanvasTexture(cv); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 4;
        const gate = new THREE.Group(), gy0 = ground(1145, -151.7);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.95, 0.1), [0, 0, 0, 0, 0, 0].map((_, i) => i >= 4 ? new THREE.MeshLambertMaterial({ map: gt }) : new THREE.MeshLambertMaterial({ color: 0x3b2a1c }))); leaf.position.y = 1.0; gate.add(leaf);
        for (const sx of [-2.45, 2.45]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xe9dfc6 })); post.position.set(sx, 1.15, 0); gate.add(post); const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), new THREE.MeshLambertMaterial({ color: 0xffffff })); cap.position.set(sx, 2.35, 0); gate.add(cap); }
        gate.position.set(1144.6, gy0, 151.75); this.scene.add(gate);
      }).catch(e => { console.warn('home', e); this.home = this.home === 'loading' ? 'none' : this.home; });
    }
    if (this.homeCars && hd > 520) this.homeCars = false;      // they are put back when you come home
    if (!this.homeCars && hd < 260 && g.traffic && g.traffic.pieces && g.traffic.pieces.length) {
      this.homeCars = true; this.homeList = [];
      // parked nose to the wall, all on Dubai plates: grey Sentra, red Yaris, (the gate), black Jeep, white Sorento
      for (const [k, x] of [['sentra', 1135.6], ['yaris', 1139.0], ['jeep', 1149.9], ['sorento', 1153.6]]) {
        plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(k); } finally { plateOpt.dubaiOnly = false; }
        const y = -154.4, gy = ground(x, y), car = { mesh, parked: true, x, y, h: 0, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200 }; this.homeList.push(car);
        mesh.position.set(x, gy + TYRE_Y, -y); mesh.rotation.y = rotY(0); this.scene.add(mesh); g.traffic.cars.push(car);
      }
    }
    // the red BMW 650i is parked at both homes: outside 27C Street and in front of AB Residence 2
    for (const b of (this.bmws ||= [{ x: 1131.8, y: -154.4, h: 0 }, { x: 4908.4, y: -10418.2, h: 0.3658 }])) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (b.car && (b.car.dead || d > 520)) { if (d > 520 && !b.car.dead && Math.hypot(b.car.x - b.x, b.car.y - b.y) < 3 && p.car !== b.car) { this.scene.remove(b.car.mesh); const i = g.traffic.cars.indexOf(b.car); if (i >= 0) g.traffic.cars.splice(i, 1); } if (d > 520) b.car = null; }
      if (!b.car && d < 260 && g.traffic && g.traffic.pieces && g.traffic.pieces.length) {
        plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar('bmw6'); } finally { plateOpt.dubaiOnly = false; }
        const gy = ground(b.x, b.y), car = b.car = { mesh, parked: true, x: b.x, y: b.y, h: b.h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200 };
        mesh.position.set(b.x, gy + TYRE_Y, -b.y); mesh.rotation.y = rotY(b.h); this.scene.add(mesh); g.traffic.cars.push(car);
      }
    }
    // your own car is always waiting outside your home (Farah: the black Tiida at AB Residence 2)
    const hm = HOMES[g.story];
    if (hm && hm.car && !this.stock && p.mode === 'foot' && (!this.ownCar || this.ownCar.dead) && g.traffic && Math.hypot(hm.x - p.x, hm.y - p.y) < 220) this.stock = hm.carAt ? { x: hm.carAt[0], y: hm.carAt[1], h: hm.carAt[2], kind: hm.car, tell: true } : { x: hm.x + 3.4, y: hm.y + 1.5, h: hm.h || 0, kind: hm.car, tell: true };
    if (this.stock && g.traffic && g.traffic.pieces && g.traffic.pieces.length && Math.hypot(this.stock.x - p.x, this.stock.y - p.y) < 260) {
      const s = this.stock; this.stock = null; plateOpt.dubaiOnly = true; let mesh; try { mesh = makeCar(s.kind); } finally { plateOpt.dubaiOnly = false; }
      if (s.tell) toast('🚗 Your black Tiida is parked right beside you.', 3500);
      const gy = ground(s.x, s.y), car = { mesh, parked: true, x: s.x, y: s.y, h: s.h, gy, v: 0, s: 0, dir: 1, piece: { tile: null }, mission: true, hp: 200, owned: true };
      mesh.position.set(s.x, gy + TYRE_Y, -s.y); mesh.rotation.y = rotY(s.h); this.scene.add(mesh); g.traffic.cars.push(car); this.ownCar = car;
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

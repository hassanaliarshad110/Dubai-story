// Dubai City Stories: weapons, wanted stars and police chases.
// Guns are hitscan (pistol, SMG, shotgun, AK, sniper, minigun); grenades, rockets, homing missiles and an airstrike explode.
// Every crime adds heat: shooting where people can see, hurting or killing someone, running people over, stealing a car,
// blowing things up. Heat is stars (1 to 5); the police send one chase car per star, arrest you at one star and shoot from two.
import * as THREE from 'three';
import { toast } from './hud.js?v=11112231';
import { hurt } from './health.js?v=11112231';
import { makeCar } from './actors.js?v=11112231';
import { ground } from './terrain.js?v=11112231';
import { standY } from './tiles.js?v=11112231';
import { dirOf, rotY, TYRE_Y } from './player.js?v=11112231';
import { spinWheels } from './vehicles.js?v=11112231';
import { lightsOn } from './carlights.js?v=11112231';
import { sfx } from './sound.js?v=11112231';

export const WEAPONS = [
  { id: 0, icon: '👊', name: 'Fists', melee: true, dmg: 50, every: 0.5, range: 1.8 },
  { id: 1, icon: '🔫', name: 'Pistol', dmg: 40, every: 0.3, range: 60, spread: 0.015, snd: 'pistol', len: 0.2 },
  { id: 2, icon: '🔫', name: 'SMG', dmg: 22, every: 0.075, range: 60, spread: 0.045, snd: 'smg', len: 0.34 },
  { id: 3, icon: '💥', name: 'Shotgun', dmg: 22, pellets: 8, every: 0.85, range: 30, spread: 0.1, snd: 'shotgun', len: 0.6 },
  { id: 4, icon: '🪖', name: 'AK-47', dmg: 36, every: 0.105, range: 110, spread: 0.025, snd: 'rifle', len: 0.7 },
  { id: 5, icon: '🎯', name: 'Sniper rifle', dmg: 400, every: 1.3, range: 400, spread: 0, snd: 'sniper', len: 0.95 },
  { id: 6, icon: '⚙️', name: 'Minigun', dmg: 30, every: 0.035, range: 110, spread: 0.05, snd: 'smg', len: 0.8, fat: true },
  { id: 7, icon: '💣', name: 'Grenades', throw: true, every: 0.9, speed: 17, up: 0.4, g: 9.8, R: 8, life: 4 },
  { id: 8, icon: '🚀', name: 'RPG', rocket: true, every: 1.1, speed: 60, R: 10, life: 5, len: 0.95, tube: true },
  { id: 9, icon: '🛰️', name: 'Homing missile', rocket: true, homing: true, every: 1.4, speed: 48, R: 11, life: 8, len: 1.05, tube: true },
  { id: 10, icon: '☢️', name: 'Heavy missile', rocket: true, every: 2.4, speed: 42, R: 22, life: 7, len: 1.2, tube: true, big: true },
  { id: 11, icon: '✈️', name: 'Airstrike', strike: true, every: 6, R: 14 },
];
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3();
const CSS = `
#wanted { position: fixed; top: calc(env(safe-area-inset-top) + 74px); left: 50%; transform: translateX(-50%); z-index: 21; font: 900 22px system-ui, sans-serif; letter-spacing: 3px; pointer-events: none; text-shadow: 0 1px 4px #000; white-space: nowrap; }
#wanted i { font-style: normal; color: rgba(255,255,255,.22); } #wanted i.on { color: #ffd21a; }
#wanted.search i.on { animation: wblink .5s infinite alternate; } @keyframes wblink { to { opacity: .25; } }
#wanted[hidden] { display: none; }
#wp-fire, #wp-next { position: fixed; z-index: 26; border-radius: 50%; border: 2px solid rgba(255,255,255,.6); color: #fff; touch-action: none; user-select: none; -webkit-user-select: none; }
#wp-fire { right: 14px; bottom: calc(env(safe-area-inset-bottom) + 196px); width: 66px; height: 66px; font-size: 28px; background: rgba(200, 20, 30, .72); }
#wp-fire:active { background: rgba(255, 60, 60, .95); }
#wp-next { right: 92px; bottom: calc(env(safe-area-inset-bottom) + 204px); width: 50px; height: 50px; font-size: 22px; background: rgba(15, 23, 32, .68); }
#wp-name { position: fixed; right: 14px; bottom: calc(env(safe-area-inset-bottom) + 268px); z-index: 26; font: 700 12px system-ui, sans-serif; color: #fff; background: rgba(15,23,32,.6); padding: 3px 9px; border-radius: 10px; pointer-events: none; }
#busted { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.55); color: #fff; font: 900 54px system-ui, sans-serif; letter-spacing: 4px; text-shadow: 0 3px 12px #000; pointer-events: none; }
#busted small { display: block; font-size: 16px; letter-spacing: 0; font-weight: 600; margin-top: 8px; text-align: center; }
#busted[hidden] { display: none; }
body.cine #wanted, body.cine #wp-fire, body.cine #wp-next, body.cine #wp-name { display: none; }
@media (orientation: landscape) { #wp-fire { right: 236px; bottom: calc(env(safe-area-inset-bottom) + 26px); } #wp-next { right: 314px; bottom: calc(env(safe-area-inset-bottom) + 34px); } #wp-name { right: 236px; bottom: calc(env(safe-area-inset-bottom) + 98px); } }`;

export class Crime {
  constructor(game, scene) {
    this.g = game; this.scene = scene; this.w = 0; this.held = false; this.cool = 0;
    this.heat = 0; this.stars = 0; this.unseen = 0; this.units = []; this.spawnT = 0; this.bustT = 0;
    this.rockets = []; this.fx = []; this.tracers = []; this.bodies = []; this.wrecks = []; this.strikes = []; this.kills = 0;
    this.sphere = new THREE.SphereGeometry(1, 12, 8); this.cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.mTracer = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mCop = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mFlash = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mSmoke = new THREE.MeshBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.5, depthWrite: false });
    this.mRocket = new THREE.MeshLambertMaterial({ color: 0x4a5a3a }); this.mGrenade = new THREE.MeshLambertMaterial({ color: 0x2f3b2a });
    this.mWreck = new THREE.MeshLambertMaterial({ color: 0x191919 }); this.mBlood = new THREE.MeshBasicMaterial({ color: 0x6a0a0a, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
    this.mScorch = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
    this.mGun = new THREE.MeshLambertMaterial({ color: 0x1c1d20 }); this.mWood = new THREE.MeshLambertMaterial({ color: 0x6a4424 }); this.mOlive = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });
    this.disc = new THREE.CircleGeometry(1, 20); this.disc.rotateX(-Math.PI / 2);
    this.ui();
    game.onDeath = () => this.wasted();
  }
  // ---------------------------------------------------------------- buttons and keys
  ui() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const mk = (tag, id, html) => { const e = document.createElement(tag); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
    this.elStars = mk('div', 'wanted', '<i>★</i><i>★</i><i>★</i><i>★</i><i>★</i>'); this.elStars.hidden = true;
    this.elFire = mk('button', 'wp-fire', '👊'); this.elNext = mk('button', 'wp-next', '🔁'); this.elName = mk('div', 'wp-name', 'Fists');
    this.elBust = mk('div', 'busted', ''); this.elBust.hidden = true;
    for (const e of [this.elFire, this.elNext, this.elName]) e.style.display = 'none';
    const down = e => { e.preventDefault(); e.stopPropagation(); this.held = true; }, up = () => { this.held = false; };
    this.elFire.addEventListener('pointerdown', down); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.elFire.addEventListener(ev, up);
    this.elNext.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.cycle(1); });
    addEventListener('keydown', e => {
      if (!this.g.started || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      if (e.code === 'KeyQ' && !e.repeat) this.cycle(e.shiftKey ? -1 : 1);
      else if (e.code === 'KeyX' || e.code === 'ControlLeft' || e.code === 'ControlRight') { this.held = true; e.preventDefault(); }
      else if (/^Digit\d$/.test(e.code) && !e.repeat) { const n = +e.code.slice(5); this.setWeapon(n === 0 ? 10 : n); }
    });
    addEventListener('keyup', e => { if (e.code === 'KeyX' || e.code === 'ControlLeft' || e.code === 'ControlRight') this.held = false; });
    addEventListener('blur', () => { this.held = false; });
    addEventListener('contextmenu', e => { if (this.g.started && e.target && e.target.tagName === 'CANVAS') e.preventDefault(); });
    addEventListener('pointerdown', e => { if (this.g.started && e.pointerType === 'mouse' && e.button === 2 && e.target.tagName === 'CANVAS') this.held = true; });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 2) this.held = false; });
  }
  show(on) { for (const e of [this.elFire, this.elNext, this.elName]) e.style.display = on ? '' : 'none'; }
  cycle(d) { this.setWeapon((this.w + d + WEAPONS.length) % WEAPONS.length); }
  setWeapon(i) {
    if (!WEAPONS[i]) return; this.w = i; const W = WEAPONS[i];
    this.elFire.textContent = W.icon; this.elName.textContent = W.name; toast(`${W.icon} ${W.name}`, 1200); this.updateHeld();
  }
  // the weapon in the right hand
  updateHeld() {
    const ch = this.g.player && this.g.player.char; if (!ch || !ch.bones) return;
    const hand = ch.bones.RightHand || ch.bones.handR; if (!hand) return;
    if (this.prop) { this.prop.parent && this.prop.parent.remove(this.prop); this.prop = null; }
    this.propChar = ch; const W = WEAPONS[this.w]; if (W.melee || W.strike) return;
    const k = hand.isBone && ch.mixer ? 100 : 1, g = new THREE.Group(), box = (w, h, l, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); b.position.set(x, y, z); g.add(b); return b; };
    if (W.throw) { const e = new THREE.Mesh(this.sphere, this.mGrenade); e.scale.set(0.05, 0.065, 0.05); g.add(e); }
    else if (W.tube) { const t = new THREE.Mesh(this.cyl, this.mOlive); t.rotation.x = Math.PI / 2; t.scale.set(W.big ? 0.075 : 0.055, W.len, W.big ? 0.075 : 0.055); t.position.set(0, 0.1, 0.1); g.add(t); box(0.03, 0.12, 0.04, this.mGun, 0, 0, 0); const tip = new THREE.Mesh(new THREE.ConeGeometry(W.big ? 0.09 : 0.065, 0.22, 8), this.mRocket); tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.1, 0.1 + W.len / 2 + 0.08); g.add(tip); }
    else {
      const L = W.len; box(0.035, 0.07, L, this.mGun, 0, 0.03, L / 2 - 0.08); box(0.03, 0.1, 0.04, W.id === 4 ? this.mWood : this.mGun, 0, -0.04, -0.03);
      if (L > 0.3) { box(0.03, 0.06, 0.18, W.id === 4 || W.id === 3 ? this.mWood : this.mGun, 0, 0.01, -0.2); box(0.025, 0.11, 0.05, this.mGun, 0, -0.05, L * 0.3); }
      if (W.fat) for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(this.cyl, this.mGun); b.rotation.x = Math.PI / 2; b.scale.set(0.012, 0.5, 0.012); b.position.set(Math.cos(i) * 0.03, 0.03 + Math.sin(i) * 0.03, L * 0.75); g.add(b); }
      if (W.id === 5) { const sc = new THREE.Mesh(this.cyl, this.mGun); sc.rotation.x = Math.PI / 2; sc.scale.set(0.02, 0.24, 0.02); sc.position.set(0, 0.09, L * 0.3); g.add(sc); }
    }
    g.rotation.x = -Math.PI / 2;       // the barrel points along the hand
    g.scale.setScalar(k); g.position.set(0, 0.08 * k, 0.02 * k); hand.add(g); this.prop = g;
  }
  // ---------------------------------------------------------------- crime and stars
  crime(n, why) {
    const s0 = this.stars; this.heat = Math.min(5.4, this.heat + n); this.stars = Math.min(5, Math.floor(this.heat)); this.unseen = 0;
    if (this.stars > s0) { toast(`🚨 ${'★'.repeat(this.stars)} ${why || 'Wanted'}`, 2200); this.drawStars(); }
  }
  atLeast(n, why) { if (this.heat < n) this.crime(n - this.heat, why); else this.unseen = 0; }
  drawStars() { this.elStars.hidden = this.stars < 1; [...this.elStars.children].forEach((e, i) => e.classList.toggle('on', i < this.stars)); }
  clear(msg) { this.heat = 0; this.stars = 0; this.unseen = 0; this.drawStars(); this.elStars.classList.remove('search'); for (const u of this.units) u.leave = 8; if (msg) toast(msg, 2600); }
  witnesses(x, y, r = 45) {
    const P = this.g.people; if (P) for (const w of P.walkers) { const p = w.ch.g.position; if (Math.abs(p.x - x) < r && Math.abs(-p.z - y) < r) return true; }
    for (const c of this.g.traffic.cars) if (!c.parked && !c.player && Math.abs(c.x - x) < r && Math.abs(c.y - y) < r) return true;
    return false;
  }
  // taking a car that is not yours: a carjacking always, a parked car when someone sees it
  stole(c) {
    if (c.owned) return; const pol = c.mesh.userData.police;
    if (pol) this.atLeast(2, 'You stole a police car!');
    else if (!c.parked) { this.atLeast(1, 'Carjacking!'); this.fleeDriver(c); }
    else if (this.witnesses(c.x, c.y, 40)) this.atLeast(1, 'Car theft reported!');
    c.owned = true;
  }
  fleeDriver(c) { const P = this.g.people; if (P && P.flee) P.flee(c.x - Math.cos(c.h) * 2, c.y + Math.sin(c.h) * 2); }
  wasted() { this.clear(); for (const u of this.units) u.leave = 0.01; this.held = false; }
  busted() {
    const fine = 500 * Math.max(1, this.stars), m = this.g.missions;
    if (m && m.pay) m.pay(Math.min(fine, Math.max(0, m.money)));
    this.elBust.innerHTML = `<div>BUSTED<small>Dubai Police fined you AED ${fine}. Your weapons were taken.</small></div>`; this.elBust.hidden = false; setTimeout(() => { this.elBust.hidden = true; }, 2800);
    this.setWeapon(0); this.clear(); for (const u of this.units) u.leave = 3;
    const p = this.g.player; if (p.mode === 'car') { const c = p.exit(); if (c) this.g.traffic.release(c); const sp = document.getElementById('speed'); if (sp) sp.hidden = true; }
  }
  // ---------------------------------------------------------------- targets
  targets() {
    const T = [], P = this.g.people, p = this.g.player;
    if (P) for (const w of P.walkers) { const q = w.ch.g.position; T.push({ x: q.x, y: -q.z, z: q.y + 1.1, r: 0.55, h: 0.9, ped: w }); }
    for (const c of this.g.traffic.cars) { if (c.dead || c === p.car) continue; T.push({ x: c.x, y: c.y, z: c.gy + 0.8, r: 1.5, h: 0.9, car: c }); }
    for (const u of this.units) if (!u.dead) T.push({ x: u.x, y: u.y, z: u.gy + 0.8, r: 1.6, h: 0.9, unit: u });
    return T;
  }
  origin() {
    const p = this.g.player, [fx, fy] = dirOf(p.h);
    if (p.mode === 'heli') return { x: p.x + fx * 2.5, y: p.y + fy * 2.5, z: p.gy + 0.6, fx, fy, fz: -Math.min(0.9, Math.max(0.05, (p.gy - ground(p.x, p.y)) / 70)) };
    if (p.mode === 'car') return { x: p.x + fx * 2.6, y: p.y + fy * 2.6, z: p.gy + 1.15, fx, fy, fz: 0 };
    return { x: p.x + fx * 0.7 + fy * 0.18, y: p.y + fy * 0.7 - fx * 0.18, z: p.gy + 1.35, fx, fy, fz: 0 };
  }
  // aim straight ahead, or at the nearest target in front (within the range and about 20 degrees)
  aim(o, range, T) {
    let best = null, bd = range;
    for (const t of T) { const dx = t.x - o.x, dy = t.y - o.y, d = Math.hypot(dx, dy); if (d > bd || d < 0.6) continue; if ((dx * o.fx + dy * o.fy) / d < 0.93) continue; best = t; bd = d; }
    if (best) { const dx = best.x - o.x, dy = best.y - o.y, dz = best.z - o.z, d = Math.hypot(dx, dy, dz) || 1; return { fx: dx / d, fy: dy / d, fz: dz / d, lock: best }; }
    const d = Math.hypot(o.fx, o.fy, o.fz) || 1; return { fx: o.fx / d, fy: o.fy / d, fz: o.fz / d, lock: null };
  }
  blockedAt(x, y, z) { if (z < ground(x, y)) return true; const tl = this.g.tiles, r = tl && tl.roofAt ? tl.roofAt(x, y) : null; return r != null && z < r; }
  // ---------------------------------------------------------------- firing
  fire() {
    const p = this.g.player, W = WEAPONS[this.w]; if (!p || this.g.deadT > 0 || p.mode === 'ride') return;
    if ((W.melee || W.throw) && p.mode !== 'foot') return;
    const o = this.origin(), T = this.targets();
    if (W.melee) {
      const ch = p.char; if (ch) ch.pose = { throw: 0 };
      for (const t of T) { if (!t.ped) continue; const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy); if (d < W.range && (dx * o.fx + dy * o.fy) / (d || 1) > 0.3) { this.hitPed(t.ped, W.dmg, dx, dy); break; } }
      return;
    }
    if (W.strike) { const a = this.aim(o, 160, T), tx = a.lock ? a.lock.x : p.x + o.fx * 70, ty = a.lock ? a.lock.y : p.y + o.fy * 70; this.callStrike(tx, ty); return; }
    if (W.throw) {
      const ch = p.char; if (ch) ch.pose = { throw: 0 };
      setTimeout(() => { const o2 = this.origin(), a = this.aim(o2, 40, this.targets()); this.launch(W, { x: o2.x, y: o2.y, z: o2.z + 0.35, vx: a.fx * W.speed, vy: a.fy * W.speed, vz: (a.fz + W.up) * W.speed }); }, 260);
      return;
    }
    if (W.rocket) {
      const a = this.aim(o, W.homing ? 260 : 140, T);
      this.launch(W, { x: o.x + a.fx, y: o.y + a.fy, z: o.z + 0.15 + a.fz, vx: a.fx * W.speed, vy: a.fy * W.speed, vz: a.fz * W.speed, lock: W.homing ? a.lock : null });
      sfx.whoosh && sfx.whoosh(); this.flash(o.x, o.y, o.z, 0.5); this.noise(o.x, o.y, 0.35); return;
    }
    const a = this.aim(o, W.range, T), n = W.pellets || 1;
    for (let i = 0; i < n; i++) {
      const s = W.spread, dx = a.fx + (Math.random() - 0.5) * 2 * s, dy = a.fy + (Math.random() - 0.5) * 2 * s, dz = a.fz + (Math.random() - 0.5) * s, l = Math.hypot(dx, dy, dz) || 1;
      this.shot(o, dx / l, dy / l, dz / l, W, T);
    }
    this.flash(o.x + a.fx * (W.len || 0.3), o.y + a.fy * (W.len || 0.3), o.z, W.pellets ? 0.3 : 0.2); sfx.gun && sfx.gun(W.snd); this.noise(o.x, o.y, W.id === 5 ? 0.25 : 0.12);
  }
  // one bullet: the nearest thing along its line (a person, a car, a wall, the ground)
  shot(o, dx, dy, dz, W, T, cop = false) {
    let tHit = W.range, hit = null;
    for (const t of T) {
      const rx = t.x - o.x, ry = t.y - o.y, rz = t.z - o.z, al = rx * dx + ry * dy + rz * dz; if (al < 0.3 || al > tHit) continue;
      const px = rx - dx * al, py = ry - dy * al, pz = rz - dz * al; if (Math.hypot(px, py) > t.r || Math.abs(pz) > t.h) continue;
      tHit = al; hit = t;
    }
    for (let s = 2; s < tHit; s += 2.5) { if (this.blockedAt(o.x + dx * s, o.y + dy * s, o.z + dz * s)) { tHit = s; hit = null; break; } }
    const ex = o.x + dx * tHit, ey = o.y + dy * tHit, ez = o.z + dz * tHit;
    this.tracer(o.x, o.y, o.z, ex, ey, ez, cop);
    if (!hit) { this.puff(ex, ey, ez, 0.18, 0.25); return; }
    if (hit.ped) this.hitPed(hit.ped, W.dmg, dx, dy);
    else if (hit.car) this.hitCar(hit.car, W.dmg * 0.55);
    else if (hit.unit) this.hitUnit(hit.unit, W.dmg * 0.5);
    this.puff(ex, ey, ez, 0.14, 0.2);
  }
  // people nearby hear it: they run, and the police are called
  noise(x, y, heat) {
    const P = this.g.people; let seen = false;
    if (P) for (const w of P.walkers) { const q = w.ch.g.position; if (Math.hypot(q.x - x, -q.z - y) < 70) { w.sp = 4.4 + Math.random(); w.pause = 0; w.panic = 10; seen = true; } }
    if (seen || this.stars > 0 || this.witnesses(x, y, 60)) this.crime(heat, 'Shots fired!');
  }
  hitPed(w, dmg, dx, dy) {
    w.hp = (w.hp ?? 100) - dmg; const P = this.g.people;
    if (w.hp > 0) { w.sp = 4.6; w.pause = 0; w.panic = 12; this.crime(0.5, 'Assault!'); return; }
    const i = P.walkers.indexOf(w); if (i < 0) return; P.walkers.splice(i, 1);
    const g = w.ch.g, x = g.position.x, y = -g.position.z, gy = standY(x, y);
    g.rotation.order = 'YXZ'; g.rotation.x = -Math.PI / 2; g.rotation.y = Math.atan2(dx, -dy); g.position.y = gy + 0.22;
    const b = new THREE.Mesh(this.disc, this.mBlood); b.scale.setScalar(0.5 + Math.random() * 0.4); b.position.set(x, gy + 0.03, -y); this.scene.add(b);
    this.bodies.push({ ch: w.ch, blood: b, t: 40 }); this.kills++;
    const isCop = !!w.cop;
    this.crime(isCop ? 2 : 1, isCop ? 'You killed a police officer!' : 'Murder!');
  }
  hitCar(c, dmg) {
    c.hp = (c.hp ?? 160) - dmg;
    if (!c.parked && !c.player && !c.scared) { c.scared = true; this.crime(0.3, 'Shooting at cars!'); }
    if (c.hp <= 0) this.blowCar(c);
  }
  hitUnit(u, dmg) { u.hp -= dmg; this.atLeast(3, 'Attacking the police!'); if (u.hp <= 0 && !u.dead) { u.dead = true; this.boom(u.x, u.y, u.gy + 0.6, 7, true); this.wreck(u.x, u.y, u.gy, u.h, u.mesh); this.scene.remove(u.mesh); this.crime(1, 'Police car destroyed!'); } }
  blowCar(c) {
    if (c.dead || c.blown) return; c.blown = true; const p = this.g.player, mine = c === p.car;
    if (mine) { const k = p.exit(); if (k) this.g.traffic.release(k); const sp = document.getElementById('speed'); if (sp) sp.hidden = true; hurt(70, 0, 0, 'boom'); }
    this.wreck(c.x, c.y, c.gy, c.h, c.mesh); c.dead = true; c.player = false;
    setTimeout(() => this.boom(c.x, c.y, c.gy + 0.6, 7, true), 10);
    if (!mine) this.crime(c.mesh.userData.police ? 1.5 : 1, 'Vehicle destroyed!');
  }
  // a burnt-out shell where the car was, with a fire for a while
  wreck(x, y, gy, h, mesh) {
    const u = (mesh && mesh.userData) || {}, L = u.L || 4.4, Wd = u.W || 1.8, g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.75, L), this.mWreck); b.position.y = 0.6; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.85, 0.5, L * 0.45), this.mWreck); c.position.set(0, 1.2, -L * 0.05); g.add(c);
    const fm = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const fl = []; for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 7), fm); f.position.set((Math.random() - 0.5) * Wd * 0.6, 1.9, (Math.random() - 0.5) * L * 0.6); g.add(f); fl.push(f); }
    g.position.set(x, gy + 0.05, -y); g.rotation.y = rotY(h); this.scene.add(g); this.wrecks.push({ g, fl, fm, t: 45, x, y, z: gy });
  }
  // ---------------------------------------------------------------- rockets, grenades, explosions
  launch(W, o) {
    const m = new THREE.Mesh(W.throw ? this.sphere : this.cyl, W.throw ? this.mGrenade : this.mRocket);
    if (W.throw) m.scale.setScalar(0.07); else m.scale.set(W.big ? 0.14 : 0.07, W.big ? 1.6 : 0.9, W.big ? 0.14 : 0.07);
    this.scene.add(m); this.rockets.push({ ...o, W, m, t: 0, trail: 0, mine: true });
  }
  callStrike(x, y) {
    const gy = ground(x, y), ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(15); ring.position.set(x, Math.max(gy, this.roof(x, y)) + 0.3, -y); this.scene.add(ring);
    this.strikes.push({ x, y, t: 2.2, n: 9, ring, gap: 0 }); toast('✈️ Airstrike inbound. Get clear!', 2200); this.atLeast(2, 'Airstrike!');
  }
  roof(x, y) { const tl = this.g.tiles, r = tl && tl.roofAt ? tl.roofAt(x, y) : null; return r == null ? -1e9 : r; }
  boom(x, y, z, R, mine) {
    const big = R / 9;
    const mk = (col, add) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false });
    const add = (col, r0, r1, life, rise, addv, delay = 0) => { const m = new THREE.Mesh(this.sphere, mk(col, addv)); m.position.set(x + (Math.random() - 0.5) * R * 0.2, z + 0.5, -y + (Math.random() - 0.5) * R * 0.2); m.scale.setScalar(0.01); m.visible = false; this.scene.add(m); this.fx.push({ m, t: -delay, life, r0, r1, rise, own: true }); };
    add(0xfff4c0, R * 0.2, R * 0.55, 0.22, 1, true); add(0xff9a2a, R * 0.25, R * 0.8, 0.55, 3, true, 0.03); add(0xff4a10, R * 0.2, R * 0.65, 0.8, 5, true, 0.1);
    for (let i = 0; i < 3; i++) add(0x2a2a2a, R * 0.3, R * (0.7 + i * 0.25), 2.2 + i * 0.7, 6 + i * 3, false, 0.15 + i * 0.12);
    const gz = Math.max(ground(x, y), 0); if (z - gz < 4) { const s = new THREE.Mesh(this.disc, this.mScorch); s.scale.setScalar(R * 0.55); s.position.set(x, gz + 0.04, -y); this.scene.add(s); this.fx.push({ m: s, t: 0, life: 40, flat: true }); }
    sfx.boom && sfx.boom(big);
    const p = this.g.player, P = this.g.people;
    if (P) for (const w of [...P.walkers]) { const q = w.ch.g.position, d = Math.hypot(q.x - x, -q.z - y); if (d < R && Math.abs(q.y - z) < R) this.hitPed(w, 400, q.x - x, -q.z - y); else if (d < R * 6) { w.sp = 4.8; w.pause = 0; w.panic = 14; } }
    for (const c of this.g.traffic.cars) { if (c.dead || c.blown) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < R + 1.5 && Math.abs(c.gy - z) < R + 3) { c.hp = (c.hp ?? 160) - (420 * (1 - d / (R + 1.5)) + 60); if (c.hp <= 0) setTimeout(() => this.blowCar(c), 120 + Math.random() * 250); } }
    for (const u of this.units) { if (u.dead) continue; const d = Math.hypot(u.x - x, u.y - y); if (d < R + 1.5) this.hitUnit(u, 420 * (1 - d / (R + 1.5)) + 60); }
    if (this.g.deadT <= 0) { const d = Math.hypot(p.x - x, p.y - y, (p.gy + 1) - z), k = p.mode === 'foot' ? 1 : 0.45; if (d < R) hurt(Math.round((85 * (1 - d / R) + 8) * k), (p.x - x) / (d || 1), (p.y - y) / (d || 1), 'boom'); }
    if (mine) this.crime(0.8, 'Explosion!');
  }
  // ---------------------------------------------------------------- small effects
  tracer(x0, y0, z0, x1, y1, z1, cop) {
    const m = new THREE.Mesh(this.cyl, cop ? this.mCop : this.mTracer), dx = x1 - x0, dy = z1 - z0, dz = -(y1 - y0), l = Math.hypot(dx, dy, dz) || 1;
    m.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2); m.quaternion.setFromUnitVectors(UP, _v.set(dx / l, dy / l, dz / l)); m.scale.set(0.022, l, 0.022);
    this.scene.add(m); this.tracers.push({ m, t: 0.06 });
  }
  flash(x, y, z, r) { const m = new THREE.Mesh(this.sphere, this.mFlash); m.position.set(x, z, -y); m.scale.setScalar(r); this.scene.add(m); this.tracers.push({ m, t: 0.05 }); }
  puff(x, y, z, r0, life) { if (this.fx.length > 140) return; const m = new THREE.Mesh(this.sphere, this.mSmoke); m.position.set(x, z, -y); m.scale.setScalar(r0); this.scene.add(m); this.fx.push({ m, t: 0, life, r0, r1: r0 * 3.5, rise: 0.6, shared: true }); }
  // ---------------------------------------------------------------- the police
  spawnUnit() {
    const p = this.g.player, tr = this.g.traffic; let x = null, y = null;
    for (let i = 0; i < 30 && x == null; i++) {
      const pc = tr.pieces[Math.random() * tr.pieces.length | 0]; if (!pc || pc.kind === 7 || pc.zs) continue;
      const m = pc.pts[pc.pts.length >> 1], d = Math.hypot(m[0] - p.x, m[1] - p.y); if (d < 110 || d > 260) continue;
      if (this.units.some(u => Math.hypot(u.x - m[0], u.y - m[1]) < 10)) continue; x = m[0]; y = m[1];
    }
    if (x == null) { const a = Math.random() * 6.283; x = p.x + Math.cos(a) * 170; y = p.y + Math.sin(a) * 170; if (this.roof(x, y) > -1e8) return; }
    const mesh = makeCar('police'); lightsOn(mesh, true); this.scene.add(mesh);
    const u = { mesh, x, y, h: Math.atan2(p.x - x, p.y - y), v: 8, gy: ground(x, y), hp: 260, shootT: 1 + Math.random(), stuck: 0, near: 0 };
    this.units.push(u);
  }
  updateUnits(dt) {
    const p = this.g.player, want = this.stars;
    const live = this.units.filter(u => !u.dead && u.leave == null).length;
    if (live < want && (this.spawnT -= dt) <= 0) { this.spawnT = 1.2; this.spawnUnit(); }
    let nearest = 1e9, busting = false; const pgElev = p.gy - ground(p.x, p.y) > 2.5 && p.mode !== 'heli';
    for (const u of this.units) {
      if (u.dead) continue;
      const dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy);
      if (u.leave != null) { u.leave -= dt; if (u.leave <= 0 || d > 260) { u.dead = true; this.scene.remove(u.mesh); continue; } }
      else if (d > 340) { u.dead = true; this.scene.remove(u.mesh); continue; }
      else nearest = Math.min(nearest, d);
      // steer at the player (or just drive on when leaving), round buildings
      let want_h = u.leave != null ? u.h : Math.atan2(dx, dy), pick = null;
      for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4]) { const hh = want_h + off, qx = u.x + Math.sin(hh) * 7, qy = u.y + Math.cos(hh) * 7; if (this.roof(qx, qy) < -1e8) { pick = hh; break; } }
      if (pick == null) pick = want_h + Math.PI;
      const dh = Math.atan2(Math.sin(pick - u.h), Math.cos(pick - u.h)); u.h += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const onFoot = p.mode === 'foot', top = Math.min(44, Math.max(20, Math.abs(p.v) * 0.95 + 5));
      let tgt = u.leave != null ? 12 : d > 30 ? top : onFoot ? (d < 9 ? 0 : 9) : Math.max(10, Math.abs(p.v) + 3);
      if (Math.abs(dh) > 1.2) tgt = Math.min(tgt, 7);
      u.v += Math.max(-16 * dt, Math.min(7 * dt, tgt - u.v));
      const nx = u.x + Math.sin(u.h) * u.v * dt, ny = u.y + Math.cos(u.h) * u.v * dt;
      if (this.roof(nx, ny) > -1e8) { u.v = -3; u.stuck += dt; u.h += 1.2 * dt; } else { u.x = nx; u.y = ny; if (u.v > 3) u.stuck = Math.max(0, u.stuck - dt); }
      if (u.stuck > 5 || (tgt > 8 && Math.abs(u.v) < 1 && (u.still = (u.still || 0) + dt) > 6)) { u.dead = true; this.scene.remove(u.mesh); continue; }
      if (Math.abs(u.v) > 1) u.still = 0;
      for (const o of this.units) if (o !== u && !o.dead) { const ex = u.x - o.x, ey = u.y - o.y, e = Math.hypot(ex, ey); if (e < 4 && e > 0.01) { u.x += ex / e * (4 - e) * 0.5; u.y += ey / e * (4 - e) * 0.5; } }
      const gy = pgElev && d < 90 ? p.gy : standY(u.x, u.y); u.gy += (gy - u.gy) * Math.min(1, dt * 6);
      u.mesh.position.set(u.x, u.gy + TYRE_Y, -u.y); u.mesh.rotation.y = rotY(u.h); spinWheels(u.mesh, u.v * dt, 0);
      const bc = u.mesh.userData.beacons; if (bc) { const on = Math.floor(performance.now() / 180) % 2 === 0; bc[0].visible = on; bc[1].visible = !on; }
      if (u.leave != null || this.g.deadT > 0) continue;
      // ramming, arresting and shooting
      if (d < 3.2 && p.mode !== 'heli' && Math.abs(p.gy - u.gy) < 2.5) {
        const k = (3.2 - d) / (d || 1); p.x += dx * k * 0.6; p.y += dy * k * 0.6; u.x -= dx * k * 0.4; u.y -= dy * k * 0.4;
        if (onFoot && u.v > 4) hurt(Math.min(40, 8 + u.v * 1.5), dx / (d || 1), dy / (d || 1), 'car'); else if (!onFoot && Math.abs(p.v) > 6) { p.v *= 0.75; u.v *= 0.6; u.hp -= 12; if (u.hp <= 0) this.hitUnit(u, 1); }
      }
      if (this.stars <= 2 && d < 8 && Math.abs(p.gy - u.gy) < 3 && (onFoot ? true : Math.abs(p.v) < 2) && p.mode !== 'heli') busting = true;
      if (this.stars >= 2 && d < (p.mode === 'heli' ? 110 : 60) && (u.shootT -= dt) <= 0) {
        u.shootT = Math.max(0.35, 1.5 - this.stars * 0.22) * (0.7 + Math.random() * 0.6);
        const oz = u.gy + 1.4, tz = p.gy + (onFoot ? 1.1 : 0.9), chance = (onFoot ? 0.4 : p.mode === 'heli' ? 0.12 : 0.22) + this.stars * 0.05;
        const hit = Math.random() < chance, mx = hit ? 0 : (Math.random() - 0.5) * 5, my = hit ? 0 : (Math.random() - 0.5) * 5;
        let clear = true; for (let s = 3; s < d - 1; s += 3) if (this.blockedAt(u.x + dx / d * s, u.y + dy / d * s, oz + (tz - oz) * s / d)) { clear = false; break; }
        if (clear) { this.tracer(u.x, u.y, oz, p.x + mx, p.y + my, tz + (hit ? 0 : 1), true); sfx.gun && sfx.gun('pistol', 0.5); if (hit) hurt(5 + this.stars * 2, 0, 0, 'shot'); }
      }
    }
    this.units = this.units.filter(u => !u.dead);
    // arrest: a police car right beside you while you stand still or sit in a stopped car
    if (busting && this.stars > 0) { if ((this.bustT += dt) > 2.6) { this.bustT = 0; this.busted(); } } else this.bustT = Math.max(0, this.bustT - dt * 2);
    // out of sight long enough: they give up
    if (this.stars > 0) {
      const seen = nearest < 130; this.elStars.classList.toggle('search', !seen);
      if (seen) this.unseen = 0; else if ((this.unseen += dt) > 16 + this.stars * 6) this.clear('✅ You lost the police.');
      if ((this.sirenT = (this.sirenT || 0) - dt) <= 0 && nearest < 200) { this.sirenT = 0.72; sfx.siren && sfx.siren(Math.max(0.05, 1 - nearest / 200)); }
    }
  }
  // ---------------------------------------------------------------- every frame
  update(dt) {
    const p = this.g.player; if (!p) return;
    if (this.elFire.style.display === 'none' && this.g.started) this.show(true);
    this.cool -= dt;
    const W = WEAPONS[this.w];
    if (this.held && this.cool <= 0 && !this.g.paused && this.g.deadT <= 0) { this.cool = W.every; this.fire(); }
    const ch = p.char;
    if (ch && p.mode === 'foot' && !W.melee && !W.throw && !W.strike) { const a = this.held || this.cool > -0.6 ? 1 : 0, cur = ch.pose && ch.pose.aim != null ? ch.pose.aim : 0, n = cur + (a - cur) * Math.min(1, dt * 12); if (!(ch.pose && (ch.pose.ride || ch.pose.glide || ch.pose.throw != null))) ch.pose = n > 0.02 ? { aim: n } : null; }
    else if (ch && ch.pose && ch.pose.aim != null) ch.pose = null;
    if (ch && ch !== this.propChar) this.updateHeld();
    if (this.prop) this.prop.visible = p.mode === 'foot';
    // running people over
    if (p.mode === 'car' && Math.abs(p.v) > 3.5 && this.g.people) {
      const u = p.car && p.car.mesh.userData, L = (u && u.L) || 4.4, Wd = (u && u.W) || 1.8, [fx, fy] = dirOf(p.h);
      for (const w of [...this.g.people.walkers]) {
        const q = w.ch.g.position, dx = q.x - p.x, dy = -q.z - p.y; if (Math.abs(dx) > 6 || Math.abs(dy) > 6 || Math.abs(q.y - p.gy) > 2.5) continue;
        if (Math.abs(dx * fx + dy * fy) > L / 2 + 0.35 || Math.abs(dx * fy - dy * fx) > Wd / 2 + 0.3) continue;
        this.hitPed(w, 400, fx * Math.sign(p.v), fy * Math.sign(p.v)); p.v *= 0.9; sfx.crash && sfx.crash();
      }
    }
    // rockets and grenades
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i], W2 = r.W; r.t += dt;
      if (W2.throw) r.vz -= W2.g * dt;
      else if (r.lock) {       // homing: turn toward the target
        const t = r.lock, tx = t.ped ? t.ped.ch.g.position.x : (t.car || t.unit).x, ty = t.ped ? -t.ped.ch.g.position.z : (t.car || t.unit).y, tz = t.ped ? t.ped.ch.g.position.y + 1 : (t.car || t.unit).gy + 0.8;
        const dx = tx - r.x, dy = ty - r.y, dz = tz - r.z, d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, dt * 3.2), sp = W2.speed;
        r.vx += (dx / d * sp - r.vx) * k; r.vy += (dy / d * sp - r.vy) * k; r.vz += (dz / d * sp - r.vz) * k;
        if ((t.car && t.car.dead) || (t.unit && t.unit.dead)) r.lock = null;
      }
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt; r.m.position.set(r.x, r.z, -r.y);
      const sp = Math.hypot(r.vx, r.vy, r.vz) || 1; if (!W2.throw) r.m.quaternion.setFromUnitVectors(UP, _v.set(r.vx / sp, r.vz / sp, -r.vy / sp));
      if (!W2.throw && (r.trail -= dt) <= 0) { r.trail = 0.03; this.puff(r.x - r.vx / sp, r.y - r.vy / sp, r.z - r.vz / sp, W2.big ? 0.5 : 0.28, 0.7); }
      let hit = r.t > W2.life || this.blockedAt(r.x, r.y, r.z);
      if (!hit && r.t > 0.08) for (const t of this.targets()) { if (Math.hypot(t.x - r.x, t.y - r.y) < t.r + 0.4 && Math.abs(t.z - r.z) < 1.6) { hit = true; break; } }
      if (hit) { this.scene.remove(r.m); this.rockets.splice(i, 1); this.boom(r.x, r.y, Math.max(r.z, ground(r.x, r.y) + 0.3), W2.R, r.mine); }
    }
    // airstrikes: a ring on the ground, then the missiles come down
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.t -= dt; s.ring.rotation.z += dt * 2;
      if (s.t <= 0 && (s.gap -= dt) <= 0 && s.n > 0) {
        s.gap = 0.16; s.n--; const a = Math.random() * 6.283, d = Math.random() * 13, tx = s.x + Math.cos(a) * d, ty = s.y + Math.sin(a) * d, W2 = { ...WEAPONS[11], rocket: true, speed: 150, life: 4, big: true };
        const m = new THREE.Mesh(this.cyl, this.mRocket); m.scale.set(0.16, 2, 0.16); this.scene.add(m);
        this.rockets.push({ x: tx - 40, y: ty - 25, z: ground(tx, ty) + 230, vx: 40 / 1.6, vy: 25 / 1.6, vz: -230 / 1.6, W: W2, m, t: 0, trail: 0, mine: true });
      }
      if (s.n <= 0 && s.t < -3.5) { this.scene.remove(s.ring); this.strikes.splice(i, 1); }
    }
    // fire, smoke, tracers, bodies, wrecks
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.t += dt; if (f.t < 0) continue; f.m.visible = true; const k = f.t / f.life;
      if (k >= 1) { this.scene.remove(f.m); if (f.own) f.m.material.dispose(); this.fx.splice(i, 1); continue; }
      if (f.flat) { if (k > 0.8) f.m.visible = Math.random() > (k - 0.8) * 5; continue; }
      const e = 1 - (1 - k) * (1 - k); f.m.scale.setScalar(f.r0 + (f.r1 - f.r0) * e); f.m.position.y += f.rise * dt;
      if (f.own) f.m.material.opacity = Math.max(0, 1 - k * k); else if (f.shared && k > 0.6) f.m.scale.multiplyScalar(1 - (k - 0.6) * 2.4);
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) { const t = this.tracers[i]; if ((t.t -= dt) <= 0) { this.scene.remove(t.m); this.tracers.splice(i, 1); } }
    for (let i = this.bodies.length - 1; i >= 0; i--) { const b = this.bodies[i]; if ((b.t -= dt) <= 0 || Math.hypot(b.ch.g.position.x - p.x, -b.ch.g.position.z - p.y) > 200) { this.scene.remove(b.ch.g); this.scene.remove(b.blood); this.bodies.splice(i, 1); } }
    for (let i = this.wrecks.length - 1; i >= 0; i--) {
      const w = this.wrecks[i]; w.t -= dt; const burn = w.t > 15;
      for (const f of w.fl) { f.visible = burn; f.scale.set(0.8 + Math.random() * 0.5, 0.7 + Math.random() * 0.8, 0.8 + Math.random() * 0.5); }
      if (burn && Math.random() < dt * 6) this.puff(w.x + (Math.random() - 0.5), w.y + (Math.random() - 0.5), w.z + 2.4, 0.5, 1.6);
      if (burn && p.mode === 'foot' && Math.hypot(p.x - w.x, p.y - w.y) < 2.2 && Math.abs(p.gy - w.z) < 2) hurt(6, (p.x - w.x) * 0.3, (p.y - w.y) * 0.3, 'fire');
      if (w.t <= 0) { this.scene.remove(w.g); w.fm.dispose(); this.wrecks.splice(i, 1); }
    }
    // heat cools slowly while nothing new happens (never below the current star until the police lose you)
    if (this.stars === 0 && this.heat > 0) this.heat = Math.max(0, this.heat - dt * 0.03);
    this.updateUnits(dt);
  }
}

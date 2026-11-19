// Dubai City Stories: missions for Hassan, Farah and Ali. Each mission is a list of steps:
//   go    drive or walk to a place (optionally against the clock)
//   steal take the marked car;  destroy  wreck the marked cars;  lose  shake off the police
// Start one from Phone → Missions (it puts a marker on the map), then walk or drive into the yellow ring.
import * as THREE from 'three';
import { toast } from './hud.js?v=11190752';
import { makeMarker, makeCar } from './actors.js?v=11190752';
import { ground } from './terrain.js?v=11190752';
import { TYRE_Y, rotY } from './player.js?v=11190752';

const go = (at, text, o = {}) => ({ k: 'go', at, text, ...o });
export const MISSIONS = {      // easy ones: go there, see that. No timers to beat, nobody shooting
  farah: [
    { id: 'F1', name: 'First drive', pay: 200, start: 'AB Residence 2, Al Warsan', intro: 'Your black Tiida is parked outside. Take it into town: City Centre Deira.', steps: [go('Deira City Centre', 'Drive to City Centre Deira', { car: true })] },
    { id: 'F2', name: 'The Frame', pay: 250, start: 'Zabeel Park', intro: 'Everyone has a picture at the Dubai Frame. Go and get yours.', steps: [go('Dubai Frame', 'Go to the Dubai Frame')] },
    { id: 'F3', name: 'Souk morning', pay: 300, start: 'Gold Souk', intro: 'Gold first, then spices. The two souks are a short walk apart.', steps: [go('Spice Souk', 'Walk to the Spice Souk')] },
    { id: 'F4', name: 'Old Dubai', pay: 300, start: 'Al Seef', intro: 'A slow morning by the Creek: from Al Seef up to the old Al Fahidi houses.', steps: [go('Al Fahidi Historical Neighbourhood', 'Go to Al Fahidi')] },
    { id: 'F5', name: 'Chai first', pay: 300, start: 'Al Fahidi Historical Neighbourhood', intro: 'Nothing starts before chai. The Arabian Tea House is around the corner.', steps: [go('Arabian Tea House', 'Tea at the Arabian Tea House')] },
    { id: 'F6', name: 'Mall day', pay: 400, start: 'The Dubai Mall', intro: 'Shopping done. Walk out to the fountain, then over the bridge to Souk Al Bahar.', steps: [go('Dubai Fountain', 'Walk to the Dubai Fountain'), go('Souk Al Bahar', 'Cross to Souk Al Bahar')] },
    { id: 'F7', name: 'Glass and curves', pay: 500, start: 'The Opus by OMNIYAT', intro: 'Two buildings worth a photo: The Opus, with the hole through it, and The Binary next door.', steps: [go('The Binary by OMNIYAT', 'Go to The Binary')] },
    { id: 'F8', name: 'The future', pay: 500, start: 'Emirates Towers', intro: 'From the twin towers to the silver ring with the writing on it.', steps: [go('Museum of the Future', 'Go to the Museum of the Future')] },
  ],
  ali: [
    { id: 'A1', name: 'Karak run', pay: 200, start: '27C Street, Al Garhoud', intro: 'The house wants karak. Take a car, drive to Karakccino, stop outside and HONK. Then bring it home.', steps: [go('Karakccino', 'Drive to Karakccino', { car: true }), { k: 'karak', text: 'Stop outside and honk for karak 📣' }, go('27C Street, Al Garhoud', 'Take the karak home', { car: true })] },
    { id: 'A2', name: 'Airport pickup', pay: 300, start: 'DXB Terminal 3', intro: 'Your cousin has landed. Take him to City Centre Deira.', steps: [go('Deira City Centre', 'Drive to City Centre Deira', { car: true })] },
    { id: 'A3', name: 'Over the bridge', pay: 300, start: 'Al Garhoud Bridge', intro: 'Cross the Creek to Festival City. Mind the Salik gate.', steps: [go('Dubai Festival City', 'Drive to Dubai Festival City', { car: true })] },
    { id: 'A4', name: 'Beach day', pay: 300, start: 'Union Metro Station', intro: 'Friday. Everybody is going to Al Mamzar.', steps: [go('Al Mamzar Beach', 'Get to Al Mamzar Beach')] },
    { id: 'A5', name: 'Clean licence', pay: 500, start: 'Dubai World Trade Centre', intro: 'Your uncle bets you cannot drive Sheikh Zayed Road without one radar flash. Limit plus twenty, no more. Take your time.', steps: [go('The Dubai Mall', 'Drive to The Dubai Mall without a single flash', { car: true, noFine: true })] },
    { id: 'A6', name: 'Off-plan', pay: 500, start: 'The Binary by OMNIYAT', intro: 'First day at the agency. Drop brochures at two lobbies. "Sir, are you interested in off-plan?"', steps: [go('The Opus by OMNIYAT', 'Brochures at The Opus'), go('One by OMNIYAT', 'Brochures at One by OMNIYAT')] },
    { id: 'A7', name: 'Handover day', pay: 600, start: 'The Sterling by OMNIYAT', intro: 'Two sets of keys to hand over on the canal. No rush.', steps: [go('The Pad by OMNIYAT', 'Keys to The Pad'), go('Vela by OMNIYAT', 'Keys to Vela')] },
    { id: 'A8', name: 'Big night', pay: 600, start: 'Dubai Opera', intro: 'Show the family Downtown: the fountain, then right under the tallest building in the world.', steps: [go('Dubai Fountain', 'Walk to the Dubai Fountain'), go('Burj Khalifa', 'Stand under the Burj Khalifa')] },
  ],
};
const CSS = `#dxm { position: fixed; left: 10px; top: calc(env(safe-area-inset-top) + 150px); z-index: 22; max-width: min(78vw, 360px); background: rgba(15,23,32,.84); color: #fff; border-left: 4px solid #ffc400; border-radius: 10px; padding: 8px 12px; font: 600 14px system-ui, sans-serif; pointer-events: none; }
#dxm b { display: block; font-size: 11px; letter-spacing: 1.5px; color: #ffc400; } #dxm i { font-style: normal; color: #ffd76a; font-weight: 800; }
#dxm[hidden] { display: none; } body.cine #dxm { display: none; }
#dxm-big { position: fixed; left: 0; right: 0; top: 32%; z-index: 58; text-align: center; font: 900 40px system-ui, sans-serif; letter-spacing: 3px; color: #ffd21a; text-shadow: 0 3px 12px #000; pointer-events: none; } #dxm-big small { display: block; font-size: 16px; color: #fff; letter-spacing: 0; } #dxm-big[hidden] { display: none; }`;

export class DubaiMissions {
  constructor(game, scene, world) {
    this.g = game; this.scene = scene; this.L = Object.fromEntries((world.landmarks || []).map(l => [l.label, l])); this.cur = null; this.offer = null; this.extra = [];
    try { this.done = new Set(JSON.parse(localStorage.getItem('dcs-missions') || '[]')); } catch (e) { this.done = new Set(); }
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.el = document.createElement('div'); this.el.id = 'dxm'; this.el.hidden = true; document.body.appendChild(this.el);
    this.big = document.createElement('div'); this.big.id = 'dxm-big'; this.big.hidden = true; document.body.appendChild(this.big);
    this.marker = makeMarker(0xffc400); this.marker.visible = false; scene.add(this.marker);
    document.querySelector('#objective') && (this.objEl = document.querySelector('#objective'));
  }
  list() { return (MISSIONS[this.g.story] || MISSIONS.ali).filter(m => this.L[m.start] && m.steps.every(s => s.k !== 'go' || this.L[s.at])); }
  next() { return this.list().find(m => !this.done.has(m.id)) || null; }
  pos(name) { const l = this.L[name], tl = this.g.tiles; let x = l.x, y = l.y; if (name === 'Burj Khalifa') { x += 150; y -= 190; } return { x, y }; }
  flash(t, s = '') { this.big.innerHTML = `${t}<small>${s}</small>`; this.big.hidden = false; clearTimeout(this._ft); this._ft = setTimeout(() => { this.big.hidden = true; }, 3200); }
  mark(x, y) { this.marker.visible = true; this.marker.position.set(x, ground(x, y), -y); this.g.setWaypoint(x, y); this.tx = x; this.ty = y; }
  // put a mission on the map: go to its yellow ring to begin
  choose(m) { if (this.cur) this.fail('Mission dropped.'); this.offer = m; const p = this.pos(m.start); this.mark(p.x, p.y); this.show(`MISSION · ${m.name.toUpperCase()}`, `Go to the yellow ring at ${m.start} to start. Pays <i>AED ${m.pay}</i>.`); }
  show(a, b) { this.el.innerHTML = `<b>${a}</b>${b}`; this.el.hidden = false; }
  begin(m) { this.offer = null; this.cur = { m, i: -1, t: 0 }; if (m.night) this.g.clock = 20.5; this.flash(m.name.toUpperCase(), m.intro); this.step(); }
  step() {
    const c = this.cur; c.i++; this.clearExtra();
    if (c.i >= c.m.steps.length) return this.pass();
    const s = c.s = c.m.steps[c.i], p = this.g.player; c.t = s.time || 0;
    c.fines = this.g.fun ? this.g.fun.count : 0; c.karak = this.g.fun ? (this.g.fun.karaks || 0) : 0;
    if (s.k === 'go') { const q = this.pos(s.at); this.mark(q.x, q.y); }
    else if (s.k === 'steal') { const car = this.spawnCar(s.car, p.x, p.y, 0); c.car = car; this.mark(car.x, car.y); }
    else if (s.k === 'destroy') { c.targets = []; for (let i = 0; i < s.n; i++) c.targets.push(this.spawnCar(['tiida', 'landcruiser', 'yaris'][i % 3], p.x, p.y, i + 1)); this.mark(c.targets[0].x, c.targets[0].y); }
    else if (s.k === 'lose') { this.marker.visible = false; this.g.waypoint = null; if (this.g.crime) this.g.crime.atLeast(s.stars, 'The police are on to you!'); }
  }
  // a parked car for the mission, on a street near (x, y), with a red ring over it
  spawnCar(kind, x, y, n) {
    const tr = this.g.traffic; let px = x + 40 + n * 12, py = y + 30, h = 0, best = 1e9;
    for (let i = 0; i < 400; i++) { const pc = tr.pieces[Math.random() * tr.pieces.length | 0]; if (!pc || ![5, 6, 7].includes(pc.kind) || pc.zs) continue; const k = Math.random() * (pc.pts.length - 1) | 0, a = pc.pts[k], b = pc.pts[k + 1], d = Math.hypot(a[0] - x, a[1] - y); if (d < 45 || d > 170 || Math.abs(d - 90) > best) continue; if (tr.cars.some(c => Math.hypot(c.x - a[0], c.y - a[1]) < 8)) continue; best = Math.abs(d - 90); const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; h = Math.atan2(b[0] - a[0], b[1] - a[1]); px = (a[0] + b[0]) / 2 + (b[1] - a[1]) / l * 2.2; py = (a[1] + b[1]) / 2 - (b[0] - a[0]) / l * 2.2; }
    const mesh = makeCar(kind), gy = ground(px, py), car = { mesh, parked: true, x: px, y: py, h, gy, v: 0, s: 0, dir: 1, piece: tr.pieces[0], mission: true, hp: 200 };
    mesh.position.set(px, gy + TYRE_Y, -py); mesh.rotation.y = rotY(h); this.scene.add(mesh); tr.cars.push(car);
    const ring = makeMarker(0xff3030); ring.scale.setScalar(0.8); this.scene.add(ring); this.extra.push({ ring, car });
    return car;
  }
  clearExtra() { for (const e of this.extra) this.scene.remove(e.ring); this.extra = []; }
  pass() { const m = this.cur.m; this.cur = null; this.done.add(m.id); try { localStorage.setItem('dcs-missions', JSON.stringify([...this.done])); } catch (e) { } if (this.g.missions && this.g.missions.earn) this.g.missions.earn(m.pay); this.flash('MISSION PASSED', `+ AED ${m.pay}`); if (this.g.sfx && this.g.sfx.chime) this.g.sfx.chime(); this.marker.visible = false; this.g.waypoint = null; this.el.hidden = true; const n = this.next(); if (n) setTimeout(() => { if (!this.cur && !this.offer) this.choose(n); }, 6000); }
  fail(why) { this.cur = null; this.clearExtra(); this.marker.visible = false; this.g.waypoint = null; this.el.hidden = true; this.flash('MISSION FAILED', why); }
  update(dt) {
    const p = this.g.player; if (!p) return;
    this.marker.rotation.y += dt * 1.5;
    for (const e of this.extra) { e.ring.visible = !e.car.dead; e.ring.position.set(e.car.x, e.car.gy + 2.6, -e.car.y); e.ring.rotation.y += dt * 2; }
    if (!this.cur) {
      if (!this.offer && !this._first && this.g.started) { this._first = true; const n = this.next(); if (n) this.choose(n); }
      if (this.offer && Math.hypot(p.x - this.tx, p.y - this.ty) < 28) this.begin(this.offer);
      return;
    }
    const c = this.cur, s = c.s; if (this.g.deadT > 0) return this.fail('You were wasted.');
    let line = s.text;
    if (s.time) { c.t -= dt; if (c.t <= 0) return this.fail('Out of time.'); line += ` · <i>${Math.floor(c.t / 60)}:${String(Math.floor(c.t % 60)).padStart(2, '0')}</i>`; }
    if (s.noFine && this.g.fun && this.g.fun.count > c.fines) return this.fail('📸 Flashed by a radar.');
    if (s.k === 'karak') { if (this.g.fun && (this.g.fun.karaks || 0) > c.karak) return this.step(); }
    else if (s.k === 'go') {
      const d = Math.hypot(p.x - this.tx, p.y - this.ty); line += ` · ${d > 950 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m'}`;
      if (s.car && p.mode !== 'car') line += ' · get a car';
      if (s.same && c.car && c.car.dead) return this.fail('The car was destroyed.');
      if (d < 30 && (!s.car || p.mode === 'car') && (!s.same || p.car === c.car)) return this.step();
    } else if (s.k === 'steal') { if (c.car.dead) return this.fail('The car was destroyed.'); if (p.car === c.car) return this.step(); }
    else if (s.k === 'destroy') { const left = c.targets.filter(t => !t.dead).length; line += ` · <i>${left} left</i>`; const nx = c.targets.find(t => !t.dead); if (!nx) return this.step(); if (this.tx !== nx.x) this.mark(nx.x, nx.y); }
    else if (s.k === 'lose') { const cr = this.g.crime; line += cr ? ` · ${'★'.repeat(cr.stars)}` : ''; if ((c.lt = (c.lt || 0) + dt) > 3 && (!cr || cr.stars === 0)) return this.step(); }
    this.show(`${c.m.name.toUpperCase()} · AED ${c.m.pay}`, line);
  }
}

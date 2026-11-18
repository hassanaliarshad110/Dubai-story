// Dubai City Stories: missions for Hassan, Farah and Ali. Each mission is a list of steps:
//   go    drive or walk to a place (optionally against the clock)
//   steal take the marked car;  destroy  wreck the marked cars;  lose  shake off the police
// Start one from Phone → Missions (it puts a marker on the map), then walk or drive into the yellow ring.
import * as THREE from 'three';
import { toast } from './hud.js?v=11112231';
import { makeMarker, makeCar } from './actors.js?v=11112231';
import { ground } from './terrain.js?v=11112231';
import { TYRE_Y, rotY } from './player.js?v=11112231';

const go = (at, text, o = {}) => ({ k: 'go', at, text, ...o });
export const MISSIONS = {
  hassan: [
    { id: 'h1', name: 'Airport pickup', pay: 300, start: 'DXB Terminal 3', intro: 'A client just landed. Get him to City Centre Deira before he starts calling other drivers.', steps: [go('Deira City Centre', 'Drive the client to City Centre Deira', { time: 240, car: true })] },
    { id: 'h2', name: 'Cash run', pay: 600, start: 'Gold Souk', intro: 'A trader in the Gold Souk needs an envelope at The Dubai Mall. Do not stop for anyone.', steps: [go('The Dubai Mall', 'Take the envelope to The Dubai Mall', { time: 420, car: true })] },
    { id: 'h3', name: 'The repo', pay: 900, start: 'Wafi City', intro: 'Someone stopped paying for a white Patrol. It is parked nearby. Take it back.', steps: [{ k: 'steal', car: 'patrol', text: 'Take the marked Nissan Patrol' }, go('Al Garhoud Bridge', 'Bring the Patrol across to Al Garhoud Bridge', { car: true, same: true })] },
    { id: 'h5', name: 'Karak run', pay: 250, start: '27C Street, Al Garhoud', intro: 'The whole house wants karak. Drive to Karakccino, stop outside and HONK. They bring it to the window. Then get home before it goes cold.', steps: [go('Karakccino', 'Drive to Karakccino', { car: true }), { k: 'karak', text: 'Stop outside and honk for karak 📣' }, go('27C Street, Al Garhoud', 'Get the karak home hot', { time: 150, car: true })] },
    { id: 'h6', name: 'The viewing', pay: 1200, start: 'The Opus by OMNIYAT', intro: 'A buyer has landed for a penthouse viewing. Collect him from Terminal 3 and bring him to The Opus. One radar flash and he walks: he has seen how people drive here.', steps: [go('DXB Terminal 3', 'Collect the buyer from Terminal 3', { car: true }), go('The Opus by OMNIYAT', 'Drive him to The Opus. No radar flashes!', { time: 600, car: true, noFine: true })] },
    { id: 'h7', name: 'Handover day', pay: 1800, start: 'One by OMNIYAT', intro: 'Four handovers, four towers, one afternoon. Keys in the glovebox. Business Bay traffic does not care.', steps: [go('The Binary by OMNIYAT', 'Keys to The Binary', { car: true }), go('Bayswater by OMNIYAT', 'Keys to Bayswater', { car: true }), go('The Pad by OMNIYAT', 'Keys to The Pad', { car: true }), go('The Sterling by OMNIYAT', 'Last one: The Sterling', { time: 200, car: true })] },
    { id: 'h8', name: 'Bounced cheque', pay: 1500, start: 'The Sterling by OMNIYAT', intro: 'An investor paid his booking with a cheque that bounced. Twice. His Land Cruiser is parked nearby. The office wants it at The Opus until he pays.', steps: [{ k: 'steal', car: 'landcruiser', text: 'Take the marked Land Cruiser' }, go('The Opus by OMNIYAT', 'Bring it to The Opus', { car: true, same: true }), { k: 'lose', stars: 2, text: 'He called the police. Lose them' }] },
    { id: 'h4', name: 'Closing the books', pay: 1500, start: 'Business Bay', intro: 'Three cars belong to people who cheated the wrong man. Make sure none of them drives again, then disappear.', steps: [{ k: 'destroy', n: 3, text: 'Destroy the three marked cars' }, { k: 'lose', stars: 3, text: 'Lose the police' }] },
  ],
  farah: [
    { id: 'f1', name: 'Creek dash', pay: 400, start: 'Al Seef', intro: 'A bet: Al Seef to Festival City before the abra crosses the Creek. Go.', steps: [go('Dubai Festival City', 'Race to Dubai Festival City', { time: 330, car: true })] },
    { id: 'f2', name: 'Three shots', pay: 700, start: 'Dubai Frame', intro: 'The magazine wants three pictures by tonight: the Frame, the Museum of the Future and the Burj.', steps: [go('Museum of the Future', 'Photograph the Museum of the Future'), go('Burj Khalifa', 'Photograph the Burj Khalifa')] },
    { id: 'f3', name: 'Front row', pay: 300, start: 'The Dubai Mall', intro: 'The show starts after dark. Get to the fountain.', night: true, steps: [go('Dubai Fountain', 'Get to the Dubai Fountain for the show')] },
    { id: 'f5', name: 'Golden hour', pay: 600, start: 'Vela by OMNIYAT', intro: 'The developer wants sunset pictures of every tower on the canal for the brochure. The light lasts ten minutes.', steps: [go('The Sterling by OMNIYAT', 'Shoot The Sterling'), go('The Pad by OMNIYAT', 'Shoot The Pad', { time: 240 }), go('The Opus by OMNIYAT', 'Shoot The Opus', { time: 360 })] },
    { id: 'f6', name: 'Chai first', pay: 300, start: 'Al Seef', intro: 'Nobody shoots before chai. Arabian Tea House, then the Frame while the light is good.', steps: [go('Arabian Tea House', 'Tea at Arabian Tea House'), go('Dubai Frame', 'Get to the Dubai Frame', { time: 420, car: true })] },
    { id: 'f4', name: 'Getaway', pay: 1200, start: 'DIFC Gate Building', intro: 'Your passenger did something stupid in DIFC and now every patrol car is looking for your plates.', steps: [{ k: 'lose', stars: 3, text: 'Lose the police' }] },
  ],
  ali: [
    { id: 'a1', name: 'First day', pay: 300, start: 'DXB Terminal 1', intro: 'Welcome to Dubai. Your cousin said to meet him in old Dubai. Find your way.', steps: [go('Union Metro Station', 'Get to Union station'), go('Al Fahidi Historical Neighbourhood', 'Meet your cousin in Al Fahidi')] },
    { id: 'a2', name: 'Souk errands', pay: 500, start: 'Spice Souk', intro: 'Your cousin has a list. Spices, then gold, then a package to BurJuman.', steps: [go('Gold Souk', 'Pick up the order in the Gold Souk'), go('BurJuman', 'Deliver the package to BurJuman', { time: 300 })] },
    { id: 'a3', name: 'Delivery rider', pay: 600, start: 'Deira City Centre', intro: 'A food order for Al Mamzar Beach, and the customer is counting the minutes.', steps: [go('Al Mamzar Beach', 'Deliver the order to Al Mamzar Beach', { time: 420, car: true })] },
    { id: 'a5', name: 'Karak boy', pay: 350, start: 'FiLLi Café', intro: 'Your first shift. Three karak, one customer at Wafi, and he tips only if it is hot.', steps: [go('Wafi City', 'Deliver the karak to Wafi City', { time: 260, car: true })] },
    { id: 'a6', name: 'Off-plan', pay: 900, start: 'Business Bay', intro: 'Your cousin got you a job handing out brochures. "Sir, are you interested in off-plan?" Three lobbies before the security guards compare notes.', steps: [go('The Binary by OMNIYAT', 'Brochures at The Binary'), go('The Opus by OMNIYAT', 'Brochures at The Opus', { time: 200 }), go('One by OMNIYAT', 'Brochures at One by OMNIYAT', { time: 260 })] },
    { id: 'a7', name: 'Clean licence', pay: 800, start: 'Al Garhoud Bridge', intro: 'Your uncle bets you cannot cross town without one radar flash. Garhoud to the Dubai Mall. Limit plus twenty, not a kilometre more.', steps: [go('The Dubai Mall', 'Reach The Dubai Mall without a single flash', { time: 540, car: true, noFine: true })] },
    { id: 'a4', name: 'Wrong crowd', pay: 1200, start: 'Zabeel Park', intro: 'Your cousin owes money. The men he owes parked two cars by Zabeel Park. He wants them gone.', steps: [{ k: 'destroy', n: 2, text: 'Destroy the two marked cars' }, { k: 'lose', stars: 2, text: 'Lose the police' }] },
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
  list() { return (MISSIONS[this.g.story] || MISSIONS.hassan).filter(m => this.L[m.start] && m.steps.every(s => s.k !== 'go' || this.L[s.at])); }
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

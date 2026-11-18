// Dubai City Stories: big video screens along the roads that play Aflatoon's music videos.
// The videos are the real YouTube player (data/videos.json lists them), laid over the screen in the 3D world while you
// stand in front of it; a button opens the video full size with sound, and another opens it on YouTube.
import * as THREE from 'three';

const W = 640, H = 360;
// CSS matrix3d that maps a W x H box onto four screen points (top-left, top-right, bottom-right, bottom-left)
function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
function mul(a, b) { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; }
function mulv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
function basis(p) { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1], v = mulv(adj(m), [p[3][0], p[3][1], 1]); return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
function homography(src, dst) { const t = mul(basis(dst), adj(basis(src))); for (let i = 0; i < 9; i++) t[i] /= t[8]; return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`; }
const ytId = s => { const m = String(s || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) || String(s || '').match(/^([A-Za-z0-9_-]{11})$/); return m ? m[1] : null; };

export class VideoWall {
  constructor(game, camera, boards) {
    this.g = game; this.camera = camera; this.boards = boards; this.videos = []; this.channel = 'https://www.youtube.com/@projecthiphopdesi'; this.cur = null; this.t = 0;
    fetch('data/videos.json').then(r => r.json()).then(d => { this.channel = d.channel || this.channel; this.artist = d.artist || 'Aflatoon'; this.videos = (d.videos || []).map(v => ({ id: ytId(v.id || v.url), title: v.title || '' })).filter(v => v.id); }).catch(() => { });
    const st = document.createElement('style'); st.textContent = `
#vw-frame { position: fixed; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; z-index: 4; border: 0; pointer-events: none; background: transparent; }
#vw-btn { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 300px); transform: translateX(-50%); z-index: 27; background: #e11d2a; color: #fff; font: 800 15px system-ui, sans-serif; border: 0; border-radius: 22px; padding: 10px 18px; box-shadow: 0 3px 12px rgba(0,0,0,.5); }
#vw-big { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,.88); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
#vw-big iframe { width: min(96vw, 960px); aspect-ratio: 16 / 9; border: 0; border-radius: 10px; background: #000; }
#vw-big .row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; } #vw-big button, #vw-big a { font: 800 15px system-ui, sans-serif; border: 0; border-radius: 22px; padding: 11px 20px; color: #fff; text-decoration: none; }
#vw-big a { background: #e11d2a; } #vw-big button { background: #2a3442; } #vw-big h3 { color: #fff; font: 800 18px system-ui, sans-serif; margin: 0; text-align: center; padding: 0 12px; }
#vw-frame[hidden], #vw-btn[hidden], #vw-big[hidden] { display: none; } body.cine #vw-frame, body.cine #vw-btn { display: none; }
@media (orientation: landscape) { #vw-btn { bottom: calc(env(safe-area-inset-bottom) + 96px); } }`; document.head.appendChild(st);
    const f = this.frame = document.createElement('iframe'); f.id = 'vw-frame'; f.hidden = true; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('playsinline', ''); document.body.appendChild(f);
    // the player tells us when the video is really playing: until then the screen keeps its poster, never a black box
    f.addEventListener('load', () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (e) { } });
    addEventListener('message', e => { if (!/youtube/.test(e.origin || '')) return; let d = e.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch (er) { return; } const st = d && d.info && d.info.playerState; if (st === 1) this.playing = true; else if (st === 0 || st === -1 || st === 5) this.playing = false; });
    this.loader = new THREE.TextureLoader(); this.loader.setCrossOrigin('anonymous');
    const b = this.btn = document.createElement('button'); b.id = 'vw-btn'; b.hidden = true; document.body.appendChild(b); b.onclick = () => this.openBig();
    const big = this.big = document.createElement('div'); big.id = 'vw-big'; big.hidden = true; document.body.appendChild(big);
  }
  videoFor(b) { return this.videos.length ? this.videos[b.video % this.videos.length] : null; }
  openBig() {
    const v = this.cur && this.videoFor(this.cur);
    if (!v) { window.open(this.channel, '_blank', 'noopener'); return; }
    this.stop(); this.g.paused = true;
    this.big.innerHTML = `<h3>${(v.title ? v.title + ' · ' : '') + (this.artist || 'Aflatoon')}</h3><iframe allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0"></iframe><div class="row"><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">▶ Open on YouTube</a><button>✕ Back to the game</button></div>`;
    this.big.hidden = false; this.big.querySelector('button').onclick = () => { this.big.hidden = true; this.big.innerHTML = ''; this.g.paused = false; };
  }
  say(func, args = []) { try { this.frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) { } }
  poster(b) {
    const v = this.videoFor(b); if (!v || !b.mat || b.pm === b.mat) return; b.pm = b.mat; const m = b.mat;
    const set = t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (b.mat === m) { m.map = t; m.needsUpdate = true; } };
    this.loader.load(`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`, t => { if (t.image && t.image.width < 400) return this.loader.load(`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, set, undefined, () => { }); set(t); }, undefined, () => this.loader.load(`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, set, undefined, () => { }));
  }
  stop() { this.playing = false; if (this.shown) { this.shown = null; this.frame.src = 'about:blank'; } this.frame.style.opacity = '0'; this.frame.style.transform = 'translate(-9999px, 0)'; }
  update(dt, p) {
    if (!this.big.hidden) return;
    // the nearest screen: you hear it from 250 m away (louder as you get closer), and see the video when you stand in front of it
    let best = null, bd = 250;
    for (const b of this.boards) { if (b.video == null || b.bad) continue; if (b.mat && b.pm !== b.mat && this.videos.length) this.poster(b); const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { best = b; bd = d; } }
    const front = best && best.face && bd < 90 && ((p.x - best.x) * Math.sin(best.h) + (p.y - best.y) * Math.cos(best.h)) / (bd || 1) > 0.35;
    const near = front ? best : null;
    if (near !== this.cur) { this.cur = near; const v = near && this.videoFor(near); this.btn.hidden = !near; if (near) this.btn.textContent = v ? `▶ Watch${v.title ? ' “' + v.title + '”' : ''} · open on YouTube` : '▶ Aflatoon on YouTube'; }
    const v = best && this.videoFor(best);
    if (!v) { this.stop(); return; }
    if (this.shown !== best) { this.shown = best; this.playing = false; this.shownT = 0; this.volT = 0; this.frame.hidden = false; this.frame.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&controls=0&playsinline=1&loop=1&playlist=${v.id}&rel=0&modestbranding=1&enablejsapi=1`; }
    if ((this.volT -= dt) <= 0) { this.volT = 0.4; const k = Math.max(0, 1 - bd / 250), vol = Math.round(100 * k * k); this.say('unMute'); this.say('setVolume', [vol]); this.say('playVideo'); }
    this.shownT += dt;
    if (!front || !(this.playing || this.shownT > 6)) { this.frame.style.opacity = '0'; this.frame.style.transform = 'translate(-9999px, 0)'; return; }
    // lay the player over the screen: project its four corners
    const m = best.face, hw = m.geometry.parameters.width / 2, hh = m.geometry.parameters.height / 2, pts = [], vw = innerWidth, vh = innerHeight, q = new THREE.Vector3(); let ok = true;
    m.updateWorldMatrix(true, false);
    for (const [x, y] of [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]]) { q.set(x, y, 0.02).applyMatrix4(m.matrixWorld).project(this.camera); if (q.z > 1 || q.z < -1) ok = false; pts.push([(q.x + 1) / 2 * vw, (1 - q.y) / 2 * vh]); }
    const area = Math.abs((pts[1][0] - pts[0][0]) * (pts[3][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[3][0] - pts[0][0]));
    if (!ok || area < 900) { this.frame.style.opacity = '0'; this.frame.style.transform = 'translate(-9999px, 0)'; return; }
    this.frame.style.opacity = '1'; this.frame.style.transform = homography([[0, 0], [W, 0], [W, H], [0, H]], pts);
  }
}

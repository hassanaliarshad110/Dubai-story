// Dubai City Stories: the title song's lyric video on big screens along the roads.
// The words are drawn live in pink and follow the song: the radio when it is playing the title song,
// otherwise the screen plays the song itself, louder as you walk up to it.
import * as THREE from 'three';
import { music } from './music.js?v=11190630';
import { isMuted } from './sound.js?v=11190630';

const SRC = 'audio/radio/dubai-city-stories.mp3', LEN = 103.7, BEAT = 60 / 89, ANCHOR = 37.2;
// [start, text, kind]  kind: v = verse, h = hook, t = title card
const L = [
  [0, '', 't'],
  [2.1, 'Yeah... Dubai City Stories. Yalla!', 'v'],
  [7.4, '', 't'],
  [10.0, 'Sharjah traffic, left at five, got home at nine', 'v'],
  [12.7, 'Salik beeping every bridge, four dirhams at a time', 'v'],
  [15.4, "Radar on the right and I'm one-forty in the lane", 'v'],
  [18.1, 'Flash! There goes my salary again', 'v'],
  [20.8, 'White Patrol behind me, high beams, let him pass', 'v'],
  [23.5, 'Two-digit number plate, tinted glass', 'v'],
  [26.2, 'Karak for a dirham, shawarma on the street', 'v'],
  [28.9, 'Fifty degrees outside, AC on my feet', 'v'],
  [31.6, 'DEWA bill in August like a phone number, bro', 'v'],
  [34.3, "Still I wouldn't trade it, there's nowhere else to go", 'v'],
  [37.0, 'Dubai City Stories! (Yalla!)', 'h'],
  [39.7, 'Dubai City Stories! (Habibi!)', 'h'],
  [42.4, 'Yeh sheher hamara, yeh qissa hamara', 'v'],
  [47.8, 'Dubai City Stories!', 'h'],
  [50.6, 'Yeah... Dubai City Stories. Yalla!', 'v'],
  [56.0, '', 't'],
  [58.6, 'Sheikh Zayed Road ki roshni, baarah lane ka dariya', 'v'],
  [61.3, 'Metro ki Red Line, Nol card hi zariya', 'v'],
  [64.0, 'Satwa ki galiyaan, Karama ka bazaar', 'v'],
  [66.7, '"Habibi, send location", "Inshallah" har baar', 'v'],
  [69.4, 'Jo aaya do saal ko, woh bees saal guzaara', 'v'],
  [72.1, 'Yeh ret ka sheher nahi, yeh sapnon ka kinaara', 'v'],
  [74.8, 'From the abra to the Burj, from the souk to the sky', 'v'],
  [77.5, 'Old Dubai, new Dubai, same city, same vibe', 'v'],
  [80.1, 'Dubai City Stories! (Yalla!)', 'h'],
  [82.8, 'Dubai City Stories! (Habibi!)', 'h'],
  [85.5, 'Yeh sheher hamara, yeh qissa hamara', 'v'],
  [90.9, 'Dubai City Stories!', 'h'],
  [93.7, '', 't'],
];
const W = 1024, H = 576, PINK = '#ff2e93', HOT = '#ff5fb0', DIM = '#6b1848', PALE = '#ffd0e8';
let canvas = null, g = null, tex = null, fontOk = false;
const font = px => fontOk ? `${px}px Anton` : `900 ${Math.round(px * 0.86)}px "Arial Narrow", "Segoe UI", Roboto, sans-serif`;
try { new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)').load().then(f => { document.fonts.add(f); fontOk = true; draw(lastT, true); }).catch(() => { }); } catch (e) { }
let lastT = 0;
export function lyricTexture() {
  if (tex) return tex;
  canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; g = canvas.getContext('2d');
  tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; draw(0, true); return tex;
}
const idxAt = t => { let i = 0; for (let k = 0; k < L.length; k++) { if (L[k][0] <= t) i = k; else break; } return i; };
function wrap(words, px, maxW) {
  g.font = font(px); const rows = [[]]; let w = 0, sp = g.measureText(' ').width;
  for (const wd of words) { const ww = g.measureText(wd.s).width; if (w + ww > maxW && rows[rows.length - 1].length) { rows.push([]); w = 0; } rows[rows.length - 1].push({ ...wd, w: ww }); w += ww + sp; }
  return { rows, sp };
}
function glow(text, x, y, col, blur) { g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.fillText(text, x, y); g.shadowBlur = 0; }
function titleCard(t, beat) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(60); glow('DUBAI', W / 2, 176, PALE, 14);
  g.font = font(150 + beat * 6); glow('CITY STORIES', W / 2, 296, PINK, 34); g.fillStyle = HOT; g.fillText('CITY STORIES', W / 2, 296);
  g.font = '700 30px "Segoe UI", Roboto, sans-serif'; g.fillStyle = PALE; g.fillText('THE TITLE TRACK  ·  A GAME BY HASSAN ALI', W / 2, 420);
}
function draw(t, force) {
  if (!g) return; lastT = t;
  const i = idxAt(t), [st, text, kind] = L[i], en = i + 1 < L.length ? L[i + 1][0] : LEN, ph = ((t - ANCHOR) / BEAT % 1 + 1) % 1, beat = Math.pow(1 - ph, 3);
  // background: deep purple, a pink glow that pumps with the beat, and level bars along the bottom
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d0214'); bg.addColorStop(1, '#2b0530'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, H * 0.5, 30, W / 2, H * 0.5, 560); rg.addColorStop(0, `rgba(255,46,147,${0.20 + 0.16 * beat})`); rg.addColorStop(1, 'rgba(255,46,147,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let b = 0; b < 48; b++) { const h = 14 + (Math.abs(Math.sin(b * 1.7 + t * 5.1)) * 0.6 + Math.abs(Math.sin(b * 0.61 - t * 3.3)) * 0.4) * (46 + 50 * beat); g.fillStyle = b % 2 ? 'rgba(255,46,147,.55)' : 'rgba(255,120,190,.45)'; g.fillRect(14 + b * 20.8, H - 12 - h, 13, h); }
  g.fillStyle = PINK; g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8);
  g.textBaseline = 'middle';
  if (kind === 't' || !text) { titleCard(t, beat); if (tex) tex.needsUpdate = true; return; }
  g.textAlign = 'left'; g.font = '800 26px "Segoe UI", Roboto, sans-serif'; g.fillStyle = PALE; g.fillText('♪  DUBAI CITY STORIES', 34, 44);
  g.textAlign = 'right'; g.fillStyle = HOT; g.fillText('AFLATOON FM', W - 34, 44);
  // the line being sung: words light up one after another
  const k = Math.max(0, Math.min(1, (t - st) / Math.max(0.6, (en - st) * (kind === 'h' ? 0.62 : 0.86))));
  const words = text.toUpperCase().split(' ').map(s => ({ s, ad: /^\(/.test(s) }));
  let px = kind === 'h' ? 168 : 112, lay = wrap(words, px, W - 90);
  while (lay.rows.length > (kind === 'h' ? 2 : 2) && px > 60) { px -= 6; lay = wrap(words, px, W - 90); }
  if (kind === 'h') px += beat * 5;
  g.font = font(px); const lh = px * 1.12, y0 = H / 2 + 6 - (lay.rows.length - 1) * lh / 2; let n = 0; const total = words.length;
  lay.rows.forEach((row, r) => {
    const rw = row.reduce((a, w) => a + w.w, 0) + lay.sp * (row.length - 1); let x = (W - rw) / 2; g.textAlign = 'left';
    for (const w of row) {
      const on = k * total >= n + 0.15, y = y0 + r * lh;
      if (on) { glow(w.s, x, y, w.ad ? PALE : PINK, kind === 'h' ? 30 : 20); g.fillStyle = w.ad ? '#ffffff' : HOT; g.fillText(w.s, x, y); }
      else { g.fillStyle = DIM; g.fillText(w.s, x, y); }
      x += w.w + lay.sp; n++;
    }
  });
  // the next line, small
  const nx = i + 1 < L.length ? L[i + 1][1] : '';
  if (nx) { g.textAlign = 'center'; g.font = '600 30px "Segoe UI", Roboto, sans-serif'; g.fillStyle = 'rgba(255,190,225,.6)'; g.fillText(nx, W / 2, H - 150); }
  if (tex) tex.needsUpdate = true;
}

export class LyricBoards {
  constructor(game, boards) {
    this.g = game; this.boards = boards.filter(b => b.lyric); this.t = 0; this.acc = 0;
    this.a = new Audio(); this.a.preload = 'none'; this.a.loop = true; this.a.volume = 0; this.a.src = SRC;
  }
  update(dt, p) {
    this.acc += dt; if (this.acc < 1 / 14) return; const step = this.acc; this.acc = 0;
    let best = null, bd = 420;
    for (const b of this.boards) { if (b.bad || !b.g) continue; const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { best = b; bd = d; } }
    const a = this.a, tr = music.track, radio = music.playing && music.el.volume > 0.03, radioTitle = radio && (!tr || tr.src === SRC);
    // sound from the screen itself: only when the radio is silent, and not during a full-size video
    const vol = best && !radio && !isMuted() && !this.g.paused && !document.hidden ? Math.pow(Math.max(0, 1 - bd / 230), 2) * 0.8 : 0;
    if (vol > 0.01) { if (a.paused) { try { if (a.readyState >= 1) a.currentTime = this.t % LEN; } catch (e) { } const pr = a.play(); if (pr && pr.catch) pr.catch(() => { }); } a.volume = Math.min(1, vol); }
    else if (!a.paused) { a.volume = 0; a.pause(); }
    if (radioTitle) this.t = music.el.currentTime; else if (!a.paused && a.currentTime > 0) this.t = a.currentTime; else this.t = (this.t + step) % LEN;
    if (best) draw(this.t);
  }
}

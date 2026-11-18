// Welcome billboards where main roads enter each ward, with a welcome from that ward's councillor.
import * as THREE from 'three';
import { ground } from './terrain.js?v=11112231';
import { rotY, dirOf } from './player.js?v=11112231';

let DATA = null;
export async function loadBillboards() { try { DATA = await (await fetch('data/billboards.json')).json(); } catch (e) { DATA = null; } return !!DATA; }
const TEX = new Map();
function wardTexture(n, councillor) {
  let t = TEX.get(n); if (t) return t;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 432; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 432); grd.addColorStop(0, '#0b3d6e'); grd.addColorStop(1, '#0f6d8c'); g.fillStyle = grd; g.fillRect(0, 0, 1024, 432);
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 1024, 18); g.fillRect(0, 414, 1024, 18);
  // a skyline strip along the bottom
  g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 40; i++) { const w = 18 + (i * 37 % 30), h = 30 + (i * 53 % 90); g.fillRect(i * 27, 400 - h, w, h); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
  g.font = '800 92px "Segoe UI", Roboto, Arial, sans-serif'; g.fillText(`Welcome to Ward ${n}`, 512, 120);
  g.font = '600 46px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#ffe28a'; g.fillText('A warm welcome from your councillor', 512, 218);
  let fs = 72; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(councillor).width > 940 && fs > 40) { fs -= 4; g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; }
  g.fillStyle = '#ffffff'; g.fillText(councillor, 512, 300);
  g.font = '500 30px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText('Calgary · YYC Story', 512, 372);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set(n, t); return t;
}
// ---------------------------------------------------------------- Dubai: advertising boards along the main roads
// "Your brand here" on half of them (ad space in the game), the game's own and Hassan's brands on the rest
const ADS = [
  { bg: ['#0b1220', '#1b2a44'], bar: '#f5c542', big: 'YOUR BRAND HERE', sub: 'Advertise in Dubai City Stories', foot: 'This billboard is for rent', col: '#f5c542' },
  { bg: ['#7a0c1a', '#c8102e'], bar: '#ffffff', big: 'YOUR BRAND HERE', sub: 'Seen by every driver on this road', foot: 'Dubai City Stories · ad space', col: '#ffffff' },
  { bg: ['#06363a', '#0b7a75'], bar: '#ffd76a', big: 'DUBAI CITY STORIES', sub: 'The real Dubai. Your story.', foot: 'A game by Hassan Ali', col: '#ffffff' },
  { bg: ['#101010', '#2a2a2a'], bar: '#e8c9a0', big: 'KAELBY', sub: 'Shop online · kaelby.com', foot: 'Delivered to your door', col: '#f3e3cc' },
  { bg: ['#1a1038', '#5a2ea0'], bar: '#ff5ac8', big: 'PROJECT HIP HOP DESI', sub: 'New music on YouTube', foot: '@projecthiphopdesi', col: '#ffffff' },
  { bg: ['#0c2a4a', '#1f6fb5'], bar: '#7fe0ff', big: 'DUBAI INSIGHT', sub: 'The city in numbers', foot: 'Open data, made clear', col: '#ffffff' },
  { bg: ['#2a1a05', '#a8741a'], bar: '#fff1c0', big: 'YOUR BRAND HERE', sub: 'Put your business on the map', foot: 'Dubai City Stories · ad space', col: '#fff1c0' },
];
function videoTexture() {
  let t = TEX.get('video'); if (t) return t;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 576); grd.addColorStop(0, '#12061f'); grd.addColorStop(1, '#3a0d2e'); g.fillStyle = grd; g.fillRect(0, 0, 1024, 576);
  g.fillStyle = '#e11d2a'; g.beginPath(); g.roundRect(412, 120, 200, 140, 34); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(488, 152); g.lineTo(488, 228); g.lineTo(556, 190); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = '900 110px "Segoe UI", Roboto, Arial, sans-serif'; g.fillText('AFLATOON', 512, 350);
  g.font = '700 44px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#ffd76a'; g.fillText('Music videos · Project Hip Hop Desi', 512, 440);
  g.font = '500 30px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText('Walk up to watch · tap to open YouTube', 512, 506);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set('video', t); return t;
}
function adTexture(i) {
  const key = 'ad' + i; let t = TEX.get(key); if (t) return t; const a = ADS[i % ADS.length];
  const c = document.createElement('canvas'); c.width = 1024; c.height = 432; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 432); grd.addColorStop(0, a.bg[0]); grd.addColorStop(1, a.bg[1]); g.fillStyle = grd; g.fillRect(0, 0, 1024, 432);
  g.fillStyle = a.bar; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 418, 1024, 14); g.fillRect(60, 252, 904, 4);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = a.col;
  let fs = 128; g.font = `900 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; while (g.measureText(a.big).width > 930 && fs > 50) { fs -= 4; g.font = `900 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; }
  g.fillText(a.big, 512, 150);
  g.font = '700 52px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#ffffff'; g.fillText(a.sub, 512, 310);
  g.font = '500 30px "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(a.foot, 512, 374);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set(key, t); return t;
}
// one board about every 500 m along the motorways and main roads, on the right of the traffic and facing it
export function dubaiBoards(world, roofAt) {
  const out = [], G = new Map(), far = (x, y) => { const k = Math.floor(x / 350) + ',' + Math.floor(y / 350); if (G.has(k)) return false; G.set(k, 1); return true; };
  // every road's centre line in a 24 m grid, so a board never lands on another carriageway
  const RG = new Map(), put = (x, y) => { const k = Math.floor(x / 24) + ',' + Math.floor(y / 24); let l = RG.get(k); if (!l) RG.set(k, l = []); l.push(x, y); };
  for (const r of world.overview || []) for (let i = 1; i < r.p.length; i++) { const a = r.p[i - 1], b = r.p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), st = Math.max(1, Math.ceil(l / 8)); for (let s = 0; s <= st; s++) put(a[0] + (b[0] - a[0]) * s / st, a[1] + (b[1] - a[1]) * s / st); }
  const clear = (x, y, R) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = RG.get((Math.floor(x / 24) + i) + ',' + (Math.floor(y / 24) + j)); if (l) for (let k = 0; k < l.length; k += 2) if (Math.hypot(l[k] - x, l[k + 1] - y) < R) return false; } return true; };
  let n = 0;
  for (const r of world.overview || []) {
    if (![1, 2, 3].includes(r.c) || r.p.length < 2) continue; let acc = 180 + (n * 97) % 240;
    for (let i = 1; i < r.p.length; i++) {
      const a = r.p[i - 1], b = r.p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; acc += l;
      if (acc < 520) continue; acc = 0;
      const dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l; let x = null, y = null;
      for (const off of [14, 19, 24, 30, 36]) { const qx = (a[0] + b[0]) / 2 + dy * off, qy = (a[1] + b[1]) / 2 - dx * off; if (clear(qx, qy, 11.5)) { x = qx; y = qy; break; } }
      if (x == null) { acc = 400; continue; }
      if (!far(x, y)) continue;
      const brd = { x, y, h: Math.atan2(-dx, -dy), ad: (n * 5 + (n % 2 ? 0 : 3)) % ADS.length, roofAt }; if (n % 9 === 4) brd.video = (n - 4) / 9; out.push(brd); n++;      // one in nine is a video screen
    }
  }
  return out;
}
const postMat = new THREE.MeshLambertMaterial({ color: 0x5f656b }), backMat = new THREE.MeshLambertMaterial({ color: 0x2b2f34 });
export class Billboards {
  constructor(scene, boards = null) { this.scene = scene; this.items = (boards || (DATA ? DATA.boards : [])).map(b => ({ ...b, g: null })); this.t = 0; }
  update(dt, px, py, night) {
    if ((this.t -= dt) > 0) return; this.t = 1;
    for (const b of this.items) {
      const d = Math.hypot(b.x - px, b.y - py);
      if (d < 1200 && !b.g && !b.bad) {
        if (b.roofAt) { if (d > 420) continue; if ([[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]].some(([ox, oy]) => b.roofAt(b.x + ox, b.y + oy) != null)) { b.bad = true; continue; } }      // never inside a building
        const g = b.g = new THREE.Group(), gy = ground(b.x, b.y);
        g.position.set(b.x, gy, -b.y); g.rotation.y = rotY(b.h);
        for (const x of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7, 0.45), postMat); p.position.set(x, 3.5, -0.3); p.castShadow = true; g.add(p); }
        const vid = b.video != null, bw = vid ? 16 : 12, bh = vid ? 9 : 5.06, by = vid ? 11.2 : 9.3;
        const back = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.34, 0.3), backMat); back.position.set(0, by, -0.3); back.castShadow = true; g.add(back);
        b.mat = new THREE.MeshBasicMaterial({ map: vid ? videoTexture() : b.ad != null ? adTexture(b.ad) : wardTexture(b.ward, b.councillor), toneMapped: false });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), b.mat); face.position.set(0, by, -0.14); g.add(face); b.face = face;
        this.scene.add(g);
      } else if (d > 1500 && b.g) { this.scene.remove(b.g); b.g = null; b.face = null; }
      if (b.mat) b.mat.color.setScalar(night ? 0.95 : 0.85);
    }
  }
}

// Scritte disegnate su canvas per insegne, cartelli e pannelli.
import * as THREE from 'three';

export function wrap(ctx, text, maxW){
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words){ const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// i caratteri web si caricano solo quando servono: le scritte su canvas vanno ridisegnate quando sono pronti,
// altrimenti restano con il carattere di ripiego (spesso uno con le grazie)
export const fontsReady = typeof document !== 'undefined' && document.fonts
  ? Promise.all(['600 40px Barlow', '400 40px Barlow', '700 40px "Barlow Condensed"', 'italic 700 40px "Barlow Condensed"'].map(f => document.fonts.load(f).catch(() => null)))
  : Promise.resolve();
// piano con texture da canvas; draw(ctx, w, h) disegna il contenuto
export function canvasPlane(w, h, pw, ph, draw, { double = false, basic = true } = {}){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  let last = draw;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const M = basic ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new M({ map: tex, side: double ? THREE.DoubleSide : THREE.FrontSide, transparent: true }));
  m.userData.dynamic = true;
  m.redraw = fn => { last = fn; ctx.clearRect(0, 0, w, h); fn(ctx, w, h); tex.needsUpdate = true; };
  fontsReady.then(() => m.redraw(last));
  return m;
}
// insegna: fascia colorata con scritta
export function signPlane(text, { bg = '#0b2a5b', fg = '#ffffff', pw = 4, ph = .8, font = 'bold 76px "Barlow Condensed", Arial Narrow, sans-serif', double = false } = {}){
  const W = 1024, H = Math.round(1024*ph/pw);
  return canvasPlane(W, H, pw, ph, (x, w, h) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    let size = parseInt(/(\d+)px/.exec(font)[1], 10);
    while (x.measureText(text).width > w*.92 && size > 20){ size -= 4; x.font = font.replace(/\d+px/, size + 'px'); }
    x.fillText(text, w/2, h/2 + 4);
  }, { double });
}
// immagine (logo) su un piano, caricata in modo asincrono
export function imagePlane(url, pw, ph){
  const tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.dynamic = true;
  return m;
}

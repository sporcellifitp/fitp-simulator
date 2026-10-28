// Gesto a scorrimento sullo schermo (dito o mouse). Durante il trascinamento mostra la mira;
// al rilascio produce il colpo: direzione = dove va la palla, lunghezza = profondità, velocità = potenza.
//   su            → colpo in topspin (dritto / rovescio / volée / servizio)
//   giù lungo     → pallonetto
//   giù corto     → smorzata in back
export class Swipe {
  constructor(el) {
    this.el = el;
    this.active = null;
    this.onRelease = null;
    this.onMove = null;
    this.onStart = null;
    this.enabled = true;
    const down = (x, y) => {
      if (!this.enabled) return;
      this.active = { x0: x, y0: y, x, y, t0: performance.now(), pts: [[x, y, performance.now()]] };
      this.onStart?.(this.active);
    };
    const move = (x, y) => {
      if (!this.active) return;
      this.active.x = x; this.active.y = y;
      this.active.pts.push([x, y, performance.now()]);
      if (this.active.pts.length > 30) this.active.pts.shift();
      this.onMove?.(this.read());
    };
    const up = () => {
      if (!this.active) return;
      const g = this.read();
      this.onEnd?.(this.active.pts);
      this.active = null;
      if (g && g.len > 0.035) this.onRelease?.(g);
      else this.onMove?.(null);
    };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); down(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => { if (this.active) { e.preventDefault(); move(e.clientX, e.clientY); } });
    el.addEventListener('pointerup', (e) => { e.preventDefault(); up(); });
    el.addEventListener('pointercancel', () => { this.active = null; this.onMove?.(null); });
  }

  // Gesto normalizzato sull'altezza dello schermo.
  read() {
    const a = this.active;
    if (!a) return null;
    const H = Math.max(320, window.innerHeight);
    const dx = (a.x - a.x0) / H, dy = (a.y - a.y0) / H;
    const len = Math.hypot(dx, dy);
    const dur = Math.max(0.04, (performance.now() - a.t0) / 1000);
    // velocità sugli ultimi 120 ms (il colpo di polso finale conta di più)
    const now = performance.now();
    let k = a.pts.length - 1;
    while (k > 0 && now - a.pts[k][2] < 120) k--;
    const p = a.pts[k];
    const recent = Math.hypot(a.x - p[0], a.y - p[1]) / H / Math.max(0.03, (now - p[2]) / 1000);
    return { dx, dy, len, dur, speed: Math.max(len / dur, recent), up: dy < 0 };
  }
}

// Traduce il gesto in un colpo: obiettivo nel campo avversario in coordinate "di chi colpisce"
// (lateral: -1 sinistra … +1 destra; depth: metri dalla rete), tipo, potenza 0..1.
//   su (normale)        → topspin            su veloce e lungo → piatto (più forte, più rischioso)
//   su lento            → pallonetto         giù lungo         → tagliato (basso e profondo)
//   giù corto           → palla corta
export const SHOT_NAMES = { topspin: 'TOPSPIN', flat: 'PIATTO', slice: 'TAGLIO', drop: 'PALLA CORTA', lob: 'PALLONETTO', volley: 'VOLÉE', smash: 'SMASH', serve: 'SERVIZIO' };
export const SHOT_COLORS = { topspin: '#d8f23a', flat: '#ff9a2e', slice: '#38e1ff', drop: '#ff6fd0', lob: '#b99bff', serve: '#ffffff' };

export function swipeToShot(g, { serve = false } = {}) {
  const ang = Math.atan2(g.dx, g.up ? -g.dy : g.dy); // 0 = dritto avanti
  const lateral = Math.max(-1, Math.min(1, ang / 0.62));
  const power = Math.max(0, Math.min(1, (g.speed - 0.8) / 2.6));
  const deep = Math.min(1, g.len / 0.42);
  if (serve) {
    return { kind: 'serve', spinKind: 'flat', lateral, depth: 5.2 + Math.min(1, g.len / 0.4) * 0.9, power };
  }
  if (!g.up) {
    if (g.len < 0.16) return { kind: 'drive', spinKind: 'drop', lateral, depth: 1.7 + g.len * 9, power: 0 };
    return { kind: 'drive', spinKind: 'slice', lateral, depth: 5.6 + deep * 5, power: Math.min(0.7, power) };
  }
  if (g.speed < 1.0 && g.len > 0.1) return { kind: 'drive', spinKind: 'lob', lateral, depth: 9.2 + deep * 1.6, power: 0.2 };
  if (g.speed > 3.4 && g.len > 0.28) return { kind: 'drive', spinKind: 'flat', lateral, depth: 6.2 + deep * 4.6, power: Math.max(0.6, power) };
  return { kind: 'drive', spinKind: 'topspin', lateral, depth: 5.0 + deep * 5.8, power };
}

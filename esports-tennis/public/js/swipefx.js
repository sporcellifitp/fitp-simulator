// Scia del gesto: il tratto del dito disegnato come una cometa azzurra che si assottiglia verso la coda
// e svanisce dopo il rilascio (sopra la scena 3D, sotto l'interfaccia).
export class SwipeTrail {
  constructor(swipe) {
    this.swipe = swipe;
    this.c = document.createElement('canvas');
    this.c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
    document.body.appendChild(this.c);
    this.x = this.c.getContext('2d');
    this.fading = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    swipe.onEnd = (pts) => this.release(pts);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.c.width = Math.round(window.innerWidth * dpr);
    this.c.height = Math.round(window.innerHeight * dpr);
  }

  // Da chiamare al rilascio del dito: il tratto resta visibile e svanisce.
  release(pts) {
    if (pts && pts.length > 1) this.fading = { pts: pts.map((p) => [p[0], p[1]]), t: performance.now() };
  }

  draw() {
    const x = this.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, this.c.width, this.c.height);
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const a = this.swipe.active;
    if (a && a.pts.length > 1) this.stroke(a.pts, 1);
    if (this.fading) {
      const k = 1 - (performance.now() - this.fading.t) / 450;
      if (k <= 0) this.fading = null;
      else this.stroke(this.fading.pts, k);
    }
  }

  stroke(pts, alpha) {
    const x = this.x;
    const n = pts.length;
    // cometa: un'unica forma piena che si allarga dalla coda alla punta (l'ultimo punto toccato)
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const w = 1 + (i / (n - 1)) ** 1.4 * 13;
      L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
      Rr.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    const g = x.createLinearGradient(pts[0][0], pts[0][1], pts[n - 1][0], pts[n - 1][1]);
    g.addColorStop(0, `rgba(40,200,255,${0.05 * alpha})`);
    g.addColorStop(1, `rgba(90,245,255,${0.95 * alpha})`);
    x.fillStyle = g;
    x.beginPath();
    L.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    for (let i = n - 1; i >= 0; i--) x.lineTo(Rr[i][0], Rr[i][1]);
    x.closePath();
    x.fill();
    // bagliore sulla punta
    const [hx, hy] = pts[n - 1];
    const glow = x.createRadialGradient(hx, hy, 0, hx, hy, 26);
    glow.addColorStop(0, `rgba(220,255,255,${0.9 * alpha})`);
    glow.addColorStop(1, 'rgba(60,230,255,0)');
    x.fillStyle = glow;
    x.beginPath(); x.arc(hx, hy, 26, 0, Math.PI * 2); x.fill();
  }
}

// Fisica della pallina, deterministica (stesso risultato su entrambi i telefoni in multigiocatore):
// gravità, attrito dell'aria, effetto (topspin/backspin) e rimbalzo sul cemento. Nessun Math.random qui.

export const G = 9.81;
export const DRAG = 0.0052;        // a = -DRAG·|v|·v
export const BALL_R = 0.033;
export const DT = 1 / 240;
export const COURT = { hw: 5.485, shw: 4.115, hl: 11.885, svc: 6.4, net: 0.914, netPost: 1.07, netPostX: 6.4 };

export function netHeightAt(x) {
  const t = Math.min(1, Math.abs(x) / COURT.netPostX);
  return COURT.net + (COURT.netPost - COURT.net) * t * t;
}

// ball: {p:[x,y,z], v:[x,y,z], spin} — spin > 0 topspin (spinge verso il basso), < 0 backspin (sostiene)
export function stepBall(b, dt = DT) {
  const [vx, vy, vz] = b.v;
  const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const hs = Math.sqrt(vx * vx + vz * vz);
  const magnus = b.spin * 0.0022 * hs * hs / 30; // accelerazione verticale dovuta all'effetto
  const ax = -DRAG * sp * vx;
  const ay = -G - DRAG * sp * vy - magnus;
  const az = -DRAG * sp * vz;
  b.v[0] += ax * dt; b.v[1] += ay * dt; b.v[2] += az * dt;
  b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
  let event = null;
  // rete: attraversamento del piano z = 0 sotto il nastro
  if ((b.p[2] - b.v[2] * dt) * b.p[2] <= 0 && b.v[2] !== 0 && Math.abs(b.p[0]) < COURT.netPostX) {
    if (b.p[1] - BALL_R < netHeightAt(b.p[0])) {
      event = { type: 'net' };
      b.v[2] *= -0.15; b.v[0] *= 0.3; b.v[1] *= 0.3;
      b.p[2] = Math.sign(b.v[2] || 1) * 0.05;
    }
  }
  // rimbalzo
  if (b.p[1] < BALL_R && b.v[1] < 0) {
    b.p[1] = BALL_R;
    const vin = -b.v[1];
    // il topspin rimbalza più alto e "scappa" in avanti; il back resta basso e si frena (palla corta)
    // back molto forte (palla corta): la palla si "siede" e quasi si ferma
    const heavyBack = b.spin < -1.4;
    b.v[1] = vin * (heavyBack ? 0.5 : 0.74 + Math.max(-0.26, Math.min(0.07, b.spin * 0.12)));
    const keep = heavyBack ? 0.3 : 0.72 + Math.max(-0.3, Math.min(0.1, b.spin * 0.08));
    b.v[0] *= keep; b.v[2] *= keep;
    b.spin *= 0.4;
    event = { type: 'bounce', x: b.p[0], z: b.p[2], vin };
  }
  return event;
}

export function cloneBall(b) {
  return { p: b.p.slice(), v: b.v.slice(), spin: b.spin };
}

// Traiettoria campionata fino a `maxT` secondi o al secondo rimbalzo.
export function predict(ball, maxT = 4, step = 2) {
  const b = cloneBall(ball);
  const pts = [];
  let t = 0, bounces = 0, firstBounce = null;
  while (t < maxT) {
    let ev = null;
    for (let i = 0; i < step; i++) { ev = stepBall(b) || ev; t += DT; }
    pts.push({ t, p: b.p.slice(), v: b.v.slice(), bounces });
    if (ev && ev.type === 'bounce') {
      bounces++;
      if (!firstBounce) firstBounce = { t, x: ev.x, z: ev.z };
      if (bounces >= 2) break;
    }
    if (ev && ev.type === 'net') return { pts, firstBounce, net: true };
  }
  return { pts, firstBounce, net: false };
}

// Dove cade la palla (primo rimbalzo) e altezza sulla rete, senza fermarsi alla rete.
function flight(p0, v0, spin) {
  const b = { p: p0.slice(), v: v0.slice(), spin };
  let t = 0, netClear = Infinity;
  const startSide = Math.sign(p0[2]) || 1;
  for (let i = 0; i < 4000; i++) {
    const prevZ = b.p[2];
    const [vx, vy, vz] = b.v;
    const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const hs = Math.sqrt(vx * vx + vz * vz);
    const magnus = spin * 0.0022 * hs * hs / 30;
    b.v[0] += -DRAG * sp * vx * DT; b.v[1] += (-G - DRAG * sp * vy - magnus) * DT; b.v[2] += -DRAG * sp * vz * DT;
    b.p[0] += b.v[0] * DT; b.p[1] += b.v[1] * DT; b.p[2] += b.v[2] * DT;
    t += DT;
    if (prevZ * b.p[2] <= 0 && Math.sign(prevZ) === startSide) netClear = b.p[1] - netHeightAt(b.p[0]);
    if (b.p[1] <= BALL_R) return { x: b.p[0], z: b.p[2], t, netClear };
  }
  return { x: b.p[0], z: b.p[2], t, netClear };
}

// Velocità iniziale per mandare la palla da p0 al punto (tx, tz) con velocità orizzontale `speed` (m/s).
// Cerca l'alzata giusta per bisezione; se la palla non passa la rete abbassa la velocità e riprova.
export function solveShot(p0, tx, tz, speed, spin, minNetClear = 0.25) {
  let s = speed;
  for (let attempt = 0; attempt < 14; attempt++) {
    const dx = tx - p0[0], dz = tz - p0[2];
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const ux = dx / d, uz = dz / d;
    let lo = -12, hi = 30, best = null;
    for (let i = 0; i < 26; i++) {
      const vy = (lo + hi) / 2;
      const f = flight(p0, [ux * s, vy, uz * s], spin);
      const fd = (f.x - p0[0]) * ux + (f.z - p0[2]) * uz;
      best = { v: [ux * s, vy, uz * s], f };
      if (fd < d) lo = vy; else hi = vy;
    }
    if (best.f.netClear >= minNetClear) return { v: best.v, spin, land: [best.f.x, best.f.z], t: best.f.t, netClear: best.f.netClear };
    s *= 0.9;
  }
  return null;
}

// Il punto (x, z) è dentro il campo del singolare nella metà indicata (side = +1 vicino, -1 lontano)?
export function inCourt(x, z, side, margin = 0.04) {
  return Math.abs(x) <= COURT.shw + margin && side * z >= -margin && side * z <= COURT.hl + margin;
}

// Riquadro del servizio: chi serve da `serverSide` sul lato `court` ('deuce' = destra del battitore).
export function inServiceBox(x, z, receiverSide, box, margin = 0.04) {
  // box: 'deuce' | 'ad' visto da chi riceve; sul lato del ricevente la metà "deuce" è la sua destra
  const right = receiverSide > 0 ? x > 0 : x < 0; // destra del ricevente (che guarda verso la rete)
  const wantRight = box === 'deuce';
  const lateralOk = (right === wantRight || Math.abs(x) <= margin) && Math.abs(x) <= COURT.shw + margin;
  const depth = receiverSide * z;
  return lateralOk && depth >= -margin && depth <= COURT.svc + margin;
}

// Generatore pseudo-casuale con seme (per la CPU e per la mira imprecisa).
export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

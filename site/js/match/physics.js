// Fisica della palla per tennis e padel, senza Three.js (testabile con node --test).
// Coordinate del campo: x = larghezza, z = lunghezza (rete a z = 0), y = altezza. Il lato 0 è z > 0, il lato 1 è z < 0.

export const GRAVITY = 9.81;
// Rad/s, asse nel mondo. Il modello include Magnus e contatto tangenziale col campo.
const BALL_RADIUS = .0335, MAGNUS = .0006, SPIN_DECAY = .12;
const zeroSpin = () => ({ x: 0, y: 0, z: 0 });
export function spinForShot(type, from, to, court = COURTS.tennis){
  if (court.sport !== 'tennis') return zeroSpin();
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz) || 1;
  const rate = ({ drive: 110, topspin: 180, slice: -160, drop: -190, lob: 65, serve: 90, smash: 140 })[type] ?? 0;
  return { x: dz/d*rate, y: 0, z: -dx/d*rate };
}

export const COURTS = {
  tennis: {
    sport: 'tennis', halfW: 4.115, halfL: 11.885, serviceZ: 6.4, netH: .914, netPostH: 1.07,
    bounce: .7, friction: .8, walls: null, runoff: { x: 6.2, z: 18 },
  },
  padel: {
    sport: 'padel', halfW: 5, halfL: 10, serviceZ: 6.95, netH: .88, netPostH: .92,
    bounce: .74, friction: .85, walls: { h: 3, fence: 4, rest: .62 }, runoff: { x: 5, z: 10 },
  },
};

export const sideOf = z => z >= 0 ? 0 : 1;
export const netHeightAt = (court, x) => court.netH + (court.netPostH - court.netH)*Math.min(1, Math.abs(x)/court.halfW);

export function newBall(p = { x: 0, y: 1, z: 0 }, v = { x: 0, y: 0, z: 0 }, spin = zeroSpin()){
  return { p: { ...p }, v: { ...v }, spin: { ...spin }, rolling: false, stopped: false, still: 0 };
}
export const cloneBall = b => ({ p: { ...b.p }, v: { ...b.v }, spin: { ...(b.spin || zeroSpin()) }, rolling: b.rolling, stopped: b.stopped, still: b.still, out: b.out });

function advanceFlight(ball, h, tennis){
  const p = ball.p, v = ball.v, w = ball.spin;
  if (!ball.rolling){
    let ax = 0, ay = -GRAVITY, az = 0;
    if (tennis && w){
      ax = MAGNUS*(w.y*v.z - w.z*v.y);
      ay += MAGNUS*(w.z*v.x - w.x*v.z);
      az = MAGNUS*(w.x*v.y - w.y*v.x);
      const decay = 1 - SPIN_DECAY*h;
      w.x *= decay; w.y *= decay; w.z *= decay;
    }
    v.x += ax*h; v.y += ay*h; v.z += az*h;
  }
  const drag = 1 - .06*h;
  v.x *= drag; v.z *= drag;
  p.x += v.x*h; p.y += v.y*h; p.z += v.z*h;
}

// Avanza la palla di dt secondi. Gli eventi (rimbalzo, rete, parete, uscita dal recinto) finiscono in `events`.
export function stepBall(ball, dt, court, events = []){
  if (ball.stopped) return events;
  const n = Math.max(1, Math.ceil(dt/.004)), h = dt/n, p = ball.p, v = ball.v;
  for (let i = 0; i < n; i++){
    const px = p.x, py = p.y, pz = p.z;
    advanceFlight(ball, h, court.sport === 'tennis');
    // rete
    if ((pz > 0) !== (p.z > 0) && Math.abs(p.x) < court.halfW + .9){
      const u = pz/(pz - p.z), y = p.y - v.y*h*(1 - u);
      const top = netHeightAt(court, p.x);
      if (y < top){
        if (top - y < .06 && Math.abs(v.z) > 4){
          // sul nastro: la palla passa lo stesso, rallentata e un po' sparata in alto
          v.z *= .45; v.x *= .7; v.y = Math.abs(v.y)*.2 + .9;
          events.push({ type: 'net', tape: true, x: p.x, y, z: 0 });
        } else {
          p.z = pz > 0 ? .03 : -.03; v.z *= -.15; v.x *= .3; v.y = Math.min(v.y, 0);
          events.push({ type: 'net', x: p.x, y, z: 0 });
        }
      }
    }
    // pareti del padel: vetro e rete metallica rimandano la palla, sopra si esce dal recinto
    const W = court.walls;
    if (W){
      if (Math.abs(p.z) > court.halfL){
        if (p.y < W.fence){ p.z = Math.sign(p.z)*court.halfL; v.z = -v.z*W.rest; v.x *= .9; events.push({ type: 'wall', axis: 'z', x: p.x, y: p.y, z: p.z, side: sideOf(p.z) }); }
        else if (!ball.out){ ball.out = true; events.push({ type: 'exit', x: p.x, y: p.y, z: p.z, side: sideOf(p.z) }); }
      }
      if (Math.abs(p.x) > court.halfW && Math.abs(p.z) <= court.halfL + .01){
        const h2 = Math.abs(p.z) > 6 ? W.h : W.h;             // vetro vicino al fondo, rete metallica al centro: stessa altezza qui
        if (p.y < h2){ p.x = Math.sign(p.x)*court.halfW; v.x = -v.x*W.rest*.8; events.push({ type: 'wall', axis: 'x', x: p.x, y: p.y, z: p.z, side: sideOf(p.z) }); }
        else if (!ball.out){ ball.out = true; events.push({ type: 'exit', x: p.x, y: p.y, z: p.z, side: sideOf(p.z) }); }
      }
    }
    // terreno
    if (p.y <= 0 && v.y <= 0 && !ball.rolling){
      const groundFraction = Math.max(0, Math.min(1, py/(py - p.y)));
      p.y = 0;
      if (court.sport === 'tennis' && ball.spin && Math.hypot(ball.spin.x, ball.spin.y, ball.spin.z) > .001){
        const w = ball.spin, speed = Math.hypot(v.x, v.z) || 1;
        const top = (w.x*v.z - w.z*v.x)/speed;
        // Restituzione efficace di palla/campo: top più alto, taglio più basso.
        // L'impulso tangenziale riduce lo slittamento e trasferisce spin in velocità.
        const incomingY = -v.y, restitution = court.bounce + Math.max(-.12, Math.min(.08, top*.00065));
        const slipX = v.x + w.z*BALL_RADIUS, slipZ = v.z - w.x*BALL_RADIUS;
        const slip = Math.hypot(slipX, slipZ), maxImpulse = .22*(1 + restitution)*incomingY;
        const impulse = Math.min(slip*2/7, maxImpulse), factor = slip > 1e-8 ? -impulse/slip : 0;
        const jx = slipX*factor, jz = slipZ*factor;
        v.x += jx; v.z += jz;
        w.x -= jz*2.5/BALL_RADIUS; w.z += jx*2.5/BALL_RADIUS; w.y *= .8;
        if (incomingY < 1.2){ ball.rolling = true; v.y = 0; }
        else v.y = incomingY*restitution;
      } else {
        if (-v.y < 1.2){ ball.rolling = true; v.y = 0; }
        else v.y = -v.y*court.bounce;
        v.x *= court.friction; v.z *= court.friction;
      }
      // L'evento usa l'attraversamento del terreno, non la fine del sottopasso.
      // Evita che un tiro sulla linea venga giudicato fuori per un frame più lungo.
      const u = groundFraction;
      const bx = px + (p.x - px)*u, bz = pz + (p.z - pz)*u;
      events.push({ type: 'bounce', x: bx, y: 0, z: bz, side: sideOf(bz) });
    }
    if (ball.rolling){
      const k = 1 - 1.6*h; v.x *= k; v.z *= k;
      if (Math.hypot(v.x, v.z) < .3){ ball.stopped = true; events.push({ type: 'stop', x: p.x, z: p.z, side: sideOf(p.z) }); break; }
    }
  }
  return events;
}

// Traiettoria prevista: campioni ogni `dt` secondi per `T` secondi, con il numero di rimbalzi fino a quel momento.
export function predict(ball, court, T = 3, dt = 1/60){
  const b = cloneBall(ball), out = [];
  let bounces = 0, walls = 0, t = 0, net = false;
  while (t < T && !b.stopped){
    const ev = stepBall(b, dt, court);
    for (const e of ev){ if (e.type === 'bounce') bounces++; if (e.type === 'wall') walls++; if (e.type === 'net') net = true; }
    t += dt;
    out.push({ t, x: b.p.x, y: b.p.y, z: b.p.z, vx: b.v.x, vy: b.v.y, vz: b.v.z, bounces, walls, net });
  }
  return out;
}

// Solutore coerente con stepBall: drag applicato prima dell'avanzamento e gravità
// semi-implicita. Il passo nominale è quello di un frame a60Hz diviso in5 passi;
// i passi reali a30/120Hz differiscono meno di un centimetro al primo rimbalzo.
export function aimShot(from, to, T, court, clearance = .35, spin = null){
  if (court.sport === 'padel') return padelAimShot(from, to, T, court, clearance);
  if (spin && Math.hypot(spin.x, spin.y, spin.z) > .001) return spinAimShot(from, to, T, court, clearance, spin);
  const h = 1/300, drag = .06, retain = 1 - drag*h;
  let t = Math.max(.12, Math.round((Number.isFinite(T) ? T : 1)/h)*h);
  const solve = duration => {
    const factor = retain*(1 - Math.pow(retain, duration/h))/drag;
    return { x: (to.x - from.x)/factor, y: (-from.y + .5*GRAVITY*duration*(duration + h))/duration, z: (to.z - from.z)/factor, T: duration };
  };
  let v;
  for (let k = 0; k < 180; k++){
    v = solve(t);
    if ((from.z > 0) === (to.z > 0) || Math.abs(v.z) < 1e-6) return v;
    const fraction = -from.z/(to.z - from.z);
    const tn = h*Math.log(1 - fraction*(1 - Math.pow(retain, t/h)))/Math.log(retain);
    const x = from.x + (to.x - from.x)*fraction;
    const yn = from.y + v.y*tn - .5*GRAVITY*tn*(tn + h);
    if (yn >= netHeightAt(court, x) + clearance) return v;
    t += .01;
  }
  return v;
}

// Con omega imposto, le forze sono lineari in v: tre risposte unitarie danno
// la soluzione del tiro senza tentativi casuali. Lo stesso integratore del gioco
// determina sia l'arrivo sia il passaggio sopra la rete.
function spinAimShot(from, to, T, court, clearance, spin){
  let duration = aimShot(from, to, T, court, clearance).T;
  const cross = (a, b) => ({ x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.x });
  const dot = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;
  const flight = (v, time) => {
    const ball = newBall(from, v, spin), n = Math.ceil(time/(1/300)), h = time/n;
    let netY = Infinity, netX = 0;
    for (let i = 0; i < n; i++){
      const prev = { ...ball.p }; advanceFlight(ball, h, true);
      if ((prev.z > 0) !== (ball.p.z > 0)){
        const u = prev.z/(prev.z - ball.p.z);
        netY = prev.y + (ball.p.y - prev.y)*u; netX = prev.x + (ball.p.x - prev.x)*u;
      }
    }
    return { p: ball.p, netY, netX };
  };
  let velocity;
  for (let attempt = 0; attempt < 80; attempt++){
    const base = flight({ x: 0, y: 0, z: 0 }, duration).p;
    const cols = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }].map(v => {
      const p = flight(v, duration).p; return { x: p.x - base.x, y: p.y - base.y, z: p.z - base.z };
    });
    const target = { x: to.x - base.x, y: -base.y, z: to.z - base.z };
    const det = dot(cols[0], cross(cols[1], cols[2]));
    if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return aimShot(from, to, duration, court, clearance);
    velocity = { x: dot(target, cross(cols[1], cols[2]))/det, y: dot(cols[0], cross(target, cols[2]))/det, z: dot(cols[0], cross(cols[1], target))/det, T: duration };
    const path = flight(velocity, duration);
    if ((from.z > 0) === (to.z > 0) || path.netY >= netHeightAt(court, path.netX) + clearance) return velocity;
    duration += .025;
  }
  return velocity;
}

// Parametri dei colpi: tempo di volo in funzione della distanza e del tipo
export function shotTime(court, type, dist){
  const fast = court.sport === 'padel' ? 15 : 21;
  if (type === 'lob') return court.sport === 'padel' ? 1.75 : 1.85;
  if (type === 'smash') return Math.max(.32, dist/(fast*1.45));
  if (type === 'serve') return Math.max(.42, dist/(fast*1.25));
  if (type === 'drop') return Math.max(.72, dist/(fast*.55));
  if (type === 'slice') return Math.max(.55, dist/(fast*.82));
  return Math.max(.45, dist/fast);
}

// Il padel conserva il suo tuning storico; il refactoring riguarda il tennis.
function padelAimShot(from, to, T, court, clearance){
  let t = T;
  for (let k = 0; k < 40; k++){
    const v = { x: (to.x - from.x)/t, z: (to.z - from.z)/t, y: (-from.y + .5*GRAVITY*t*t)/t, T: t };
    if ((from.z > 0) === (to.z > 0) || Math.abs(v.z) < 1e-6) return v;
    const tn = -from.z/v.z, yn = from.y + v.y*tn - .5*GRAVITY*tn*tn;
    if (yn >= netHeightAt(court, from.x + v.x*tn) + clearance) return v;
    t += .05;
  }
  return { x: (to.x - from.x)/t, z: (to.z - from.z)/t, y: (-from.y + .5*GRAVITY*t*t)/t, T: t };
}

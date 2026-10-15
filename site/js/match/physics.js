// Fisica della palla per tennis e padel, senza Three.js (testabile con node --test).
// Coordinate del campo: x = larghezza, z = lunghezza (rete a z = 0), y = altezza. Il lato 0 è z > 0, il lato 1 è z < 0.

export const GRAVITY = 9.81;

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

export function newBall(p = { x: 0, y: 1, z: 0 }, v = { x: 0, y: 0, z: 0 }){
  return { p: { ...p }, v: { ...v }, rolling: false, stopped: false, still: 0 };
}
export const cloneBall = b => ({ p: { ...b.p }, v: { ...b.v }, rolling: b.rolling, stopped: b.stopped, still: b.still });

// Avanza la palla di dt secondi. Gli eventi (rimbalzo, rete, parete, uscita dal recinto) finiscono in `events`.
export function stepBall(ball, dt, court, events = []){
  if (ball.stopped) return events;
  const n = Math.max(1, Math.ceil(dt/.004)), h = dt/n, p = ball.p, v = ball.v;
  for (let i = 0; i < n; i++){
    const pz = p.z;
    if (!ball.rolling) v.y -= GRAVITY*h;
    const drag = 1 - .06*h;                               // un po' d'aria
    v.x *= drag; v.z *= drag;
    p.x += v.x*h; p.y += v.y*h; p.z += v.z*h;
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
      p.y = 0;
      if (-v.y < 1.2){ ball.rolling = true; v.y = 0; }
      else v.y = -v.y*court.bounce;
      v.x *= court.friction; v.z *= court.friction;
      events.push({ type: 'bounce', x: p.x, y: 0, z: p.z, side: sideOf(p.z) });
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

// Velocità iniziale per portare la palla da `from` a terra in `to` in circa `T` secondi, passando sopra la rete.
export function aimShot(from, to, T, court, clearance = .35){
  let t = T;
  for (let k = 0; k < 40; k++){
    const vx = (to.x - from.x)/t, vz = (to.z - from.z)/t, vy = (-from.y + .5*GRAVITY*t*t)/t;
    if ((from.z > 0) === (to.z > 0) || Math.abs(vz) < 1e-6) return { x: vx, y: vy, z: vz, T: t };
    const tn = -from.z/vz, yn = from.y + vy*tn - .5*GRAVITY*tn*tn;
    if (yn >= netHeightAt(court, from.x + vx*tn) + clearance) return { x: vx, y: vy, z: vz, T: t };
    t += .05;
  }
  const vx = (to.x - from.x)/t, vz = (to.z - from.z)/t, vy = (-from.y + .5*GRAVITY*t*t)/t;
  return { x: vx, y: vy, z: vz, T: t };
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

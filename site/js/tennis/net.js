// Partita online: stato della partita in istantanee (host → amico) e ricostruzione sull'altro schermo. Senza DOM.
// Tempi: tutto è nel «tempo di partita» dell'host (core.t). L'amico stima il tempo di partita attuale dalle istantanee e
// dall'allineamento degli orologi, e disegna un attimo indietro (D secondi) interpolando tra due istantanee: movimento
// fluido anche con la rete che va a scatti. Quando l'amico colpisce, il colpo si riferisce a ciò che vedeva (tempo − D):
// l'host lo giudica su quell'istante (la palla torna indietro), e intanto non chiude il punto (attesa «grace»).
import { pointLabels } from '../match/rules.js';

const r3 = v => Math.round(v*1000)/1000;
export function encodeSnap(core, hostWallMs){
  const b = core.ball, sc = core.score;
  return {
    t: 's', ct: r3(core.t), hw: Math.round(hostWallMs*10)/10, ph: core.phase, sv: core.serverP && core.serverP.id,
    b: [r3(b.p.x), r3(b.p.y), r3(b.p.z), r3(b.v.x), r3(b.v.y), r3(b.v.z)], hd: b.held ? 1 : 0, tt: core.toss ? r3(core.toss.t0) : null,
    p: core.players.map(p => [r3(p.x), r3(p.z), r3(p.y || 0), p.anim ? [p.anim.kind, p.anim.side || null, r3(p.anim.at)] : 0, p.inc ? [r3(p.inc.Tc), r3(p.inc.x), r3(p.inc.z), p.inc.side, Number.isFinite(p.inc.y) ? r3(p.inc.y) : null] : 0, r3(p.vx || 0), r3(p.vz || 0), core.legalFor ? (core.legalFor(p) ? 1 : 0) : 0]),
    sc: [sc.games[0], sc.games[1], sc.points[0], sc.points[1], sc.server, sc.tiebreak ? 1 : 0, sc.gamesToWin, sc.set ? 1 : 0],
  };
}
// eventi da mandare all'amico (con il tempo di partita, per mostrarli quando li vede)
export const encodeEvents = (core, events) => events.filter(e => e.type !== 'net' || e.tape).map(e => ({ ...e, ct: r3(core.t) }));

export function createMirror({ players, D = .1 }){
  const snaps = [], events = [];
  const M = {
    D, players, last: null, rate: 1, waiting: false,
    resetClock(){ snaps.length = 0; events.length = 0; M.rate = 1; M.waiting = true; },
    // rate: quanto avanza il tempo di partita per ogni secondo dell'host. Su un computer lento la partita va più piano
    // dell'orologio (passo massimo per fotogramma): senza questa stima l'amico vedrebbe e colpirebbe «nel futuro».
    push(s){
      if (M.last && s.ct < M.last.ct) return;
      const p = M.waiting ? null : M.last;
      M.waiting = false;
      if (p && s.hw > p.hw + 5){ const r = (s.ct - p.ct)/((s.hw - p.hw)/1000); if (isFinite(r)) M.rate += (Math.max(.1, Math.min(1.2, r)) - M.rate)*.2; }
      snaps.push(s); M.last = s; while (snaps.length > 40) snaps.shift();
    },
    pushEvents(list){ events.push(...list); },
    // tempo di partita attuale stimato: ultima istantanea + tempo passato sull'orologio dell'host
    coreNow(localMs, clock){ const s = M.last; if (!s) return 0; if (M.waiting) return s.ct; return s.ct + M.rate*(clock.toRemote(localMs) - s.hw)/1000; },
    renderTime(localMs, clock){ return M.coreNow(localMs, clock) - M.D; },
    // da un istante locale (s, orologio di questa pagina) al tempo di partita che si stava vedendo
    seenAt(localSec, clock){ return M.coreNow(localSec*1000, clock) - M.D; },
    takeEvents(R){ const out = []; while (events.length && events[0].ct <= R) out.push(events.shift()); return out; },
    score(){
      const s = M.last; if (!s) return null;
      const sc = { games: [s.sc[0], s.sc[1]], points: [s.sc[2], s.sc[3]], server: s.sc[4], tiebreak: !!s.sc[5], gamesToWin: s.sc[6], set: !!s.sc[7] };
      return { ...sc, labels: pointLabels(sc) };
    },
    // stato da disegnare all'istante R, interpolato tra le due istantanee attorno
    view(R){
      if (!snaps.length) return null;
      R = Math.max(snaps[0].ct, Math.min(R, snaps.at(-1).ct + .15));
      let a = snaps[0], b = snaps[snaps.length - 1];
      for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].ct <= R){ a = snaps[i - 1]; b = snaps[i]; break; }
      if (R >= b.ct) a = b;
      const k = b === a ? 0 : Math.max(0, Math.min(1, (R - a.ct)/(b.ct - a.ct))), L = (x, y) => x + (y - x)*k;
      // oltre l'ultima istantanea: la palla prosegue in linea retta per al massimo 0,15 s
      const ex = b === a ? Math.min(.15, Math.max(0, R - a.ct)) : 0;
      const ball = b === a
        ? { x: a.b[0] + a.b[3]*ex, y: Math.max(0, a.b[1] + a.b[4]*ex - 4.9*ex*ex), z: a.b[2] + a.b[5]*ex }
        : { x: L(a.b[0], b.b[0]), y: L(a.b[1], b.b[1]), z: L(a.b[2], b.b[2]) };
      // un salto grande tra due istantanee (colpo con la palla riportata indietro): niente interpolazione
      if (b !== a && Math.hypot(b.b[0] - a.b[0], b.b[2] - a.b[2]) > 4){ const n = k < .5 ? a : b; ball.x = n.b[0]; ball.y = n.b[1]; ball.z = n.b[2]; }
      const src = k < .5 ? a : b;
      return {
        t: R, phase: src.ph, held: !!src.hd, serverId: src.sv, toss: src.tt != null ? { t0: src.tt } : null,
        ball: { p: ball, v: { x: L(a.b[3], b.b[3]), y: L(a.b[4], b.b[4]) - 9.81*ex, z: L(a.b[5], b.b[5]) } },
        players: M.players.map((p, i) => ({
          ...p, x: L(a.p[i][0], b.p[i][0]), z: L(a.p[i][1], b.p[i][1]), y: L(a.p[i][2], b.p[i][2]),
          vx: L(a.p[i][5] || 0, b.p[i][5] || 0), vz: L(a.p[i][6] || 0, b.p[i][6] || 0),
          contactEligible: src.p[i][7] == null ? !!src.p[i][4] : !!src.p[i][7],
          anim: src.p[i][3] ? { kind: src.p[i][3][0], side: src.p[i][3][1], at: src.p[i][3][2] } : null,
          inc: src.p[i][4] ? { Tc: src.p[i][4][0], x: src.p[i][4][1], z: src.p[i][4][2], side: src.p[i][4][3], y: Number.isFinite(src.p[i][4][4]) ? src.p[i][4][4] : undefined } : null,
        })),
      };
    },
  };
  return M;
}


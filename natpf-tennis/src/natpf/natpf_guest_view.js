// Palla e giocatori sul computer del Player 2 nella sfida tra due computer (1v1). L'host è l'arbitro e manda uno
// snapshot ogni ~50 ms; tra uno snapshot e l'altro il P2 fa volare la palla con la sua fisica e, quando colpisce lui,
// prevede la traiettoria in locale (game_engine.js, _attemptP2RallyStrike) senza aspettare l'host.
// Prima ogni snapshot sovrascriveva palla e attori in un colpo solo (attori al 65% verso l'host) e:
//   (a) dopo un colpo del P2 arrivavano ancora snapshot fatti dall'host PRIMA di ricevere quel colpo: la palla tornava
//       indietro oltre la racchetta e poi ripartiva;
//   (b) a ogni snapshot palla e attori facevano uno scatto.
// Ora:
//   1) blocco della previsione locale: per al massimo GUEST_VIEW.holdMs dopo un colpo del P2 la parte «palla» degli
//      snapshot che non contengono ancora quel colpo si ignora (fase, punteggio, banner e attori si applicano sempre);
//   2) correzione morbida SOLO VISIVA: la fisica (ball.pos, usata anche dalla previsione dei colpi) resta quella
//      dell'host; ciò che si disegna (palla, ombra, scia) recupera lo scarto in ~GUEST_VIEW.blendMs. Colpo nuovo o
//      scarto grande: salto netto. Gli attori si avvicinano alla posizione dell'host un po' a ogni fotogramma;
//   3) misure per la diagnostica (evento «sfida.vista»): età degli snapshot, correzioni della palla, blocchi.
// Qui solo i calcoli (funzioni pure, provate in test/natpf-guest-view.test.mjs); il motore li usa solo sul P2.
export const GUEST_VIEW = {
  holdMs: 300,      // blocco della previsione locale dopo un colpo del P2 (poi lo snapshot vince comunque)
  blendMs: 100,     // tempo in cui la palla disegnata recupera lo scarto (resta < 5%)
  snapM: 1.5,       // scarto della palla oltre il quale niente fusione: salto netto
  actorMs: 60,      // costante di tempo della fusione degli attori (con uno snapshot ogni 50 ms ne recupera ~2/3)
  actorSnapM: 3,    // attore lontano più di così dalla posizione dell'host (cambio di campo, servizio): salto netto
  reportMs: 5000,   // ogni quanto il riassunto per la diagnostica
};

export function createGuestView(){
  return { hit: null, off: { x: 0, y: 0, z: 0 }, stats: newStats(), reportAt: 0 };
}

// colpo locale del P2: conteggio dei colpi dello scambio DOPO il colpo, e quando (ms, performance.now)
export function markLocalHit(view, { count, now }){
  view.hit = { count: Number(count) || 0, at: now };
  return view.hit;
}

// Lo snapshot non contiene ancora il colpo locale del P2? Allora la sua palla è più vecchia della previsione locale e
// non si applica. Non si blocca: senza colpo locale, dopo holdMs (l'host potrebbe non averlo accettato), o se per l'host
// lo scambio è finito (fase diversa da RALLY: quel colpo non arriverà più).
export function holdBall(hit, ball, { now, phase = null, holdMs = GUEST_VIEW.holdMs } = {}){
  if (!hit || !ball) return false;
  if (!(now - hit.at <= holdMs)) return false;
  if (phase && phase !== 'RALLY') return false;
  const n = Number(ball.rallyStrokeCount || 0);
  return n < hit.count || (n === hit.count && ball.lastHitter === 'player');
}

const len = v => Math.hypot(v.x, v.y, v.z);
// Snapshot applicato: la fisica è saltata da prev a next. L'offset di ciò che si disegna assorbe il salto (la palla
// disegnata resta dov'era e poi recupera); colpo nuovo (conteggio o battitore cambiati) o scarto oltre snapM: offset a
// zero, la palla si vede subito dove la mette l'host. size = ampiezza della correzione della fisica (m).
export function ballCorrection(prev, next, off, { snapM = GUEST_VIEW.snapM } = {}){
  const d = { x: prev.pos.x - next.pos.x, y: prev.pos.y - next.pos.y, z: prev.pos.z - next.pos.z }, size = len(d);
  if (prev.count !== next.count || prev.hitter !== next.hitter) return { off: { x: 0, y: 0, z: 0 }, kind: 'colpo', size };
  const o = { x: off.x + d.x, y: off.y + d.y, z: off.z + d.z };
  if (len(o) > snapM) return { off: { x: 0, y: 0, z: 0 }, kind: 'salto', size };
  return { off: o, kind: 'fuso', size };
}

// frazione dello scarto recuperata in dtMs con costante di tempo tauMs
export const blendFactor = (dtMs, tauMs) => (tauMs > 0 ? 1 - Math.exp(-Math.max(0, dtMs) / tauMs) : 1);
// l'offset della palla decade (in blendMs ne resta meno del 5%); sotto il millimetro è zero
export function decayOffset(off, dtMs, { blendMs = GUEST_VIEW.blendMs } = {}){
  const k = 1 - blendFactor(dtMs, blendMs / 3);
  off.x *= k; off.y *= k; off.z *= k;
  if (len(off) < 1e-3) off.x = off.y = off.z = 0;
  return off;
}

// Attore: scarto dalla posizione dell'host da recuperare un po' a ogni fotogramma (null = niente). Lontano: salto.
export function actorFix(pos, net, { snapM = GUEST_VIEW.actorSnapM } = {}){
  const dx = net.px - pos.x, dz = net.pz - pos.z;
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return { snap: false, fix: null };
  return Math.hypot(dx, dz) > snapM ? { snap: true, fix: null } : { snap: false, fix: { x: dx, z: dz } };
}
// un fotogramma della fusione dell'attore: quanto spostarlo ora (step) e quanto resta (fix, null quando è finito)
export function actorStep(fix, dtMs, { tauMs = GUEST_VIEW.actorMs } = {}){
  const k = blendFactor(dtMs, tauMs), step = { x: fix.x * k, z: fix.z * k }, left = { x: fix.x - step.x, z: fix.z - step.z };
  return { step, fix: Math.hypot(left.x, left.z) < 1e-3 ? null : left };
}

/* ---------- misure per la diagnostica ---------- */
export function newStats(){
  return { snaps: 0, ageN: 0, ageSum: 0, ageMax: 0, corrN: 0, corrSum: 0, corrMax: 0, holds: 0, jumps: 0, hits: 0 };
}
// età dello snapshot al relay (ms: ora del relay alla lettura − ora dello snapshot), se il relay la manda
export function noteAge(s, ageMs){
  s.snaps++;
  const a = Number(ageMs);
  if (ageMs == null || !Number.isFinite(a) || a < 0) return s;
  s.ageN++; s.ageSum += a; s.ageMax = Math.max(s.ageMax, a);
  return s;
}
// palla di uno snapshot: bloccata (held) o applicata (kind/size da ballCorrection)
export function noteBall(s, { held = false, kind = null, size = 0 } = {}){
  if (held){ s.holds++; return s; }
  if (kind === 'colpo'){ s.hits++; return s; }
  s.corrN++; s.corrSum += size; s.corrMax = Math.max(s.corrMax, size);
  if (kind === 'salto') s.jumps++;
  return s;
}
// riassunto ogni everyMs (null se non è ora o non è arrivato niente); le misure ripartono da zero
export function takeReport(view, now, { everyMs = GUEST_VIEW.reportMs } = {}){
  if (!view.reportAt){ view.reportAt = now; return null; }
  if (now - view.reportAt < everyMs) return null;
  const s = view.stats;
  view.reportAt = now; view.stats = newStats();
  if (!s.snaps) return null;
  const r1 = x => Math.round(x * 10) / 10;
  return {
    snapshot: s.snaps,
    etaMediaMs: s.ageN ? Math.round(s.ageSum / s.ageN) : null,
    etaMaxMs: s.ageN ? Math.round(s.ageMax) : null,
    correzioneMediaCm: s.corrN ? r1((s.corrSum / s.corrN) * 100) : 0,
    correzioneMaxCm: r1(s.corrMax * 100),
    salti: s.jumps,
    colpiNuovi: s.hits,
    blocchi: s.holds,
  };
}

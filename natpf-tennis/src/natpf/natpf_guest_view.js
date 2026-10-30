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
//   3) snapshot che CONFERMA il colpo locale (stesso conteggio, battitore il P2): l'host ha ricevuto il colpo in
//      ritardo e la sua palla è indietro di ~un andata e ritorno di rete (a 30 m/s, 70 ms = 2 m) rispetto alla
//      previsione locale. Prima era fuso come uno scarto qualsiasi: oltre snapM salto netto e la palla disegnata tornava
//      di ~2 m verso la racchetta del P2. Ora la fisica adotta la traiettoria dell'host (è l'arbitro e quel ritardo resta
//      in tutti gli snapshot del colpo), la palla disegnata resta dov'era (limite di salto ownSnapM per tutto il colpo)
//      e recupera rallentando, senza mai andare all'indietro (decayOffset con la velocità: minSpeed).
//      Scartata l'alternativa di portare avanti lo stato dell'host del ritardo stimato: il ritardo non è misurabile
//      (snapshotAgeMs non comprende la rete) e andrebbe riapplicato a ogni snapshot, rimbalzo e risposta dell'host;
//   4) misure per la diagnostica (evento «sfida.vista»): età degli snapshot, correzioni della palla, blocchi.
// Qui solo i calcoli (funzioni pure, provate in test/natpf-guest-view.test.mjs); il motore li usa solo sul P2.
export const GUEST_VIEW = {
  holdMs: 500,      // blocco della previsione locale dopo un colpo del P2 (poi lo snapshot vince comunque). Era 300:
                    // nell'e2e su localhost lo snapshot più vecchio aveva già 247 ms, con due computer il blocco scadeva
  blendMs: 100,     // tempo in cui la palla disegnata recupera lo scarto (resta < 5%)
  snapM: 1.5,       // scarto della palla oltre il quale niente fusione: salto netto
  ownSnapM: 8,      // lo stesso per il colpo del P2 confermato dall'host (~260 ms di ritardo a 30 m/s): oltre, l'host ha
                    // davvero un'altra palla
  minSpeed: 0.3,    // mentre recupera, la palla disegnata va avanti almeno al 30% della velocità: rallenta, non torna
  actorMs: 60,      // costante di tempo della fusione degli attori (con uno snapshot ogni 50 ms ne recupera ~2/3)
  actorSnapM: 3,    // attore lontano più di così dalla posizione dell'host (cambio di campo, servizio): salto netto
  reportMs: 5000,   // ogni quanto il riassunto per la diagnostica
};

export function createGuestView(){
  // own: conteggio del colpo del P2 confermato dall'host, finché gli snapshot sono di quel colpo (null = nessuno)
  return { hit: null, off: { x: 0, y: 0, z: 0 }, own: null, stats: newStats(), reportAt: 0 };
}

// colpo locale del P2: conteggio dei colpi dello scambio DOPO il colpo, e quando (ms, performance.now). Colpo nuovo:
// niente fusione, la palla parte dalla racchetta (prima restava lo scarto di prima, fino a 1,5 m per ~100 ms)
export function markLocalHit(view, { count, now }){
  view.hit = { count: Number(count) || 0, at: now };
  view.off.x = view.off.y = view.off.z = 0;
  view.own = null;
  return view.hit;
}

// Lo snapshot (non bloccato) contiene il colpo locale del P2: stesso conteggio e battitore il P2 ('opponent' sul suo
// computer). Va chiesto PRIMA di azzerare hit. Niente limite di tempo: se nel frattempo non è arrivato altro, è ancora
// la conferma di quel colpo (se è arrivato uno snapshot vecchio, la palla locale è cambiata e ballCorrection dà 'colpo')
export function confirmsHit(hit, ball){
  return !!hit && !!ball && Number(ball.rallyStrokeCount || 0) === hit.count && ball.lastHitter === 'opponent';
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
// own: colpo del P2 confermato dall'host, limite di salto ownSnapM. Valori non finiti (NaN in uno snapshot o nella palla
// locale): offset a zero e 'salto'; prima l'offset restava NaN fino al colpo nuovo (decayOffset non lo azzerava mai e
// ogni correzione risultava 'fuso').
export function ballCorrection(prev, next, off, { snapM = GUEST_VIEW.snapM, own = false, ownSnapM = GUEST_VIEW.ownSnapM } = {}){
  const d = { x: prev.pos.x - next.pos.x, y: prev.pos.y - next.pos.y, z: prev.pos.z - next.pos.z }, l = len(d);
  const size = Number.isFinite(l) ? l : 0;
  if (prev.count !== next.count || prev.hitter !== next.hitter) return { off: { x: 0, y: 0, z: 0 }, kind: 'colpo', size };
  const o = { x: off.x + d.x, y: off.y + d.y, z: off.z + d.z };
  if (!(len(o) <= (own ? ownSnapM : snapM))) return { off: { x: 0, y: 0, z: 0 }, kind: 'salto', size };
  return { off: o, kind: 'fuso', size };
}

// Palla di uno snapshot applicata alla vista (prev = palla locale prima, next = quella dell'host): aggiorna offset e
// colpo confermato. confirm = confirmsHit al momento dello snapshot. kind 'conferma' per lo snapshot che conferma il
// colpo locale e viene fuso (misurato a parte: è il ritardo del colpo, non una deriva tra snapshot)
export function applyBall(view, prev, next, { confirm = false } = {}){
  const own = confirm || (view.own != null && next.count === view.own && next.hitter === 'opponent');
  const c = ballCorrection(prev, next, view.off, { own });
  Object.assign(view.off, c.off);
  view.own = own && c.kind !== 'colpo' ? next.count : null;
  return confirm && c.kind === 'fuso' ? { ...c, kind: 'conferma' } : c;
}

// frazione dello scarto recuperata in dtMs con costante di tempo tauMs
export const blendFactor = (dtMs, tauMs) => (tauMs > 0 ? 1 - Math.exp(-Math.max(0, dtMs) / tauMs) : 1);
// l'offset della palla decade (in blendMs ne resta meno del 5%); sotto il millimetro è zero.
// vel (velocità della fisica, m/s) e physMs (tempo della fisica nel fotogramma; 0 durante il fermo del colpo): la parte
// dell'offset IN AVANTI (palla disegnata davanti alla fisica, come dopo la conferma del colpo del P2) si recupera al più
// a (1 − minSpeed) della velocità orizzontale, così la palla disegnata rallenta ma non torna mai indietro verso chi l'ha
// colpita. Sotto 1 m/s nessun limite (palla quasi ferma: nessuna direzione)
export function decayOffset(off, dtMs, { blendMs = GUEST_VIEW.blendMs, vel = null, physMs = dtMs, minSpeed = GUEST_VIEW.minSpeed } = {}){
  let s = blendFactor(dtMs, blendMs / 3);
  const vh = vel ? Math.hypot(vel.x, vel.z) : 0;
  if (vh > 1){
    const fwd = (off.x * vel.x + off.z * vel.z) / vh, cap = (1 - minSpeed) * vh * Math.max(0, physMs) / 1000;
    if (fwd * s > cap) s = cap / fwd;
  }
  off.x *= 1 - s; off.y *= 1 - s; off.z *= 1 - s;
  if (!(len(off) >= 1e-3)) off.x = off.y = off.z = 0;   // anche NaN: zero
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
  return { snaps: 0, ageN: 0, ageSum: 0, ageMax: 0, corrN: 0, corrSum: 0, corrMax: 0, holds: 0, jumps: 0, hits: 0, confN: 0, confMax: 0 };
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
  if (kind === 'conferma'){ s.confN++; s.confMax = Math.max(s.confMax, size); return s; }
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
    conferme: s.confN,                          // colpi del P2 confermati dall'host con fusione
    confermaMaxCm: r1(s.confMax * 100),         // quanto la palla dell'host era indietro (≈ velocità × ritardo)
  };
}

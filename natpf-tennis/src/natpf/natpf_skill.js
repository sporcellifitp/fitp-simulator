// NATPF skill gap: chi colpisce in tempo, angolato e forte deve poter fare il punto; chi sbaglia deve pagarlo.
// Con il telefono in verticale la direzione nasce dal tempo vero del colpo e dal polso (swingLandingX): chi sa
// giocare a tennis sceglie l'angolo, chi colpisce a caso manda la palla a caso e spesso corta.
// Funzioni senza DOM, chiamate dal motore del motore base (game_engine.js, blocchi «NATPF skill gap») e dall'audit
// scripts/audit/rally-balance.mjs. Valgono per tutte le racchette: telefono, webcam, mouse e tastiera.
//
//  • assistenza del tempo: uno swing in anticipo viene tenuto fino allo sweet spot solo per una finestra breve,
//    graduata per difficoltà, ed è «perfetto» solo se l'anticipo era piccolo;
//  • il giocatore: la mira conta più della fortuna, la dispersione cresce con il tempo sbagliato e con la potenza,
//    vicino alle righe si può uscire; la palla accelera con i colpi perfetti consecutivi;
//  • la CPU: tempo di reazione, lettura imperfetta della traiettoria, portata limitata ed errori che crescono con
//    angolo, velocità, pressione dello scambio e allungo; sotto pressione rimanda palle corte e alte da smash.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const gauss = (rng = Math.random) => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

export const COURT = Object.freeze({ SINGLES_X: 4.115, BASELINE_Z: 11.89, OUT_X: 4.115 + .22, OUT_Z: 11.89 + .28 });

// Regole del giocatore a livello Esperto: valgono anche contro Leggenda (la CPU cambia, chi gioca no).
const EXPERT_PLAYER = Object.freeze({
  assistWindow: .16, perfectLead: .07, timingSpan: .15, autoAim: .25,
  scatter: .5, lineRisk: .6, depthRisk: .55,
  playerErr: Object.freeze({ base: .01, power: .13, timing: .32, max: .5 }),
  streakGain: .05, streakMin: .8, playerSpeed: 8.8,
});
// Parametri per difficoltà. «1v1» (due persone) usa solo la parte del giocatore.
export const SKILL_LEVELS = Object.freeze({
  casual: Object.freeze({
    assistWindow: .3, perfectLead: .17, timingSpan: .2,  // s: lo swing anticipato resta in attesa al massimo così; «perfetto» entro perfectLead
    autoAim: .55,                                       // uno swing al centro va comunque un po' verso il campo libero
    scatter: .45, lineRisk: .5, depthRisk: .5,          // m: dispersione laterale e in profondità
    playerErr: Object.freeze({ base: .008, power: .1, timing: .28, max: .45 }),  // rischio d'errore del giocatore
    streakGain: .045, streakMin: .82,                   // tempo di volo −4,5% per colpo perfetto consecutivo, fino a −18%
    cpuReach: 1.4, cpuSpeed: 4.7, cpuReact: .24, cpuReadSd: .45, cpuReadFix: .38, cpuCenterBias: .35,
    cpuAccel: 10, cpuDecel: 16,                         // m/s²: la CPU accelera e frena (23/10: prima cambiava verso all'istante)
    cpuErr: Object.freeze({ base: .03, angle: .2, speed: .12, pressure: .06, stretch: .25, rally: .014, drop: .32, lob: .3, smash: .5, max: .7 }),
    cpuWeak: .16, cpuAttack: .7, cpuAttackBase: .12, cpuAttackFlight: .7, playerSpeed: 10.2,  // su palle deboli la CPU attacca: angolo e ritmo
    cpuServe: Object.freeze({ flight: 1, wide: 0 }),     // servizio della CPU lento e al centro del quadrato (cpuServe)
  }),
  pro: Object.freeze({
    ...EXPERT_PLAYER,
    cpuReach: 1.5, cpuSpeed: 5.3, cpuReact: .2, cpuReadSd: .36, cpuReadFix: .3, cpuCenterBias: .22,
    cpuAccel: 11, cpuDecel: 17,                         // 23/10: con l'inerzia la punta sale da 5,0 (corse lunghe)
    // 23/10: meno errori a caso (erano base .015, velocità .12, angolo .2): con la corsa che costa, i punti li decidono di più
    // il campo aperto e l'allungo (stretch), non il caso; Pro contro «medio» resta nel 70–85% dei game
    cpuErr: Object.freeze({ base: .004, angle: .08, speed: .04, pressure: .035, stretch: .18, rally: .012, drop: .22, lob: .2, smash: .35, max: .5 }),
    cpuWeak: .1, cpuAttack: .7, cpuAttackBase: .24, cpuAttackFlight: .62,
    cpuServe: Object.freeze({ flight: .85, wide: .8 }),
  }),
  // Leggenda: per chi gioca le regole di Esperto. La CPU non ha una probabilità d'errore propria (cpuErr): colpisce
  // con le stesse regole del giocatore e sceglie il colpo per utilità (natpf_legend.js); split-step, reazione e
  // lettura umane, corsa con accelerazione e frenata limitate (cpuSpeed sotto la velocità del giocatore).
  leggenda: Object.freeze({
    ...EXPERT_PLAYER,
    // racchetta virtuale: chi gioca non sbaglia più a caso e il movimento automatico arriva quasi ovunque; la CPU difende
    // più veloce (prima 7 m/s), legge meglio (prima ±0,25 m) e arriva con la racchetta quanto chi gioca (prima 1,85 m),
    // sempre sotto la velocità di chi gioca (8,8 m/s)
    cpuReach: 2.3, cpuSpeed: 8.0, cpuReact: .15, cpuReactSd: .03, cpuReadSd: .18, cpuReadFix: .32, cpuCenterBias: 0,
    cpuErr: null, cpuLegend: true,
    cpuServe: Object.freeze({ flight: .9 }),           // direzione: natpf_legend.legendServe
  }),
  '1v1': Object.freeze({
    assistWindow: .22, perfectLead: .12, timingSpan: .17, autoAim: .3,
    scatter: .48, lineRisk: .55, depthRisk: .55,
    playerErr: Object.freeze({ base: .01, power: .12, timing: .3, max: .5 }),
    streakGain: .045, streakMin: .82,
  }),
});
export const skillLevel = difficulty => SKILL_LEVELS[String(difficulty || 'casual').toLowerCase()] || SKILL_LEVELS.casual;

// Servizio della CPU (23/10, sera): flight moltiplica il tempo di volo (sotto 1 più veloce), wide quanto va verso gli
// angoli del quadrato (dirX del motore: ±1 l'angolo). A Pro e Leggenda il servizio è l'arma della CPU: fa correre di
// lato chi risponde. Prima la risposta si giocava correndo in avanti fino a metà campo (planPlayerIntercept), un handicap
// nascosto che a Leggenda faceva perdere il 94% dei punti in risposta; tolto quello, la difficoltà sta qui
export const cpuServeFlight = engine => skillLevel(engine?.matchConfig?.difficulty).cpuServe?.flight ?? 1;
export function cpuServeEvent(engine, rng = Math.random){
  const wide = finite(skillLevel(engine?.matchConfig?.difficulty).cpuServe?.wide, 0);
  if (!wide) return { timing: 'PERFECT' };
  // due servizi su tre verso un angolo, gli altri al corpo
  const r = rng(), dirX = r < .33 ? -wide : r < .66 ? wide : (rng() - .5)*.4;
  return { timing: 'PERFECT', dirX };
}

// stato dello scambio sul motore: colpi perfetti consecutivi, pressione sulla CPU, piano di corsa della CPU
export function skillState(engine){
  return engine.natpfSkill || (engine.natpfSkill = { streak: 0, p2Streak: 0, pressure: 0, lastQuality: 1, cpuPlan: null, lastShot: null });
}
export function resetRally(engine){ const s = skillState(engine); s.streak = 0; s.p2Streak = 0; s.pressure = 0; s.cpuPlan = null; s.lastShot = null; return s; }

/* ---------- assistenza del tempo ---------- */
// Quanto manca allo sweet spot (s) quando parte lo swing: distanza palla–giocatore lungo il campo / velocità.
export function leadToSweetSpot(r, velZ){ const v = Math.abs(finite(velZ)); return v > .5 ? Math.max(0, (-.1 - finite(r))/v) : 0; }
// Swing anticipato in attesa: scade dopo la finestra della difficoltà (prima 0,48 s per tutti).
export function assistExpiry(now, level){ return now + level.assistWindow; }
// Un gesto, un solo swing a schermo. Prima: con un gesto in anticipo lo swing partiva subito e poi ripartiva da capo
// quando la palla arrivava (due swing per un gesto, con uno scatto della racchetta); con un gesto in tempo la palla
// partiva subito ma la racchetta arrivava al punto d'impatto dell'animazione ~0,1 s dopo. Ora:
//   • gesto in anticipo: la racchetta si carica subito dal lato del colpo (risposta immediata) e resta carica finché
//     la palla non arriva; lo swing parte al colpo vero;
//   • colpo: l'animazione parte da poco prima dell'impatto (contactSkip della sua durata, l'impatto è al 34%), così
//     racchetta e palla si toccano davvero nell'istante del colpo.
export const SWING_VISUAL = Object.freeze({ contactSkip: .24, prepMargin: .2 });
export function holdSwingPrep(actor, side, lead = 0){
  if (!actor || (side !== 'forehand' && side !== 'backhand')) return;
  (actor.userData || (actor.userData = {})).natpfPrep = { side, amount: 1, until: (globalThis.performance?.now?.() ?? Date.now()) + (Math.max(0, finite(lead)) + SWING_VISUAL.prepMargin)*1000 };
}
export function swingFromContact(state){
  if (state && Number.isFinite(state.swingDuration)) state.swingElapsed = Math.max(state.swingElapsed || 0, SWING_VISUAL.contactSkip*state.swingDuration);
  return state;
}
// Passi della fisica per un fotogramma: tutto il tempo del fotogramma, diviso in n passi uguali mai più lunghi del
// passo fisso del motore (1/120 s). Prima la fisica avanzava solo a passi fissi interi e il resto si accumulava: a 60 Hz,
// con il tempo dei fotogrammi che oscilla, ogni tanto un fotogramma riceveva 1 o 3 passi invece di 2 (palla e giocatori
// che scattano di metà o una volta e mezza il dovuto); a 144 Hz un fotogramma su sei non muoveva niente.
export function physicsSteps(dt, max){
  if (!(dt > 0) || !(max > 0)) return { n: 0, h: 0 };
  const n = Math.max(1, Math.ceil(dt/max - 1e-6));
  return { n, h: dt/n };
}
// Voto dello swing rilasciato allo sweet spot: «perfetto» solo con un anticipo piccolo, altrimenti «in anticipo».
export function assistGrade(lead, level){
  const l = finite(lead, 0);
  if (l <= level.perfectLead) return { grade: 'PERFECT', cursor: .5, quality: 1 - .25*l/Math.max(.01, level.perfectLead) };
  return { grade: 'EARLY', cursor: .28, quality: clamp(.55 - .35*(l - level.perfectLead)/Math.max(.05, level.assistWindow - level.perfectLead), .15, .55) };
}
// Qualità del tempo (0…1) dal voto del motore base e, per i perfetti, da quanto la palla era vicina al centro della finestra.
export function timingQuality(grade, g = 0){
  const G = String(grade || '').toUpperCase();
  if (G === 'PERFECT') return clamp(1 - Math.abs(finite(g) + .1)/1.1*.3, .7, 1);
  if (G === 'EARLY' || G === 'LATE') return .45;
  if (G === 'VERY EARLY' || G === 'VERY LATE') return .15;
  return .7;
}

/* ---------- colpo del giocatore ---------- */
// Punto di rimbalzo laterale del colpo del giocatore.
//   aim:      dirX dello swing (−1 sinistra … +1 destra), dal gesto, dal piatto del telefono, dal mouse o dalla tastiera
//   aimMode:  'face' quando la mira viene dall'angolo del piatto (telefono orizzontale): il tempo pesa la metà
//   side:     +1 se il giocatore è nella metà destra del campo (il colpo in ritardo va lungolinea da quella parte)
//   openSide: lato libero dell'avversario (−1/+1), per l'auto-mira dei colpi centrali
export function playerLandingX({ grade = 'PERFECT', aim = 0, aimMode = null, side = 1, openSide = 1, quality = 1, power = .6, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const G = String(grade).toUpperCase(), v = clamp(finite(aim), -1, 1);
  const face = aimMode === 'face', tw = face ? .45 : 1;              // peso del tempo sulla direzione
  const early = G === 'EARLY' || G === 'VERY EARLY', late = G === 'LATE' || G === 'VERY LATE';
  // colpo in anticipo → incrociato, in ritardo → lungolinea (come nel motore base), ma meno estremo: l'angolo vero lo dà la mira
  const shift = early ? -side*(1.7 + rng()*.9) : late ? side*(1.7 + rng()*.85) : 0;
  let x;
  if (face) x = v*3.45 + shift*tw;
  else if (early || late) x = shift + v*.95;
  else if (Math.abs(v) > .22) x = v*(2.75 + rng()*.95);
  else x = openSide*level.autoAim*(2.2 + rng()*1.1) + v*2;          // colpo centrale: niente più campo aperto gratis
  return landingScatter(x, { quality, power, level, rng });
}
/* ---------- telefono in verticale: direzione dal tempo vero del colpo e dal polso ---------- */
// Come nel tennis vero: colpire prima che la palla arrivi all'altezza del corpo la tira incrociata, colpire tardi la
// spinge lungolinea; il polso (rotazione del manico all'impatto) apre o chiude ancora l'angolo. Il tempo è quello
// dell'istante del picco misurato sul telefono, non quello in cui il messaggio arriva al computer.
//   timing: secondi di anticipo rispetto allo sweet spot (negativo = in ritardo)
//   contact: +1 se la palla è alla destra di chi colpisce (dritto del destro), -1 alla sinistra
//   wrist: −1 … +1, polso che manda la palla a sinistra … a destra
export const SWING_AIM = Object.freeze({ timingSpan: .16, timingX: 2.5, wristX: 2.2, naturalX: .6, maxX: 5.2, centre: .35 });
// Anticipo all'istante del picco: la palla, quando il telefono ha colpito, era ancora più lontana di «latency» secondi.
export function swingTiming(r, velZ, latency = 0){
  const v = Math.abs(finite(velZ)), lat = clamp(finite(latency), 0, .3);
  return v > .5 ? (-.1 - finite(r))/v + lat : 0;
}
// Ritardo del colpo del telefono (s, dal picco a quando il computer lo riceve) e spostamento della palla in quel tempo
export const eventLatency = e => (e && e.natpf && e.natpf.aim === 'swing' ? clamp(finite(e.natpf.latency), 0, .3) : 0);
export const latencyShift = (e, velZ) => Math.abs(finite(velZ))*eventLatency(e);
// Colpo del Player 2 letto dal relay (1v1 tra due computer): alla latenza misurata sul suo computer si aggiunge il tempo
// passato nel relay prima che l'host lo leggesse (serverTimeMs è sull'orologio del relay: nel browser dell'host è lo
// stesso orologio; con un server su un altro computer gli orologi possono differire, e un valore fuori 0…0,25 s si ignora).
// Il viaggio dal computer del P2 al relay non è misurato (resta nei limiti noti).
export function relayedNatpf(swing, nowMs = Date.now()){
  const n = swing && swing.natpf;
  if (!n || typeof n !== 'object') return null;
  if (n.aim !== 'swing' || !Number.isFinite(Number(swing.serverTimeMs))) return n;
  const wait = (finite(nowMs) - Number(swing.serverTimeMs))/1000;
  return wait >= 0 && wait <= .25 ? { ...n, latency: +clamp(finite(n.latency, .06) + wait, 0, .3).toFixed(3) } : n;
}
// Tempo in unità della finestra (più larga contro la CPU facile): 0 centro, ±1 anticipo/ritardo deciso, oltre ±1,6 non
// conta di più.
export const timingUnits = (timing, level = null) => clamp(finite(timing)/(level?.timingSpan || SWING_AIM.timingSpan), -1.6, 1.6);
// Voto del colpo dal tempo all'impatto (per anello colorato, testi e potenza)
export function swingGrade(timing, level = null){
  const t = timingUnits(timing, level);
  if (Math.abs(t) <= SWING_AIM.centre) return { grade: 'PERFECT', cursor: .5 - t*.2 };
  if (t > 0) return { grade: t > 1.25 ? 'VERY EARLY' : 'EARLY', cursor: clamp(.5 - t*.25, .1, .45) };
  return { grade: t < -1.25 ? 'VERY LATE' : 'LATE', cursor: clamp(.5 - t*.25, .55, .9) };
}
// Qualità del colpo: un anticipo o un ritardo moderati sono una scelta (angolo), quelli estremi un errore.
export const swingQuality = (timing, level = null) => clamp(1 - .55*clamp(Math.abs(timingUnits(timing, level)) - .7, 0, .9), .5, 1);
// Con il piatto all'impatto (aimSource 'face') la mira la decide soprattutto il piatto, uguale per dritto e rovescio
// (girato a destra → palla a destra: il rovescio va lungolinea quanto il dritto); il tempo pesa meno.
// timingX 1,6 (prima 1,0): dentro la finestra «perfetto» il tempo sposta la palla di ±0,6 m, in anticipo/ritardo deciso
// di ±1,6 m; faceX 3,4: con la mira dalla direzione del piatto (createAimModel) 20° di scarto portano la palla a ~2,2 m
// dal centro, 30° quasi sulla riga. Prima la palla cadeva quasi sempre nella stessa zona (x ≈ −0,4 m).
export const FACE_AIM = Object.freeze({ naturalX: .3, timingX: 1.6, faceX: 3.4 });
export function swingLandingX({ timing = 0, contact = 1, wrist = 0, aimSource = null, quality = 1, power = .6, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const c = contact >= 0 ? 1 : -1, t = timingUnits(timing, level), w = clamp(finite(wrist), -1, 1);
  const K = aimSource === 'face' ? { naturalX: FACE_AIM.naturalX, timingX: FACE_AIM.timingX, wristX: FACE_AIM.faceX } : SWING_AIM;
  const x = -c*K.naturalX - c*t*K.timingX + w*K.wristX;
  return landingScatter(clamp(x, -SWING_AIM.maxX, SWING_AIM.maxX), { quality, power, level, rng });
}
// Preparazione: chi porta indietro la racchetta prima del colpo (come ogni tennista) colpisce più pulito; chi colpisce
// solo di polso, a braccio fermo, disperde di più. Vale solo se il telefono sa riconoscere la preparazione.
export function prepQuality(n){
  if (!n || n.aim !== 'swing' || !n.prepCapable) return 1;
  return n.prep ? 1 : .86;
}
// Forza: metà dalla velocità del gesto rispetto alla propria calibrazione, metà dalla velocità vera del telefono
// (°/s al picco). Un gesto da bambino resta lento anche se è «il più forte» che fa; il dritto di un tennista va forte.
export function swingPower(relative = .6, peakDegS = null){
  // relativa: il telefono dà 0,3 + 0,35 × (picco / proprio colpo tipico), quindi il colpo tipico vale 0,5
  const rel = clamp((finite(relative, .6) - .3)/.7);
  if (!Number.isFinite(peakDegS)) return rel;
  // scala assoluta fino a circa 1700 °/s: i dritti veri arrivano a 1200–1650 °/s (con 1180 erano tutti al massimo)
  return clamp(.45*rel + .55*clamp((peakDegS - 280)/1400));
}
// Profondità (z negativa): i gesti veloci vanno lunghi (e rischiano), quelli lenti restano a metà campo e la CPU attacca.
export function swingDepthZ(power = .6, { rng = Math.random } = {}){
  return -clamp(6.6 + 4.1*clamp(finite(power, .6)) + gauss(rng)*.45, 5.6, 11.4);
}
// Tipo di colpo dal verso verticale del gesto rispetto al proprio dritto (calibrazione): su = lob, giù = tagliato,
// giù e lento = palla corta.
export const SWING_LIFT = Object.freeze({ lob: .32, slice: -.3, dropPower: .38 });
export function swingShot({ lift = 0, baseline = 0, power = .6, lob = false, slice = false, drop = false } = {}){
  const rel = finite(lift) - finite(baseline);
  if (drop) return 'drop';
  if (lob || rel >= SWING_LIFT.lob) return 'lob';
  if (slice || rel <= SWING_LIFT.slice) return finite(power, .6) < SWING_LIFT.dropPower ? 'drop' : 'slice';
  return 'topspin';
}
// Dispersione laterale: cresce con il tempo sbagliato e con la potenza; vicino alle righe la potenza è un rischio.
export function landingScatter(x, { quality = 1, power = .6, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const p = clamp(finite(power, .6)), q = clamp(finite(quality, 1)), x0 = finite(x);
  const sd = level.scatter*(.22 + .78*(1 - q))*(.55 + .45*p) + level.lineRisk*(1 - .5*q)*p*p*clamp(Math.abs(x0)/COURT.SINGLES_X - .55, 0, .45);
  return clamp(x0 + gauss(rng)*sd, -(COURT.SINGLES_X + 1.1), COURT.SINGLES_X + 1.1);
}
// Rischio che il colpo del giocatore esca o vada in rete: cresce con la potenza (soprattutto vicino alle righe)
// e con il tempo sbagliato. È la contropartita di angolo e forza.
export function playerErrorChance({ quality = 1, power = .6, aimX = 0, level = SKILL_LEVELS.casual } = {}){
  const k = level.playerErr; if (!k) return 0;
  const p = clamp(finite(power, .6)), q = clamp(finite(quality, 1)), line = clamp(Math.abs(finite(aimX))/3.6);
  return clamp(k.base + k.power*p*p*(.35 + .65*line) + k.timing*(1 - q)**1.5, 0, k.max);
}
// Che errore: 'long' con la potenza, 'wide' vicino alle righe, 'net' con il tempo sbagliato.
export function playerErrorPlan({ quality = 1, power = .6, aimX = 0, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const chance = playerErrorChance({ quality, power, aimX, level });
  if (rng() >= chance) return { kind: 'ok', chance };
  const q = clamp(finite(quality, 1)), wide = clamp(Math.abs(finite(aimX))/3.6), r = rng()*(1 + wide + (1 - q));
  const kind = r < 1 ? 'long' : r < 1 + wide ? 'wide' : 'net';
  return { kind, chance, x: Math.sign(finite(aimX) || (rng() - .5))*(COURT.OUT_X + .1 + rng()*.8), z: -(COURT.OUT_Z + .15 + rng()*1.2) };
}
// Profondità (z negativa = metà campo della CPU): i colpi forti e imprecisi possono finire lunghi.
export function playerDepthZ(z, { quality = 1, power = .6, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const p = clamp(finite(power, .6)), q = clamp(finite(quality, 1)), depth = finite(z, -9);
  if (depth > -6) return depth + gauss(rng)*.35*(1 - q*.6);           // palle corte: piccola dispersione
  const sd = level.depthRisk*(.2 + .8*(1 - q))*(.4 + .6*p);
  return clamp(depth - Math.abs(gauss(rng))*sd*.7 + gauss(rng)*sd*.5, -(COURT.BASELINE_Z + 1.6), -3);
}
// Equilibrio al contatto: allungarsi o colpire in corsa toglie qualità (come executionQuality di NATPF).
export function reachQuality(lateral, running = 0){ return clamp(1 - Math.max(0, finite(lateral) - 1.1)*.22 - clamp(finite(running))*.15, .35, 1); }
// Forza dello swing del motore base (0,8…1,68) → 0…1
export const powerNorm = speed => clamp((finite(speed, 1.18) - .8)/.88);
// Tempo di volo più corto con i colpi perfetti consecutivi
export function streakFlight(flight, streak, level){ return flight*Math.max(level.streakMin, 1 - level.streakGain*Math.max(0, streak - 1)); }
// Tempo di volo minimo perché la traiettoria passi la rete senza l'aiuto del motore (che alzerebbe la palla e la
// manderebbe lunga di metri): la velocità cresce con i perfetti, ma resta quella di un colpo che può entrare.
export function minClearFlight({ fromY = 1, fromZ = 11, toZ = -9, flight = .8, topspin = 14, gravity = 9.15, netY = .914 + .34 } = {}){
  const g = gravity + finite(topspin)*.14, y0 = finite(fromY, 1), z0 = finite(fromZ), dz = finite(toZ) - z0;
  if (Math.sign(z0) === Math.sign(finite(toZ)) || !dz) return flight;
  for (let h = Math.max(.3, finite(flight, .8)); h < 2.5; h += .01){
    const vz = dz/h, vy = (.08 - y0 + .5*g*h*h)/h, m = Math.abs(z0/vz);
    if (y0 + vy*m - .5*g*m*m >= netY) return h;
  }
  return flight;
}
// Un colpo fuori tempo è anche più lento: arriva prima la CPU.
// Tempo di volo del pallonetto (s): con la compensazione della resistenza dell'aria sale a circa 6 m e cade in fondo
export const LOB_FLIGHT = 2.0;
export const mistimeFlight = (flight, quality) => flight*(1 + .14*(1 - clamp(finite(quality, 1))));

// Dopo il colpo del giocatore: pressione sulla CPU e serie di perfetti.
export function registerPlayerShot(engine, { grade, quality, power, landingX, landingZ = -9.5, shot = 'TOPSPIN', who = 'player', cpuZ = -11 } = {}){
  const s = skillState(engine), perfect = String(grade).toUpperCase() === 'PERFECT';
  if (who === 'p2') s.p2Streak = perfect ? s.p2Streak + 1 : 0;
  else s.streak = perfect ? s.streak + 1 : 0;
  const angle = clamp(Math.abs(finite(landingX))/COURT.SINGLES_X);
  s.pressure = clamp(s.pressure*.75 + clamp(finite(quality, 1))*(.1 + .45*angle + .45*clamp(finite(power, .6)))*shotThreat({ power, depth: landingZ }), 0, 3);
  s.lastQuality = quality; s.lastShot = { shot: String(shot).toUpperCase(), grade, landingX, landingZ, power, cpuZ };
  return s;
}

/* ---------- CPU ---------- */
// Corsa della CPU: parte dopo il tempo di reazione verso dove crede che arrivi la palla, poi corregge.
export function planCpuRun(engine, { rng = Math.random } = {}){
  const lv = skillLevel(engine.matchConfig?.difficulty), s = skillState(engine), cpu = engine.opponent;
  if (!lv.cpuReact || !cpu) return null;
  if (lv.cpuLegend){
    // Leggenda: split-step all'impatto dell'avversario (ferma per il tempo di reazione, 0,15 ± 0,03 s), poi verso il
    // punto d'incontro con un errore di lettura che si azzera mentre la palla vola (in cpuReadFix secondi)
    const truth = cpu.targetPos.clone(), speed = finite(engine.ball?.vel?.length?.(), 24), now = finite(engine.elapsedTime);
    const react = clamp(lv.cpuReact + gauss(rng)*(lv.cpuReactSd || 0), .1, .25);
    const err = gauss(rng)*lv.cpuReadSd*(.6 + .4*clamp((speed - 18)/14));
    s.cpuPlan = { legend: true, hold: cpu.pos.clone(), truth, err, readAt: now + react, fixDur: lv.cpuReadFix };
    cpu.targetPos.copy(s.cpuPlan.hold);
    return s.cpuPlan;
  }
  const truth = cpu.targetPos.clone(), speed = finite(engine.ball?.vel?.length?.(), 24);
  const angle = clamp(Math.abs(finite(engine.ball?.targetLanding?.x))/COURT.SINGLES_X);
  // la CPU legge male le palle veloci e angolate e, all'inizio, si aspetta la palla più al centro
  const misread = gauss(rng)*lv.cpuReadSd*(.5 + .5*clamp((speed - 18)/14))*(1 + angle)*(1 + .25*s.pressure);
  const read = truth.clone(); read.x = read.x*(1 - (lv.cpuCenterBias || 0)*angle) + misread;
  const now = finite(engine.elapsedTime);
  s.cpuPlan = { hold: cpu.pos.clone(), read, truth, readAt: now + lv.cpuReact*(1 + .15*s.pressure), fixAt: now + lv.cpuReact + lv.cpuReadFix };
  cpu.targetPos.copy(s.cpuPlan.hold);
  return s.cpuPlan;
}
// A ogni passo della fisica (solo in partita contro la CPU)
export function tickCpuRun(engine){
  const plan = engine.natpfSkill?.cpuPlan, cpu = engine.opponent;
  if (!plan || !cpu) return;
  const now = finite(engine.elapsedTime);
  if (plan.legend){
    if (now < plan.readAt){ cpu.targetPos.copy(plan.hold); return; }
    const k = Math.max(0, 1 - (now - plan.readAt)/plan.fixDur);
    cpu.targetPos.copy(plan.truth); cpu.targetPos.x += plan.err*k;
    if (!k) engine.natpfSkill.cpuPlan = null;
    return;
  }
  if (now >= plan.fixAt){ cpu.targetPos.copy(plan.truth); engine.natpfSkill.cpuPlan = null; }
  else if (now >= plan.readAt) cpu.targetPos.copy(plan.read);
  else cpu.targetPos.copy(plan.hold);
}
export const cpuReach = (engine, base) => { const lv = skillLevel(engine.matchConfig?.difficulty); return lv.cpuReach ?? base; };
// Corsa della CPU con accelerazione e frenata (Casual e Pro; Leggenda ha la sua, natpf_legend.js). Richiesta del 23/10:
// prima la CPU andava alla velocità piena verso il bersaglio e cambiava verso all'istante, quindi arrivava ovunque
// (nel banco 0% di vincenti a Pro anche con la palla a 4–6 m da lei): spostarla non costava niente. Ora una CPU ferma,
// o che corre dalla parte sbagliata, ha bisogno di tempo per arrivare dall'altra parte. Fisica, non caso.
// true se ha mosso lei la CPU (altrimenti il motore la muove come prima)
export function cpuStep(engine, actor, dt){
  if (actor !== engine.opponent || engine.isMultiplayer || !(dt > 0)) return false;
  const lv = skillLevel(engine.matchConfig?.difficulty);
  if (!lv.cpuAccel || lv.cpuLegend) return false;
  const a = actor, dx = a.targetPos.x - a.pos.x, dz = a.targetPos.z - a.pos.z, d = Math.hypot(dx, dz), vmax = a.maxSpeed;
  // velocità voluta: piena lontano dal bersaglio, poi quella che permette di fermarsi frenando
  const vDes = d > .05 ? Math.min(vmax, Math.sqrt(2*lv.cpuDecel*Math.max(0, d - .05))) : 0;
  const wx = d > 1e-6 ? dx/d*vDes : 0, wz = d > 1e-6 ? dz/d*vDes : 0;
  let ax = wx - a.vel.x, az = wz - a.vel.z; const am = Math.hypot(ax, az);
  const lim = (Math.hypot(wx, wz) < a.vel.length() ? lv.cpuDecel : lv.cpuAccel)*dt;
  if (am > lim){ ax *= lim/am; az *= lim/am; }
  a.vel.set(a.vel.x + ax, 0, a.vel.z + az);
  a.pos.x += a.vel.x*dt; a.pos.z += a.vel.z*dt; a.stridePhase += a.vel.length()*dt*4.4;
  return true;
}

// Probabilità d'errore della CPU sul colpo che sta per rimandare.
// quality: qualità del colpo in arrivo (un angolo preso fuori tempo mette meno in difficoltà)
// threat: pericolosità del colpo in arrivo (forza e profondità): una palla lenta e corta non mette in difficoltà nessuno.
export const shotThreat = ({ power = .6, depth = -9.5 } = {}) => clamp(.25 + .55*clamp(finite(power, .6)) + .35*clamp((-finite(depth, -9.5) - 7.6)/2.6), .25, 1.15);
export function cpuErrorChance({ angle = 0, speed = 22, pressure = 0, stretch = 0, rally = 0, quality = 1, shot = 'TOPSPIN', cpuDeep = true, threat = 1, level = SKILL_LEVELS.casual } = {}){
  const k = level.cpuErr; if (!k) return 0;
  const S = String(shot).toUpperCase(), q = (.3 + .7*clamp(finite(quality, 1)))*clamp(finite(threat, 1), .25, 1.15);
  let p = k.base + q*(k.angle*clamp(finite(angle))**1.5 + k.speed*clamp((finite(speed, 22) - 12)/16) + k.stretch*clamp(finite(stretch))**2)
    + k.pressure*clamp(finite(pressure), 0, 3) + k.rally*Math.max(0, finite(rally) - 4);
  if (S === 'DROP' && cpuDeep) p += k.drop;
  if (S === 'LOB' && !cpuDeep) p += k.lob;
  if (S === 'SMASH') p += k.smash;
  return clamp(p, 0, k.max);
}
// Cosa fa la CPU con questa palla: 'ok' (risposta normale), 'net' / 'wide' / 'long' (errore) o 'weak' (palla corta e
// alta, da smash). Gli errori della CPU crescono con angolo, velocità, pressione, allungo e lunghezza dello scambio.
export function cpuReturnPlan(engine, actor, { rng = Math.random } = {}){
  const lv = skillLevel(engine.matchConfig?.difficulty), s = skillState(engine), ball = engine.ball;
  if (!lv.cpuErr || engine.isMultiplayer || (engine.autoPlayMode && !engine.userHasInteracted)) return { kind: 'ok', chance: 0 };
  const reach = lv.cpuReach || 1.5;
  const info = {
    angle: Math.abs(finite(ball.targetLanding?.x))/COURT.SINGLES_X,
    speed: finite(ball.vel?.length?.(), 22),
    pressure: s.pressure,
    stretch: Math.abs(finite(ball.pos?.x) - finite(actor.pos?.x))/reach,
    rally: finite(ball.rallyStrokeCount),
    quality: finite(s.lastQuality, 1),
    shot: s.lastShot?.shot || ball.shotType,
    cpuDeep: finite(s.lastShot?.cpuZ, -11) < -8.5,
    threat: s.lastShot ? shotThreat({ power: s.lastShot.power, depth: s.lastShot.landingZ }) : 1,
    level: lv,
  };
  const chance = cpuErrorChance(info), roll = rng();
  s.lastCpu = { chance, ...info, level: undefined };
  if (roll < chance){
    const r = rng();
    return { kind: r < .42 ? 'net' : r < .74 ? 'wide' : 'long', chance, info };
  }
  if (rng() < lv.cpuWeak*clamp(s.pressure, 0, 2)*.5 + (info.stretch > .8 ? .08 : 0)) return { kind: 'weak', chance, info };
  s.pressure *= .6;
  // palla debole (fuori tempo, lenta e centrale): la CPU attacca con angolo e ritmo
  // palla corta (rimbalzo prima di 8 m dalla rete) e lenta: la CPU entra e attacca
  const short = clamp((finite(s.lastShot?.landingZ, -9.5) + 8.6)/2.4);
  const soft = (1 - clamp(info.quality)) + (info.angle < .35 && finite(s.lastShot?.power, .6) < .45 ? .35 : 0) + short*(.5 - .4*clamp(finite(s.lastShot?.power, .6)));
  if (lv.cpuAttack && info.stretch < .8 && rng() < (lv.cpuAttackBase || 0) + lv.cpuAttack*clamp(soft)) return { kind: 'attack', chance, info, flight: lv.cpuAttackFlight };
  return { kind: 'ok', chance, info };
}

/* ---------- varietà di traiettorie e angoli ---------- */
// Prima ogni colpo passava la rete al minimo consentito (circa 1,25 m): stesse parabole piatte per tutti, angoli
// stretti impossibili e CPU che sceglieva il colpo da un ciclo fisso. Ora l'altezza sulla rete dipende dal colpo e
// dalla forza (top spin lento = parabola alta e carica, piatto forte = rasoterra, tagliato = basso), gli angoli
// stretti cadono corti come nel tennis vero e la CPU sceglie tra più schemi. Vale per giocatore, P2 e CPU.
//   clear: altezza sulla rete (m) per tipo di colpo, da forte (indice 0) a lento (indice 1); spin: top spin corrispondente
export const ARC = Object.freeze({
  TOPSPIN: Object.freeze({ clear: [1.3, 2.05], spin: [15, 23], sd: .14 }),
  FLAT: Object.freeze({ clear: [1.27, 1.42], spin: [19, 20], sd: .05 }),
  SLICE: Object.freeze({ clear: [1.27, 1.55], spin: [-7, -5], sd: .07 }),
  MOON: Object.freeze({ clear: [2.5, 3.1], spin: [20, 24], sd: .15 }),
  netY: .914 + .34, maxFlight: 1.9,
});
// Altezza della palla quando passa sopra la rete (z = 0) con il lancio del motore (_launchBallToTarget, senz'aria).
export function netCrossY({ fromY = 1, fromZ = 11, toZ = -9, flight = .8, topspin = 14, gravity = 9.15 } = {}){
  const g = gravity + finite(topspin)*.14, y0 = finite(fromY, 1), dz = finite(toZ) - finite(fromZ), h = Math.max(.45, finite(flight, .8));
  const vz = dz/h, vy = (.08 - y0 + .5*g*h*h)/h, m = Math.abs(finite(fromZ)/vz);
  return y0 + vy*m - .5*g*m*m;
}
// Tempo di volo perché la palla passi sopra la rete all'altezza «clear» (mai meno di «flight»).
export function flightForClear({ clear = ARC.netY, maxFlight = ARC.maxFlight, ...a } = {}){
  const base = Math.max(.45, finite(a.flight, .8));
  if (Math.sign(finite(a.fromZ, 11)) === Math.sign(finite(a.toZ, -9))) return base;
  for (let h = base; h < maxFlight; h += .01) if (netCrossY({ ...a, flight: h }) >= clear) return h;
  return Math.max(base, maxFlight);
}
// Traiettoria del colpo: altezza sulla rete e top spin dal tipo di colpo e dalla forza, poi il tempo di volo.
//   shot: 'TOPSPIN' | 'FLAT' | 'SLICE' | 'MOON' · power 0…1 · quality 0…1 (un colpo sporco esce più alto e più corto di spin)
// Restituisce { flight, topspin, clear }: flight non è mai più corto di quello proposto dal motore.
export function shotArc({ shot = 'TOPSPIN', power = .6, quality = 1, fromY = 1, fromZ = 11, toZ = -9, flight = .8, gravity = 9.15, rng = Math.random } = {}){
  const S = String(shot).toUpperCase(), A = ARC[S === 'POWER' ? 'FLAT' : S] || ARC.TOPSPIN;
  const soft = 1 - clamp(finite(power, .6)), q = clamp(finite(quality, 1));
  // palla presa alta (sopra 1,5 m): si può tirare più piatta
  const high = clamp((finite(fromY, 1) - 1.5)/.5)*.18;
  const clear = Math.max(ARC.netY + .02, A.clear[0] + (A.clear[1] - A.clear[0])*soft + Math.abs(gauss(rng))*A.sd + (1 - q)*.15 - high);
  const topspin = A.spin[0] + (A.spin[1] - A.spin[0])*soft - (S === 'TOPSPIN' ? (1 - q)*5 : 0);
  return { flight: flightForClear({ fromY, fromZ, toZ, flight, topspin, gravity, clear }), topspin, clear };
}
// Correzione per l'attrito dell'aria del motore, che il lancio (_launchBallToTarget) non considera: ogni colpo cadeva
// circa 2 m prima del bersaglio, cioè le palle «in fondo» rimbalzavano a metà campo e gli errori «lunghi» restavano
// dentro. airScale simula il volo con la stessa fisica del motore e restituisce di quanto moltiplicare la velocità
// lungo il campo (z) perché la palla cada alla profondità voluta. La mira laterale resta quella tarata finora.
export function airScale({ from, vel, to, topspin = 14, sidespin = 0, gravity = 9.15, drag = .012, dt = 1/120 } = {}){
  const want = Math.abs(to.z - from.z), g = gravity + finite(topspin)*.14;
  const reach = k => {
    let y = from.y, z = from.z, vx = vel.x, vy = vel.y, vz = vel.z*k;
    for (let i = 0; i < 900 && !(y <= .075 && vy < 0); i++){
      const d = Math.max(0, 1 - drag*Math.hypot(vx, vy, vz)*dt);
      vx *= d; vy *= d; vz *= d; vy -= g*dt; vx += finite(sidespin)*.12*dt;
      y += vy*dt; z += vz*dt;
    }
    return Math.abs(z - from.z);
  };
  let k = 1;
  for (let i = 0; i < 6; i++){ const got = reach(k); if (!got || Math.abs(got - want) < .05) break; k *= clamp(want/got, .8, 1.25); }
  return clamp(k, 1, 1.8);
}
// Applica la correzione alla velocità della palla (solo la componente lungo il campo).
export function fixAir(ball, opts){ ball.vel.z *= airScale({ ...opts, vel: ball.vel }); return ball; }
// Angolo stretto: una palla molto angolata deve cadere più corta per restare in campo (come nel tennis vero).
// z: profondità proposta (negativa o positiva, è il segno della metà campo) · x: punto di rimbalzo laterale
export function angleDepth(x, z, { rng = Math.random } = {}){
  const a = clamp((Math.abs(finite(x)) - 2.9)/1.2), s = Math.sign(finite(z, -9)) || -1, d = Math.abs(finite(z, -9));
  if (!a || d < 6.4) return finite(z, -9);
  const short = 5.9 + rng()*1.3;
  return s*(d + (short - d)*a);
}
// Rimbalzo: il top spin salta più alto e scorre, il tagliato resta basso (moltiplicatori della velocità al rimbalzo).
export const bounceSpin = spin => { const s = finite(spin, 14); return { up: clamp(1 + (s - 14)*.012, .88, 1.12), along: clamp(1 + (s - 14)*.006, .95, 1.06) }; };

// Schemi della CPU nella risposta normale: prima il colpo veniva da un ciclo fisso (top, top, tagliato, top, lob) e la
// palla andava sempre verso il campo libero a media profondità. Ora la CPU sceglie per peso tra più schemi, con
// angoli e altezze diversi; al livello Esperto cerca più spesso angoli e palle profonde.
//   playerX: posizione laterale del giocatore · playerZ: distanza dalla rete · ballX: dove la CPU colpisce
export const CPU_PATTERNS = Object.freeze({
  casual: Object.freeze({ rally: .32, open: .3, behind: .08, deep: .1, angle: .04, slice: .1, moon: .06 }),
  pro: Object.freeze({ rally: .2, open: .26, behind: .12, deep: .18, angle: .1, slice: .09, moon: .05 }),
});
export function cpuShotChoice({ difficulty = 'casual', playerX = 0, playerZ = 11.5, ballX = 0, rally = 0, rng = Math.random } = {}){
  // Leggenda non usa questi schemi (natpf_legend.js), ma se ci arrivasse varrebbero quelli di Esperto
  const pro = ['pro', 'leggenda'].includes(String(difficulty).toLowerCase()), W = { ...CPU_PATTERNS[pro ? 'pro' : 'casual'] };
  const open = finite(playerX) >= 0 ? -1 : 1, nearNet = finite(playerZ, 11.5) < 7.5;
  if (nearNet){ W.moon = 0; W.lob = .35; W.angle *= 1.6; }    // giocatore a rete: pallonetto o passante angolato
  if (finite(rally) < 2){ W.angle *= .3; W.behind *= .3; }     // sulla risposta al servizio niente colpi rischiosi
  const keys = Object.keys(W), tot = keys.reduce((s, k) => s + W[k], 0);
  let r = rng()*tot, kind = keys[0];
  for (const k of keys){ if ((r -= W[k]) <= 0){ kind = k; break; } }
  const depth = pro ? [7.4, 10.4] : [6.4, 8.8], z = (a, b) => a + rng()*(b - a), side = s => clamp(s, -COURT.SINGLES_X + .45, COURT.SINGLES_X - .45);
  switch (kind){
    case 'rally': return { kind, shot: 'TOPSPIN', x: side((rng() - .5)*2.4), z: z(depth[0] + .8, depth[1] + .6), power: pro ? .55 : .35 };
    case 'open': return { kind, shot: 'TOPSPIN', x: side(open*(pro ? 1.25 + rng()*1.75 : .85 + rng()*1.15)), z: z(depth[0], depth[1]), power: pro ? .7 : .5 };
    case 'behind': return { kind, shot: 'TOPSPIN', x: side(-open*(1.3 + rng()*1.2)), z: z(depth[0] + .5, depth[1] + .5), power: pro ? .65 : .45 };
    case 'deep': return { kind, shot: 'TOPSPIN', x: side(open*(2.2 + rng()*1.2)), z: z(Math.max(9.2, depth[1] - .4), 10.9), power: pro ? .8 : .6 };
    case 'angle': return { kind, shot: 'TOPSPIN', x: side(open*(3.25 + rng()*.45)), z: z(5.8, 7), power: .5 };
    case 'slice': return { kind, shot: 'SLICE', x: side((rng() - .5)*3.2 + open*.8), z: z(depth[0] - .4, depth[1]), power: .45 };
    case 'moon': return { kind, shot: 'MOON', x: side((rng() - .5)*2), z: z(9.3, 10.6), power: .3 };
    case 'lob': return { kind, shot: 'LOB', x: side((rng() - .5)*2.4), z: z(9.4, 10.8), power: .3 };
  }
  return { kind: 'rally', shot: 'TOPSPIN', x: 0, z: depth[0], power: .5 };
}

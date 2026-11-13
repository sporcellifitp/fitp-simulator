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
import { openRun } from "./natpf_duo_rules.js"; // B25: campo aperto tra due persone nello stesso schermo (moveFactor)
import { EVENTO, eventoK, eventoPoint, eventoReset, eventoState, blend } from "./natpf_evento.js"; // B18.2: livello «Evento» adattivo
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
// (B18.2 gruppo 3: i livelli «Bambini» ed «Evento» si aggiungono qui sotto, dopo questi quattro, che restano identici)
const LEVELS = {
  casual: Object.freeze({
    assistWindow: .3, perfectLead: .17, timingSpan: .2,  // s: lo swing anticipato resta in attesa al massimo così; «perfetto» entro perfectLead
    autoAim: .55,                                       // uno swing al centro va comunque un po' verso il campo libero
    scatter: .45, lineRisk: .5, depthRisk: .5,          // m: dispersione laterale e in profondità
    playerErr: Object.freeze({ base: .008, power: .1, timing: .28, max: .45 }),  // rischio d'errore del giocatore
    streakGain: .045, streakMin: .82,                   // tempo di volo −4,5% per colpo perfetto consecutivo, fino a −18%
    // B18.2 passo 2 (D1): la difficoltà passa dalla corsa. Casual corre più piano di prima (4,7 m/s e 10 m/s²) e legge un
    // poco in ritardo la palla nel campo aperto (cpuWide): più vincenti veri per chi gioca, meno errori regalati
    cpuReach: 1.4, cpuSpeed: 4.4, cpuReact: .24, cpuReadSd: .45, cpuReadFix: .38, cpuCenterBias: .35,
    cpuWide: Object.freeze({ react: .06, from: 2, to: 4.5 }),
    cpuAccel: 9, cpuDecel: 16,                          // m/s²: la CPU accelera e frena (23/10: prima cambiava verso all'istante)
    // errori per la pressione (cpuErrorChance): base sulla palla comoda (prima 3% + 1,4% a colpo oltre il quarto), poi
    // allungo (stretch), corsa (run) e palla veloce (speed); angolo e pressione accumulata moltiplicano; soft: una palla
    // lenta vale almeno il 70% (a Casual la CPU è impacciata quando deve muoversi); net: quota di base degli errori in rete.
    // Niente stanchezza (cpuFatigue, solo a Pro): a Casual gli scambi finiscono da soli (oltre i 40 colpi lo 0,8–1,1% dei
    // punti) e con la stanchezza «bambino» passava dal 45 al 58–64% dei game: il livello cambiava più del voluto
    cpuErr: Object.freeze({ base: .017, stretch: .24, run: .1, speed: .1, angle: .5, pressure: .4, soft: .7, net: .2, drop: .32, lob: .3, smash: .5, sup: .25, max: .7 }),
    cpuWeak: .16, cpuAttack: .7, cpuAttackBase: .12, cpuAttackFlight: .7, playerSpeed: 10.2,  // su palle deboli la CPU attacca: angolo e ritmo
    cpuServe: Object.freeze({ flight: 1, wide: 0 }),     // servizio della CPU lento e al centro del quadrato (cpuServe)
  }),
  pro: Object.freeze({
    ...EXPERT_PLAYER,
    cpuReach: 1.5, cpuSpeed: 5.3, cpuReact: .2, cpuReadSd: .36, cpuReadFix: .3, cpuCenterBias: .22,
    cpuWide: Object.freeze({ react: .19, from: 2.5, to: 4.5 }),    // B18.2 passo 2 (D9): lettura in ritardo della palla larga (planCpuRun)
    cpuFatigue: Object.freeze({ near: 1.5, free: 6, span: 8, slow: .15 }),   // stanchezza dalle corse lunghe dello scambio (cpuTired)
    cpuAccel: 11, cpuDecel: 17,                         // 23/10: con l'inerzia la punta sale da 5,0 (corse lunghe)
    // 23/10: meno errori a caso (erano base .015, velocità .12, angolo .2): con la corsa che costa, i punti li decidono di più
    // il campo aperto e l'allungo (stretch), non il caso; Pro contro «medio» resta nel 70–85% dei game
    // B18.2 passo 2 (D1 e D9): niente più errore che cresce con la lunghezza dello scambio (rally era .009 a colpo oltre il
    // quarto). A Pro la CPU sbaglia solo in allungo e in corsa (stretch, run), più una base piccola sulla palla comoda:
    // palla veloce, angolata o profonda la mettono in difficoltà perché la fanno correre e allungare (speed, angle e
    // pressure a 0: con quei termini «medio», che tira forte e angolato, usciva dalla fascia 70–85% dei game). La palla nel
    // campo aperto la legge in ritardo (cpuWide, sopra): a 4–6 m da lei fa vincente il 19% delle volte («umano», prima
    // 1,8%) invece di essere ripresa. Se chi gioca la fa correre si stanca (cpuFatigue, cpuTired: contano i metri oltre
    // 1,5 m di ogni corsa verso la palla; niente fino a 6 m, piena a 14 m): corre fino al 15% più piano e in allungo o in
    // corsa sbaglia fino a 3,5 volte tanto (tired 2,5); sulla palla comoda no. Taratura (i numeri vanno insieme: con più
    // ritardo, più errori o più stanchezza «medio» esce dalla fascia; con meno «amatore» e «umano» perdono troppo) e
    // tabelle: docs/b18/t2-2-cpu-pressione.md
    cpuErr: Object.freeze({ base: .005, stretch: .045, run: .022, speed: 0, angle: 0, pressure: 0, soft: 1, net: .2, drop: .22, lob: .2, smash: .35, sup: .25, tired: 2.5, max: .5 }),
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
};

/* ---------- B18.2 gruppo 3: livelli «Bambini» ed «Evento» (difetto 3 / D3 del rapporto B16) ---------- */
// «Bambini» (nel menu: Chi gioca → Bambino): un bambino deve poter fare scambi e vincere game. A Casual il profilo
// «bambino» del banco vince 46–48 punti e 39–46 game su 100 e perde 37 punti su 100 senza toccare la palla. Qui:
//   • chi gioca ha più margine sul tempo: finestra della direzione più larga (timingSpan: lo stesso errore di tempo sposta
//     meno la palla verso le righe), si colpisce ancora un poco più in ritardo (lateMargin, natpf_impact.lateMargin),
//     «Perfetto» più largo (perfectLead), meno dispersione e meno rischio vicino alle righe;
//   • la palla della CPU arriva più lenta e un poco più alta (cpuFlight × tempo di volo dei suoi colpi, cpuServe.flight
//     per il servizio), quasi sempre al centro e mai negli angoli (CPU_PATTERNS.bambini), e la CPU non attacca la palla
//     debole (cpuAttack 0);
//   • la CPU corre piano, parte tardi e sbaglia di più quando deve muoversi (cpuErr), anche sul servizio (SERVE_WEIGHT).
// Le condizioni del colpo super e il riconoscimento dei gesti non cambiano. Taratura e misure:
// scripts/audit/evento-bambini.mjs, docs/b18/t2-4-evento-bambini.md
LEVELS.bambini = Object.freeze({
  ...LEVELS.casual,
  assistWindow: .34, perfectLead: .22, timingSpan: .28, autoAim: .6,
  scatter: .35, lineRisk: .35, depthRisk: .4,
  playerErr: Object.freeze({ base: .004, power: .06, timing: .2, max: .35 }),
  lateMargin: .06, cpuFlight: 1.08,
  cpuErr: Object.freeze({ ...LEVELS.casual.cpuErr, base: .012, stretch: .2, run: .08 }),
  cpuAttack: 0, cpuAttackBase: 0,
  cpuServe: Object.freeze({ flight: 1.15, wide: 0 }),
});
// «Evento» (nel menu: Chi gioca → Adulto): il livello si regola da solo su chi gioca (natpf_evento.js). È una media,
// pesata da k (0…1, natpf_evento.eventoK), tra due livelli che esistono già e sono tarati:
//   easy  Casual, identico (a k = 0 la partita è quella di Casual, numero per numero);
//   hard  Pro: la lettura, gli errori e la stanchezza della CPU, e le regole di Pro per chi gioca (finestra della
//         direzione, «Perfetto», dispersione, rischio vicino alle righe, corsa del personaggio); la CPU corre un poco più
//         di quella di Pro (5,6 m/s invece di 5,3, portata 1,55 m invece di 1,5, reazione 0,19 s invece di 0,2). Con la
//         CPU di Pro esatta «umano» e «medio» del banco vincevano 70 e 68 punti su 100 già a k = 1: il livello restava
//         fermo al suo tetto proprio per l'adulto medio. Così il loro punto di equilibrio (65 su 100) sta a k ≈ 0,9.
// Tra i due cambiano insieme, un poco a ogni gradino: quanto corre e legge la CPU, quanto sbaglia, quanto forte e
// profonda tira (cpuFlight × tempo di volo dei suoi colpi; cpuPro: probabilità che il colpo sia scelto come a Pro,
// cpuShotChoice) e quanta precisione è chiesta a chi gioca. Con la sola CPU che migliora (prima prova) gli scambi
// diventavano lunghissimi (25 colpi a punto per «umano» vicino a k = 1): chi gioca con le regole larghe di Casual non
// sbaglia quasi mai e il punto lo chiude solo un errore della CPU.
// Restano quelle di Casual a ogni k (tabelle per livello di natpf_stroke_outcome.js, che ricadono su Casual): la finestra
// d'impatto (IMPACT) e l'assistenza (ASSIST: mira piena, qualità sotto cui il colpo fallisce). A k = 1 Evento è quindi
// un poco più largo di Pro per chi gioca.
const { tired: _proTired, ...PRO_ERR } = LEVELS.pro.cpuErr;
export const EVENTO_ENDS = Object.freeze({
  easy: Object.freeze({ ...LEVELS.casual, cpuErr: Object.freeze({ ...LEVELS.casual.cpuErr, tired: 0 }), cpuFatigue: Object.freeze({ ...LEVELS.pro.cpuFatigue, slow: 0 }), cpuFlight: 1, cpuPro: 0 }),
  hard: Object.freeze({ ...LEVELS.pro, assistWindow: LEVELS.casual.assistWindow, cpuErr: Object.freeze({ ...PRO_ERR, tired: _proTired }), cpuFlight: .8, cpuPro: 1,
    cpuSpeed: 5.6, cpuReach: 1.55, cpuReact: .19 }),
});
// solo per le misure (scripts/audit/evento-bambini.mjs --prova): valori che sostituiscono quelli dell'estremo «hard»
export const eventoHardTuning = {};
// livello Evento a k (pura)
export const eventoLevelAt = k => Object.freeze({ ...blend(EVENTO_ENDS.easy, { ...EVENTO_ENDS.hard, ...eventoHardTuning }, k), adaptive: true });
LEVELS.evento = eventoLevelAt(EVENTO.start);   // il livello alla partenza (in partita: skillLevel('evento'), che segue k)
export const SKILL_LEVELS = Object.freeze(LEVELS);
// Solo per audit ed esperimenti (scripts/audit/cpu-pressione.mjs --prova=…): valori che sostituiscono quelli del livello,
// es. cpuTuning.pro = { cpuSpeed: 4.6 }. Vuoto nel gioco
export const cpuTuning = {};
let eventoCache = { k: NaN, tune: null, level: null };
function eventoLevel(){
  const k = eventoK(), T = cpuTuning.evento || null;
  if (eventoCache.k !== k || eventoCache.tune !== T){ const L = eventoLevelAt(k); eventoCache = { k, tune: T, level: T ? { ...L, ...T } : L }; }
  return eventoCache.level;
}
export const skillLevel = difficulty => {
  const k = String(difficulty || 'casual').toLowerCase();
  if (k === 'evento') return eventoLevel();
  const L = SKILL_LEVELS[k] || SKILL_LEVELS.casual, T = cpuTuning[k];
  return T ? { ...L, ...T } : L;
};
// la partita di adesso è al livello Evento contro la CPU?
export const isEvento = engine => String(engine?.matchConfig?.difficulty || '') === 'evento' && !engine?.isMultiplayer;
// le due velocità che il motore tiene sui personaggi (game_engine._applyDifficultyTuning) seguono k
function eventoSpeeds(engine){
  const L = skillLevel('evento');
  if (engine.opponent) engine.opponent.maxSpeed = L.cpuSpeed;
  if (engine.player) engine.player.maxSpeed = L.playerSpeed;
}
// Evento: a fine punto la CPU si regola di un gradino (natpf_evento.eventoPoint) e la sua velocità segue subito
// (game_engine._awardPoint). who: 'player' | 'opponent'. Niente negli altri livelli, nella demo e nell'allenamento
export function eventoAfterPoint(engine, who){
  if (!isEvento(engine) || (engine.autoPlayMode && !engine.userHasInteracted)) return null;
  const k = eventoPoint(who === 'player');
  eventoSpeeds(engine);
  return k;
}
// Evento: si riparte dal valore di base (giocatore nuovo, chiosco, scelta di «Chi gioca»); la velocità della CPU segue
export function eventoRestart(engine){
  const s = eventoReset();
  if (isEvento(engine)) eventoSpeeds(engine);
  return s;
}
export { eventoState, eventoK };
// × tempo di volo dei colpi della CPU nello scambio (Bambini: palla più lenta e un poco più alta); 1 esatto negli altri
// livelli. Non vale per il pallonetto, già lento
export const cpuFlightFactor = (engine, shot = '') => (shot === 'LOB' || engine?.isMultiplayer ? 1 : finite(skillLevel(engine?.matchConfig?.difficulty).cpuFlight, 1) || 1);

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
  return engine.natpfSkill || (engine.natpfSkill = { streak: 0, p2Streak: 0, pressure: 0, lastQuality: 1, cpuPlan: null, lastShot: null, serve: null });
}
// B18.2 (D11): a ogni punto ripartono anche la qualità dell'ultimo colpo (prima restava quella del punto prima e decideva
// la risposta della CPU al servizio) e il servizio in gioco (serve, registerServe)
// B18.2 passo 2: riparte anche la corsa fatta dalla CPU nello scambio (cpuRun, CPU_FATIGUE)
export function resetRally(engine){ const s = skillState(engine); s.streak = 0; s.p2Streak = 0; s.pressure = 0; s.cpuPlan = null; s.lastShot = null; s.lastQuality = 1; s.serve = null; s.cpuRun = 0; return s; }

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
// latenza del colpo (s): da quanto è avvenuto il gesto quando il gioco lo riceve. Negativa solo per la webcam, che manda
// lo swing appena il movimento parte e stima il colpo vero poco dopo (webcam_motion.js)
export const eventLatency = e => (e && e.natpf && e.natpf.aim === 'swing' ? clamp(finite(e.natpf.latency), -.15, .3) : 0);
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
  return wait >= 0 && wait <= .25 ? { ...n, latency: +clamp(finite(n.latency, .06) + wait, -.15, .3).toFixed(3) } : n;
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
// B18.2 gruppo 3 (revisione): le voci della situazione di un colpo di chi gioca, una per una, come le calcola il motore
// (game_engine._natpfRacketShot: quality = reach × prep × stretch × pace; pace = fast × deep × high), più la pressione dello
// scambio lungo e la corsa. Solo per chi spiega il colpo (natpf_super_hint.js: perché il super non è scattato) e per la
// diagnostica: non entra nell'esito. Q: { reach, prep, stretch } già calcolate dal motore; speed: velocità della palla
// (m/s); z: dove è chi colpisce lungo il campo; y: altezza della palla; smash: colpo da sopra la testa
export function situationParts(Q = {}, { speed = 0, z = 0, y = 1, smash = false, pressure = 1, running = 0 } = {}){
  const r3 = v => +finite(v, 1).toFixed(3);
  return { reach: r3(Q.reach), prep: r3(Q.prep), stretch: r3(Q.stretch),
    fast: r3(1 - .25*clamp((finite(speed) - 24)/12)),            // palla molto veloce (da 24 m/s, fino a −25% a 36 m/s)
    deep: r3(1 - .15*clamp((Math.abs(finite(z)) - 12.2)/1.2)),   // colpita oltre 30 cm dietro la riga di fondo (fino a −15%)
    high: r3(smash ? 1 : 1 - .12*clamp((finite(y, 1) - 1.5)/.6)), // rimbalzo alto sopra la spalla (fino a −12%, non la schiacciata)
    pressure: r3(pressure), running: +clamp(finite(running)).toFixed(3) };
}
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
  // B18.2 passo 3 (D8): quante palle corte ha visto la CPU negli ultimi colpi di chi gioca (dropHabit, prima di questo colpo)
  const S = String(shot).toUpperCase(), habit = finite(s.dropHabit);
  if (who !== 'p2') s.dropHabit = habit*DROP_READ.keep + (S === 'DROP' ? 1 : 0);
  s.lastQuality = quality; s.lastShot = { shot: S, grade, landingX, landingZ, power, cpuZ, dropHabit: habit };
  return s;
}
// B18.2 passo 3 (D8 del rapporto B16): la palla corta prevedibile. Prima ogni palla corta giocata con la CPU in fondo
// aggiungeva una probabilità d'errore fissa (cpuErr.drop: +32% a Casual, +22% a Pro), anche la decima di fila e anche se
// cadeva a metà campo, e dopo ogni colpo la CPU tornava in fondo: giocare solo palle corte era la tattica migliore. Ora:
//   • vale quanto è buona: piena se cade entro near − span m dalla rete, niente da near m (dropThreat);
//   • vale meno se è prevedibile: la CPU tiene il conto delle palle corte negli ultimi colpi di chi gioca (dropHabit: ogni
//     colpo il conto vale keep volte quello di prima, una palla corta aggiunge 1). Con il conto a «full» l'errore in più è
//     ridotto di «cut» e la CPU, dopo il suo colpo, aspetta fino a «forward» m più avanti (dropForward): ci arriva prima,
//     ma lascia spazio dietro (pallonetto e colpo profondo tornano utili). La prima palla corta vale intera.
export const DROP_READ = Object.freeze({ keep: .5, full: 2, cut: .85, near: 5.2, span: 2, forward: 3.2 });
export const dropExpect = habit => clamp(finite(habit)/DROP_READ.full);
export const dropThreat = ({ depth = -3, habit = 0 } = {}) => clamp((DROP_READ.near - Math.abs(finite(depth, -3)))/DROP_READ.span)*(1 - DROP_READ.cut*dropExpect(habit));
// metri più avanti a cui la CPU aspetta il colpo dopo (0 esatto se chi gioca non ha giocato palle corte)
export const dropForward = engine => DROP_READ.forward*dropExpect(engine?.natpfSkill?.dropHabit);

/* ---------- servizio di chi gioca contro la CPU: un servizio che conta (B18.2, D11 del rapporto B16) ---------- */
// Prima la risposta della CPU non dipendeva dal servizio: la probabilità d'errore usava la qualità dell'ultimo colpo del
// punto prima (lastQuality mai azzerata) e l'angolo misurato dal centro del campo (un servizio alla «T» valeva zero, uno
// al centro del quadrato metà di uno sulla riga), la CPU partiva nell'istante del colpo (nessuna reazione, a tutti i
// livelli) e gli unici ace nascevano dalla velocità rimasta dal punto prima (game_engine._natpfStandStill). Con la CPU
// ferma: punto diretto 14–18% a Casual, 3–9% a Pro e 1–2% a Leggenda, quasi uguale per un servizio perfetto, forte e
// sulla riga e per uno colpito in ritardo. Ora il servizio ha una minaccia sua (serveInfo):
//   • velocità (fast): quella vera della palla alla partenza, sulla scala del tabellone (km/h = m/s × 6,8): 0 fino a
//     160 km/h (il servizio insegnato a tempo parte a 157), 1 da 190 (forza 0,9 a tempo: 191–194). La velocità vera e
//     non la forza del gesto: il kick di webcam, mouse e prove (natpf_stroke_outcome.SERVE.legacyFlight) è una palla lenta
//     anche con un gesto forte;
//   • strettezza (tight): distanza del rimbalzo dal centro del quadrato, verso l'esterno o verso la «T» (chi risponde
//     aspetta al centro del quadrato): 0 fino al 45% della metà larghezza utile (il servizio insegnato cade al 42%), 1 dal 90%;
//   • tempo del colpo (clean, da q di serveOutcome): 1 a tempo, 0 da 0,55 in giù (colpito 0,5 s fuori tempo);
//   • threat = tempo × (mix.pace·velocità + mix.tight·strettezza + mix.both·velocità·strettezza): 1 solo per il servizio
//     perfetto, forte e sulla riga; sharp = tempo × velocità × strettezza: il servizio forte E angolato, che la CPU legge
//     in ritardo.
// Effetti, per livello (SERVE_WEIGHT[livello]; Leggenda: natpf_legend.LEGEND.serveQ):
//   • errore in risposta (Casual e Pro, cpuServeErrorChance): base × (lateBase … 1 con il tempo del colpo; a Casual
//     lateBase 1: il servizio fuori tempo non perde la base) + threat × minaccia + l'allungo vero all'impatto (stretch × allungo²: il resto lo fa la
//     lettura in ritardo); a Leggenda la qualità del colpo di risposta scende di serveQ × minaccia (stesse regole del
//     giocatore, niente dado);
//   • lettura in ritardo (registerServe → cpuPlan): la CPU resta ferma read × sharp secondi (± readSd, mai sotto zero)
//     prima di partire verso la palla; sul servizio esterno non ci arriva (ace) o risponde in allungo;
//   • pressione: il servizio mette pressione allo scambio (pressure × minaccia), quindi più risposte deboli.
// Un servizio normale (velocità e strettezza 0) non cambia la corsa della CPU: minaccia 0, nessun ritardo. Vale solo
// contro la CPU: nello stesso schermo e nella sfida tra due computer chi risponde è una persona
// (game_engine._executeServeHit). Valori tarati con scripts/audit/servizio.mjs (docs/b18/t2-1-servizio.md).
export const SERVE_WEIGHT = Object.freeze({
  kmhFrom: 160, kmhSpan: 30, kmh: 6.8, tightFrom: .45, tightSpan: .45, qFrom: .55, boxCenter: 2.05, boxHalf: 1.77,
  mix: Object.freeze({ pace: .7, tight: .1, both: .2 }),
  lateBase: .6,                // un servizio colpito fuori tempo vale il 60% della base (Pro; un livello può avere il suo)
  // Casual (revisione del B18.2): base 0,15 e nessuna penalità per il servizio fuori tempo (lateBase 1). Con i personaggi
  // fermi spariscono gli ace «regalati», che con il servizio del telefono erano il 7–9% dei servizi anche per chi batte
  // piano o tardi: con base 0,135 e lateBase 0,6 il profilo «bambino» scendeva da 52,4–52,6% a 49,6% (servizio insegnato)
  // e 47,0% (in ritardo) dei punti al servizio, da 41% a 34–38% dei game. Casual è il livello di chi comincia: lì un
  // servizio colpito tardi vale quanto uno normale. Limite: con base 0,17 il servizio perfetto, forte e stretto esce
  // dalla fascia 20–25% (26,3%). Misure: scripts/audit/servizio.mjs --naturale --servizio=…, docs/b18/t2-1-servizio.md
  // B18.2 passo 2: i numeri qui sotto sono quelli del passo 1 × 0,84 (base 0,15 → 0,125 a Casual, 0,045 → 0,038 a Pro;
  // threat 0,05 → 0,042; allungo 0,125 → 0,105 e 0,09 → 0,076), con lo stesso risultato in campo: prima metà degli errori
  // «di lato» della CPU cadeva dentro e non era un errore (game_engine._executeOpponentReturn), adesso ogni errore
  // deciso esce davvero. stretch è la costante dell'allungo sul servizio (non più una quota di cpuErr.stretch: gli
  // errori degli scambi si tarano senza spostare il servizio). A Casual read 0,075 → 0,037: la CPU ora corre più piano
  // (4,4 m/s) e con il ritardo di prima il servizio perfetto sulla riga faceva il 27% di ace (obiettivo: punto diretto 20–25%)
  casual: Object.freeze({ base: .125, lateBase: 1, threat: .042, stretch: .105, max: .6, read: .037, readSd: .35, pressure: 1 }),
  pro: Object.freeze({ base: .038, threat: .042, stretch: .076, max: .45, read: .135, readSd: .35, pressure: 1 }),
  leggenda: Object.freeze({ read: .15, readSd: .35 }),
  // B18.2 gruppo 3. Bambini: come Casual, con la CPU che sbaglia più spesso la risposta (un bambino batte piano e al
  // centro: il suo servizio non mette in difficoltà nessuno per velocità). Evento: questa è la riga alla partenza; in
  // partita vale la media tra Casual e Pro pesata da k (serveLevel, eventoServeAt)
  bambini: Object.freeze({ base: .2, lateBase: 1, threat: .042, stretch: .105, max: .6, read: .037, readSd: .35, pressure: 1 }),
  evento: Object.freeze({ base: .0554, lateBase: .68, threat: .042, stretch: .0818, max: .48, read: .1154, readSd: .35, pressure: 1 }),
});
// Un livello nuovo contro la CPU deve avere qui la sua riga: senza, il suo servizio non ha peso (la risposta torna alla
// regola degli scambi, cpuErrorChance) e la CPU non legge in ritardo.
// Solo per audit ed esperimenti (scripts/audit/servizio.mjs): valori che sostituiscono quelli del livello, es.
// serveTuning.casual = { read: 0 }
export const serveTuning = {};
// Evento: media tra Casual e Pro pesata da k (lateBase di Pro è quello comune, SERVE_WEIGHT.lateBase)
export const eventoServeAt = k => blend(SERVE_WEIGHT.casual, { lateBase: SERVE_WEIGHT.lateBase, ...SERVE_WEIGHT.pro }, k);
const serveLevel = difficulty => {
  const k = String(difficulty || 'casual').toLowerCase(), W = k === 'evento' ? eventoServeAt(eventoK()) : SERVE_WEIGHT[k];
  return W ? (serveTuning[k] ? { ...W, ...serveTuning[k] } : W) : null;
};
// Minaccia del servizio. speed: velocità della palla alla partenza (m/s); q: tempo del colpo (serveOutcome, 1 a tempo);
// x: rimbalzo laterale voluto; box: lato del quadrato (segno della x del suo centro)
export function serveInfo({ speed = 23, q = 1, x = 0, box = -1 } = {}){
  const W = SERVE_WEIGHT, xc = (box >= 0 ? 1 : -1)*W.boxCenter, kmh = finite(speed, 23)*W.kmh;
  const P = clamp((kmh - W.kmhFrom)/W.kmhSpan), A = clamp((Math.abs(finite(x, xc) - xc)/W.boxHalf - W.tightFrom)/W.tightSpan);
  const Q = clamp((finite(q, 1) - W.qFrom)/(1 - W.qFrom));
  return { kmh: Math.round(kmh), q: +finite(q, 1).toFixed(3), x: +finite(x).toFixed(3), fast: +P.toFixed(3), tight: +A.toFixed(3), clean: +Q.toFixed(3),
    threat: +(Q*(W.mix.pace*P + W.mix.tight*A + W.mix.both*P*A)).toFixed(3), sharp: +(Q*P*A).toFixed(3) };
}
// Dopo il servizio di chi gioca contro la CPU (il motore ha già messo il bersaglio della CPU sul punto d'incontro):
// ricorda il servizio per la risposta e, se è forte e angolato, fa leggere la CPU in ritardo. Restituisce lo stato del
// servizio (s.serve), con late = secondi di ritardo della lettura
export function registerServe(engine, serve, { rng = Math.random } = {}){
  const s = skillState(engine), W = serveLevel(engine?.matchConfig?.difficulty), cpu = engine?.opponent;
  s.serve = null; s.lastQuality = 1;
  if (!W || !serve || !cpu) return null;
  const info = serveInfo(serve), late = info.sharp > 0 && W.read > 0 ? Math.max(0, W.read*info.sharp*(1 + gauss(rng)*finite(W.readSd))) : 0;
  s.serve = { ...info, late: +late.toFixed(3) };
  s.pressure = clamp(finite(W.pressure)*info.threat, 0, 3);
  if (late > .01){
    const now = finite(engine.elapsedTime), truth = cpu.targetPos.clone(), hold = cpu.pos.clone();
    // stessa forma del piano di corsa dello scambio (planCpuRun, tickCpuRun): ferma fino a readAt, poi sul punto vero
    s.cpuPlan = skillLevel(engine.matchConfig?.difficulty).cpuLegend
      ? { legend: true, serve: true, hold, truth, err: 0, readAt: now + late, fixDur: .01 }
      : { serve: true, hold, read: truth, truth, readAt: now + late, fixAt: now + late };
    cpu.targetPos.copy(hold);
  }
  return s.serve;
}
// Il servizio in gioco per la risposta della CPU: solo sulla palla del servizio (un colpo, colpita da chi gioca)
export function serveInPlay(engine){
  const sv = engine?.natpfSkill?.serve, b = engine?.ball;
  return sv && b && finite(b.rallyStrokeCount) <= 1 && b.lastHitter === 'player' && !b.natpfFeed ? sv : null;
}
// Probabilità che la CPU sbagli la risposta al servizio (Casual e Pro). stretch: allungo vero all'impatto (distanza
// laterale / portata), come negli scambi
export function cpuServeErrorChance({ serve = null, stretch = 0, level = SKILL_LEVELS.casual, difficulty = 'casual' } = {}){
  const k = level.cpuErr, W = serveLevel(difficulty); if (!k || !W || !serve) return 0;
  const late = clamp(finite(W.lateBase, SERVE_WEIGHT.lateBase));    // per livello (Casual: 1, nessuna penalità per chi colpisce tardi)
  const p = W.base*(late + (1 - late)*clamp(finite(serve.clean, 1))) + W.threat*clamp(finite(serve.threat))
    + finite(W.stretch)*(.3 + .7*clamp(finite(serve.q, 1)))*clamp(finite(stretch))**2;
  return clamp(p, 0, W.max);
}

/* ---------- CPU ---------- */
// Corsa della CPU: parte dopo il tempo di reazione verso dove crede che arrivi la palla, poi corregge.
export function planCpuRun(engine, { rng = Math.random } = {}){
  const lv = skillLevel(engine.matchConfig?.difficulty), s = skillState(engine), cpu = engine.opponent;
  if (!lv.cpuReact || !cpu) return null;
  if (lv.cpuLegend){
    // Leggenda: split-step all'impatto dell'avversario (ferma per il tempo di reazione, 0,15 ± 0,03 s), poi verso il
    // punto d'incontro con un errore di lettura che si azzera mentre la palla vola (in cpuReadFix secondi)
    const truth = cpu.targetPos.clone(), speed = finite(engine.ball?.vel?.length?.(), 24), now = finite(engine.elapsedTime), sup = engine.ball?.natpfSuper;
    // B31 (punto 22): la schiacciata di chi gioca la Leggenda la legge in ritardo (LEGEND_SMASH.react, come il colpo super)
    const smashIn = s.lastShot?.shot === 'SMASH' && !engine.isMultiplayer;
    const react = clamp(lv.cpuReact + gauss(rng)*(lv.cpuReactSd || 0), .1, .25) + (sup ? finite(sup.react) : 0) + (smashIn ? LEGEND_SMASH.react : 0);
    const err = gauss(rng)*lv.cpuReadSd*(.6 + .4*clamp((speed - 18)/14))*(sup ? finite(sup.misread, 1) : 1);
    s.cpuPlan = { legend: true, hold: cpu.pos.clone(), truth, err, readAt: now + react, fixDur: lv.cpuReadFix };
    cpu.targetPos.copy(s.cpuPlan.hold);
    return s.cpuPlan;
  }
  const truth = cpu.targetPos.clone(), speed = finite(engine.ball?.vel?.length?.(), 24), sup = engine.ball?.natpfSuper;
  const angle = clamp(Math.abs(finite(engine.ball?.targetLanding?.x))/COURT.SINGLES_X);
  // la CPU legge male le palle veloci e angolate e, all'inizio, si aspetta la palla più al centro; il colpo super
  // potente lo legge ancora peggio e in ritardo (sup.react, sup.misread)
  const misread = gauss(rng)*lv.cpuReadSd*(.5 + .5*clamp((speed - 18)/14))*(1 + angle)*(1 + .25*s.pressure)*(sup ? finite(sup.misread, 1) : 1);
  const read = truth.clone(); read.x = read.x*(1 - (lv.cpuCenterBias || 0)*angle) + misread;
  // B18.2 passo 2 (D9): la palla nel campo aperto la CPU la legge in ritardo. wide: secondi in più quando il punto
  // d'incontro è lontano di lato almeno cpuWide.to metri (niente fino a cpuWide.from)
  const W = lv.cpuWide, far = W ? finite(W.react)*clamp((Math.abs(truth.x - cpu.pos.x) - W.from)/Math.max(.1, W.to - W.from)) : 0;
  const now = finite(engine.elapsedTime), late = (sup ? finite(sup.react) : 0) + far;
  // stanchezza della CPU (cpuTired): ogni palla che la fa correre più di cpuFatigue.near metri aggiunge i metri in più
  const F = lv.cpuFatigue;
  if (F) s.cpuRun = finite(s.cpuRun) + Math.max(0, Math.hypot(truth.x - cpu.pos.x, truth.z - cpu.pos.z) - finite(F.near));
  s.cpuPlan = { hold: cpu.pos.clone(), read, truth, readAt: now + lv.cpuReact*(1 + .15*s.pressure) + late, fixAt: now + lv.cpuReact + lv.cpuReadFix + late, far: +far.toFixed(3) };
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
// Stanchezza di chi gioca (richiesta del 29/10: «dopo tanti movimenti da destra e sinistra il personaggio si stanchi,
// ma non troppo»). Solo i personaggi mossi da chi gioca (P1, e il P2 del 1v1 e dello stesso schermo), non la CPU (le sue
// prove di bilanciamento restano quelle). Ogni metro di corsa laterale (lungo x) durante il punto aggiunge perMeter
// alla stanchezza (0…1), il cambio di verso di corsa ne aggiunge turn; ferma (sotto restSpeed) si recupera restRecover
// al secondo, tra un punto e l'altro pointRecover al secondo (B18, D6: fatigueRest; prima non scattava mai). Effetto:
// velocità massima fino a −maxSlow (10%): uno scambio lungo da una riga all'altra (una decina di colpi, 35–40 m di corsa
// laterale) toglie il 5–6%, qualche scambio così di fila arriva al 10%, e torna giù nelle pause.
export const FATIGUE = Object.freeze({ perMeter: .012, turn: .015, turnSpeed: 2, restSpeed: 1.2, restRecover: .03, pointRecover: .12, maxSlow: .1 });
const fatigueOf = (engine, actor) => {
  const F = engine.natpfFatigue || (engine.natpfFatigue = new Map());
  let f = F.get(actor); if (!f) F.set(actor, f = { level: 0, dir: 0 });
  return f;
};
// B18 (D6): stanchezza di tutti a zero (partita nuova, sessione nello stesso schermo). Prima restava quella della
// partita prima (fino a 0,96–0,99 a Pro e Leggenda): il visitatore dopo partiva già «Stanco!»
export const resetFatigue = engine => { engine?.natpfFatigue?.clear?.(); };
// B18 (D6): un passo fuori dallo scambio (pausa tra i punti, servizio, moviola) per ogni personaggio che si è stancato:
// recupero FATIGUE.pointRecover al secondo. Prima fatigueStep girava solo con la palla in gioco (il motore muove i
// personaggi solo lì) e il ramo «tra un punto e l'altro» non scattava mai: a Pro la barra restava su «Stanco!» per il
// 90–95% del tempo
export function fatigueRest(engine, dt){
  const F = engine?.natpfFatigue;
  if (!F?.size || !(dt > 0)) return;
  for (const a of F.keys()) fatigueStep(engine, a, { dt, inPoint: false });
}
// livello di stanchezza (0…1) di un personaggio
export const fatigueLevel = (engine, actor) => (engine.natpfFatigue?.get(actor)?.level ?? 0);
// a ogni passo del movimento di un personaggio di chi gioca: vx velocità laterale (m/s), dt (s)
export function fatigueStep(engine, actor, { vx = 0, speed = 0, dt = 0, inPoint = true } = {}){
  if (!actor || !(dt > 0)) return 0;
  const f = fatigueOf(engine, actor), F = FATIGUE;
  if (inPoint){
    f.level += F.perMeter*Math.abs(vx)*dt;
    const dir = Math.abs(vx) > F.turnSpeed ? Math.sign(vx) : 0;
    if (dir && f.dir && dir !== f.dir) f.level += F.turn;
    if (dir) f.dir = dir;
    if (speed < F.restSpeed) f.level -= F.restRecover*dt;
  } else { f.level -= F.pointRecover*dt; f.dir = 0; }
  f.level = clamp(f.level, 0, 1);
  return f.level;
}
// Fattore della velocità di corsa (≤ 1): stanchezza, e palla super potente in arrivo (natpf_stroke_outcome.superShot:
// chi la riceve la legge in ritardo, ball.natpfSuper.reach). mine: palla colpita da questo lato (non in arrivo)
export function moveFactor(engine, actor){
  const b = engine.ball, sup = b?.natpfSuper;
  const incoming = !!sup && !!b.inPlay && !!actor && Math.sign(finite(actor.pos?.z, 1)) === Math.sign(finite(b.vel?.z));   // va verso di lui
  // B25 (campo aperto, natpf_duo_rules.js): tra due persone, con l'opzione accesa, i personaggi corrono come persone
  // (OPEN_COURT.speed)
  // … verso la palla (OPEN_COURT.speed) e, più piano, quando rientrano dopo il proprio colpo (OPEN_COURT.recover: la palla
  // l'ha colpita lui e va via). Spenta, o contro la CPU: fattore 1 esatto
  const open = openRun(engine), away = !!open && !!b?.inPlay && !!actor && (b.lastHitter === 'opponent') === (actor === engine.opponent);
  return (1 - FATIGUE.maxSlow*fatigueLevel(engine, actor))*(incoming ? clamp(finite(sup.reach, 1), .5, 1) : 1)*(open ? finite(away ? open.recover ?? open.speed : open.speed, 1) : 1);
}

// B18.2 passo 2: a Pro la CPU si stanca se chi gioca la fa correre (come chi gioca: FATIGUE). Tolto l'errore
// che cresceva con la sola lunghezza dello scambio, contro chi rimanda sempre la palla senza chiudere gli scambi non
// finivano più (a Pro il 3% dei punti arrivava a 60 colpi, il 10% oltre i 40; prima 0% e 1,4%). Ora contano le corse
// lunghe: ogni palla che la CPU deve andare a prendere a più di «near» metri da dov'è aggiunge i metri in più a cpuRun
// (planCpuRun; azzerato a ogni punto). Niente fino a «free» metri, poi la stanchezza sale fino a 1 in «span» metri.
// Stanca corre fino al «slow» più piano e, quando colpisce in allungo o in corsa, sbaglia di più (cpuErr.tired); sulla
// palla comoda no. Non è la lunghezza dello scambio: uno scambio lungo giocato addosso alla CPU non la stanca (le palle
// entro «near» metri non contano), due o tre palle negli angoli cominciano a stancarla e cinque la stancano del tutto.
// Prima versione scartata: tutti i metri corsi (anche il rientro al centro): erano 4–6 m a colpo qualunque cosa facesse
// chi gioca, cioè di nuovo il numero dei colpi.
// Scartata anche la stanchezza che continua a salire oltre 1 negli scambi lunghissimi: accorcia gli scambi (a 60 colpi
// dall'1,4 allo 0,3% dei punti di «umano») ma dà a «medio» due punti su cento in più e lo porta fuori dalla fascia 70–85%.
// Valori in SKILL_LEVELS.pro.cpuFatigue. Casual e Leggenda non ce l'hanno: lì la CPU non si stanca, come prima
export const cpuTired = engine => {
  const F = skillLevel(engine?.matchConfig?.difficulty).cpuFatigue;
  return F ? clamp((finite(engine?.natpfSkill?.cpuRun) - F.free)/Math.max(1, F.span)) : 0;
};
export function cpuStep(engine, actor, dt){
  if (actor !== engine.opponent || engine.isMultiplayer || !(dt > 0)) return false;
  const lv = skillLevel(engine.matchConfig?.difficulty);
  if (!lv.cpuAccel || lv.cpuLegend) return false;
  const a = actor, dx = a.targetPos.x - a.pos.x, dz = a.targetPos.z - a.pos.z, d = Math.hypot(dx, dz), vmax = a.maxSpeed*(1 - finite(lv.cpuFatigue?.slow)*cpuTired(engine));
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
// B18.2 passo 2 (D1 del rapporto B16): la CPU sbaglia per la pressione, non a caso. Prima la probabilità aveva una base
// fissa (3% a Casual) e cresceva con la sola lunghezza dello scambio (k.rally × colpi oltre il quarto): tra il 51 e il 70%
// dei punti finiva con un errore della CPU, il 7–12% dei colpi anche sulle palle facili, e bastava rimandare la palla.
// Ora conta quanto la palla la mette in difficoltà nell'istante in cui la colpisce (cpuStrain):
//   • in allungo (reach): palla oltre stretchFrom della portata, al quadrato fino alla portata piena;
//   • in corsa (run): CPU oltre runFrom della sua velocità massima quando colpisce;
//   • palla veloce (pace): velocità della palla all'impatto oltre paceFrom m/s;
//   • angolata (angle) e profonda/forte (threat, shotThreat): aggravano le prime tre, da sole non bastano;
// e la pressione accumulata dai colpi buoni di chi gioca (registerPlayerShot) moltiplica la difficoltà invece di
// sommarsi: su una palla comoda la CPU non sbaglia nemmeno dopo uno scambio duro. La lunghezza dello scambio da sola
// non conta più. Il livello passa soprattutto dalla corsa (cpuSpeed, cpuAccel, cpuReact, cpuReach, cpuWide).
// Misure: scripts/audit/cpu-pressione.mjs (npm run audit:cpu), docs/b18/t2-2-cpu-pressione.md
export const CPU_STRAIN = Object.freeze({ stretchFrom: .4, runFrom: .3, paceFrom: 18, paceSpan: 10 });
export function cpuStrain({ stretch = 0, running = 0, speed = 16, angle = 0 } = {}){
  const K = CPU_STRAIN;
  return { reach: clamp((finite(stretch) - K.stretchFrom)/(1 - K.stretchFrom))**2, run: clamp((finite(running) - K.runFrom)/(1 - K.runFrom)),
    pace: clamp((finite(speed, 16) - K.paceFrom)/K.paceSpan), angle: clamp(finite(angle))**1.5 };
}
// rally: accettato per compatibilità, non conta (prima: k.rally × colpi oltre il quarto)
// drop (B18.2 passo 3): quanto vale questa palla corta (dropThreat, 0…1; 1 se non si sa: prove e chiamate di prima)
// slice (B31): errore in più sul tagliato basso preso da lontano (NET_PLAY.slice di natpf_net_play.js; 0 per gli altri colpi)
export function cpuErrorChance({ angle = 0, speed = 16, pressure = 0, stretch = 0, running = 0, quality = 1, shot = 'TOPSPIN', cpuDeep = true, threat = 1, sup = false, tired = 0, drop = 1, slice = 0, level = SKILL_LEVELS.casual } = {}){
  const k = level.cpuErr; if (!k) return 0;
  const S = String(shot).toUpperCase(), D = cpuStrain({ stretch, running, speed, angle });
  // una palla debole (fuori tempo, lenta e corta) mette meno in difficoltà; k.soft è il minimo del livello (a Casual la
  // CPU è impacciata quando deve muoversi, anche su una palla lenta)
  const q = Math.max(finite(k.soft), (.3 + .7*clamp(finite(quality, 1)))*clamp(finite(threat, 1), .25, 1.15));
  // tired: quanto la CPU ha corso nello scambio (cpuTired, 0…1): stanca sbaglia di più le palle difficili, non quelle comode
  let p = k.base + q*(k.stretch*D.reach + k.run*D.run + k.speed*D.pace)*(1 + k.angle*D.angle)*(1 + k.pressure*clamp(finite(pressure), 0, 3))*(1 + finite(k.tired)*clamp(finite(tired)));
  if (S === 'DROP' && cpuDeep) p += k.drop*clamp(finite(drop, 1));
  if (S === 'LOB' && !cpuDeep) p += k.lob;
  if (S === 'SLICE' && cpuDeep) p += finite(slice)*(.3 + .7*clamp(finite(quality, 1)));
  if (S === 'SMASH') p += k.smash;
  // colpo super potente (natpf_stroke_outcome.superShot): oltre a leggerlo in ritardo, la CPU che ci arriva lo controlla
  // male. Prima questo veniva dall'allungo (peso .18 a Pro, ora .06): senza, a Pro lo rimandava 20 volte su 24 invece di 15
  if (sup) p += finite(k.sup);
  return clamp(p, 0, k.max);
}
// Che errore fa la CPU: dipende dal motivo. In allungo o in corsa la palla esce di lato, la palla veloce o profonda
// scappa lunga, in rete finiscono soprattutto le palle basse (tagliato, palla corta). Prima: 42% in rete, sempre
// (un punto su tre finiva con la CPU in rete); obiettivo del rapporto: al massimo un punto su otto
export function cpuErrorKind({ stretch = 0, running = 0, speed = 16, angle = 0, shot = 'TOPSPIN', depth = -9, level = SKILL_LEVELS.casual, rng = Math.random } = {}){
  const D = cpuStrain({ stretch, running, speed, angle }), S = String(shot).toUpperCase(), low = S === 'SLICE' || S === 'DROP';
  const net = finite(level.cpuErr?.net, .2) + (low ? .3 : 0);
  const wide = .3 + .6*Math.max(D.reach, .6*D.run) + .3*D.angle, long = .3 + .6*D.pace + .3*clamp((-finite(depth, -9) - 8.5)/2.5);
  const r = rng()*(net + wide + long);
  return r < net ? 'net' : r < net + wide ? 'wide' : 'long';
}
// Cosa fa la CPU con questa palla: 'ok' (risposta normale), 'net' / 'wide' / 'long' (errore) o 'weak' (palla corta e
// alta, da smash). Gli errori della CPU crescono con l'allungo, la corsa e la velocità della palla (cpuErrorChance).
// Risposta difensiva della CPU in allungo (game_engine._executeOpponentReturn): con la palla lontana di lato più di «wide»
// metri (o di «power» metri su un colpo potente) la CPU rimanda un tagliato o un pallonetto corto e lento, da attaccare.
// B18 (D9 del rapporto B16): a Pro la soglia era 1,55 m, oltre la portata della CPU (cpuReach 1,5 m): la risposta difensiva
// non scattava mai (0,0% dei colpi della CPU, a Casual 14%) e la palla larga non dava niente. Ora sotto la portata, un poco
// più in là che a Casual (80% della portata contro 77%). Leggenda: come prima (la sua risposta la sceglie natpf_legend.js)
// B31: errore in più della CPU in fondo sul tagliato basso di chi gioca (cpuErrorChance, slice), per la qualità del colpo
// B31 (punto 22): la Leggenda contro la schiacciata riuscita di chi gioca: reazione in più (s) e qualità della risposta ×
// q (natpf_legend.legendDecide). Prima ne rimandava in gioco una su due (banco audit:rete: 50–67%)
export const LEGEND_SMASH = Object.freeze({ react: .15, q: .45 });
export const SLICE_ERR = Object.freeze({ casual: .006, pro: .003 });
export const CPU_DEFENSE = Object.freeze({
  casual: Object.freeze({ wide: 1.08, power: .75 }),
  pro: Object.freeze({ wide: 1.2, power: .95 }),
  leggenda: Object.freeze({ wide: 1.55, power: 1.25 }),
});
export function cpuDefensive(difficulty, stretch, power = false){
  const D = CPU_DEFENSE[String(difficulty || '').toLowerCase()] || CPU_DEFENSE.casual;
  return finite(stretch) > D.wide || (!!power && finite(stretch) > D.power);
}
export function cpuReturnPlan(engine, actor, { rng = Math.random } = {}){
  const lv = skillLevel(engine.matchConfig?.difficulty), s = skillState(engine), ball = engine.ball;
  if (!lv.cpuErr || engine.isMultiplayer || (engine.autoPlayMode && !engine.userHasInteracted)) return { kind: 'ok', chance: 0 };
  const reach = lv.cpuReach || 1.5;
  const info = {
    angle: Math.abs(finite(ball.targetLanding?.x))/COURT.SINGLES_X,
    speed: finite(ball.vel?.length?.(), 22),
    pressure: s.pressure,
    stretch: Math.abs(finite(ball.pos?.x) - finite(actor.pos?.x))/reach,
    running: finite(actor.vel?.length?.())/Math.max(1, finite(actor.maxSpeed, 5)),   // B18.2 passo 2: colpita in corsa
    rally: finite(ball.rallyStrokeCount),
    quality: finite(s.lastQuality, 1),
    shot: s.lastShot?.shot || ball.shotType,
    cpuDeep: finite(s.lastShot?.cpuZ, -11) < -8.5,
    threat: s.lastShot ? shotThreat({ power: s.lastShot.power, depth: s.lastShot.landingZ }) : 1,
    sup: !!ball.natpfSuper,
    tired: cpuTired(engine),
    // B18.2 passo 3 (D8): la palla corta vale quanto è buona e quanto è una sorpresa
    drop: s.lastShot?.shot === 'DROP' ? dropThreat({ depth: s.lastShot.landingZ, habit: s.lastShot.dropHabit }) : 1,
    slice: s.lastShot?.shot === 'SLICE' ? finite(SLICE_ERR[lv.cpuPro > .5 || lv === SKILL_LEVELS.pro ? 'pro' : 'casual']) : 0,   // B31: tagliato basso
    level: lv,
  };
  // B18.2 (D11): sulla palla del servizio la risposta dipende dal servizio ricevuto (serveInfo), non dall'ultimo colpo
  // del punto prima; per l'attacco della CPU conta il tempo del servizio (un servizio fuori tempo si attacca)
  const sv = serveInPlay(engine);
  if (sv){ info.quality = sv.q; info.threat = sv.threat; info.serve = true; }
  const chance = sv ? cpuServeErrorChance({ serve: sv, stretch: info.stretch, level: lv, difficulty: engine.matchConfig?.difficulty }) : cpuErrorChance(info), roll = rng();
  s.lastCpu = { chance, ...info, level: undefined, kind: 'ok' };
  if (roll < chance){
    const kind = cpuErrorKind({ ...info, depth: s.lastShot?.landingZ, rng });
    s.lastCpu.kind = kind;
    return { kind, chance, info };
  }
  if (rng() < lv.cpuWeak*clamp(s.pressure, 0, 2)*.5 + (info.stretch > .8 ? .08 : 0)){ s.lastCpu.kind = 'weak'; return { kind: 'weak', chance, info }; }
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
// Volo con la fisica del motore fino al primo rimbalzo: punto di rimbalzo, tempo, altezza e tempo al passaggio sulla rete.
export function flyAir({ from, vel, topspin = 14, sidespin = 0, gravity = 9.15, drag = .012, dt = 1/120 } = {}){
  const g = gravity + finite(topspin)*.14;
  let x = from.x, y = from.y, z = from.z, vx = vel.x, vy = vel.y, vz = vel.z, net = null, netT = null, t = 0, px = x, py = y, pz = z;
  for (let i = 0; i < 900 && !(y <= .075 && vy < 0); i++){
    const d = Math.max(0, 1 - drag*Math.hypot(vx, vy, vz)*dt);
    vx *= d; vy *= d; vz *= d; vy -= g*dt; vx += finite(sidespin)*.12*dt;
    px = x; py = y; pz = z;
    x += vx*dt; y += vy*dt; z += vz*dt; t += dt;
    if (net == null && Math.sign(pz) !== Math.sign(z) && pz !== z){ const f = pz/(pz - z); net = py + (y - py)*f; netT = t - dt*(1 - f); }
  }
  // punto di rimbalzo continuo (tra i due passi attorno a terra): il motore lo trova al passo, cioè fino a ~0,2 m dopo
  const f = py > y ? clamp((py - .075)/(py - y)) : 1;
  return { x, z, t, net, netT, landX: px + (x - px)*f, landZ: pz + (z - pz)*f };
}
// Servizio alla profondità voluta (diagnostiche del 30/10, C4: tutti i servizi cadevano 0,9–1,4 m prima, 11 su 11,
// perché al servizio mancava fixAir). Come fixAir corregge la velocità lungo il campo, e anche quella di lato perché il
// servizio resti nel punto scelto del quadrato; poi controlla con l'aria che la palla passi sopra la rete di almeno
// netGap (il controllo di _launchBallToTarget è senz'aria): se no la alza e rifà la profondità.
export function fixAirServe(ball, { from, to, topspin = 14, sidespin = 0, gravity = 9.15, drag = .012, netY = .914, netGap = .16 } = {}){
  const o = { from, topspin, sidespin, gravity, drag };
  for (let pass = 0; pass < 4; pass++){
    for (let i = 0; i < 8; i++){
      // il motore vede il rimbalzo al primo passo sotto terra (fino a un passo dopo il punto continuo): si mira a metà strada
      const f = flyAir({ ...o, vel: ball.vel }), want = to.z - from.z, got = (f.landZ + f.z)/2 - from.z;
      const okZ = Math.abs(got - want) < .02, okX = Math.abs(f.landX - to.x) < .02;
      if (okZ && okX) break;
      if (got && Math.sign(got) === Math.sign(want)) ball.vel.z *= clamp(want/got, .8, 1.25);
      ball.vel.x += clamp((to.x - f.landX)/Math.max(.3, f.t), -3, 3);
    }
    const f = flyAir({ ...o, vel: ball.vel });
    if (f.net == null || f.net >= netY + netGap) break;
    ball.vel.y += (netY + netGap + .03 - f.net)/Math.max(.15, f.netT);
  }
  return ball;
}
// Angolo stretto: una palla molto angolata deve cadere più corta per restare in campo (come nel tennis vero).
// z: profondità proposta (negativa o positiva, è il segno della metà campo) · x: punto di rimbalzo laterale
export function angleDepth(x, z, { rng = Math.random } = {}){
  const a = clamp((Math.abs(finite(x)) - 2.9)/1.2), s = Math.sign(finite(z, -9)) || -1, d = Math.abs(finite(z, -9));
  if (!a || d < 6.4) return finite(z, -9);
  const short = 5.9 + rng()*1.3;
  return s*(d + (short - d)*a);
}
// Rimbalzo: il top spin salta più alto e scorre, il tagliato resta basso (moltiplicatori della velocità al rimbalzo).
// B31: il tagliato forte (effetto −6 o meno: il tagliato di chi gioca, il tagliato pieno della CPU) rimbalza più basso
// (fino a 0,8 invece di 0,88 della velocità verticale): palla bassa, buona per avvicinarsi a rete e contro chi sta
// lontano. Il tagliato morbido e la palla corta (−5…−3) restano come prima
export const SLICE_BOUNCE = Object.freeze({ spin: -6, up: .8 });
export const bounceSpin = spin => { const s = finite(spin, 14); return { up: clamp(1 + (s - 14)*.012, s <= SLICE_BOUNCE.spin ? SLICE_BOUNCE.up : .88, 1.12), along: clamp(1 + (s - 14)*.006, .95, 1.06) }; };

// Schemi della CPU nella risposta normale: prima il colpo veniva da un ciclo fisso (top, top, tagliato, top, lob) e la
// palla andava sempre verso il campo libero a media profondità. Ora la CPU sceglie per peso tra più schemi, con
// angoli e altezze diversi; al livello Esperto cerca più spesso angoli e palle profonde.
//   playerX: posizione laterale del giocatore · playerZ: distanza dalla rete · ballX: dove la CPU colpisce
export const CPU_PATTERNS = Object.freeze({
  casual: Object.freeze({ rally: .32, open: .3, behind: .08, deep: .1, angle: .04, slice: .1, moon: .06 }),
  pro: Object.freeze({ rally: .2, open: .26, behind: .12, deep: .18, angle: .1, slice: .09, moon: .05 }),
  // B18.2 gruppo 3, Bambini: quasi sempre al centro, niente contropiede né angoli stretti, qualche parabola alta
  bambini: Object.freeze({ rally: .7, open: .1, behind: 0, deep: .04, angle: 0, slice: .06, moon: .1 }),
});
export function cpuShotChoice({ difficulty = 'casual', playerX = 0, playerZ = 11.5, ballX = 0, rally = 0, rng = Math.random } = {}){
  // Leggenda non usa questi schemi (natpf_legend.js), ma se ci arrivasse varrebbero quelli di Esperto
  // (Evento: con probabilità cpuPro, che segue k, il colpo è scelto come a Pro: più profondo, più angolato, più forte)
  const key = String(difficulty).toLowerCase(), pro = ['pro', 'leggenda'].includes(key) || (key === 'evento' && finite(skillLevel(key).cpuPro) > 0 && rng() < skillLevel(key).cpuPro), W = { ...(key === 'bambini' ? CPU_PATTERNS.bambini : CPU_PATTERNS[pro ? 'pro' : 'casual']) };
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

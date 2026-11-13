// Telecomando dello staff (B27): da una fotografia del gioco (snapshot, fatta da natpf_remote.js leggendo la pagina) a
// «dove siamo» e «cosa può fare ogni pulsante del telefono adesso». Funzioni pure, provate con node:test
// (test/natpf-telecomando.test.mjs); la matrice di tutte le schermate è in docs/b27/telecomando.md.
//
// Strati, dal più in alto: intro → pannello dello stand → finestre <dialog> → nome del giocatore → diagnostica →
// calibrazione dello schermo → guida → tutorial dei gesti → pausa → partita ferma per il telefono → pannello del
// telefono → fine partita → Player 2 dell'invito → menu (lobby) → in campo (lezione, calibrazione, riscaldamento,
// minigioco, partita). La pausa sta sopra «partita ferma per il telefono»: il suo foglio si apre sopra quel riquadro
// (prima le frecce comandavano il riquadro dietro e Indietro non chiudeva la pausa).
// Come si naviga (navPlan):
//   'keys'  il modulo dello strato gestisce già frecce, Invio ed Esc (menu, guida, tutorial, calibrazione dello schermo,
//           lezione, intro): il telefono manda gli stessi tasti della tastiera;
//   'focus' finestre con pulsanti (pausa, pannelli, fine partita, nome…): le frecce spostano il fuoco tra i pulsanti
//           visibili dello strato, OK li preme, Indietro fa l'azione «indietro» dello strato;
//   'field' in campo: frecce e OK non fanno niente (muoverebbero il giocatore e tirerebbero colpi: il telecomando non
//           interferisce mai con la racchetta), Indietro apre la pausa.

import { CPU_LEVELS as WHO_CPU_LEVELS, LEVEL_NAME, whoOfLevel } from './natpf_who.js';

export const SCREEN_LABEL = Object.freeze({
  trial: 'Scambi di prova',
  intro: 'Intro', staff: 'Pannello dello stand', remote: 'Telecomando dello staff', dialog: 'Finestra di avviso', nick: 'Nome del giocatore',
  diag: 'Diagnostica', calibra: 'Calibrazione dello schermo', guide: 'Guida «Come si gioca»', tutorial: 'Tutorial dei gesti',
  hold: 'Partita ferma: telefono scollegato', phonePanel: 'Pannello del telefono', pause: 'Pausa', victory: 'Fine partita',
  guest: 'Player 2: racchetta e visuale', lesson: 'Lezione: presa e posizione', cal: 'Calibrazione del telefono',
  warmup: 'Riscaldamento', training: 'Allenamento', minigame: 'Minigioco', match: 'Partita', other: 'Gioco',
});
export const LOBBY_LABEL = Object.freeze({
  menu: 'Menu principale', mode: 'Scegli la modalità', controller: 'Scegli la racchetta', connect: 'Collega il telefono',
  match: 'Pronto per la partita', options: 'Opzioni', challenges: 'Minigiochi', ranking: 'Classifica del giorno',
  result: 'Risultato del minigioco', warmup: 'In campo',
});
// Livello contro la CPU (dal 2026-11-12.4 la pagina «Partita» chiede «Chi gioca: Bambino · Ragazzo · Adulto», natpf_who.js;
// Esperta e Leggenda stanno in «Altre impostazioni»). Il pulsante del telecomando gira tra tutti e cinque, in ordine di
// difficoltà, e dice il nome che lo staff vede sullo schermo: «Chi gioca: Adulto», oppure «CPU: Esperta».
export const CPU_LEVELS = WHO_CPU_LEVELS;
const WHO_NAME = Object.freeze({ bambino: 'Bambino', ragazzo: 'Ragazzo', adulto: 'Adulto' });
const cpuOk = level => (CPU_LEVELS.includes(level) ? level : 'evento');
export const cpuName = level => { const l = cpuOk(level), w = whoOfLevel(l); return w ? WHO_NAME[w] : `CPU ${LEVEL_NAME[l]}`; };
export const cpuLabel = level => { const l = cpuOk(level), w = whoOfLevel(l); return w ? `Chi gioca: ${WHO_NAME[w]}` : `CPU: ${LEVEL_NAME[l]}`; };
export const nextCpu = level => CPU_LEVELS[(CPU_LEVELS.indexOf(cpuOk(level)) + 1) % CPU_LEVELS.length];
// strati sopra il menu e il campo, dal più in alto
export const LAYERS = Object.freeze(['intro', 'staff', 'remote', 'dialog', 'nick', 'diag', 'calibra', 'guide', 'tutorial', 'pause', 'hold', 'phonePanel', 'victory', 'guest']);
const FIELD = new Set(['cal', 'trial', 'warmup', 'training', 'minigame', 'match']);
// strati con i pulsanti in cui le frecce spostano il fuoco
const FOCUS = new Set(['staff', 'remote', 'dialog', 'nick', 'diag', 'hold', 'phonePanel', 'pause', 'victory', 'guest']);

// s: fotografia del gioco. Campi (tutti facoltativi, falsi se mancano):
//   intro, staff, remote, dialog, nick, diag, calibra, guide, tutorial, hold, phonePanel, pause, victory, guest   strati aperti
//   lobby: { visible, step, mode, splitTutorial }        training: { active, lesson, cal, drills, mode }
//   minigame: nome del minigioco in corso o null       inField: in campo con il gioco che gira (non la dimostrazione)
//   split, versus: partita nello stesso schermo / sfida tra due computer
export function remoteScreen(s = {}){
  const L = s.lobby || {}, T = s.training || {};
  const top = LAYERS.find(k => s[k]);
  if (top){
    const label = top === 'tutorial' && s.tutorialReview ? 'Rivedi i gesti' : SCREEN_LABEL[top];
    return { id: top, label, nav: FOCUS.has(top) ? 'focus' : 'keys', under: underOf(s) };
  }
  // scambi di prova (B28: la calibrazione giocando): in campo, anche nella sfida tra due computer che li apre dal menu
  if (s.trial) return { id: 'trial', label: SCREEN_LABEL.trial, nav: 'field' };
  if (L.visible){
    const step = L.step || 'menu';
    let label = LOBBY_LABEL[step] || 'Menu';
    if (step === 'connect' && L.mode === 'split') label = L.splitTutorial ? 'Stesso schermo: tutorial dei due giocatori' : 'Stesso schermo: i due telefoni';
    if (step === 'connect' && s.controller === 'webcam') label = 'Accendi la webcam';
    return { id: `lobby:${step}`, label, nav: 'keys', step, mode: L.mode || null };
  }
  if (T.active){
    if (T.lesson) return { id: 'lesson', label: SCREEN_LABEL.lesson, nav: 'keys' };
    if (T.cal) return { id: 'cal', label: SCREEN_LABEL.cal, nav: 'field' };
    return { id: T.mode === 'training' ? 'training' : 'warmup', label: SCREEN_LABEL[T.mode === 'training' ? 'training' : 'warmup'], nav: 'field' };
  }
  if (s.minigame) return { id: 'minigame', label: `Minigioco: ${s.minigame}`, nav: 'field' };
  if (s.inField) return { id: 'match', label: s.split ? 'Partita · stesso schermo' : s.versus ? 'Sfida tra due computer' : 'Partita contro la CPU', nav: 'field' };
  // menu nascosto senza una partita (passaggio al campo, dimostrazione): i tasti arriverebbero al motore, come in campo
  return { id: 'other', label: SCREEN_LABEL.other, nav: 'field' };
}
// cosa c'è sotto uno strato aperto (pausa sopra la partita…): per dire se una partita è in corso
function underOf(s){ const rest = { ...s }; for (const k of LAYERS) delete rest[k]; return remoteScreen(rest).id; }
// una partita (o minigioco, riscaldamento…) è in corso, anche sotto la pausa o un pannello: Menu e Nuovo giocatore la
// chiudono, quindi il telefono chiede conferma
// (a fine partita no: la partita è finita, Menu e Nuovo giocatore non chiudono niente)
export function gameRunning(screen){ return screen.id !== 'victory' && (FIELD.has(screen.id) || FIELD.has(screen.under) || screen.id === 'pause' || screen.id === 'hold'); }

// Navigazione: cosa fa il comando nella schermata (null se non è un comando di navigazione)
//   { kind: 'key', code }           tasto della tastiera (stesso effetto)
//   { kind: 'focus', dir }          fuoco al pulsante vicino in quella direzione
//   { kind: 'press' }               preme il pulsante a fuoco (o il primo, se nessuno lo è)
//   { kind: 'back' }                azione «indietro» dello strato (chiude il pannello, riprende dalla pausa…)
//   { kind: 'pause' }               apre la pausa (in campo)
//   { kind: 'blocked', why }        niente, con il motivo
const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', ok: 'Enter', back: 'Escape' };
export function navPlan(screen, cmd){
  if (!(cmd in KEYS)) return null;
  if (screen.nav === 'field'){
    if (cmd === 'back') return { kind: 'pause' };
    return { kind: 'blocked', why: screen.id === 'cal' ? 'Calibrazione in corso: la fa il giocatore con il suo telefono. Indietro o Pausa per fermarla.'
      : screen.id === 'trial' ? 'Scambi di prova: li gioca il giocatore. Salta per andare subito avanti (pagina «Pronto per la partita»), Indietro o Pausa per fermarli.' : 'In campo frecce e OK muoverebbero il giocatore: usa Pausa (o Indietro).' };
  }
  if (screen.nav === 'focus'){
    if (cmd === 'ok') return { kind: 'press' };
    if (cmd === 'back') return { kind: 'back' };
    return { kind: 'focus', dir: KEYS[cmd] };
  }
  // Tutorial dei gesti («Rivedi i gesti» compreso) e lezione: i loro tasti sono ← → OK e Indietro. ↑ e ↓ non li usa
  // nessuno dei due e arriverebbero al motore: in campo ↑ lancia la palla (motion_controls) e ↓ muove il giocatore
  if ((screen.id === 'tutorial' || screen.id === 'lesson') && (cmd === 'up' || cmd === 'down')) return { kind: 'blocked', why: 'Qui si sfoglia con ← e →' };
  return { kind: 'key', code: KEYS[cmd] };
}

const on = 1;
// Comandi possibili adesso: { cmds: { comando: 1 | 'motivo' }, labels, hints }. s come in remoteScreen, più:
//   controller ('phone' | 'webcam' | 'mouse'), phone: { connected }, cpu (livello), desktop: { displays, label } | null,
//   fullscreen: { available, on, gesture } (gesture: nel browser serve un tasto vero), skip (c'è un «Salta» in vista),
//   canReview (si può aprire «Rivedi i gesti»), connectReady (la pagina «Collega» può andare avanti)
//   trial (scambi di prova in corso), recalTrial («Ricalibra» adesso farebbe gli scambi di prova), calMode ('play' | 'gesti' | 'none')
export function remoteCommands(s = {}, screen = remoteScreen(s)){
  const cmds = {}, labels = {}, hints = {};
  const field = screen.nav === 'field', running = gameRunning(screen), L = s.lobby || {};
  for (const c of ['up', 'down', 'left', 'right', 'ok', 'back']){
    const p = navPlan(screen, c);
    cmds[c] = p.kind === 'blocked' ? p.why : on;
  }
  if (screen.id === 'intro'){ for (const c of ['up', 'down', 'left', 'right']) cmds[c] = 'Intro: premi OK (o Salta) per il menu'; }
  // Gioca / Pronto per la partita: avanti verso la partita
  const step = screen.step;
  if (step === 'menu'){ cmds.play = on; labels.play = 'Gioca'; hints.play = 'contro la CPU'; }
  else if (step === 'mode'){ cmds.play = on; labels.play = 'Contro la CPU'; }
  else if (step === 'controller'){ cmds.play = on; labels.play = 'Avanti'; hints.play = 'Collega'; }
  else if (step === 'connect'){ cmds.play = s.connectReady ? on : (L.mode === 'split' ? 'Servono i due telefoni pronti' : s.controller === 'webcam' ? 'La webcam non vede ancora la mano' : 'Il telefono del giocatore non è ancora collegato'); labels.play = 'Avanti'; }
  else if (step === 'match'){ cmds.play = L.mode === 'split' && !s.splitReady ? 'Servono i due telefoni pronti' : on; labels.play = 'Gioca!'; hints.play = 'Pronto per la partita'; }
  else if (step === 'result' || screen.id === 'victory'){ cmds.play = on; labels.play = 'Gioca ancora'; }
  else if (step){ cmds.play = on; labels.play = 'Gioca'; hints.play = 'dal menu'; }
  else cmds.play = running ? 'La partita è già in corso' : screen.id === 'intro' ? 'Prima entra nel menu (OK)' : 'Chiudi prima la finestra aperta (Indietro)';
  if (screen.id === 'victory') cmds.play = on;
  // Torna al menu
  cmds.menu = screen.id === 'lobby:menu' ? 'Sei già al menu principale' : screen.id === 'intro' ? 'Premi OK: dopo l’intro c’è il menu' : on;
  if (cmds.menu === on && running) hints.menu = 'chiude la partita';
  // Pausa / Riprendi
  if (screen.id === 'pause'){ cmds.pause = on; labels.pause = 'Riprendi'; }
  else if (field || screen.id === 'hold'){ cmds.pause = on; labels.pause = 'Pausa'; }
  else { cmds.pause = 'Pausa solo in campo'; labels.pause = 'Pausa'; }
  cmds.newplayer = screen.id === 'intro' ? 'Prima entra nel menu (OK)' : on;
  if (running) hints.newplayer = 'chiude la partita';
  // telefono del giocatore
  // (B28) con «Calibrazione: Giocando» in partita «Ricalibra» rifà gli scambi di prova e poi si rigioca il punto
  // (s.recalTrial, anche nello stesso schermo: per tutti e due); altrimenti azzera il profilo o rifà i gesti
  const underTrial = screen.id === 'trial' || screen.under === 'trial';
  cmds.recal = s.controller !== 'phone' ? 'Il giocatore non usa il telefono' : !s.phone?.connected ? 'Telefono del giocatore non collegato'
    : underTrial ? 'Gli scambi di prova stanno già calibrando' : s.split && !s.recalTrial ? 'Stesso schermo: ricalibra dalla pagina «Racchette»' : screen.id === 'intro' ? 'Prima entra nel menu (OK)' : on;
  if (cmds.recal === on) hints.recal = s.recalTrial ? 'scambi di prova, poi si rigioca il punto' : s.calMode === 'gesti' ? 'rifà i gesti' : s.calMode === 'none' ? 'profilo da capo' : s.calMode === 'play' ? 'profilo da capo: impara dai prossimi scambi' : '';
  if (!hints.recal) delete hints.recal;
  cmds.gestures = s.canReview ? on : screen.id === 'tutorial' ? 'Il tutorial è già aperto' : field || running ? 'In partita no: Pausa → Aiuto «Come si gioca»' : 'Qui non c’è il tutorial dei gesti';
  // livello della CPU (vale dalla prossima partita)
  const cpuFree = !s.split && !s.versus && L.mode !== 'split' && L.mode !== 'friend';
  // (in partita no: la CPU cambierebbe a metà; sopra il menu, nella pausa del menu o a fine partita sì)
  const atMenu = screen.id.startsWith('lobby:') || String(screen.under || '').startsWith('lobby:') || screen.id === 'victory';
  cmds.cpu = !cpuFree ? 'Non c’è la CPU in questa modalità' : !atMenu ? 'Si cambia dal menu, prima o dopo la partita' : on;
  labels.cpu = cpuLabel(s.cpu);
  if (cmds.cpu === on) hints.cpu = `poi ${cpuName(nextCpu(s.cpu))}`;
  // schermo del gioco (solo nel programma Windows) e schermo intero
  if (!s.desktop){ cmds.screen = 'Solo nel programma Windows'; }
  else if ((s.desktop.displays || 0) < 2){ cmds.screen = 'C’è un solo monitor collegato'; hints.screen = s.desktop.label || ''; }
  else { cmds.screen = on; hints.screen = s.desktop.label ? `ora: ${s.desktop.label}` : 'monitor successivo'; }
  const fs = s.fullscreen || {};
  cmds.fullscreen = !fs.available ? 'Non disponibile qui' : fs.gesture ? 'Nel browser serve un tasto sul computer (F)' : on;
  labels.fullscreen = fs.on ? 'Schermo intero: sì' : 'Schermo intero: no';
  cmds.staff = screen.id === 'intro' ? 'Prima entra nel menu (OK)' : on;
  labels.staff = screen.id === 'staff' ? 'Chiudi il pannello' : 'Pannello dell’addetto';
  cmds.skip = s.skip ? on : 'Qui non c’è niente da saltare';
  if (s.skip) labels.skip = typeof s.skip === 'string' ? s.skip : 'Salta';
  return { cmds, labels, hints };
}
// Serve la conferma sul telefono prima del comando? (testo della domanda o null)
export function confirmText(cmd, screen){
  if (!gameRunning(screen)) return null;
  if (cmd === 'menu') return 'La partita in corso si chiude. Tornare al menu?';
  if (cmd === 'newplayer') return 'La partita in corso si chiude e si azzera il giocatore. Continuare?';
  return null;
}
// Riga del punteggio per il telefono. score: engine.score ({ playerPoints, opponentPoints, playerGames, opponentGames })
const POINTS = ['0', '15', '30', '40'];
export function scoreLine(score, { tiebreak = false, names = ['Tu', 'CPU'] } = {}){
  if (!score) return '';
  const a = score.playerPoints | 0, b = score.opponentPoints | 0;
  let pts;
  if (tiebreak) pts = `${a}-${b}`;
  else if (a >= 3 && b >= 3) pts = a === b ? 'Parità' : `Vantaggio ${a > b ? names[0] : names[1]}`;
  else pts = `${POINTS[Math.min(a, 3)]}-${POINTS[Math.min(b, 3)]}`;
  return `${names[0]} ${score.playerGames | 0} · ${names[1]} ${score.opponentGames | 0} (game) · ${pts}`;
}

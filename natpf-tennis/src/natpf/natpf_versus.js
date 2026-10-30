// Sfida un amico (1v1 tra due computer): sessione, stato della lobby, presenza e testi per chi gioca.
// Prima non esisteva una «sessione»: ogni colpo o messaggio del Player 2 accendeva il multigiocatore anche in una
// partita contro la CPU o nel menu, il computer del P2 decideva i punti per conto suo, nessuno si accorgeva di chi
// usciva e la lobby diceva solo «In attesa di Challenger…». Ora:
//   • host: la sessione nasce con la stanza («Sfida un amico») e finisce scegliendo un'altra modalità; solo dentro la
//     sessione e a partita in corso valgono i colpi del P2; in lobby si manda al P2 lo stato della lobby, non la
//     dimostrazione;
//   • lobby: in attesa → P2 collegato → P2 pronto; «Gioca» solo con il P2 pronto;
//   • partita: P2 assente per più di VERSUS.lostMs → pausa con la spiegazione, riprende da sola quando torna;
//   • P2: l'host è l'unico arbitro (punti, game, fine partita arrivano dagli snapshot); stato chiaro in ogni fase.
// Funzioni pure qui; il collegamento a motore e interfaccia sta in game_engine.js (blocchi «NATPF 1v1») e natpf_ui.js.

export const VERSUS = Object.freeze({
  lostMs: 5000,        // senza notizie dall'altro computer per 5 s: scollegato (come il telefono e il WebRTC)
  invalidMs: 6000,     // stanza che non esiste per 6 s di fila: link sbagliato o host che ha chiuso
  lobbyEvery: .5,      // s: stato della lobby mandato al P2 mentre l'host prepara la partita
  matchEvery: .045,    // s: snapshot della partita (come prima)
});
export const MATCH_PHASES = Object.freeze(['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER', 'MATCH_OVER', 'REPLAY']);

// Stato della lobby visto dall'host: 'waiting' (nessuno) · 'joined' (P2 collegato, sceglie la racchetta) · 'ready'
export function lobbyState({ p2Online = false, p2Ready = false } = {}){
  return !p2Online ? 'waiting' : p2Ready ? 'ready' : 'joined';
}
export const canStart = state => state === 'ready';

// Testi dello stato della sfida senza server (natpf_p2p.js), per l'host e per il Player 2. Tra parentesi il codice
// dell'errore della segnalazione, per chi aiuta a capire il problema
export const P2P_NET_HINT = 'Provate con un’altra rete (per esempio quella di casa invece di quella dell’ufficio o della scuola), senza VPN, oppure con i due computer sulla stessa rete Wi-Fi.';
export function p2pStatusText(mode, status, error = null){
  const host = mode === 'host';
  // Player 2: host introvabile da tempo, o stanza già occupata da un altro Player 2
  if (!host && error === 'chiusa' && status !== 'connected') return 'L’host non risponde: forse ha chiuso la partita. Riprovo da solo; se non torna, chiedi un nuovo link';
  if (!host && error === 'occupata') return 'Nella stanza c’è già un Player 2: riprovo tra poco, entri appena si libera';
  // l'altro computer risponde ma il canale diretto non si apre: è la rete (firewall, NAT, VPN). Prima: «Mi collego…» e
  // «In attesa del Player 2…» per sempre
  if (error === 'rete' && status !== 'connected' && status !== 'off')
    return `${host ? 'Il Player 2 ha aperto il link' : 'L’host c’è'}, ma la rete blocca il collegamento diretto tra i due computer. ${P2P_NET_HINT} ${host ? 'Il Player 2 riprova da solo.' : 'Riprovo da solo.'}`;
  switch (status){
    case 'waiting': return 'In attesa del Player 2…';
    case 'connected': return host ? 'Player 2 collegato ✓' : 'Collegato all’host ✓';
    case 'lost': return host ? 'Player 2 scollegato: si ricollega da solo appena torna la rete' : 'Collegamento con l’host perso: mi ricollego…';
    case 'connecting': return 'Mi collego all’host…';
    case 'error':
      if (error === 'stanza') return 'Stanza non valida: chiedi all’host un nuovo link';
      if (error === 'libreria') return 'Il collegamento tra i due computer non si è caricato: ricarica la pagina';
      if (error === 'browser-incompatible') return 'Questo browser non permette il collegamento diretto tra due computer: usa un browser aggiornato (Chrome, Edge, Firefox o Safari)';
      // errore del browser sul canale diretto (PeerJS «webrtc»): non è la segnalazione né per forza il browser
      if (error === 'webrtc') return `Il collegamento diretto si è interrotto (${error}): riprovo da solo`;
      if (error === 'unavailable-id') return 'Questa stanza è ancora aperta in un’altra scheda: chiudila e torna qui, oppure crea una nuova sfida';
      return `Il server che mette in contatto i due computer non risponde (${error || 'rete'}): controlla la connessione a internet, riprovo da solo`;
    case 'off': return 'Collegamento chiuso';
    default: return 'Preparo il collegamento…';
  }
}

// Stato della lobby dell'host in una riga, nella barra dell'invito che resta in vista dalla racchetta alla partita (prima
// codice e link comparivano solo nell'ultima pagina, dopo racchetta, collegamento e riscaldamento, sotto tre righe di
// passi). state: 'on' (si aspetta) · 'ok' (pronto) · 'error'. net: collegamento senza server { mode, status, error }:
// un problema di rete si dice al posto dell'attesa. failed: la stanza non è nata
export function hostLobbyStatus(state, { roomId = '', p2Name = 'Player 2', net = null, failed = false } = {}){
  if (!roomId) return failed ? { state: 'error', text: 'La stanza non è stata creata: controlla la connessione e riprova' } : { state: 'on', text: 'Creo la stanza…' };
  if (net?.mode === 'host' && state === 'waiting'){
    if (net.status === 'starting') return { state: 'on', text: 'Apro la stanza su internet…' };
    if (net.error) return { state: 'error', text: p2pStatusText('host', net.status, net.error) };
  }
  if (state === 'ready') return { state: 'ok', text: `${p2Name} è pronto ✓ Premi «Gioca»` };
  if (state === 'joined') return { state: 'on', text: `${p2Name} è entrato: collega la racchetta e la prova in campo` };
  return { state: 'on', text: `In attesa di ${p2Name}: mandagli il link (lo apre sul suo computer) o dettagli il codice` };
}
// Codice della stanza scritto a mano («at-k3zq», «K3ZQ», «AT K3ZQ») → «AT-K3ZQ»; null se non è un codice (quattro
// lettere o cifre senza 0, O, 1 e I, come scripts/match-relay.mjs)
export function roomCode(text){
  const s = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = s.length === 6 && s.startsWith('AT') ? s.slice(2) : s;
  return /^[A-HJ-NP-Z2-9]{4}$/.test(code) ? `AT-${code}` : null;
}
// Pagina del Player 2 per un codice: stessa pagina, ruolo p2; p2p: sito senza server (collegamento diretto). Restano
// i parametri di prova (lan, peer)
export function joinUrl(code, { pathname = '/', search = '', p2p = false } = {}){
  const q = new URLSearchParams(search), params = new URLSearchParams({ room: code, role: 'p2' });
  if (q.get('lan') === '1') params.set('lan', '1');
  if (p2p){ params.set('net', 'p2p'); if (q.get('peer')) params.set('peer', q.get('peer')); }
  return `${pathname || '/'}?${params}`;
}
export function startLabel(state){
  return state === 'ready' ? 'Gioca ›' : state === 'joined' ? 'Aspetto che il Player 2 sia pronto…' : 'In attesa del Player 2…';
}

// Stato visto dal Player 2:
//   'connecting' · 'lobby' (collegato, l'host prepara) · 'playing' · 'lost' (host senza notizie) · 'closed' (l'host ha
//   chiuso la stanza) · 'invalid' (codice inesistente)
export function guestState({ linked = false, invalid = false, closed = false, hostLobby = false, lastSnapshotAgeMs = null, everLinked = false } = {}){
  if (invalid) return 'invalid';
  if (closed) return 'closed';
  if (!linked) return everLinked ? 'lost' : 'connecting';
  if (lastSnapshotAgeMs != null && lastSnapshotAgeMs > VERSUS.lostMs) return 'lost';
  return hostLobby ? 'lobby' : 'playing';
}
// phone: con il telefono ancora da collegare o calibrare (il pulsante porta al QR e poi al campo d'allenamento)
export function guestText(state, { ready = false, phone = false, hostName = 'Player 1' } = {}){
  switch (state){
    case 'invalid': return 'Questo link non porta a nessuna stanza: chiedi a chi ti ha invitato un link nuovo.';
    case 'closed': return `${hostName} ha chiuso la stanza. Chiedi un nuovo link per giocare ancora.`;
    case 'lost': return `Collegamento con ${hostName} perso: riprovo da solo. Se non torna, chiedi un nuovo link.`;
    case 'lobby': return ready ? `Sei pronto ✓ ${hostName} avvia la partita.` : phone ? 'Collegato ✓ Collega il telefono: lo calibri in campo con il lanciapalle, poi sei pronto.' : 'Collegato ✓ Scegli la racchetta e premi «Sono pronto».';
    case 'playing': return 'Partita in corso.';
    default: return `Mi collego alla stanza di ${hostName}…`;
  }
}

// Riga di stato del pannello del Player 2: lo stato della sfida o, nella sfida senza server non ancora collegata,
// perché (rete che blocca il collegamento diretto, host muto, stanza occupata, server della segnalazione). Prima una
// seconda riga «Mi collego all’host…» sotto la prima, e nessuna spiegazione. net: { mode, status, error }
export function guestLine(state, { ready = false, phone = false, hostName = 'Player 1', net = null } = {}){
  if (net?.mode === 'guest' && (state === 'connecting' || state === 'lost') && net.error) return { state: 'error', text: p2pStatusText('guest', net.status, net.error) };
  return { state, text: guestText(state, { ready, phone, hostName }) };
}

// Presenza dell'avversario durante la partita (host): quanto manca all'avviso di uscita
export function absentFor(lastSeenMs, now){ return Number.isFinite(lastSeenMs) && lastSeenMs > 0 ? Math.max(0, now - lastSeenMs) : Infinity; }

// Contatori del relay (snapshot e colpi): se il relay riparte (epoca diversa) si ricomincia da capo; prima il P2
// scartava tutti gli snapshot finché il nuovo contatore non superava il vecchio.
export function seqGate(state, { epoch = null, seq }){
  const s = state || { epoch: null, last: 0 };
  if (epoch != null && epoch !== s.epoch){ s.epoch = epoch; s.last = 0; }
  if (typeof seq !== 'number' || seq <= s.last) return { ok: false, state: s };
  s.last = seq;
  return { ok: true, state: s };
}

// Colpi del P2 arrivati dall'ultima lettura (prima solo l'ultimo: due eventi ravvicinati perdevano il primo)
export function newSwings(history = [], last = 0, fallback = null){
  const list = (Array.isArray(history) ? history : []).filter(s => s && typeof s.seq === 'number' && s.seq > last).sort((a, b) => a.seq - b.seq);
  if (!list.length && fallback && typeof fallback.seq === 'number' && fallback.seq > last) list.push(fallback);
  return list;
}

/* ---------- età dei colpi del P2 sull'host (analisi del 30/10: «prima misurare, poi proteggere») ---------- */
// Prima il viaggio computer del P2 → host non era misurato e l'host giocava ogni colpo del P2 letto dal relay, per
// quanto vecchio: un colpo o un lancio arrivato 2–3 s dopo (canale fermo e poi ripartito) poteva far partire il servizio
// del P2 o essere giocato come nuovo. Ora il computer del P2 allinea il suo orologio a quello del relay (campo now di
// /api/match/state, motion_controls.js) e manda con il colpo sentAtHost: l'ora del relay stimata all'invio. Il relay
// è nel browser dell'host (sfida senza server) o nel server LAN: l'età si misura sul suo orologio.
// Come PHONE_STALE_S (natpf_phone_racket.js) per il tratto telefono → computer: un colpo più vecchio di così non si gioca
export const P2_STALE_MS = 600;
// Istante del colpo sull'orologio del relay: sentAtHost meno la latenza dal picco sul telefono all'arrivo sul computer
// del P2 (natpf.latency, s), se c'è; null se il P2 non ha mandato l'ora (P2 di prima, orologio non ancora stimato,
// telefono che scrive da solo nel relay in LAN)
export function p2SwingHitAt(swing){
  const sent = swing?.sentAtHost;
  if (typeof sent !== 'number' || !Number.isFinite(sent)) return null;
  const lat = swing.natpf?.latency;
  return typeof lat === 'number' && Number.isFinite(lat) ? sent - lat*1000 : sent;
}
// Età del colpo (ms dal picco, o dall'invio se manca la latenza) a nowMs (orologio del relay); null senza i dati:
// allora il colpo si gioca come prima
export function p2SwingAgeMs(swing, nowMs){
  const hit = p2SwingHitAt(swing);
  return hit == null || typeof nowMs !== 'number' || !Number.isFinite(nowMs) ? null : nowMs - hit;
}
export const p2SwingStale = (ageMs, maxMs = P2_STALE_MS) => ageMs != null && ageMs > maxMs;

/* ---------- partita ferma per tutti e due quando uno non può giocare (diagnosi del 30/10) ---------- */
// Prima l'host vedeva solo il computer del P2: con il telefono del P2 scollegato, la pagina del telefono nascosta o i
// sensori fermi la partita andava avanti e il P2 non poteva colpire (il controllo del telefono escludeva il P2). Ora il
// computer del P2 dice all'host perché non può giocare (hold nella lettura dello stato) e l'host ferma la partita per
// tutti e due, con lo stesso conto alla rovescia e il punto rigiocato del telefono del P1 (natpf_phone_watch.js).

// Motivi detti subito (li sa il dispositivo stesso); gli altri devono durare HOLD_GRACE_MS (un ricollegamento lampo non
// ferma la partita)
export const HOLD_GRACE_MS = 300;
const HOLD_NOW = new Set(['pagina nascosta', 'computer nascosto']);
// Lato P2: perché non può giocare adesso. playing: partita in corso sul P2; hidden: finestra del gioco nascosta sul suo
// computer; health: salute del telefono (phoneHealthOf) se gioca con il telefono, altrimenti null
export function p2HoldWhy({ playing = false, hidden = false, health = null } = {}){
  if (!playing) return null;
  if (hidden) return 'computer nascosto';
  return health && !health.ok ? health.why || 'scollegato' : null;
}
// Il motivo si dice all'host dopo HOLD_GRACE_MS (subito se il dispositivo lo sa da sé); null appena torna tutto a posto
export function createHoldReporter({ graceMs = HOLD_GRACE_MS } = {}){
  let since = null, cur = null;
  return {
    get why(){ return cur; },
    update(why, now = 0){
      if (!why){ since = null; cur = null; return null; }
      if (cur && why !== cur) cur = why;
      if (cur) return cur;
      if (since == null) since = now;
      if (HOLD_NOW.has(why) || now - since >= graceMs){ cur = why; since = null; }
      return cur;
    },
  };
}
// Lato host: l'avversario può giocare? absentMs: da quanto il computer del P2 non si sente; hold: motivo detto dal P2;
// hostHidden: la finestra dell'host è nascosta (il motore si ferma con lei)
export function opponentHealth({ absentMs = 0, hold = null, hostHidden = false, lostMs = VERSUS.lostMs } = {}){
  if (hostHidden) return { ok: false, why: 'host nascosto' };
  if (absentMs > lostMs) return { ok: false, why: 'avversario' };
  if (hold) return { ok: false, why: String(hold) };
  return { ok: true, why: null };
}
// Testo del riquadro di attesa sull'host
export function hostHoldText(why, { p2Name = 'Player 2' } = {}){
  const resume = 'La partita è ferma per tutti e due, il punteggio resta. Riprende da sola con un breve conto alla rovescia; se lo scambio era in corso, il punto si rigioca.';
  switch (why){
    case 'avversario': return { title: `${p2Name} si è scollegato`, text: `${resume} Sul suo computer può premere «Riconnetti».` };
    case 'host nascosto': return { title: 'Partita in pausa', text: `Hai messo il gioco in secondo piano. ${resume}` };
    case 'computer nascosto': return { title: `${p2Name} ha messo il gioco in secondo piano`, text: resume };
    case 'scollegato': return { title: `Il telefono di ${p2Name} è scollegato`, text: resume };
    case 'non pronto': return { title: `Il telefono di ${p2Name} non è pronto`, text: `Sta finendo la calibrazione. ${resume}` };
    case 'pagina nascosta': return { title: `Il telefono di ${p2Name} ha lo schermo spento`, text: `O un’altra app aperta. ${resume}` };
    case 'sensori fermi': return { title: `Il telefono di ${p2Name} non manda il movimento`, text: resume };
    default: return { title: `${p2Name} non può giocare`, text: resume };
  }
}
// Cosa vede il P2 con la partita ferma. hold (dallo snapshot dell'host): { who: 'p2' | 'host', why, left } — who 'p2':
// il motivo è suo (il telefono: lo dice holdText del telefono); left: secondi alla ripresa
export function guestHoldNotice(hold = {}, { hostName = 'Player 1', phoneText = null } = {}){
  const h = hold || {};
  if (Number.isFinite(h.left)) return { title: 'Si riprende', text: `Tra ${h.left}…` };
  if (h.who === 'p2'){
    if (h.why === 'avversario') return { title: 'Collegamento con l’host interrotto', text: `${hostName} non riceve più il tuo computer: la partita è ferma. Premi «Riconnetti» se non torna da solo.` };
    if (h.why === 'computer nascosto') return { title: 'Partita in pausa', text: 'Torna alla finestra del gioco: la partita riprende con il conto alla rovescia.' };
    return { title: 'Il tuo telefono è in pausa', text: phoneText || 'Il telefono non è utilizzabile: guarda il telefono.', phone: true };
  }
  if (h.why === 'host nascosto') return { title: 'Partita in pausa', text: `${hostName} ha messo il gioco in secondo piano: riprende quando torna.` };
  if (h.why === 'telefono') return { title: 'Partita in pausa', text: `Il telefono di ${hostName} è in pausa: riprende quando torna pronto.` };
  return { title: 'Partita in pausa', text: `${hostName} ha messo in pausa la partita.` };
}

/* ---------- punteggio salvato dall'host (ripresa dopo un ricaricamento) ---------- */
// Prima, se la pagina dell'host si ricaricava a partita in corso, la stanza tornava (stesso codice, il P2 si ricollega)
// ma la partita ripartiva da 0-0. Ora l'host salva il punteggio nella scheda (sessionStorage) a ogni cambio; la prossima
// partita nella stessa stanza, con la stessa durata e da 0-0, riparte da lì. Si cancella a fine partita, tornando al
// menu o lasciando la sfida: vale solo per il ricaricamento.
export const CHECKPOINT_KEY = 'natpf.versus.checkpoint';
export const CHECKPOINT_MAX_MS = 30 * 60e3;
const SCORE_KEYS = ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames', 'server', 'deuceSide'];
export function makeCheckpoint({ roomId, fmt = null, gamesToWin = 1, score = {} }, now = Date.now()){
  return { roomId, fmt, gamesToWin, at: now, score: Object.fromEntries(SCORE_KEYS.map(k => [k, score[k]])) };
}
const zero = s => !s.playerPoints && !s.opponentPoints && !s.playerGames && !s.opponentGames;
// il punteggio da riprendere per questa partita, o null
export function checkpointFor(cp, { roomId, fmt = null, gamesToWin = 1, score = {} }, now = Date.now()){
  if (!cp || typeof cp !== 'object' || !cp.score || cp.roomId !== roomId || cp.gamesToWin !== gamesToWin || (cp.fmt || null) !== (fmt || null)) return null;
  if (!(now - cp.at >= 0 && now - cp.at <= CHECKPOINT_MAX_MS) || zero(cp.score) || !zero(score)) return null;
  const s = cp.score;
  if (![s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames].every(n => Number.isInteger(n) && n >= 0 && n < 50)) return null;
  if (s.playerGames >= gamesToWin || s.opponentGames >= gamesToWin) return null;
  return { ...s, server: s.server === 'opponent' ? 'opponent' : 'player', deuceSide: s.deuceSide !== false };
}

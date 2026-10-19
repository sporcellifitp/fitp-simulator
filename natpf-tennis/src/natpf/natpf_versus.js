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

// Righe della lobby dell'host: cosa è fatto, cosa si sta aspettando e cosa fare
export function hostLobbyLines(state, { roomId = '', p2Name = 'Player 2' } = {}){
  return [
    { id: 'room', state: roomId ? 'ok' : 'on', text: roomId ? `Stanza creata · codice ${roomId}` : 'Creo la stanza…' },
    { id: 'joined', state: state === 'waiting' ? 'on' : 'ok', text: state === 'waiting' ? `Manda il link a ${p2Name}: lo apre sul suo computer` : `${p2Name} è entrato nella stanza` },
    { id: 'ready', state: state === 'ready' ? 'ok' : state === 'joined' ? 'on' : '', text: state === 'ready' ? `${p2Name} è pronto` : `${p2Name} sceglie la racchetta e preme «Sono pronto»` },
  ];
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
export function guestText(state, { ready = false, hostName = 'Player 1' } = {}){
  switch (state){
    case 'invalid': return 'Questo link non porta a nessuna stanza: chiedi a chi ti ha invitato un link nuovo.';
    case 'closed': return `${hostName} ha chiuso la stanza. Chiedi un nuovo link per giocare ancora.`;
    case 'lost': return `Collegamento con ${hostName} perso: riprovo da solo. Se non torna, chiedi un nuovo link.`;
    case 'lobby': return ready ? `Sei pronto ✓ ${hostName} avvia la partita.` : 'Collegato ✓ Scegli racchetta e visuale, poi premi «Sono pronto».';
    case 'playing': return 'Partita in corso.';
    default: return `Mi collego alla stanza di ${hostName}…`;
  }
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

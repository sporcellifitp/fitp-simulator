// ── contratto della stanza (Higgsfield): sei funzioni pure ──────────────────
// Il telefono di chi difende decide l'esito di ogni colpo (punto, fallo) o risponde con un colpo;
// il server controlla solo che lo faccia il giocatore giusto e tiene il punteggio.

export const meta = { game: 'SuperTennis Arena', minPlayers: 2, maxPlayers: 2 };

const KINDS = ['serve', 'drive', 'volley', 'smash'];
const SPINS = ['flat', 'topspin', 'slice', 'drop', 'lob'];
const REASONS = ['out', 'net', 'winner', 'ace', 'miss'];

export function setup(players) {
  return { players: players.slice(0, 2), names: ['', ''], score: newScore('breve', 0), phase: 'serve', turn: 0, shot: null, shotSeq: 0, pointSeq: 0, lastPoint: null, faults: 0 };
}

function num(x, lim) { return typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= lim; }
function vec(v, lims) { return Array.isArray(v) && v.length === 3 && v.every((x, i) => num(x, lims[i])); }

export function validateAction(state, playerId, a) {
  const seat = state.players.indexOf(playerId);
  if (seat < 0) return { ok: false, error: 'non sei in campo' };
  if (!a || typeof a !== 'object') return { ok: false, error: 'azione non valida' };
  if (a.type === 'hello') return typeof a.name === 'string' && a.name.length <= 14 ? { ok: true } : { ok: false, error: 'nome non valido' };
  if (a.type === 'config') {
    if (seat !== 0 || state.pointSeq > 0 || state.shotSeq > 0) return { ok: false, error: 'partita già iniziata' };
    return FORMATS[a.format] ? { ok: true } : { ok: false, error: 'formato sconosciuto' };
  }
  if (state.score.over) return { ok: false, error: 'partita finita' };
  if (a.type === 'shot') {
    const expected = state.phase === 'serve' ? currentServer(state.score) : state.turn;
    if (seat !== expected) return { ok: false, error: 'non tocca a te' };
    if (state.phase === 'serve' && a.kind !== 'serve') return { ok: false, error: 'serve prima' };
    if (!vec(a.p, [12, 4, 20]) || !vec(a.v, [80, 40, 80]) || !num(a.spin, 3)) return { ok: false, error: 'colpo non valido' };
    if (!KINDS.includes(a.kind) || !SPINS.includes(a.spinKind) || (a.side !== 1 && a.side !== -1)) return { ok: false, error: 'colpo non valido' };
    return { ok: true };
  }
  if (a.type === 'point' || a.type === 'fault') {
    if (state.phase !== 'rally' || seat !== state.turn) return { ok: false, error: 'decide chi difende' };
    if (a.type === 'fault') return state.shot && state.shot.kind === 'serve' ? { ok: true } : { ok: false, error: 'non è un servizio' };
    if (a.winner !== 0 && a.winner !== 1) return { ok: false, error: 'vincitore non valido' };
    if (!REASONS.includes(a.reason)) return { ok: false, error: 'motivo non valido' };
    return { ok: true };
  }
  return { ok: false, error: 'azione sconosciuta' };
}

export function applyAction(state, playerId, a) {
  const seat = state.players.indexOf(playerId);
  const s = { ...state };
  if (a.type === 'hello') { s.names = state.names.slice(); s.names[seat] = a.name; return s; }
  if (a.type === 'config') { s.score = newScore(a.format, 0); return s; }
  if (a.type === 'shot') {
    s.shotSeq = state.shotSeq + 1;
    s.shot = { seq: s.shotSeq, by: seat, p: a.p, v: a.v, spin: a.spin, kind: a.kind, spinKind: a.spinKind, side: a.side };
    s.turn = seat === 0 ? 1 : 0;
    s.phase = 'rally';
    return s;
  }
  if (a.type === 'fault') {
    s.pointSeq = state.pointSeq + 1;
    s.phase = 'serve';
    if (state.faults >= 1) {
      s.score = pointWon(state.score, seat);
      s.faults = 0;
      s.lastPoint = { winner: seat, reason: 'double' };
    } else {
      s.faults = 1;
      s.lastPoint = { winner: null, reason: a.reason === 'fault-net' ? 'fault-net' : 'fault' };
    }
    return s;
  }
  // punto
  s.score = pointWon(state.score, a.winner);
  s.pointSeq = state.pointSeq + 1;
  s.faults = 0;
  s.phase = 'serve';
  s.lastPoint = { winner: a.winner, reason: a.reason };
  return s;
}

export function isGameOver(state) {
  if (!state.score.over) return { over: false };
  return { over: true, winner: state.players[state.score.winner] ?? null };
}

export function viewFor(state, playerId) {
  return { ...state, seat: state.players.indexOf(playerId) };
}

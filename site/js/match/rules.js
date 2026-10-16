// Regole e punteggio di tennis e padel, senza Three.js.
// Squadra 0 gioca sul lato z > 0, squadra 1 sul lato z < 0.

/* ---------- punteggio: 15-30-40, vantaggi (o punto d'oro), game, partita ---------- */
// set: true → si vince il set con due game di scarto e sul N pari si gioca il tie-break a 7 punti (regola dei set corti
// ITF: set a 4 game, tie-break sul 4-4). Senza set vince chi arriva per primo a gamesToWin (come nel mondo).
export function newScore({ gamesToWin = 3, goldenPoint = false, firstServer = 0, set = false } = {}){
  return { points: [0, 0], games: [0, 0], gamesToWin, goldenPoint, set, tiebreak: false, tbFirst: null, server: firstServer, winner: null, history: [] };
}
const LABELS = ['0', '15', '30', '40'];
export function pointLabels(sc){
  const [a, b] = sc.points;
  if (sc.tiebreak) return [String(a), String(b)];
  if (a >= 3 && b >= 3){
    if (a === b) return ['40', '40'];
    return a > b ? ['V', '40'] : ['40', 'V'];
  }
  return [LABELS[Math.min(a, 3)], LABELS[Math.min(b, 3)]];
}
export function isDeuce(sc){ return sc.points[0] >= 3 && sc.points[0] === sc.points[1]; }
// numero del punto nel game: pari = servizio da destra, dispari = da sinistra
export const serveFromRight = sc => (sc.points[0] + sc.points[1]) % 2 === 0;

export function awardPoint(sc, team, reason = ''){
  if (sc.winner != null) return { game: false, match: false };
  sc.history.push({ team, reason });
  const o = 1 - team, p = sc.points;
  p[team]++;
  if (sc.tiebreak){
    // tie-break: a 7 con due punti di scarto; serve uno, poi due a testa
    if (p[team] >= 7 && p[team] - p[o] >= 2){
      sc.games[team]++; sc.points = [0, 0]; sc.tiebreak = false; sc.winner = team; sc.server = 1 - sc.tbFirst;
      return { game: true, match: true, tiebreak: true };
    }
    const n = p[0] + p[1];
    sc.server = Math.floor((n - 1)/2) % 2 === 0 ? 1 - sc.tbFirst : sc.tbFirst;
    return { game: false, match: false };
  }
  // si vince il game a 4 punti con due di scarto; col punto d'oro basta il punto sul 40 pari
  const game = p[team] >= 4 && (p[team] - p[o] >= 2 || (sc.goldenPoint && p[o] >= 3));
  if (!game) return { game: false, match: false };
  sc.games[team]++; sc.points = [0, 0]; sc.server = 1 - sc.server;
  const g = sc.games, N = sc.gamesToWin;
  const match = sc.set ? g[team] >= N && g[team] - g[o] >= 2 : g[team] >= N;
  if (match) sc.winner = team;
  else if (sc.set && g[0] === N && g[1] === N){ sc.tiebreak = true; sc.tbFirst = sc.server; }
  return { game: true, match, startTiebreak: sc.tiebreak };
}

/* ---------- scambio: chi può colpire, rimbalzi, falli ---------- */
// court: da physics.COURTS. Il servizio va nel riquadro in diagonale: la x ha segno opposto a quella del battitore.
export class Rally {
  constructor(court, { server, fromRight }){
    this.court = court; this.server = server; this.fromRight = fromRight;
    this.attempt = 1; this.reset();
  }
  reset(){
    this.state = 'serve';          // serve | live | over
    this.lastHitter = null;        // squadra che ha colpito per ultima
    this.bouncesSinceHit = 0;
    this.landedIn = false;         // il primo rimbalzo di questo colpo è valido
    this.wallBeforeBounce = false;
    this.isServe = true;
    this.hits = 0;
    this.result = null;
    this.netTouch = false;         // il servizio ha toccato il nastro: se poi entra nel riquadro è «let», si ripete
  }
  // x del battitore: la destra del lato 0 è x > 0, quella del lato 1 è x < 0
  serveX(){ const s = this.fromRight ? 1 : -1; return this.server === 0 ? s : -s; }
  serveBox(){ // riquadro in cui deve cadere il servizio
    const rz = this.server === 0 ? -1 : 1, sx = -Math.sign(this.serveX());
    return { x0: sx > 0 ? 0 : -this.court.halfW, x1: sx > 0 ? this.court.halfW : 0,
             z0: rz > 0 ? 0 : -this.court.serviceZ, z1: rz > 0 ? this.court.serviceZ : 0 };
  }
  canHit(team){
    if (this.state === 'over') return false;
    if (this.state === 'serve') return team === this.server;
    if (team === this.lastHitter) return false;                 // la palla deve passare dall'altra parte
    if (this.isServe && this.bouncesSinceHit === 0) return false; // il servizio si risponde dopo il rimbalzo
    return true;
  }
  hit(team){
    if (!this.canHit(team)){ return this.end(1 - team, 'doppio colpo'); }
    if (this.state === 'serve'){ this.state = 'live'; this.isServe = true; }
    else this.isServe = false;
    this.lastHitter = team; this.bouncesSinceHit = 0; this.landedIn = false; this.wallBeforeBounce = false; this.hits++;
    return null;
  }
  end(team, reason){
    if (this.state === 'over') return this.result;
    this.state = 'over'; this.result = { team, reason };
    return this.result;
  }
  // un servizio sbagliato: primo errore → seconda palla, secondo → doppio fallo
  replayServe(){ this.reset(); return { let: true }; }
  fault(reason){
    if (this.attempt === 1){ this.attempt = 2; this.reset(); return { fault: true, reason }; }
    return this.end(1 - this.server, 'doppio fallo');
  }
  inCourt(x, z){ return Math.abs(x) <= this.court.halfW + .02 && Math.abs(z) <= this.court.halfL + .02; }

  // eventi dalla fisica. Restituisce null, {fault} o {team, reason} a scambio chiuso.
  event(e){
    if (this.state !== 'live') return null;
    const hitter = this.lastHitter, other = 1 - hitter, sideOfE = e.side;
    if (e.type === 'net'){ if (this.isServe && this.bouncesSinceHit === 0) this.netTouch = true; return null; }
    if (e.type === 'bounce'){
      this.bouncesSinceHit++;
      if (this.bouncesSinceHit === 1){
        if (sideOfE === hitter) return this.isServe ? this.fault('rete') : this.end(other, 'rete');
        if (this.isServe){
          const b = this.serveBox();
          if (!(e.x >= b.x0 - .02 && e.x <= b.x1 + .02 && e.z >= b.z0 - .02 && e.z <= b.z1 + .02)) return this.fault('fuori');
          if (this.netTouch) return this.replayServe();
          this.landedIn = true;
          return null;
        }
        if (!this.inCourt(e.x, e.z)) return this.end(other, 'fuori');
        this.landedIn = true;
        return null;
      }
      // Conta il primo rimbalzo valido, non il lato del secondo: vento,
      // effetto o nastro possono riportare la palla oltre la rete senza risposta.
      return this.end(hitter, this.isServe ? 'ace' : 'vincente');
    }
    if (e.type === 'wall'){
      // padel: dopo il colpo la palla deve toccare prima il campo avversario, poi può prendere il vetro
      if (this.bouncesSinceHit === 0 && sideOfE === other) return this.isServe ? this.fault('vetro') : this.end(other, 'vetro');
      return null;
    }
    if (e.type === 'exit'){
      if (this.landedIn) return this.end(hitter, 'fuori dal recinto');
      return this.isServe ? this.fault('fuori') : this.end(other, 'fuori');
    }
    if (e.type === 'stop'){
      if (this.landedIn) return this.end(hitter, this.isServe ? 'ace' : 'vincente');
      return this.isServe ? this.fault('fuori') : this.end(other, 'fuori');
    }
    return null;
  }
  // Il limite spaziale/temporale chiude anche palle già rimbalzate dentro:
  // non sono errori di chi ha tirato, ma risposte mancate dall'avversario.
  lost(){
    if (this.state !== 'live') return null;
    if (this.landedIn) return this.end(this.lastHitter, this.isServe ? 'ace' : 'vincente');
    return this.isServe ? this.fault('fuori') : this.end(1 - this.lastHitter, 'fuori');
  }
}

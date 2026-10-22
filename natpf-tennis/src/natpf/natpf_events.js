// Sfide per gli eventi (fiere, stand): partite brevi con un punteggio, un nickname e la classifica del giorno.
//   Radar del servizio  tre servizi, vale il più veloce dentro il campo (km/h, li misura già il motore)
//   Bersagli 60"        un minuto di palle dal lanciapalle; angoli in fondo 3 punti, palla corta 5, dentro il campo 1
//   Scambio infinito    il lanciapalle accelera a ogni palla; quanti colpi di fila dentro il campo
//   Sfida il campione   punti contro la CPU esperta: vince chi arriva prima a 3 (vittoria +10)
// Le sfide con il lanciapalle si giocano nell'arena piena (pubblico e luci della partita) con l'avversario fuori dal
// campo; la palla parte come nel riscaldamento (natpf_training.js, _feed). Con lo smartphone non ancora calibrato prima
// si fa solo la calibrazione in campo (training.start({ calOnly: true })).
// Classifica del giorno: per sfida, sul computer dello stand (localStorage), azzerata ogni giorno o dal pannello
// dell'addetto; dei visitatori si chiede solo il nickname.
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const BOARD_KEY = 'natpf-tennis.classifica';
export const NICK_KEY = 'natpf-tennis.nickname';

export const CHALLENGES = Object.freeze([
  { id: 'radar', label: 'Radar del servizio', unit: 'km/h', short: 'Tre servizi: conta il più veloce dentro il campo.', facts: ['3 servizi', 'Vale il più veloce dentro il campo', '30 secondi'] },
  { id: 'targets', label: 'Bersagli 60"', unit: 'punti', short: 'Un minuto per colpire i bersagli nel campo avversario.', facts: ['60 secondi di palle', 'Angoli in fondo 3 punti, palla corta 5', 'Dentro il campo 1 punto'] },
  { id: 'rally', label: 'Scambio infinito', unit: 'colpi', short: 'Il lanciapalle accelera: quanti colpi di fila dentro il campo?', facts: ['Si ferma al primo errore', 'Ogni palla un po’ più veloce', 'Facile per tutti, lunga per i bravi'] },
  { id: 'champion', label: 'Sfida il campione', unit: 'punti', short: 'Contro la CPU esperta: vince chi arriva prima a 3 punti.', facts: ['Avversario esperto', 'Prima a 3 punti', 'Vittoria: 10 punti in più'] },
]);
export const challengeById = id => CHALLENGES.find(c => c.id === id) || null;

/* ---------- nickname ---------- */
// Parole che non si mostrano sul maxischermo di uno stand (elenco breve, minuscole, senza accenti)
const BLOCKED = ['cazzo', 'merda', 'stronz', 'vaffa', 'troia', 'puttan', 'coglion', 'minchia', 'fuck', 'shit', 'bitch', 'nazi', 'dux'];
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
export function validNickname(raw){
  const nick = String(raw || '').replace(/\s+/g, ' ').trim();
  if (nick.length < 2) return { ok: false, nick, why: 'Almeno 2 caratteri' };
  if (nick.length > 14) return { ok: false, nick, why: 'Al massimo 14 caratteri' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(nick)) return { ok: false, nick, why: 'Solo lettere, numeri, spazio, punto e trattino' };
  const f = fold(nick).replace(/[ ._-]/g, '');
  if (BLOCKED.some(w => f.includes(w))) return { ok: false, nick, why: 'Scegli un altro nickname' };
  return { ok: true, nick };
}

/* ---------- classifica del giorno (funzioni pure) ---------- */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function freshBoard(board, day = dayKey()){ return board && board.day === day && board.modes ? board : { day, modes: {} }; }
// aggiunge un risultato; a parità di punteggio è prima chi l'ha fatto prima. Restituisce la classifica e la posizione
export function addScore(board, mode, nick, score, { day = dayKey(), at = Date.now(), keep = 50 } = {}){
  const b = freshBoard(board, day), list = [...(b.modes[mode] || []), { nick, score: Math.round(score), at }];
  list.sort((x, y) => y.score - x.score || x.at - y.at);
  const rank = list.findIndex(e => e.at === at && e.nick === nick) + 1;
  return { board: { ...b, modes: { ...b.modes, [mode]: list.slice(0, keep) } }, rank, total: list.length };
}
export const topScores = (board, mode, n = 10, day = dayKey()) => (freshBoard(board, day).modes[mode] || []).slice(0, n);
export function boardCsv(board){
  const rows = [['giorno', 'sfida', 'posizione', 'nickname', 'punteggio', 'ora']];
  for (const c of CHALLENGES) (board?.modes?.[c.id] || []).forEach((e, i) => rows.push([board.day, c.label, i + 1, e.nick, e.score, new Date(e.at).toLocaleTimeString('it-IT')]));
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
}

/* ---------- punteggi delle sfide (funzioni pure) ---------- */
// bersagli nel campo avversario (P1 tira verso z < 0): angoli in fondo e palla corta al centro
export const TARGETS = Object.freeze([
  { id: 'left', x: -2.9, z: -9.6, r: 1.6, points: 3 },
  { id: 'right', x: 2.9, z: -9.6, r: 1.6, points: 3 },
  { id: 'short', x: 0, z: -3.2, r: 1.5, points: 5 },
]);
export function targetPoints(landing, inCourt){
  if (!landing || !inCourt) return { points: 0, target: null };
  for (const t of TARGETS) if (Math.hypot(landing.x - t.x, landing.z - t.z) <= t.r) return { points: t.points, target: t.id };
  return { points: 1, target: null };
}
// lanciapalle dello scambio infinito: ogni palla un po' più veloce (tempo di volo più breve), fino a un limite
export const rallyFlight = n => Math.max(.72, 1.2 - n*.035);
// sfida il campione: prima a 3 punti
export const CHAMPION_TARGET = 3;
export const championScore = (won, lost) => won*3 + (won >= CHAMPION_TARGET && won > lost ? 10 : 0);

/* ---------- sfide in campo ---------- */
export class NatpfEvents {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = null;                // sfida in corso: { id, ... }
    this.board = this._read();
    this.hud = $('natpf-challenge-hud');
    this.targets = null;
    // come il riscaldamento: durante la sfida i punti del motore non contano, decide la sfida
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => this.active ? this._ballOver(winner, why, award) : award(winner, why);
  }
  get nickname(){ try { return sessionStorage.getItem(NICK_KEY) || ''; } catch { return this._nick || ''; } }
  set nickname(v){ this._nick = v; try { v ? sessionStorage.setItem(NICK_KEY, v) : sessionStorage.removeItem(NICK_KEY); } catch {} }
  _read(){ try { return freshBoard(JSON.parse(localStorage.getItem(BOARD_KEY) || 'null')); } catch { return freshBoard(null); } }
  _write(){ try { localStorage.setItem(BOARD_KEY, JSON.stringify(this.board)); } catch {} }
  top(mode, n = 10){ this.board = freshBoard(this.board); return topScores(this.board, mode, n); }
  resetBoard(){ this.board = freshBoard(null); this._write(); }
  exportCsv(){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + boardCsv(freshBoard(this.board))], { type: 'text/csv;charset=utf-8' }));
    a.download = `classifica-natpf-${freshBoard(this.board).day}.csv`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  start(id){
    const c = challengeById(id), E = this.engine; if (!c) return;
    this.ui.training.active && this.ui.training.stop({ completed: false, silent: true });
    this.active = { id, c, score: 0, shots: 0, serves: 0, best: 0, streak: 0, time: id === 'targets' ? 60 : id === 'radar' ? 30 : 0, won: 0, lost: 0, wait: 1.2, over: false, last: '' };
    E.hud.hideTitleModal(); E.hud.hideCenterBanner();
    E.setMatchFormat?.('singles'); E.isMultiplayer = false;
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }); E._syncScoreboardHUD();
    if (id === 'champion'){
      // partita vera contro la CPU esperta; i punti li conta la sfida
      E._applyDifficultyTuning('pro'); E.matchConfig.gamesToWin = 1;
      E.startNewMatch({ showStartBanner: false });
    } else {
      E._applyDifficultyTuning('casual');
      this._opponentAway(true); this.ui.training._idle();
    }
    if (id === 'targets') this._showTargets(true);
    E.hud.showCenterBanner(c.label, { style: 'style-start', subText: this.nickname ? `Tocca a ${this.nickname}` : c.short, durationMs: 1500 });
    show(this.hud); this.paint();
  }
  _opponentAway(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
  }
  _showTargets(on){
    const E = this.engine;
    if (!this.targets){
      this.targets = TARGETS.map(t => {
        const g = new THREE.Group(); g.position.set(t.x, .012, t.z);
        const color = t.points >= 5 ? 0xff3d8b : 0xe8ff3a;
        const ring = new THREE.Mesh(new THREE.RingGeometry(t.r - .14, t.r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false }));
        const fill = new THREE.Mesh(new THREE.CircleGeometry(t.r - .14, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .18, depthWrite: false }));
        ring.rotation.x = fill.rotation.x = -Math.PI/2; g.add(ring, fill); g.renderOrder = 3; E.scene.add(g);
        return { t, g, fill, flash: 0 };
      });
    }
    for (const m of this.targets) m.g.visible = on;
  }
  // colpo del giocatore locale (dall'aptica, con l'esito dell'anello)
  onShot(q, e = {}){
    const A = this.active; if (!A || A.over || !q) return;
    const inCourt = q.label !== 'Fuori' && q.label !== 'Mancata';
    if (A.id === 'radar'){
      if (!/SERVE/i.test(e.grade || '')) return;
      const kmh = Number(e.speedKmh) || 0;
      A.serves++; A.last = inCourt ? `${kmh} km/h` : `Fuori (${kmh} km/h)`;
      if (inCourt && kmh > A.best){ A.best = kmh; A.score = kmh; }
    } else if (A.id === 'targets'){
      const r = targetPoints(this.engine.ball.targetLanding, inCourt);
      A.score += r.points; A.shots++; A.last = r.target ? `Bersaglio! +${r.points}` : r.points ? '+1' : 'Fuori';
      const m = this.targets?.find(x => x.t.id === r.target); if (m) m.flash = .8;
    } else if (A.id === 'rally'){
      if (inCourt){ A.streak++; A.score = A.streak; A.last = `${A.streak} di fila`; } else { A.last = 'Fuori'; A.missed = true; }
    }
    this.paint();
  }
  _ballOver(winner, why, award){
    const A = this.active, E = this.engine;
    if (A.id === 'champion'){
      // punto vero: lo conta la sfida, il motore continua come in partita (servizio successivo)
      if (winner === 'player') A.won++; else A.lost++;
      A.score = championScore(A.won, A.lost); A.last = winner === 'player' ? 'Punto tuo!' : 'Punto della CPU';
      if (A.won >= CHAMPION_TARGET || A.lost >= CHAMPION_TARGET){ this.finish(); return; }
      award(winner, why); this.paint(); return;
    }
    // lanciapalle: palla finita; nello scambio infinito una palla non presa ferma la serie
    if (A.id === 'rally' && winner !== 'player' && E.ball.lastHitter === 'opponent'){ A.missed = true; A.last = 'Palla persa'; }
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (A.id === 'radar' && A.serves >= 3) return this.finish();
    if (A.id === 'rally' && A.missed) return this.finish();
    A.wait = .9; this.paint();
  }
  _next(){
    const A = this.active, E = this.engine, T = this.ui.training;
    if (A.id === 'radar'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    const side = Math.random() < .5 ? 'forehand' : 'backhand';
    T._feed(side);
    // scambio infinito: ogni palla un po' più veloce
    if (A.id === 'rally'){
      const b = E.ball, t = b.targetLanding.clone(), start = b.pos.clone();
      E._launchBallToTarget(start, t, rallyFlight(A.streak), { topspin: 12, sidespin: 0, allowNetFault: false });
      E._natpfPlanPlayer?.();                     // piano sulla traiettoria rilanciata (finestra d'impatto)
    }
  }
  tick(dt){
    const A = this.active; if (!A || A.over) return;
    const E = this.engine;
    if (A.id !== 'champion'){
      const o = E.opponent; if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
      if (E.phase === 'POINT_OVER') E.phaseTimer = 0;
      const ballLive = E.phase === 'RALLY' && E.ball.inPlay;
      if (A.wait > 0 && !ballLive && !(A.id === 'radar' && /SERVE/.test(E.phase))){ A.wait -= dt; if (A.wait <= 0) this._next(); }
    }
    if (A.time > 0 && (A.id === 'targets' || A.id === 'radar')){ A.time = Math.max(0, A.time - dt); if (A.time <= 0) return this.finish(); }
    for (const m of this.targets || []) if (m.flash > 0){ m.flash -= dt; m.fill.material.opacity = .18 + .6*Math.max(0, m.flash); }
    this.paint();
  }
  finish(){
    const A = this.active, E = this.engine; if (!A || A.over) return;
    A.over = true;
    const nick = this.nickname || 'Ospite';
    const r = addScore(this.board, A.id, nick, A.score); this.board = r.board; this._write();
    this.active = null; this._restore();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = true; E.userHasInteracted = false;
    E.hud.showTitleModal();
    this.ui.flow?.showResult({ id: A.id, label: A.c.label, unit: A.c.unit, score: A.score, rank: r.rank, total: r.total, nick, won: A.won, lost: A.lost });
  }
  // interrotta dalla pausa («Torna al menu»): nessun risultato, ma il motore torna com'era (prima dopo un «Campione»
  // interrotto restavano la CPU esperta, il game secco e il lanciapalle fermo)
  abort(){
    if (!this.active) return;
    this.active.over = true; this.active = null; this._restore();
  }
  _restore(){
    const E = this.engine;
    show(this.hud, false); this._showTargets(false); this._opponentAway(false);
    E.natpfTimeScale = 1; E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    // la CPU scelta nel menu (anche Leggenda: prima tornava casual); il 1v1 qui non c'è, le sfide sono contro la CPU
    E._applyDifficultyTuning(['pro', 'leggenda'].includes(E.hud.selectedDifficulty) ? E.hud.selectedDifficulty : 'casual');
    if (Number.isFinite(E.hud.selectedGamesToWin)) E.matchConfig.gamesToWin = E.hud.selectedGamesToWin;
  }
  paint(){
    const A = this.active; if (!A || !this.hud) return;
    const time = A.time > 0 ? `<span class="ch-time">${Math.ceil(A.time)}"</span>` : '';
    const main = A.id === 'radar' ? `${A.best || 0}<small>km/h</small>` : A.id === 'champion' ? `${A.won}<small>–</small>${A.lost}` : `${A.score}<small>${A.c.unit}</small>`;
    const sub = A.id === 'radar' ? `Servizio ${Math.min(3, A.serves + 1)} di 3` : A.id === 'champion' ? 'Prima a 3 punti' : A.id === 'rally' ? 'Colpi di fila dentro il campo' : 'Angoli 3 · palla corta 5 · dentro 1';
    const html = `<span class="ch-kicker">${A.c.label}${this.nickname ? ` · ${this.nickname}` : ''}</span><b class="ch-score">${main}</b>${time}<span class="ch-sub">${sub}</span>${A.last ? `<span class="ch-last">${A.last}</span>` : ''}`;
    // solo se cambia: paint gira a ogni fotogramma e prima ricostruiva il riquadro (una regione «aria-live») 60 volte al
    // secondo, mentre il contenuto cambia circa una volta al secondo
    if (html !== this.hudHtml){ this.hudHtml = html; this.hud.innerHTML = html; }
  }
}

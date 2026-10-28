// Minigiochi arcade (dal 28/10/2026) e sfide per gli eventi: partite brevi con punteggio, nickname, classifica del
// giorno, record personali, medaglie e livello. Regole e punteggi in natpf_arcade.js (funzioni pure), bersagli 3D in
// natpf_targets.js, lanciapalle in natpf_ball_machine.js. Minigiochi: Target Rush, Precision, Combo Challenge,
// Survival, Radar del servizio, Sfida il campione.
// Le sfide con il lanciapalle si giocano nell'arena piena (pubblico e luci della partita) con l'avversario fuori dal
// campo; la palla parte come nel riscaldamento (natpf_training.js, _feed). Con lo smartphone non ancora calibrato prima
// si fa solo la calibrazione in campo (training.start({ calOnly: true })).
// Classifica del giorno: per sfida, sul computer dello stand (localStorage), azzerata ogni giorno o dal pannello
// dell'addetto; dei visitatori si chiede solo il nickname.
import * as THREE from 'three';
import { MODES, modeById, recordGame, RECORDS_KEY, levelOf, comboMultiplier, rushLevel, rushTarget, PRECISION_ZONES, precisionPoints,
  COMBO_STEPS, comboChain, comboStepOk, comboStepPoints, comboChainBonus, SURVIVAL, survivalLevel, MEDAL_LABEL } from './natpf_arcade.js';
import { TargetField } from './natpf_targets.js';
import { feedForLevel } from './natpf_ball_machine.js';
import { trainingDirection } from './natpf_training.js';
import { viewport } from './natpf_screen.js';

const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const BOARD_KEY = 'natpf-tennis.classifica';
export const NICK_KEY = 'natpf-tennis.nickname';

// i minigiochi (natpf_arcade.MODES): stessa forma delle sfide di prima (id, label, unit, short, facts)
export const CHALLENGES = MODES;
export const challengeById = modeById;

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

/* ---------- sfida il campione (funzioni pure) ---------- */
// sfida il campione: prima a 3 punti
export const CHAMPION_TARGET = 3;
export const championScore = (won, lost) => won*3 + (won >= CHAMPION_TARGET && won > lost ? 10 : 0);

/* ---------- minigiochi in campo ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export class NatpfEvents {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = null;                // minigioco in corso
    this.board = this._read();
    this.records = this._readRecords();
    this.hud = $('natpf-challenge-hud');
    this.field = new TargetField(engine);
    // come il riscaldamento: durante il minigioco i punti del motore non contano, decide il minigioco
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => this.active ? this._ballOver(winner, why, award) : award(winner, why);
  }
  get nickname(){ try { return sessionStorage.getItem(NICK_KEY) || ''; } catch { return this._nick || ''; } }
  set nickname(v){ this._nick = v; try { v ? sessionStorage.setItem(NICK_KEY, v) : sessionStorage.removeItem(NICK_KEY); } catch {} }
  _read(){ try { return freshBoard(JSON.parse(localStorage.getItem(BOARD_KEY) || 'null')); } catch { return freshBoard(null); } }
  _write(){ try { localStorage.setItem(BOARD_KEY, JSON.stringify(this.board)); } catch {} }
  _readRecords(){ try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}') || {}; } catch { return {}; } }
  _writeRecords(){ try { localStorage.setItem(RECORDS_KEY, JSON.stringify(this.records)); } catch {} }
  top(mode, n = 10){ this.board = freshBoard(this.board); return topScores(this.board, mode, n); }
  record(mode){ return this.records[mode] || null; }
  get level(){ return levelOf(this.records.xp || 0); }
  resetBoard(){ this.board = freshBoard(null); this._write(); }
  exportCsv(){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + boardCsv(freshBoard(this.board))], { type: 'text/csv;charset=utf-8' }));
    a.download = `classifica-natpf-${freshBoard(this.board).day}.csv`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  get phone(){ return this.ui.controller === 'phone'; }
  start(id){
    const c = challengeById(id), E = this.engine; if (!c) return;
    this.ui.training.active && this.ui.training.stop({ completed: false, silent: true });
    this.active = { id, c, score: 0, shots: 0, serves: 0, best: 0, streak: 0, bestStreak: 0, hits: 0, time: c.time || 0, elapsed: 0,
      wait: 2.2, over: false, last: '', lastOk: true, won: 0, lost: 0, lives: SURVIVAL.lives, returned: 0, level: 0, ball: 0,
      chainLen: 2, chain: id === 'combo' ? comboChain(2, { phone: this.phone }) : null, chainIdx: 0, chains: 0, zoneIdx: 0, zonePts: [],
      resolved: true, tick: 0 };
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
      E.audioEngine?.setMusicContext?.('minigame');
    }
    this.field.clear();
    if (id === 'rush') for (let i = 0; i < 4; i++) this._spawnTarget();
    if (id === 'precision') this.field.zone(PRECISION_ZONES[0]);
    E.hud.showCenterBanner(c.label, { style: 'style-start', subText: this.nickname ? `Tocca a ${this.nickname}` : c.short, durationMs: 1800 });
    setTimeout(() => this.active?.id === id && E.audioEngine?.cue?.('go'), 500);
    show(this.hud); this.paint();
  }
  _opponentAway(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
    this.ui.machine?.show(on);
    // il tabellone della partita (0-0) non serve: decide il punteggio del minigioco
    if (typeof document !== 'undefined') document.body?.classList?.toggle('natpf-arcade', on);
  }
  _spawnTarget(){
    const A = this.active, lv = rushLevel(A?.elapsed || 0, A?.score || 0);
    this.field.add(rushTarget(lv, Math.random, this.field.alive.filter(t => !t.hit)));
  }
  // testo che sale dal punto dello schermo dove è successo (bersaglio, rimbalzo)
  popup(text, world, cls = ''){
    const E = this.engine; if (typeof document === 'undefined' || !E.camera || !world) return;
    let layer = $('natpf-popups');
    if (!layer){ layer = document.createElement('div'); layer.id = 'natpf-popups'; layer.className = 'natpf-popups'; document.body.appendChild(layer); }
    const v = world.clone().project(E.camera), { w, h } = viewport();
    if (v.z > 1) return;
    const el = document.createElement('div');
    el.className = `natpf-pop ${cls}`; el.textContent = text;
    el.style.left = `${((v.x + 1)/2*w).toFixed(0)}px`; el.style.top = `${((1 - v.y)/2*h).toFixed(0)}px`;
    layer.appendChild(el); setTimeout(() => el.remove?.(), 1100);
  }
  _say(text, ok = true){ const A = this.active; if (A){ A.last = text; A.lastOk = ok; } }
  // colpo del giocatore locale (dall'aptica, con l'esito previsto dell'anello)
  onShot(q, e = {}){
    const A = this.active, E = this.engine; if (!A || A.over || !q) return;
    const inCourt = q.label !== 'Fuori' && q.label !== 'Mancata' && q.label !== 'In rete', au = E.audioEngine;
    A.shots++; A.resolved = true;
    const landing = E.ball.targetLanding, at = landing ? new THREE.Vector3(landing.x, .3, landing.z) : null;
    if (A.id === 'radar'){
      if (!/SERVE/i.test(e.grade || '')) return;
      const kmh = Number(e.speedKmh) || 0;
      A.serves++; this._say(inCourt ? `${kmh} km/h` : `Fuori (${kmh} km/h)`, inCourt);
      if (inCourt && kmh > A.best){ A.best = kmh; A.score = kmh; this.popup(`${kmh} km/h`, at, 'big'); }
    } else if (A.id === 'rush'){
      A.ballOpen = true;                                     // la palla può ancora colpire un bersaglio
    } else if (A.id === 'precision'){
      const zone = PRECISION_ZONES[A.zoneIdx], pts = precisionPoints(landing, zone, inCourt);
      A.score += pts; A.zonePts.push(pts); A.ball++;
      this.field.markLanding(landing, pts >= 50);
      this._say(pts >= 90 ? `Centro! +${pts}` : pts ? `+${pts}` : inCourt ? 'Troppo lontano' : 'Fuori', pts >= 50);
      this.popup(pts ? `+${pts}` : '0', at, pts >= 90 ? 'gold' : pts >= 50 ? 'ok' : 'bad');
      au?.playArcade?.(pts ? 'target' : 'miss', { combo: Math.round(pts/20), bull: pts >= 90 });
      if (pts >= 90) au?.cue?.('perfect');
    } else if (A.id === 'combo'){
      const rec = E.natpfLastRacket, racket = rec && Math.abs(E.elapsedTime - rec.at) < .1 ? rec : null;
      const side = E.player.swingType === 'backhand' ? 'backhand' : 'forehand', lefty = this.ui.hand?.hand === 'left';
      const direction = trainingDirection({ x: landing?.x, hitX: racket?.hitX ?? E.ball.pos.x, contact: (side === 'backhand' ? -1 : 1)*(lefty ? -1 : 1) });
      const shot = racket?.out?.shot?.toLowerCase() || null, step = A.chain[A.chainIdx];
      if (comboStepOk(step, { side, shot, direction, inCourt })){
        const pts = comboStepPoints(A.chain.length); A.score += pts; A.chainIdx++; A.streak++;
        au?.playArcade?.('combo', { level: A.chainIdx });
        this.popup(`${COMBO_STEPS[step].label} ✓ +${pts}`, at, 'ok');
        if (A.chainIdx >= A.chain.length){
          const bonus = comboChainBonus(A.chain.length); A.score += bonus; A.chains++;
          this._say(`Catena completata! +${bonus}`); au?.cue?.(A.chain.length >= 4 ? 'superCombo' : 'combo');
          A.chainLen = Math.min(6, A.chainLen + 1); A.chain = comboChain(A.chainLen, { phone: this.phone }); A.chainIdx = 0;
        } else this._say(`Ora: ${COMBO_STEPS[A.chain[A.chainIdx]].label}`);
      } else {
        A.bestStreak = Math.max(A.bestStreak, A.streak); A.streak = 0;
        this._say(inCourt ? `Serviva: ${COMBO_STEPS[step].label}` : 'Fuori: catena da capo', false); A.chainIdx = 0;
        au?.playArcade?.('miss');
      }
    } else if (A.id === 'survival'){
      if (inCourt){
        A.returned++; A.score = A.returned;
        const lv = survivalLevel(A.returned);
        if (lv > A.level){ A.level = lv; au?.cue?.('level'); E.hud.showCenterBanner(`Livello ${lv + 1}`, { style: 'style-start', subText: 'Il lanciapalle accelera', durationMs: 1100 }); }
        this.popup(`${A.returned}`, at, 'ok');
      } else this._loseLife('Fuori');
    }
    this.paint();
  }
  _loseLife(why){
    const A = this.active; if (!A || A.id !== 'survival') return;
    A.lives = Math.max(0, A.lives - 1); this._say(`${why}: ${A.lives ? `${A.lives} ${A.lives === 1 ? 'vita' : 'vite'}` : 'game over'}`, false);
    this.engine.audioEngine?.playArcade?.('miss');
    if (A.lives === 1) this.engine.audioEngine?.cue?.('last');
  }
  _ballOver(winner, why, award){
    const A = this.active, E = this.engine;
    if (A.id === 'champion'){
      // punto vero: lo conta la sfida, il motore continua come in partita (servizio successivo)
      if (winner === 'player') A.won++; else A.lost++;
      A.score = championScore(A.won, A.lost); this._say(winner === 'player' ? 'Punto tuo!' : 'Punto della CPU', winner === 'player');
      if (A.won >= CHAMPION_TARGET || A.lost >= CHAMPION_TARGET){ this.finish(); return; }
      award(winner, why); this.paint(); return;
    }
    // palla del lanciapalle non presa
    if (!A.resolved && E.ball.lastHitter === 'opponent'){
      if (A.id === 'survival') this._loseLife('Palla persa');
      else if (A.id === 'combo'){ A.chainIdx = 0; A.streak = 0; this._say('Palla persa: catena da capo', false); }
      else if (A.id === 'precision'){ A.zonePts.push(0); A.ball++; this._say('Palla persa', false); }
      else if (A.id === 'rush'){ A.streak = 0; this._say('Palla persa', false); }
    }
    // Target Rush: palla colpita che non ha preso nessun bersaglio, la combo si azzera
    if (A.id === 'rush' && A.ballOpen){ A.ballOpen = false; if (A.streak) this._say('Mancato: combo azzerata', false); A.bestStreak = Math.max(A.bestStreak, A.streak); A.streak = 0; }
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (A.id === 'radar' && A.serves >= 3) return this.finish();
    if (A.id === 'survival' && A.lives <= 0) return this.finish();
    if (A.id === 'precision'){
      if (A.ball >= PRECISION_ZONES.length) return this.finish();
      A.zoneIdx = A.ball; this.field.zone(PRECISION_ZONES[A.zoneIdx]);
      if (A.zoneIdx === PRECISION_ZONES.length - 1) E.audioEngine?.cue?.('last');
    }
    A.wait = A.id === 'survival' ? Math.max(.55, .95 - A.level*.05) : .9; this.paint();
  }
  _next(){
    const A = this.active, E = this.engine, T = this.ui.training, M = this.ui.machine;
    if (A.id === 'radar'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    A.resolved = false; A.ballOpen = false;
    let side = Math.random() < .5 ? 'forehand' : 'backhand', profile = null;
    if (A.id === 'rush') profile = feedForLevel(rushLevel(A.elapsed, A.score));
    if (A.id === 'precision') profile = { id: 'rally', flight: 1.2, spin: 10 };
    if (A.id === 'combo'){ side = COMBO_STEPS[A.chain[A.chainIdx]].feed; profile = { id: 'rally', flight: 1.2, spin: 10 }; }
    if (A.id === 'survival'){ profile = feedForLevel(A.level/SURVIVAL.maxLevel); M?.moveTo((Math.random() - .5)*2*Math.min(3.4, 1 + A.level*.4)); }
    T._feed(side, { profile });
  }
  tick(dt){
    const A = this.active; if (!A || A.over) return;
    const E = this.engine;
    if (A.id !== 'champion'){
      const o = E.opponent; if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
      this.ui.machine?.tick(dt);
      if (E.phase === 'POINT_OVER') E.phaseTimer = 0;
      const ballLive = E.phase === 'RALLY' && E.ball.inPlay;
      if (A.wait > 0 && !ballLive && !(A.id === 'radar' && /SERVE/.test(E.phase))){ A.wait -= dt; if (A.wait <= 0) this._next(); }
    }
    A.elapsed += dt;
    if (A.time > 0){
      const before = Math.ceil(A.time);
      A.time = Math.max(0, A.time - dt);
      // ultimi 5 secondi: il timer batte
      if (Math.ceil(A.time) !== before && A.time <= 5 && A.time > 0) E.audioEngine?.playArcade?.('tick', { urgent: A.time <= 3 });
      if (A.time <= 0){ E.audioEngine?.cue?.('time'); return this.finish(); }
    }
    if (A.id === 'rush'){
      for (const h of this.field.tick(dt)){
        A.streak++; A.hits++; A.bestStreak = Math.max(A.bestStreak, A.streak); A.ballOpen = false;
        const mult = comboMultiplier(A.streak - 1), pts = h.points*mult*(h.target.gold ? 2 : 1);
        A.score += pts;
        if (h.target.gold){ A.time += 5; }
        this.popup(`+${pts}${mult > 1 ? ` ×${mult}` : ''}`, h.at, h.target.gold ? 'gold' : h.zone === 'centro' ? 'big' : 'ok');
        this._say(h.target.gold ? `Bersaglio d’oro! +${pts} · +5"` : h.zone === 'centro' ? `Centro! +${pts}` : `+${pts}`);
        E.audioEngine?.playArcade?.('target', { combo: A.streak, bull: h.zone === 'centro' });
        if ([3, 6, 9].includes(A.streak)) E.audioEngine?.cue?.(A.streak >= 6 ? 'superCombo' : 'combo');
        else if (h.zone === 'centro') E.audioEngine?.cue?.('bullseye');
        setTimeout(() => this.active === A && this._spawnTarget(), 650);
      }
      // a livello alto un bersaglio in più
      if (this.field.alive.length < (rushLevel(A.elapsed, A.score) > .5 ? 5 : 4) && !A.spawnWait){ A.spawnWait = true; setTimeout(() => { A.spawnWait = false; this.active === A && this._spawnTarget(); }, 900); }
    } else this.field.tick(dt);
    if ((A.tick += dt) > .1){ A.tick = 0; this.paint(); }
  }
  finish(){
    const A = this.active, E = this.engine; if (!A || A.over) return;
    A.over = true; A.bestStreak = Math.max(A.bestStreak, A.streak);
    const nick = this.nickname || 'Ospite';
    const r = addScore(this.board, A.id, nick, A.score); this.board = r.board; this._write();
    const rec = recordGame(this.records, A.id, A.score); this.records = rec.records; this._writeRecords();
    this.active = null; this._restore();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = true; E.userHasInteracted = false;
    E.hud.showTitleModal();
    const au = E.audioEngine;
    if (rec.medal){ au?.playArcade?.('medal', { tier: rec.medal }); setTimeout(() => au?.cue?.(rec.medal), 900); }
    if (rec.isRecord && rec.prevBest != null) setTimeout(() => au?.cue?.('record'), 2100);
    const stats = A.id === 'rush' ? [`${A.hits} bersagli`, `combo migliore ${A.bestStreak}`, `${A.shots} colpi`]
      : A.id === 'precision' ? [`${A.zonePts.filter(p => p >= 50).length} zone su ${PRECISION_ZONES.length}`, `migliore ${Math.max(0, ...A.zonePts)}`]
      : A.id === 'combo' ? [`${A.chains} catene complete`, `serie migliore ${A.bestStreak}`]
      : A.id === 'survival' ? [`livello ${A.level + 1}`, `${A.returned} palle rimandate`]
      : A.id === 'radar' ? [`${A.serves} servizi`] : [`${A.won}–${A.lost}`];
    this.ui.flow?.showResult({ id: A.id, label: A.c.label, unit: A.c.unit, score: A.score, rank: r.rank, total: r.total, nick, won: A.won, lost: A.lost,
      medal: rec.medal, isRecord: rec.isRecord, prevBest: rec.prevBest, best: rec.records[A.id].best, xp: rec.xp, level: levelOf(rec.records.xp), stats });
  }
  // interrotta dalla pausa («Torna al menu»): nessun risultato, ma il motore torna com'era
  abort(){
    if (!this.active) return;
    this.active.over = true; this.active = null; this._restore();
  }
  _restore(){
    const E = this.engine;
    if (E.audioEngine?.musicContext === 'minigame') E.audioEngine.musicContext = null;
    show(this.hud, false); this.field.clear(); this._opponentAway(false);
    E.natpfTimeScale = 1; E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    // la CPU scelta nel menu (anche Leggenda); il 1v1 qui non c'è, i minigiochi sono contro la CPU o il lanciapalle
    E._applyDifficultyTuning(['pro', 'leggenda'].includes(E.hud.selectedDifficulty) ? E.hud.selectedDifficulty : 'casual');
    if (Number.isFinite(E.hud.selectedGamesToWin)) E.matchConfig.gamesToWin = E.hud.selectedGamesToWin;
  }
  paint(){
    const A = this.active; if (!A || !this.hud) return;
    const time = A.time > 0 ? `<span class="ch-time ${A.time <= 10 ? 'urgent' : ''}">${Math.ceil(A.time)}"</span>` : '';
    const main = A.id === 'radar' ? `${A.best || 0}<small>km/h</small>` : A.id === 'champion' ? `${A.won}<small>–</small>${A.lost}` : `${A.score}<small>${A.c.unit}</small>`;
    let extra = '', sub = '';
    if (A.id === 'rush'){ const m = comboMultiplier(Math.max(0, A.streak - 1) + 1); extra = `<span class="ch-combo" data-on="${A.streak >= 3}">Combo ${A.streak} · ×${m}</span>`; sub = 'Centro 50 · anello 30 · bordo 10'; }
    if (A.id === 'precision'){ sub = `Palla ${Math.min(A.ball + 1, PRECISION_ZONES.length)} di ${PRECISION_ZONES.length} · ${PRECISION_ZONES[A.zoneIdx].label}`; }
    if (A.id === 'combo') extra = `<ol class="ch-chain">${A.chain.map((k, i) => `<li class="${i < A.chainIdx ? 'done' : i === A.chainIdx ? 'on' : ''}">${COMBO_STEPS[k].label}</li>`).join('')}</ol>`;
    if (A.id === 'survival'){ extra = `<span class="ch-lives" aria-label="${A.lives} vite">${'<i class="on"></i>'.repeat(A.lives)}${'<i></i>'.repeat(SURVIVAL.lives - A.lives)}</span>`; sub = `Livello ${A.level + 1} · prossimo a ${(A.level + 1)*SURVIVAL.perLevel}`; }
    if (A.id === 'radar') sub = `Servizio ${Math.min(3, A.serves + 1)} di 3`;
    if (A.id === 'champion') sub = 'Prima a 3 punti';
    const rec = this.records[A.id]?.best;
    const html = `<span class="ch-kicker">${A.c.label}${this.nickname ? ` · ${esc(this.nickname)}` : ''}</span><b class="ch-score">${main}</b>${time}${extra}${sub ? `<span class="ch-sub">${sub}</span>` : ''}${rec != null ? `<span class="ch-best">Record ${rec} ${A.c.unit}</span>` : ''}${A.last ? `<span class="ch-last" data-ok="${A.lastOk}">${A.last}</span>` : ''}`;
    // solo se cambia (regione «aria-live»)
    if (html !== this.hudHtml){ this.hudHtml = html; this.hud.innerHTML = html; }
  }
}

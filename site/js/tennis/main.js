// Tennis 1 contro 1: il ciclo del gioco. Collega scena (scene.js), partita (match/core.js: regole, fisica, IA, colpi),
// comandi (controls.js) e telefono (link.js). Stati: menu (dietro gira una partita dimostrativa) → pair → play ⇄ paused → end.
import { MatchCore } from '../match/core.js';
import { pointLabels } from '../match/rules.js';
import { createScene } from './scene.js';
import { createControls } from './controls.js';
import { createPhoneLink } from './link.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => (typeof s === 'string' ? $(s) : s).classList.toggle('hidden', !on);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d){ try { const v = localStorage.getItem('tennis.' + k); return v == null ? d : JSON.parse(v); } catch (e){ return d; } }, set(k, v){ try { localStorage.setItem('tennis.' + k, JSON.stringify(v)); } catch (e){} } };

const REASON = { fuori: 'Fuori', rete: 'Rete', vincente: 'Vincente', ace: 'Ace!', 'doppio fallo': 'Doppio fallo', 'doppio colpo': 'Doppio colpo', mancata: 'Palla mancata' };
const LOOKS = [{ shirt: 0x1f4fa3, shorts: 0xffffff, cap: 0xffffff }, { shirt: 0xd8342c, shorts: 0x1d2430, cap: 0xffffff, hair: 0x1d1d1f }];
const TIMING = { perfetto: 'Perfetto', anticipo: 'In anticipo', ritardo: 'In ritardo', steccata: 'Steccata', mancata: 'Mancata' };

const S = createScene($('#app'));
const controls = createControls(S.renderer.domElement, { pick: (x, y) => S.pick(x, y) });
let state = 'menu', core = null, demo = null, link = null, usePhone = false, stats = null, fmt = store.get('fmt', '4');
let lastT = performance.now(), flashT = 0, timingT = 0, endTimer = null;

/* ---------- partita ---------- */
function makeCore(human){
  const g = +fmt;
  return new MatchCore({
    sport: 'tennis', level: 'normale', gamesToWin: human ? g : 99, set: human ? g > 1 : false, firstServer: human ? (Math.random() < .5 ? 0 : 1) : null,
    teams: [[human ? { human: true, name: 'Tu', id: 'me' } : { name: 'Rossi', skill: .7 }], [{ name: 'Computer', id: 'cpu' }]],
  });
}
function startDemo(){ demo = makeCore(false); S.setPlayers(demo.players, LOOKS); }
function newMatch(){
  clearTimeout(endTimer);
  core = makeCore(true); demo = null;
  stats = { perfect: 0, contacts: 0, won: 0 };
  S.setPlayers(core.players, LOOKS);
  state = 'play'; controls.enabled = true;
  controls.phoneAuto = usePhone && $('#autoMove').checked;
  for (const id of ['#menu', '#pair', '#pause', '#end']) show(id, false);
  show('#hud', true); scoreboard(); hint(); phoneChip();
  S.follow(core.players[0], 0, true);
  phoneSend({ t: 'ph', ph: 'play' });
}
const human = () => core && core.players.find(p => p.human);

function scoreboard(){
  const sc = core.score, lab = pointLabels(sc), names = ['Tu', 'Computer'];
  const f = +fmt === 1 ? '1 game' : `Set a ${fmt}` + (sc.tiebreak ? ' · tie-break' : '');
  $('#score').innerHTML = [0, 1].map(t => `<div class="row ${sc.server === t ? 'srv' : ''}"><i></i><span>${names[t]}</span><b>${sc.games[t]}</b><em>${lab[t]}</em></div>`).join('') + `<small>${f}</small>`;
}
function flash(big, small = '', ms = 1300){ $('#flash b').textContent = big; $('#flash span').textContent = small; $('#flash').style.opacity = 1; flashT = ms/1000; }
function timing(label){ const el = $('#timing'); el.className = label; el.textContent = TIMING[label] || label; el.style.opacity = 1; timingT = 1.1; }
function hint(text){
  if (text){ $('#hint').textContent = text; return; }
  const h = human(); if (!h) return;
  const phone = usePhone && link && link.ready;
  if (core.phase === 'serve' && core.serverP === h){
    $('#hint').textContent = core.toss
      ? (phone ? 'Colpisci quando la palla scende' : 'Rilascia quando la palla scende')
      : (phone ? 'Al servizio: un movimento lancia la palla, il secondo colpisce' : 'Al servizio: premi per lanciare la palla, tieni premuto e rilascia quando scende');
  } else $('#hint').textContent = phone
    ? 'Colpisci quando la palla ti arriva: in anticipo va incrociata, in ritardo lungolinea'
    : 'WASD per muoverti · tieni premuto e rilascia per colpire · tasto destro: pallonetto';
}

function onEvent(e){
  const h = human(), mine = e.player === 'me';
  switch (e.type){
    case 'hit': sound(e.shot === 'smash' || e.shot === 'serve' ? 1.3 : 1); if (!mine && h) hint(); break;
    case 'bounce': S.mark(e.x, e.z); sound(.45, 'bounce'); break;
    case 'net': sound(.5, 'net'); if (e.tape) flash('Nastro!', '', 800); break;
    case 'toss': hint(); break;
    case 'tossCaught': hint('Palla ripresa: rilancia quando vuoi'); break;
    case 'serveReady': hint(); phoneSend({ t: 'ph', ph: 'serve' }); break;
    case 'contact':
      if (!mine) break;
      stats.contacts++; if (e.label === 'perfetto') stats.perfect++;
      timing(e.label); phoneSend({ t: 'ev', k: 'contact', label: e.label });
      break;
    case 'whiff': if (mine){ timing('mancata'); phoneSend({ t: 'ev', k: 'miss' }); } break;
    case 'let': flash('Let', 'Il servizio ha toccato il nastro: si ripete'); break;
    case 'fault':
      if (e.reason === 'fuori') S.lastMarkOut();
      flash('Fallo', e.second ? 'Seconda palla' : (REASON[e.reason] || e.reason));
      break;
    case 'point': {
      const won = e.team === h.team; if (won) stats.won++;
      if (e.reason === 'fuori') S.lastMarkOut();
      flash(won ? 'Punto tuo' : 'Punto del computer', REASON[e.reason] || e.reason);
      scoreboard(); hint(' ');
      phoneSend({ t: 'ev', k: 'point', mine: won, txt: REASON[e.reason] || e.reason, sc: pointLabels(core.score), g: core.score.games });
      break;
    }
    case 'game': if (!e.tiebreak) setTimeout(() => state === 'play' && flash(`Game ${e.team === h.team ? 'tuo' : 'del computer'}`, `${e.games[0]} – ${e.games[1]}`), 900); scoreboard(); break;
    case 'tiebreak': setTimeout(() => flash('Tie-break', 'a 7 punti, con due di scarto'), 1700); break;
    case 'match': endTimer = setTimeout(() => finish(e.winner === h.team), 1400); break;
  }
}
function finish(won){
  state = 'end'; controls.enabled = false; show('#hud', false);
  const g = core.score.games;
  $('#endTitle').textContent = won ? 'Vittoria!' : 'Sconfitta';
  $('#endScore').textContent = `${won ? 'Hai vinto' : 'Hai perso'} ${g[0]}–${g[1]}` + (+fmt > 1 ? ` (set a ${fmt})` : '') + '.';
  $('#endStats').innerHTML = [[stats.won, 'Punti vinti'], [core.stats.winners[0], 'Vincenti'], [stats.contacts ? Math.round(stats.perfect/stats.contacts*100) + '%' : '–', 'Colpi perfetti']]
    .map(([v, l]) => `<div><b>${esc(v)}</b><small>${l}</small></div>`).join('');
  show('#end', true);
  phoneSend({ t: 'ph', ph: 'over', won });
}

/* ---------- ciclo ---------- */
let frameT = 0;
function frame(now){
  const dt = Math.min(.1, (now - lastT)/1000); lastT = now; frameT = now;
  if (state === 'play'){
    const input = controls.read();
    const n = Math.max(1, Math.ceil(dt/(1/120)));               // passi piccoli: il giudizio del colpo resta preciso
    // dagli istanti degli eventi (orologio del browser) ai ritardi rispetto al primo passo di questo fotogramma
    const t1 = now/1000 - dt + dt/n;
    if (input.swing) input.swing.delay = input.swing.at - t1;
    if (input.toss) input.toss = { delay: Math.min(0, input.toss.at - t1) };
    for (let i = 0; i < n; i++){
      const ev = core.update(dt/n, i === 0 ? input : { move: input.move, auto: input.auto });
      for (const e of ev) onEvent(e);
    }
    if (core.phase === 'serve' && !core.toss && core.serverP.human && $('#hint').textContent.trim() === '') hint();
    S.sync(core, dt, now/1000); S.follow(human(), dt);
    // mirino e barra della potenza
    const a = controls.aim, live = core.phase === 'live' || core.phase === 'serve';
    S.aim.visible = !!a && live && !(usePhone && link && link.ready && !controls.charging);
    if (a) S.aim.position.set(a.x, .02, a.z);
    const pw = controls.charging; show('#power', pw > 0);
    if (pw > 0){ $('#power i').style.width = Math.round(pw*100) + '%'; }
  } else if (demo && (state === 'menu' || state === 'pair')){
    for (let i = 0; i < 2; i++) demo.update(dt/2);
    if (demo.phase === 'over') startDemo();
    S.sync(demo, dt, now/1000); S.follow(null, dt);
  }
  if (flashT > 0){ flashT -= dt; if (flashT <= 0) $('#flash').style.opacity = 0; }
  if (timingT > 0){ timingT -= dt; if (timingT <= 0) $('#timing').style.opacity = 0; }
  S.render();
  requestAnimationFrame(frame);
}
addEventListener('pointermove', e => { const p = $('#power'); p.style.left = (e.clientX + 18) + 'px'; p.style.top = (e.clientY + 14) + 'px'; });

/* ---------- suoni (sintetizzati: niente file da scaricare) ---------- */
let ac = null;
function sound(k = 1, kind = 'hit'){
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = kind === 'hit' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(kind === 'hit' ? 420 : kind === 'net' ? 140 : 190, t);
    o.frequency.exponentialRampToValueAtTime(kind === 'hit' ? 160 : 70, t + .08);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25*k, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .14);
  } catch (e){}
}

/* ---------- telefono ---------- */
function phoneSend(m){ if (link) link.send(m); }
function ensureLink(){
  if (link) return link;
  link = createPhoneLink();
  link.on('change', () => { paintPair(); phoneChip(); });
  link.on('swing', s => {
    if (state === 'pair'){ pairNote(`Colpo ricevuto: ${s.side === 'bh' ? 'rovescio' : 'dritto'}, potenza ${Math.round(s.power*100)}%`); return; }
    if (state === 'play') controls.phoneSwing(s);
  });
  link.on('toss', () => { if (state === 'play') controls.phoneToss(); });
  return link;
}
const PHONE_TXT = {
  sensors: 'Telefono collegato: tocca «Attiva i sensori» sul telefono',
  still: 'Calibrazione: tieni fermo il telefono',
  move: 'Calibrazione: tieni fermo il telefono',
  practice: 'Ora fai un dritto di prova',
  ready: 'Pronto: il telefono è la tua racchetta',
  tap: 'Senza sensori di movimento: il telefono funziona come pulsante',
  denied: 'Sensori negati sul telefono: lo usi come pulsante',
  nomotion: 'Il telefono non dà i sensori di movimento: lo usi come pulsante',
  insecure: 'Il telefono ha aperto la pagina senza https: i sensori non funzionano',
};
let qrTok = null, noteT = null, noteUntil = 0;
function paintPair(){
  if (!link) return;
  const L = link.L, st = $('#pairStatus');
  let txt = 'Preparo la connessione…', cls = '';
  if (L.state === 'waiting') txt = 'Inquadra il codice con la fotocamera del telefono';
  if (L.state === 'connected'){ txt = PHONE_TXT[L.phone] || 'Telefono collegato'; cls = link.ready ? 'ok' : ''; }
  if (L.state === 'lost'){ txt = 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo'; cls = 'bad'; }
  if (L.state === 'error'){ txt = `Connessione non disponibile (${L.error}). Puoi giocare con mouse e tastiera.`; cls = 'bad'; }
  st.className = cls; if (performance.now() > noteUntil) st.querySelector('span').textContent = txt;
  $('#pairGo').disabled = pairFrom !== 'pause' && !link.ready;
  $('#pairGo').textContent = pairFrom === 'pause' ? 'Torna alla partita' : 'Inizia la partita';
  show('#pairForget', link.connected);
  $('#pair h2').textContent = link.connected ? 'Telefono collegato' : 'Inquadra il codice';
  show('#pairWarn', !link.connected && !!$('#pairWarn').textContent);
  // QR: solo finché non c'è un telefono collegato; si rifà quando cambia il codice monouso
  const box = $('#qr');
  if (link.connected){ box.innerHTML = '<div style="font-size:64px">✓</div>'; qrTok = null; }
  else if ((L.state === 'waiting' || L.state === 'lost') && qrTok !== link.token && window.qrcode){
    const q = window.qrcode(0, 'M'); q.addData(link.url()); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); qrTok = link.token;
    box.dataset.url = link.url();
  } else if (L.state === 'starting' || L.state === 'error'){ box.innerHTML = ''; qrTok = null; }
}
// messaggio breve (colpo di prova ricevuto): resta 1,6 s anche se intanto arrivano aggiornamenti dal telefono
function pairNote(t){ $('#pairStatus span').textContent = t; noteUntil = performance.now() + 1600; clearTimeout(noteT); noteT = setTimeout(paintPair, 1650); }
function phoneChip(){
  const on = usePhone && link && state !== 'menu';
  show('#chip', !!on); if (!on) return;
  const L = link.L, c = $('#chip');
  let t = 'Telefono: in attesa', cls = '';
  if (link.ready){ t = 'Telefono pronto' + (L.rtt != null ? ` · ${L.rtt} ms` : ''); cls = 'ok'; }
  else if (L.state === 'connected') t = 'Telefono: ' + (PHONE_TXT[L.phone] || 'collegato').toLowerCase();
  else if (L.state === 'lost' || L.state === 'error'){ t = 'Telefono scollegato · mouse e tastiera attivi'; cls = 'bad'; }
  c.className = cls; c.querySelector('span').textContent = t;
  controls.phoneAuto = link.ready && $('#autoMove').checked;
}
let pairFrom = 'menu';
function openPair(from){
  pairFrom = from; usePhone = true;
  ensureLink().start();
  state = from === 'pause' ? 'paused' : 'pair';
  show('#menu', false); show('#pause', false); show('#pair', true);
  const w = $('#pairWarn'), local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  w.textContent = location.protocol !== 'https:' && !local ? 'Questa pagina non è in https: sul telefono i sensori di movimento non funzioneranno. Apri il gioco dall\'indirizzo pubblicato (https).'
    : local ? 'Il gioco è aperto da questo computer (localhost): il telefono non può raggiungerlo. Usa l\'indirizzo pubblicato in https.' : '';
  show(w, !!w.textContent);
  paintPair();
}

/* ---------- pulsanti ---------- */
for (const b of document.querySelectorAll('#fmt button')){
  b.classList.toggle('on', b.dataset.f === fmt);
  b.addEventListener('click', () => { fmt = b.dataset.f; store.set('fmt', fmt); for (const x of document.querySelectorAll('#fmt button')) x.classList.toggle('on', x === b); });
}
$('#playMouse').addEventListener('click', () => { usePhone = !!(link && link.ready); newMatch(); });
$('#playPhone').addEventListener('click', () => openPair('menu'));
$('#pairGo').addEventListener('click', () => { if (pairFrom === 'pause' && core){ show('#pair', false); resume(); } else newMatch(); });
$('#pairBack').addEventListener('click', () => { show('#pair', false); if (pairFrom === 'pause'){ show('#pause', true); state = 'paused'; } else { state = 'menu'; show('#menu', true); } });
$('#pairForget').addEventListener('click', () => { link && link.forget(); qrTok = null; paintPair(); });
$('#autoMove').addEventListener('change', phoneChip);
function pause(){ if (state !== 'play') return; state = 'paused'; controls.enabled = false; show('#pause', true); phoneSend({ t: 'ph', ph: 'pause' }); }
function resume(){ state = 'play'; controls.enabled = true; show('#pause', false); show('#hud', true); lastT = performance.now(); phoneChip(); hint(); phoneSend({ t: 'ph', ph: 'play' }); }
$('#pauseBtn').addEventListener('click', pause);
$('#resume').addEventListener('click', resume);
$('#pausePhone').addEventListener('click', () => openPair('pause'));
$('#restart').addEventListener('click', newMatch);
$('#again').addEventListener('click', newMatch);
const toMenu = () => { state = 'menu'; controls.enabled = false; core = null; for (const id of ['#hud', '#pause', '#end', '#pair']) show(id, false); show('#menu', true); startDemo(); phoneSend({ t: 'ph', ph: 'menu' }); };
$('#toMenu').addEventListener('click', toMenu);
$('#endMenu').addEventListener('click', toMenu);
addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyP'){ if (state === 'play') pause(); else if (state === 'paused' && !$('#pause').classList.contains('hidden')) resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

startDemo();
requestAnimationFrame(frame);
// aggancio per i test automatici
window.__tennis = { get frameT(){ return frameT; }, get core(){ return core; }, get state(){ return state; }, get link(){ return link; }, controls, newMatch, get fmt(){ return fmt; }, set fmt(v){ fmt = String(v); } };

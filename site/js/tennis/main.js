// «NATPF Simulator»: il gioco. Collega scena (scene.js), partita arcade (match/arcade.js), comandi (controls.js), telefono
// (link.js + calibrazione guidata) e partita tra amici (session.js + net.js).
// Modalità: cpu (contro il computer), host (chi invita: fa girare la partita), guest (chi riceve il link: vede lo stato
// dell'host e manda i suoi colpi). Schermate: menu → telefono (QR, impugnatura, prova, verifica, conferma)
// → partita o sala d'attesa → partita → fine.
import { createCalibrationPreview, SHOTS } from './calibration-preview.js';
import { createPresentationTimeline, readGuestInput, INPUT_TIME } from './input-time.js';
import { ArcadeMatch } from '../match/arcade.js';
import { pointLabels } from '../match/rules.js';
import { mulberry32 } from '../match/core.js';
import { createScene } from './scene.js';
import { createControls } from './controls.js';
import { createPhoneLink } from './link.js';
import { hostSession, joinSession } from './session.js';
import { encodeSnap, encodeEvents, createMirror } from './net.js';
import { parseInvite } from './pairing.js';
import { PLAN, QUICK_PLAN, GESTURE_PLAN, CAL } from './calibration.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => (typeof s === 'string' ? $(s) : s).classList.toggle('hidden', !on);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d){ try { const v = localStorage.getItem('natpf-simulator.' + k); return v == null ? d : JSON.parse(v); } catch (e){ return d; } }, set(k, v){ try { localStorage.setItem('natpf-simulator.' + k, JSON.stringify(v)); } catch (e){} } };
const SCREENS = ['#menu', '#pair', '#lobby', '#guest', '#mobile', '#net', '#pause', '#end'];
const pane = id => { for (const s of SCREENS) show(s, s === id); };
const isPhone = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width || 9999, innerWidth) < 600);

const REASON = { fuori: 'Fuori', rete: 'Rete', vincente: 'Vincente', ace: 'Ace!', 'doppio fallo': 'Doppio fallo', 'doppio colpo': 'Doppio colpo' };
const TIMING = { perfetto: 'PERFETTO!', buono: 'Bel colpo', anticipo: 'Colpo anticipato', ritardo: 'Colpo di recupero' };
const MISS = { presto: ['Palla ancora lontana', 'Aspetta che arrivi vicino alla racchetta'], tardi: ['Palla già passata', 'Prova a iniziare il gesto un po’ prima'], nessuno: ['Gesto non rilevato', 'Riprova con un gesto comodo; puoi ricalibrare dalla pausa'], portata: ['Fuori portata', 'La palla era troppo lontana o troppo alta'] };

const presented = createPresentationTimeline();
const S = createScene($('#app'));
let cameraMode = store.get('camera', 'third') === 'first' ? 'first' : 'third';
function selectCamera(value){
  cameraMode = value === 'first' ? 'first' : 'third'; store.set('camera', cameraMode);
  S.setCameraMode(cameraMode);
  for (const el of document.querySelectorAll('[data-camera-select]')) el.value = cameraMode;
}
for (const el of document.querySelectorAll('[data-camera-select]')) el.addEventListener('change', e => selectCamera(e.target.value));
selectCamera(cameraMode);
const calibrationPreview = createCalibrationPreview($('#calCanvas'));
const controls = createControls(S.renderer.domElement, { pick: (x, y) => S.pick(x, y) });
const A = {
  state: 'menu', mode: 'cpu', ctrl: 'phone', name: store.get('name', ''), fmt: store.get('fmt', '4'), level: store.get('level', 'facile'),
  core: null, demo: null, link: null, host: null, guest: null, mirror: null, myId: 'me', afterCtrl: null, netPause: false, stats: null,
};
let lastT = performance.now(), flashT = 0, timingT = 0, snapAcc = 0, inputQ = { sw: [], ts: [], mv: { x: 0, y: 0 }, auto: true }, lastMv = '', endTimer = null;

// Discard inputs made before pause/reconnection/new match. Core time does not
// advance while paused, so an old browser timestamp must never be remapped.
function resetInputTimeline(){
  const now = performance.now()/1000;
  presented.reset();
  inputQ = { sw: [], ts: [], mv: { x: 0, y: 0 }, auto: true };
  controls.read();
  A.inputSince = A.core ? A.core.t : 0;
  if (A.core) {
    for (const p of A.core.humans()) p.swings = [];
    presented.record(now, A.core.t);
  }
}

/* ---------- menu ---------- */
$('#name').value = A.name;
const setName = v => { A.name = String(v || '').trim().slice(0, 16); store.set('name', A.name); };
$('#name').addEventListener('input', e => setName(e.target.value));
function seg(id, key){
  for (const b of document.querySelectorAll(id + ' button')){
    b.classList.toggle('on', b.dataset.v === A[key]);
    b.addEventListener('click', () => { A[key] = b.dataset.v; store.set(key, A[key]); for (const x of document.querySelectorAll(id + ' button')) x.classList.toggle('on', x === b); });
  }
}
seg('#fmt', 'fmt'); seg('#lvl', 'level');
const myName = () => A.name || 'Giocatore';
$('#btnCpu').addEventListener('click', () => { A.mode = 'cpu'; chooseCtrl(() => startLocal()); });
$('#btnInvite').addEventListener('click', () => { A.mode = 'host'; openHost(); });

/* ---------- controller ---------- */
function chooseCtrl(next){ A.afterCtrl = next; A.ctrl = 'phone'; openPair(next); }
function back(){
  if (A.mode === 'guest'){ A.state = 'guest'; pane('#guest'); return; }
  if (A.mode === 'host' && A.host){ openLobby(); return; }
  toMenu();
}

/* ---------- telefono: collegamento e calibrazione guidata ---------- */
const STEPS = ['collega', 'impugna', 'prova', 'verifica', 'conferma'];
const PHONE_ERR = {
  denied: 'Sul telefono è stato negato l\'accesso ai sensori di movimento. Su iPhone: ricarica la pagina del telefono e tocca «Consenti». Su Android: tocca il lucchetto nella barra degli indirizzi e consenti «Sensori di movimento».',
  nomotion: 'Il browser del telefono non manda i dati dei sensori di movimento. Usa Chrome su Android o Safari su iPhone e riapri il QR.',
  insecure: 'Il telefono ha aperto la pagina senza https e il browser non dà i sensori. Apri il gioco dall\'indirizzo pubblicato in https e inquadra di nuovo il QR.',
};
let pairNext = null, cal = { step: null, idx: 0, marks: [], result: null, free: null }, qrTok = null;
function ensureLink(){
  if (A.link) return A.link;
  const L = A.link = createPhoneLink();
  L.on('change', () => { paintPair(); phoneChip(); });
  L.on('cal', e => onCal(e));
  L.on('swing', s => { if (A.state === 'play' && A.ctrl === 'phone') controls.phoneSwing(s); });
  L.on('toss', s => { if (A.state === 'play' && A.ctrl === 'phone') controls.phoneToss(s); });
  return L;
}
function openPair(next){
  pairNext = next; A.state = 'pair'; pane('#pair');
  const L = ensureLink(); L.start();
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname), w = $('#pairWarn');
  w.textContent = L.transport === 'lan-webrtc' && local ? 'Modalità LAN: apri sul computer il suo indirizzo IP di rete in HTTPS, con un certificato attendibile sul telefono. Il QR non deve contenere localhost.' : L.transport === 'lan-webrtc' && location.protocol !== 'https:' ? 'Modalità LAN: i sensori del telefono richiedono il server HTTPS locale con un certificato attendibile.' : location.protocol !== 'https:' && !local ? 'Questa pagina non è in https: sul telefono i sensori di movimento non funzioneranno. Apri il gioco dall\'indirizzo pubblicato (https).'
    : local ? 'Il gioco è aperto da questo computer (localhost): un telefono vero non può raggiungerlo. Usa l\'indirizzo pubblicato in https.' : '';
  // telefono già collegato e calibrato: si può riusare o ricalibrare
  paintPair();
}
function pairStep(){
  const L = A.link;
  if (!L || !L.connected) return 'collega';
  const ph = L.L.phone;
  if (PHONE_ERR[ph]) return 'errore';
  if (ph === 'ready') return 'conferma';
  if (ph === 'cal'){ if (cal.step === 'swings' || cal.step === 'shots') return 'prova'; if (cal.step === 'review' || cal.step === 'free') return 'verifica'; return 'impugna'; }
  return 'collega';
}
function paintPair(){
  if (!A.link) return;
  const L = A.link, step = pairStep();
  for (const li of document.querySelectorAll('#steps li')){ const i = STEPS.indexOf(li.dataset.s), k = STEPS.indexOf(step); li.className = i === k ? 'on' : i < k || step === 'conferma' && i <= k ? 'done' : ''; }
  for (const p of ['Collega', 'Impugna', 'Prova', 'Verifica', 'Conferma', 'Errore']) show('#p' + p, step === p.toLowerCase());
  show('#pairForget', L.connected);
  // passo 1: QR e stato
  let txt = 'Preparo la connessione…', dot = '';
  if (L.L.state === 'waiting') txt = 'Inquadra il codice con la fotocamera del telefono';
  if (L.L.state === 'connected'){ txt = 'Telefono collegato: tocca «Attiva i sensori» sul telefono'; dot = 'ok'; }
  if (L.L.state === 'lost'){ txt = 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo'; dot = 'bad'; }
  if (L.L.state === 'error'){ txt = `Connessione non disponibile (${L.L.error}). Riprova o verifica la connessione.`; dot = 'bad'; }
  $('#pairStatus').textContent = txt; $('#pairDot').className = 'dot ' + dot;
  show('#pairWarn', !L.connected && !!$('#pairWarn').textContent);
  const box = $('#qr');
  if (L.connected){ box.innerHTML = '<div style="font-size:72px;color:#16a34a">✓</div>'; qrTok = null; }
  else if ((L.L.state === 'waiting' || L.L.state === 'lost') && qrTok !== L.token && window.qrcode){
    const q = window.qrcode(0, 'M'); q.addData(L.url()); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); qrTok = L.token; box.dataset.url = L.url();
  } else if (L.L.state === 'starting' || L.L.state === 'error'){ box.innerHTML = ''; qrTok = null; }
  if (step === 'errore') $('#errTxt').textContent = PHONE_ERR[L.L.phone];
  show('#calPractice', ['prova','verifica'].includes(step));
  if (step === 'prova') paintSwings();
}
function onCal(e){
  if (Number.isFinite(e.total)) cal.total = e.total;
  if (((e.kind === 'step' && e.step === 'still') || (e.kind === 'review' && e.touch)) && A.state === 'play'){ pause(); A.pairFromPause = true; openPair(() => { A.pairFromPause = false; A.state = 'paused'; resume(); }); }
  if (e.kind === 'selection'){ calibrationPreview.example(e.shot); }
  if (e.kind === 'next' || (e.kind === 'step' && ['swings','shots'].includes(e.step))) calibrationPreview.example(e.shot || 'drive', e.want === 'R' ? -1 : 1);
  if (e.kind === 'attempt' || e.kind === 'free') calibrationPreview.gesture(e);
  if (e.kind === 'step' && e.step === 'still') calibrationPreview.example();
  if (e.kind === 'free' && e.ok) $('#rvConfirm').disabled = false;
  if (e.step) cal.step = e.step;
  if (e.kind === 'step' && e.step === 'swings'){ cal.idx = e.idx || 0; if (!cal.marks.length || e.idx === 0) cal.marks = Array.from({length:e.total || PLAN.length}, () => ''); }
  if (e.kind === 'step' && e.step === 'shots'){ cal.idx = e.idx || 0; cal.marks.length = PLAN.length + GESTURE_PLAN.length; }
  if (e.kind === 'step' && e.step === 'still'){ cal.marks = []; cal.result = null; }
  if (e.kind === 'warn' && e.why === 'move') setGrip('Ti sei mosso: tieni fermo il telefono ancora un attimo', '');
  if (e.kind === 'step' && e.step === 'grip') setGrip(e.upright ? 'Telefono in verticale ✓ un attimo…' : 'Mettilo in verticale nel palmo, come il manico', e.upright ? 'ok' : '');
  if (e.kind === 'grip') setGrip(e.upright ? 'Telefono in verticale ✓' : 'Mettilo in verticale nel palmo, come il manico', e.upright ? 'ok' : '');
  if (e.kind === 'attempt'){
    cal.marks[e.globalIdx ?? e.idx] = e.ok ? 'ok' : e.tries >= CAL.maxTries ? 'ko' : '';
    const dir = e.dir === 'L' ? '←' : e.dir === 'R' ? '→' : '?';
    feedback('#fbDir', '#fbTxt', '#fbBar', dir, e.ok ? `Registrato ${SHOTS[e.shot] || 'Piatto'}${e.want ? `: ${e.dir === 'L' ? 'da destra a sinistra' : 'da sinistra a destra'}` : ''}` : e.why === 'piccolo' ? 'Movimento non distinguibile dal rumore: prova la modalità compatta o i tocchi' : `Direzione rilevata: ${dir}. Serve ${e.want === 'L' ? '←' : '→'}: tieni il telefono sempre nello stesso modo`, e.peak, e.ok);
  }
  if (e.kind === 'next') cal.idx = e.idx;
  if (e.kind === 'idle') feedback('#fbDir', '#fbTxt', '#fbBar', '…', 'Non sento movimenti: prova il gesto comodo mostrato nell’esempio. Puoi scegliere movimento compatto o controllo con i tocchi sul telefono.', 0, false);
  if (e.kind === 'review'){ cal.result = e; paintReview(e); }
  if (e.kind === 'free'){ feedback('#frDir', '#frTxt', '#frBar', e.dir === 'L' ? '←' : e.dir === 'R' ? '→' : e.ok ? '•' : '?', e.ok ? `${SHOTS[e.shot] || 'Piatto'} · ${e.dirValue === 0 ? 'centrale' : e.dir === 'L' ? 'da destra a sinistra' : 'da sinistra a destra'}, forza ${Math.round(Math.min(1.5, e.strength)*100)}%${Number.isFinite(e.confidence) ? ` · lettura ${Math.round(e.confidence*100)}%` : ''}` : 'Direzione incerta: riprova o usa Inverti direzioni', e.peak, e.ok); }
  if (e.kind === 'done') cal.step = 'done';
  paintPair();
}
function setGrip(t, cls){ $('#gripStatus').textContent = t; $('#gripDot').className = 'dot ' + cls; clearTimeout(setGrip.t); show('#skipGrip', false); setGrip.t = setTimeout(() => show('#skipGrip', cal.step === 'grip'), 6000); }
function feedback(dirId, txtId, barId, dir, txt, peak, ok){
  $(dirId).textContent = dir; $(dirId).style.color = ok ? '#16a34a' : '#e5484d'; $(txtId).textContent = txt;
  $(barId).style.width = Math.min(100, Math.round(peak/1000*100)) + '%'; $(barId).style.background = ok ? '#16a34a' : '#e0a020';
  const m = $(barId).parentElement.querySelector('i'); if (m) m.style.left = (CAL.small/1000*100) + '%';
}
function paintSwings(){
  const plan = cal.total === QUICK_PLAN.length ? QUICK_PLAN : PLAN;
  const guided = cal.step === 'shots', guide = guided ? GESTURE_PLAN[cal.idx] : { shot: 'drive', want: plan[cal.idx] || 'L' };
  const index = (guided ? PLAN.length : 0) + cal.idx, total = guided ? PLAN.length + GESTURE_PLAN.length : cal.marks.length || PLAN.length;
  $('#swArrow').textContent = guide.want === 'L' ? '←' : guide.want === 'R' ? '→' : '↑';
  $('#swWant').textContent = `Gesto ${Math.min(total, index + 1)} di ${total}${guide.want ? `: ${guide.want === 'L' ? 'verso sinistra' : 'verso destra'}` : ''}`;
  $('#swGuide').textContent = guide.hint || ({ drive: 'Apri, colpisci e torna pronto con il tuo gesto naturale.', slice: 'Inclina il piatto e accompagna il colpo di taglio, senza forzare il polso.', lob: 'Accompagna il colpo dal basso verso l’alto: la traiettoria deve alzarsi.', drop: 'Apri leggermente il piatto e accompagna un colpo corto e morbido: rallentare soltanto non basta.' }[guide.shot]);
  $('#swDots').innerHTML = Array.from({length:total}, (_, i) => `<i class="${cal.marks[i] || ''} ${i === index ? 'now' : ''}"></i>`).join('');
}
function paintReview(r){
  $('#rvTitle').textContent = r.touch ? 'Controllo con i tocchi' : r.pass ? 'Movimenti riconosciuti' : 'Calibrazione da rifare';
  const count = r.quick ? 2 : 3;
  $('#rvL').textContent = `${r.okL}/${count} ${r.okL >= 2 ? '✓' : '✗'}`; $('#rvR').textContent = `${r.okR}/${count} ${r.okR >= 2 ? '✓' : '✗'}`;
  const why = $('#rvWhy');
  why.className = 'note ' + (r.pass ? 'ok' : 'bad');
  why.textContent = r.touch ? 'Scegli direzione e intensità sul telefono e premi Colpisci. Prova una volta, poi conferma.' : r.pass ? (r.assisted ? 'Apri il braccio, poi tieni premuto il pulsante sul telefono mentre colpisci. Prova una volta e conferma.' : 'Pronto! Prova un gesto guardando la palla, poi conferma. Muovi normalmente per rispondere; accompagna verso l’alto per alzare la palla, fai un tocco corto e morbido per mandarla vicino alla rete. Non serve conoscere il tennis.')
    : r.why === 'servizio' ? 'Non è stato registrato alcun gesto di servizio. Ripeti senza forzare il movimento oppure scegli i tocchi sul telefono.'
    : r.why === 'piccolo' ? 'Non riesco a distinguere questi gesti dal rumore. Scegli movimento compatto o controllo con i tocchi sul telefono, senza forzare il braccio.'
    : 'Le due direzioni non si distinguono. Tieni il telefono sempre nello stesso modo (in verticale nel palmo) e fai gli swing davvero da una parte all\'altra.';
  if (r.pass && r.gestureWarnings?.length){
    const shots = [...new Set(r.gestureWarnings.map(w => SHOTS[w.shot] || w.shot))].join(', ');
    why.textContent += ` Gesti da distinguere meglio: ${shots}. Cambia l’inclinazione o l’accompagnamento, senza ampliare il movimento. Se sono ambigui verrà privilegiato il piatto; puoi ripetere la calibrazione.`;
  }
  $('#rvConfirm').disabled = true;
  show('#calInvert', !r.touch); show('#rvRetry', !r.touch);
  show('#pVerifica .rv', !r.touch);
  show('#rvConfirm', r.pass); show('#rvFreeBox', r.pass);
  if (r.pass) A.link.cmd('free');
}
$('#calDemo').addEventListener('click', () => calibrationPreview.example());
$('#calInvert').addEventListener('click', () => A.link?.cmd('invert'));
$('#calShotTypes').innerHTML = Object.entries(SHOTS).map(([key,label]) => `<button data-shot="${key}">${label}</button>`).join('');
$('#calShotTypes').addEventListener('click', e => { const shot=e.target.dataset.shot; if (SHOTS[shot]){ calibrationPreview.example(shot); A.link?.send({ t:'practice',shot }); } });
$('#skipGrip').addEventListener('click', () => A.link && A.link.cmd('skipGrip'));
$('#rvRetry').addEventListener('click', () => { cal.marks = PLAN.map(() => ''); cal.idx = 0; A.link.cmd('retry'); });
$('#rvConfirm').addEventListener('click', () => A.link.cmd('confirm'));
$('#pairRecal').addEventListener('click', () => { cal = { step: null, idx: 0, marks: [], result: null }; A.link.cmd('cal'); });
$('#errRetry').addEventListener('click', () => { A.link.cmd('cal'); paintPair(); });
$('#pairGo').addEventListener('click', () => { A.ctrl = 'phone'; pairNext && pairNext(); });
$('#pairBack').addEventListener('click', () => { if (A.state === 'paused' || A.pairFromPause){ A.pairFromPause = false; pane('#pause'); A.state = 'paused'; } else back(); });
$('#pairForget').addEventListener('click', () => { A.link && A.link.forget(); qrTok = null; cal = { step: null, idx: 0, marks: [], result: null }; paintPair(); });
function phoneChip(){
  const on = A.ctrl === 'phone' && A.link && (A.state === 'play' || A.state === 'paused');
  show('#chip', !!on); if (!on) return;
  const L = A.link, c = $('#chip');
  let t = 'Telefono: in attesa', cls = '';
  if (L.ready){
    const motion = L.motion(), measuredRtt = motion?.rtt ?? L.L.rtt;
    t = (L.transport === 'lan-webrtc' ? 'LAN · ' : '') + 'Telefono pronto' + (measuredRtt != null ? ` · ${Math.round(measuredRtt)} ms` : '');
    if (L.transport === 'lan-webrtc' && motion) t += ` · perdita ${Math.round(motion.loss*100)}%`;
    cls = 'ok';
  }
  else if (L.L.state === 'connected') t = 'Telefono: da calibrare (pausa → Telefono)';
  else if (L.L.state === 'lost' || L.L.state === 'error'){ t = 'Telefono scollegato · ricollega il controller'; cls = 'bad'; }
  c.className = cls; c.querySelector('span').textContent = t;
}

/* ---------- partita contro la CPU (e motore dell'host) ---------- */
const fmtOpts = () => { const g = +A.fmt; return { gamesToWin: g, set: g > 1 }; };
const grace = () => A.ctrl === 'phone' && A.link ? Math.min(.25, A.link.latency + .06) : .05;
function startLocal(){
  clearTimeout(endTimer);
  A.myId = 'me';
  A.core = new ArcadeMatch({ teams: [[{ human: true, id: 'me', name: myName(), grace: grace() }], [{ id: 'cpu', name: 'CPU' }]], cpu: A.level, ...fmtOpts(), rng: mulberry32((Math.random()*2**31) >>> 0) });
  beginPlay(['blu', 'rosso'], [myName(), 'CPU']);
}
function beginPlay(looks, names){
  resetInputTimeline();
  A.names = names; A.stats = { perfect: 0, contacts: 0, won: 0, miss: 0 };
  S.setPlayers((A.core || { players: A.mirror.players }).players, looks);
  A.state = 'play'; A.netPause = false; controls.enabled = true; controls.useAim = false;
  pane(null); show('#hud', true); scoreboard(); phoneChip();
  hint('Il gesto orienta il colpo a sinistra/destra; il timing determina qualità e velocità. Colpisci quando l\'anello diventa verde.');
  S.arena.setScore('0-0');
  phoneSend({ t: 'ph', ph: 'play' });
}
const me = () => A.core ? A.core.players.find(p => p.id === A.myId) : null;
function scoreboard(){
  const sc = A.core ? A.core.score : A.mirror && A.mirror.score(); if (!sc) return;
  const lab = pointLabels(sc), f = sc.gamesToWin === 1 ? '1 game' : `Set a ${sc.gamesToWin}` + (sc.tiebreak ? ' · tie-break' : '');
  $('#score').innerHTML = [0, 1].map(t => `<div class="r ${sc.server === t ? 'srv' : ''}"><i></i><span>${esc(A.names[t])}</span><b>${sc.games[t]}</b><em>${lab[t]}</em></div>`).join('') + `<small>${f}</small>`;
}
function flash(big, small = '', ms = 1300){ $('#flash b').textContent = big; $('#flash span').textContent = small; $('#flash').style.opacity = 1; flashT = ms/1000; }
function timing(cls, big, small = ''){ const el = $('#timing'); el.className = cls; el.innerHTML = esc(big) + (small ? `<small>${esc(small)}</small>` : ''); el.style.opacity = 1; el.style.transform = 'translateX(-50%) scale(1.12)'; setTimeout(() => el.style.transform = 'translateX(-50%) scale(1)', 120); timingT = 1.1; }
function hint(t){ $('#hint').textContent = t; }
const phoneSend = m => { if (A.ctrl === 'phone' && A.link) A.link.send(m); };

// eventi della partita (locali o arrivati dall'host), visti da chi gioca su questo schermo
function onEvent(e, view){
  const mine = e.player === A.myId, myTeam = A.myId === 'g' ? 1 : 0;
  switch (e.type){
    case 'hit': S.impact?.(e, view || viewNow()); sound(e.shot === 'serve' || e.shot === 'smash' ? 1.3 : 1);
      if(mine && e.shot==='serve') phoneSend({t:'ph',ph:'play'});
      if (e.shot === 'serve'){ const v = A.core ? A.core.ball.v : null; if (v) S.arena.setSpeed(Math.hypot(v.x, v.y, v.z)*3.6); }
      if (!mine) hint('');
      break;
    case 'bounce': S.mark(e.x, e.z); sound(.45, 'bounce'); break;
    case 'net': if (e.tape) flash('Nastro!', '', 800); sound(.5, 'net'); break;
    case 'serveReady': if (mine) hint('Al servizio: un movimento lancia la palla, il secondo la colpisce in cima'); if (mine) phoneSend({ t: 'ph', ph: 'serve' }); break;
    case 'toss': if (mine){hint('Ora colpisci quando la palla è in cima');phoneSend({t:'ph',ph:'toss'});} break;
    case 'tossCaught': if (mine){ hint('Palla ripresa: rilancia quando vuoi'); phoneSend({t:'ph',ph:'serve'}); if (e.why !== 'nessuno') timing('miss', e.why === 'presto' ? 'Troppo presto' : 'Troppo tardi', 'Colpisci quando la palla è in cima'); } break;
    case 'contact':
      if (!mine) break;
      A.stats.contacts++; if (e.label === 'perfetto') A.stats.perfect++;
      timing(e.label, TIMING[e.label] || e.label, e.serve ? 'Servizio' : ({ drop: 'Palla corta', lob: 'Lob', slice: 'Tagliato', smash: 'Smash' }[e.shot] || ''));
      S.burst((view || viewNow()).ball.p, e.label === 'perfetto' ? 0x4cff8a : e.label === 'buono' ? 0xffffff : 0xffd56b);
      phoneSend({ t: 'ev', k: 'contact', label: e.label, shot: e.shot });
      hint('');
      break;
    case 'miss': if (mine){ A.stats.miss++; const m = MISS[e.why] || ['Mancata', '']; timing('miss', m[0], m[1]); phoneSend({ t: 'ev', k: 'miss', why: e.why }); } break;
    case 'let': flash('Let', 'Il servizio ha toccato il nastro: si ripete'); break;
    case 'fault': if (e.reason === 'fuori') S.lastMarkOut(); flash('Fallo', e.second ? 'Seconda palla' : REASON[e.reason] || e.reason); break;
    case 'point': {
      const won = e.team === myTeam; if (won) A.stats.won++;
      if (e.reason === 'fuori') S.lastMarkOut();
      flash(won ? 'Punto tuo!' : 'Punto avversario', REASON[e.reason] || e.reason);
      S.cheer(won ? 1 : .5);
      const ids = A.core ? A.core.players : A.mirror.players;
      for (const p of ids) S.setMood(p.id, p.team === e.team ? 'happy' : 'sad');
      scoreboard(); hint('');
      phoneSend({ t: 'ev', k: 'point', mine: won, txt: REASON[e.reason] || e.reason });
      break;
    }
    case 'game': S.arena.setScore(`${e.games[0]}-${e.games[1]}`); scoreboard(); if (!e.tiebreak) setTimeout(() => A.state === 'play' && flash(`Game ${e.team === myTeam ? 'tuo' : 'avversario'}`, `${e.games[myTeam]} – ${e.games[1 - myTeam]}`), 1000); break;
    case 'tiebreak': setTimeout(() => flash('Tie-break', 'a 7 punti, con due di scarto'), 1800); break;
    case 'match': endTimer = setTimeout(() => finish(e.winner === myTeam, e.games), 1500); break;
  }
}
function finish(won, games){
  A.state = 'end'; controls.enabled = false; show('#hud', false);
  const myTeam = A.myId === 'g' ? 1 : 0;
  $('#endTitle').textContent = won ? 'Vittoria!' : 'Sconfitta';
  $('#endScore').textContent = `${A.names[0]} ${games[0]} – ${games[1]} ${A.names[1]}`;
  const st = A.stats, pct = st.contacts ? Math.round(st.perfect/st.contacts*100) + '%' : '–';
  $('#endStats').innerHTML = [['Punti vinti', st.won], ['Colpi riusciti', st.contacts], ['Colpi perfetti', pct], ['Palle mancate', st.miss]].map(([l, v]) => `<tr><td>${l}</td><td>${esc(v)}</td></tr>`).join('');
  show('#again', A.mode !== 'guest'); $('#again').textContent = A.mode === 'host' ? 'Rivincita (stesso amico)' : 'Rivincita';
  pane('#end');
  if (A.mode === 'guest') $('#endScore').textContent += ' · Aspetta la rivincita o torna al menu.';
  phoneSend({ t: 'ph', ph: 'over' });
  if (A.mode === 'host') A.host.send({ t: 'end', games, winner: won ? myTeam : 1 - myTeam });
}
const viewOf = core => ({ t: core.t, phase: core.phase, ball: core.ball, held: core.ball.held, toss: core.toss, serverId: core.serverP && core.serverP.id, players: core.players.map(p => ({ ...p, contactEligible: core.legalFor ? core.legalFor(p) : false })) });
const viewNow = () => A.core ? viewOf(A.core) : A.mirror.view(A.mirror.renderTime(performance.now(), A.guest.clock));

/* ---------- ciclo ---------- */
// qualità automatica: se il computer fatica (meno di ~30 fotogrammi al secondo) si alleggerisce l'arena
let quality = /[?&]q=low\b/.test(location.search) ? 0 : 2, perf = { t: 0, n: 0 };
if (quality < 2) S.setQuality(quality);
function autoQuality(dt){
  perf.t += dt; perf.n++;
  if (perf.t < 2.5) return;
  const fps = perf.n/perf.t; perf.t = 0; perf.n = 0;
  if (fps < 28 && quality > 0){ quality--; S.setQuality(quality); }
}
function frame(now){
  const dt = Math.min(.1, (now - lastT)/1000); lastT = now; A.frameT = now;
  autoQuality(dt);
  S.setRacketMotion?.(A.ctrl === 'phone' ? A.link?.motion(now) : null);
  if (A.state === 'pair'){
    // Keep the arena still behind pairing; sensor setup only needs the practice scene.
    if (!$('#calPractice').classList.contains('hidden')){ calibrationPreview.tick(now); $('#calCaption').textContent = calibrationPreview.label; }
    requestAnimationFrame(frame); return;
  }
  let shownTime = null;
  if (A.core && A.state === 'play' && !A.netPause) shownTime = stepCore(dt, now);
  else if (A.mirror && A.mode === 'guest') shownTime = stepGuest(dt, now);
  else if (A.core){ S.sync(viewOf(A.core), 0, null); S.follow(me(), dt); }
  else {
    if (!A.demo){ A.demo = new ArcadeMatch({ teams: [[{ id: 'a', name: 'A' }], [{ id: 'b', name: 'B' }]], gamesToWin: 99 }); S.setPlayers(A.demo.players, ['verde', 'viola']); }
    for (let i = 0; i < 2; i++) A.demo.update(dt/2);
    S.sync(viewOf(A.demo), dt, null); S.orbit(now/1000);
  }
  if (flashT > 0){ flashT -= dt; if (flashT <= 0) $('#flash').style.opacity = 0; }
  if (timingT > 0){ timingT -= dt; if (timingT <= 0) $('#timing').style.opacity = 0; }
  S.render();
  // Timestamp the completed render, not the beginning of a potentially slow frame.
  if (Number.isFinite(shownTime) && A.state === 'play' && !A.netPause) presented.record(performance.now()/1000, shownTime);
  requestAnimationFrame(frame);
}
// un passo della partita che gira qui (CPU o host): comandi locali e dell'amico, eventi, istantanee
function stepCore(dt, now){
  const core = A.core, input = controls.read(), n = Math.max(1, Math.ceil(dt/(1/120)));
  // istanti degli eventi (orologio del browser) → ritardi rispetto al primo passo di questo fotogramma
  const c1 = core.t + dt/n;
  const sw = input.swings.map(s => ({ ...s, at: presented.seenAt(s.at) })).filter(s => s.at != null);
  const tossAt = input.tosses.length ? presented.seenAt(input.tosses[0].at) : null;
  const mine = { move: input.move, auto: input.auto, swings: sw.map(s => ({ ...s, delay: s.at - c1 })), toss: tossAt != null ? { delay: tossAt - c1 } : null };
  const inputs = { [A.myId]: mine };
  if (A.mode === 'host'){
    const q = inputQ;
    inputs.g = { move: q.mv, auto: q.auto, swings: q.sw.map(s => ({ ...s, delay: s.at - c1 })), toss: q.ts.length ? { delay: q.ts[0].at - c1 } : null };
    q.sw = []; q.ts = [];
  }
  const all = [];
  for (let i = 0; i < n; i++){
    const inp = i === 0 ? inputs : Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { move: v.move, auto: v.auto }]));
    for (const e of core.update(dt/n, inp)){ all.push(e); onEvent(e); }
    if (A.state !== 'play') break;
  }
  if (A.mode === 'host'){
    if (all.length) A.host.send({ t: 'e', l: encodeEvents(core, all) });
    snapAcc += dt; if (snapAcc >= 1/30){ snapAcc = 0; A.host.send(encodeSnap(core, performance.now())); }
    // l'attesa del colpo dell'amico segue il ritardo della rete
    const g = core.players.find(p => p.id === 'g'); if (g) g.grace = guestGrace;
  }
  const m = me();
  S.sync(viewOf(core), dt, { id: A.myId, assist: true }); S.follow(m, dt);
  aimMarker();
  return core.t;
}
// Il puntamento è gestito dal gesto calibrato del telefono; non esiste mira con puntatore.
function aimMarker(){ const a = false; S.aim.visible = !!a; if (a) S.aim.position.set(A.myId === 'g' ? -a.x : a.x, .02, A.myId === 'g' ? -a.z : a.z); }
// amico: disegna lo stato dell'host un attimo indietro, manda i colpi riferiti a ciò che vedeva
function stepGuest(dt, now){
  const M = A.mirror, G = A.guest; if (!M.last) return;
  const R = A.netPause ? M.last.ct : M.renderTime(now, G.clock), view = M.view(R); if (!view) return;
  for (const e of M.takeEvents(R)) onEvent(e, view);
  if (A.state === 'play' && !A.netPause){
    const input = controls.read();
    const sw = input.swings.map(s => ({ at: presented.seenAt(s.at), power: s.power, lift: s.lift, lob: s.lob, drop: s.drop, slice: s.slice, dur: s.dur, dir: s.dir, aim:s.aim,confidence:s.confidence })).filter(s => s.at != null), ts = input.tosses.map(s => ({ at: presented.seenAt(s.at) })).filter(s => s.at != null);
    const mv = `${input.move.x.toFixed(2)},${input.move.y.toFixed(2)},${input.auto}`;
    if (sw.length || ts.length || mv !== lastMv){ G.send({ t: 'in', sw, ts, mv: input.move, auto: input.auto }); lastMv = mv; }
  }
  S.sync(view, dt, { id: 'g', assist: true }); S.follow(view.players.find(p => p.id === 'g'), dt);
  aimMarker();
  if (A.scoreDirty !== M.last.sc.join()){ A.scoreDirty = M.last.sc.join(); scoreboard(); }
  return view.t;
}

/* ---------- invito: host ---------- */
let guestGrace = .3;
function openHost(){
  if (!A.host){
    const H = A.host = hostSession();
    H.on('change', () => { paintLobby(); hostNet(); });
    H.on('input', d => {
      if (A.state !== 'play' || A.netPause || !A.core) return;
      const packet = readGuestInput(d, A.core.t, A.inputSince || 0);
      inputQ.sw.push(...packet.sw.slice(0, INPUT_TIME.maxQueue - inputQ.sw.length));
      inputQ.ts.push(...packet.ts.slice(0, INPUT_TIME.maxQueue - inputQ.ts.length));
      if (Number.isFinite(d.lag)) guestGrace = Math.max(.2, Math.min(.5, d.lag + .12));
    });
    H.start();
  }
  chooseCtrl(() => openLobby());
}
function openLobby(){
  A.state = 'lobby'; pane('#lobby');
  $('#lobbyTitle').textContent = A.mode === 'host' ? 'Invita un amico' : 'Partita tra amici';
  show('#inviteBox', A.mode === 'host'); show('#lobbyStart', A.mode === 'host');
  if (A.mode === 'guest') A.guest.setMe({ name: myName(), ctrl: A.ctrl, ready: true });
  paintLobby();
}
function ctrlLabel(c, ready){ return ready ? 'telefono pronto' : 'telefono da calibrare'; }
function paintLobby(){
  if (A.state !== 'lobby') return;
  const meReady = !!(A.link && A.link.ready);
  const row = (name, sub, st, color, ok) => `<div class="pl"><div class="av" style="background:${color}">${esc((name || '?')[0].toUpperCase())}</div><div><b>${esc(name)}</b><span>${esc(sub)}</span></div><div class="st" style="color:${ok ? '#16a34a' : '#8a93ab'}">${esc(st)}</div></div>`;
  if (A.mode === 'host'){
    const H = A.host;
    $('#invUrl').value = H.S.state === 'open' ? H.url() : 'Preparo il link…';
    show('#invShare', !!navigator.share);
    const g = H.S.guest;
    $('#lobbyPlayers').innerHTML = row(myName() + ' (tu)', ctrlLabel(A.ctrl, meReady), meReady ? 'Pronto' : 'Non pronto', '#2f6bff', meReady)
      + (g ? row(g.name, ctrlLabel(g.ctrl, g.ready), !g.connected ? 'Scollegato' : g.ready ? 'Pronto' : 'Si prepara…', '#ff5a3c', g.ready && g.connected) : row('In attesa dell\'amico…', 'Manda il link', '', '#c4cbe0', false));
    $('#lobbyStart').disabled = !(g && g.ready && g.connected && meReady);
    const note = $('#lobbyNote');
    note.textContent = H.S.state === 'error' ? `Connessione non disponibile (${H.S.error}): la partita tra amici non può partire. Puoi riprovare o tornare al menu.` : !meReady ? 'Collega e calibra il telefono per iniziare.' : '';
    note.className = 'note ' + (H.S.state === 'error' ? 'bad' : 'warn'); show(note, !!note.textContent);
  } else {
    const G = A.guest;
    $('#lobbyPlayers').innerHTML = row(A.hostName || 'Chi ti ha invitato', 'ospita la partita', 'Collegato', '#2f6bff', true) + row(myName() + ' (tu)', ctrlLabel(A.ctrl, meReady), meReady ? 'Pronto' : 'Non pronto', '#ff5a3c', meReady);
    const note = $('#lobbyNote'); note.className = 'note'; note.textContent = `Aspetta che ${A.hostName || 'l\'host'} inizi la partita.`; show(note, true);
  }
}
$('#invCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#invUrl').value); $('#invCopy').textContent = 'Copiato'; setTimeout(() => $('#invCopy').textContent = 'Copia', 1500); } catch (e){ $('#invUrl').select(); } });
$('#invShare').addEventListener('click', () => navigator.share && navigator.share({ title: 'NATPF Simulator', text: `${myName()} ti sfida a NATPF Simulator: apri il link e collega il telefono come racchetta`, url: $('#invUrl').value }).catch(() => {}));
$('#lobbyCtrl').addEventListener('click', () => chooseCtrl(() => openLobby()));
$('#lobbyLeave').addEventListener('click', () => leaveOnline());
$('#lobbyStart').addEventListener('click', () => hostStart());
function hostStart(){
  const H = A.host, g = H.S.guest; if (!g) return;
  clearTimeout(endTimer);
  A.myId = 'h';
  inputQ = { sw: [], ts: [], mv: { x: 0, y: 0 }, auto: true };
  A.core = new ArcadeMatch({ teams: [[{ human: true, id: 'h', name: myName(), grace: grace() }], [{ human: true, id: 'g', name: g.name, grace: guestGrace }]], ...fmtOpts(), rng: mulberry32((Math.random()*2**31) >>> 0) });
  H.send({ t: 'start', names: [myName(), g.name], ...fmtOpts() });
  beginPlay(['blu', 'rosso'], [myName(), g.name]);
}
function hostNet(){
  const g = A.host.S.guest;
  if (!(A.mode === 'host' && (A.state === 'play' || A.state === 'paused'))) return;
  if (!g || !g.connected){ resetInputTimeline(); A.netPause = true; netMsg(`${g ? g.name : 'L\'amico'} si è scollegato`, 'Aspetto che rientri: basta che riapra la pagina (si ricollega da solo). La partita riprende da dove era.', 'Termina la partita'); }
  else if (A.netPause){ resetInputTimeline(); lastT = performance.now(); A.netPause = false; pane(null); A.host.send({ t: 'start', names: A.names, resume: true, ...fmtOpts() }); }
}

/* ---------- invito: amico ---------- */
function openGuest(inv){
  A.mode = 'guest'; A.state = 'guest'; pane('#guest');
  $('#gName').value = A.name;
  const G = A.guest = joinSession(inv);
  G.on('change', s => guestNet(s));
  G.on('msg', d => guestMsg(d));
  G.connect();
}
$('#gName').addEventListener('input', e => setName(e.target.value));
$('#gGo').addEventListener('click', () => { setName($('#gName').value); chooseCtrl(() => openLobby()); });
function guestNet(s){
  const st = $('#gStatus');
  if (s.state === 'in'){
    st.innerHTML = '<span class="dot ok"></span>Collegato alla partita';
    if (A.netLost){ A.netLost = false; if (A.state === 'play') pane(null); else if (A.state === 'net') openLobby(); }
    A.guest.setMe({ name: myName(), ctrl: A.ctrl, ready: A.state === 'lobby' || A.state === 'play' });
  }
  if (s.state === 'connecting') st.innerHTML = '<span class="dot"></span>Mi collego alla partita…';
  if (s.state === 'lost'){ resetInputTimeline(); A.netPause = true; controls.enabled = false; A.netLost = true; if (A.state === 'play') netMsg('Connessione persa', 'Provo a ricollegarmi da solo…', 'Esci'); else st.innerHTML = '<span class="dot bad"></span>Connessione persa, riprovo…'; }
  if (s.state === 'denied'){
    const t = { busy: 'Questa partita ha già due giocatori.', expired: 'Il link è scaduto: chiedi un link nuovo a chi ti ha invitato.', denied: 'Il link non è più valido (è già stato usato): chiedi un link nuovo.', gone: 'La partita non esiste più: chi ti ha invitato ha chiuso o ricaricato la pagina.' }[s.why] || 'Non è possibile entrare.';
    netMsg('Non puoi entrare', t, 'Torna al menu');
  }
  if (s.state === 'closed') netMsg('Partita chiusa', `${A.hostName || 'Chi ti ha invitato'} ha chiuso la partita.`, 'Torna al menu');
}
function guestMsg(d){
  if (d.t === 'lobby'){ A.hostName = d.host && d.host.name; $('#gTitle').textContent = `${A.hostName} ti ha invitato`; paintLobby(); }
  if (d.t === 'start'){
    clearTimeout(endTimer);
    A.myId = 'g'; A.names = d.names; A.hostName = d.names[0];
    if (!A.mirror || !d.resume) A.mirror = createMirror({ players: [{ id: 'h', team: 0, human: true }, { id: 'g', team: 1, human: true }] });
    if (d.resume) A.mirror.resetClock();
    A.mirror.D = Math.min(.2, Math.max(.07, (A.guest.clock.rtt || 60)/2000 + .05));
    if (!d.resume || A.state !== 'play') beginPlay(['blu', 'rosso'], d.names);
    else { A.netPause = false; controls.enabled = true; resetInputTimeline(); pane(null); }
  }
  if (d.t === 's' && A.mirror) A.mirror.push(d);
  if (d.t === 'e' && A.mirror) A.mirror.pushEvents(d.l);
  if (d.t === 'pause'){
    A.netPause = !!d.on; controls.enabled = !d.on; resetInputTimeline();
    if (!d.on && A.mirror) A.mirror.resetClock();
    if (d.on) netMsg('Partita in pausa', `${A.hostName} ha messo in pausa.`, 'Esci dalla partita');
    else if (!$('#net').classList.contains('hidden')){ if (A.state === 'net') A.state = 'play'; pane(null); }
  }
}
function netMsg(title, text, btn){ $('#netTitle').textContent = title; $('#netText').textContent = text; $('#netBtn').textContent = btn; pane('#net'); if (A.state !== 'play') A.state = 'net'; }
$('#netBtn').addEventListener('click', () => leaveOnline());
function leaveOnline(){
  if (A.host){ A.host.stop(); A.host = null; }
  if (A.guest){ A.guest.leave(); A.guest = null; history.replaceState(null, '', location.pathname + location.search); }
  A.mirror = null; toMenu();
}

/* ---------- pausa, fine, menu ---------- */
function pause(){
  if (A.state !== 'play') return;
  resetInputTimeline();
  A.state = 'paused'; controls.enabled = false; pane('#pause');
  show('#restart', A.mode === 'cpu'); $('#resume').textContent = A.mode === 'guest' ? 'Torna alla partita (non si ferma)' : 'Riprendi';
  if (A.mode === 'host') A.host.send({ t: 'pause', on: true });
  phoneSend({ t: 'ph', ph: 'pause' });
}
function resume(){
  resetInputTimeline();
  A.state = 'play'; controls.enabled = true; pane(null); show('#hud', true); lastT = performance.now(); phoneChip(); controls.useAim = false;
  if (A.mode === 'host') A.host.send({ t: 'pause', on: false });
  phoneSend({ t: 'ph', ph: 'play' });
  const p = me(); if (p) p.grace = grace();
}
$('#pauseBtn').addEventListener('click', pause);
$('#resume').addEventListener('click', resume);
$('#pausePhone').addEventListener('click', () => { A.pairFromPause = true; openPair(() => { A.pairFromPause = false; A.state = 'paused'; resume(); }); });
$('#restart').addEventListener('click', () => startLocal());
$('#toMenu').addEventListener('click', () => A.mode === 'cpu' ? toMenu() : leaveOnline());
$('#again').addEventListener('click', () => A.mode === 'host' ? hostStart() : startLocal());
$('#endMenu').addEventListener('click', () => A.mode === 'cpu' ? toMenu() : leaveOnline());
addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyP'){ if (A.state === 'play') pause(); else if (A.state === 'paused') resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && A.mode === 'cpu') pause(); });
function toMenu(){
  clearTimeout(endTimer);
  A.state = 'menu'; A.mode = 'cpu'; A.core = null; A.mirror = null; controls.enabled = false;
  show('#hud', false); pane('#menu'); A.demo = null; phoneSend({ t: 'ph', ph: 'menu' });
}

/* ---------- suoni sintetizzati ---------- */
let ac = null;
function sound(k = 1, kind = 'hit'){
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = kind === 'hit' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(kind === 'hit' ? 440 : kind === 'net' ? 140 : 200, t); o.frequency.exponentialRampToValueAtTime(kind === 'hit' ? 160 : 70, t + .08);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25*k, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .14);
  } catch (e){}
}

/* ---------- avvio ---------- */
setInterval(() => {
  // l'host manda a chi entra il proprio nome; segue la latenza dell'amico per l'attesa dei suoi colpi
  if (A.host && A.host.connected) A.host.send({ t: 'lobby', host: { name: myName() } });
  // l'amico dice all'host quanto è indietro ciò che vede (ritardo di disegno + metà viaggio): serve per aspettare i suoi colpi
  if (A.guest && A.mirror && A.state === 'play') A.guest.send({ t: 'in', sw: [], ts: [], lag: A.mirror.D + (A.guest.clock.rtt || 60)/2000 });
  phoneChip();
}, 1000);
{
  const inv = parseInvite(location.hash);
  if (inv && isPhone){
    pane('#mobile'); A.state = 'mobile';
    $('#mobNote').textContent = 'Non riesci a copiarlo? Rimanda a te stesso il messaggio con il link e aprilo dal computer.';
  } else if (inv) openGuest(inv);
  else if (isPhone){ pane('#mobile'); A.state = 'mobile'; $('#mobNote').textContent = 'Su un computer apri questo stesso indirizzo.'; show('#mobAnyway', true); }
  else pane('#menu');
}
$('#mobCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('#mobCopy').textContent = 'Link copiato'; } catch (e){} });
$('#mobAnyway').addEventListener('click', () => { A.state = 'menu'; pane('#menu'); });
requestAnimationFrame(frame);
// aggancio per i test automatici
window.__racchetta = { A, controls, S, get core(){ return A.core; }, get state(){ return A.state; }, get link(){ return A.link; }, startLocal };


// Partite di tennis e padel tra amici, nella stanza del gioco con gli amici (net/room.js).
//
// Chi lancia la sfida fa da arbitro: sul suo dispositivo gira la partita vera (MatchCore); gli altri mandano i loro
// comandi e ricevono lo stato della partita 30 volte al secondo. Così il punteggio è uno solo per tutti.
// Il proprio giocatore si muove subito sul proprio schermo (previsione) e viene corretto solo se si allontana troppo;
// la palla fra un aggiornamento e l'altro prosegue con la stessa fisica della partita.
//
// Formati: tennis uno contro uno; padel due contro due con fino a quattro amici, i posti vuoti li gioca il computer.
// Se un amico si scollega, al suo posto gioca il computer; se si scollega chi fa da arbitro, la partita si ferma.
import { $, show, esc } from '../core/util.js';
import { hud } from '../ui/hud.js';
import { MatchCore, mulberry32 } from './core.js';
import { MatchRenderer, reasonLabel } from './view.js';
import { pointLabels } from './rules.js';
import { COURTS, newBall, stepBall } from './physics.js';
import { LEVELS } from './ai.js';

const SNAP = 1/30, INPUT_KEEPALIVE = .1, INVITE_TIME = 30;
const SHOTS = ['', 'drive', 'lob', 'smash', 'serve'];
const COMPUTER = { name: 'Computer', look: { shirt: 0x5b6678, shorts: 0x1d2430, cap: 0xdfe3e6 } };
const newId = () => Math.random().toString(36).slice(2, 9);

export function registerOnline(W){
  const R = W.room;
  let lobby = null;       // chi organizza: { mid, sport, games, level, slots, pending, accepted, timer }
  let invite = null;      // chi è invitato: { mid, from }
  let M = null;           // partita in corso

  /* ============ organizzare una partita ============ */
  const friends = () => [...R.players.values()].map(o => ({ id: o.id, name: `${o.nick} ${o.number}`, look: o.look }));
  const meSlot = () => { const i = R.info(); return { peer: R.myId, name: `${i.nick} ${i.number}`, look: i.look, me: true }; };
  const cpu = () => ({ peer: null, name: COMPUTER.name, look: COMPUTER.look });
  function openLobby({ friend = null, sport = 'tennis' } = {}){
    if (R.status !== 'in'){ hud.toast('Prima entra in una stanza con gli amici'); return; }
    const fl = friends();
    if (!fl.length){ hud.note({ title: 'Nessun amico nella stanza', sub: 'Manda il link della stanza e aspetta che entrino', ms: 4000 }); return; }
    const first = fl.find(f => f.id === friend) || fl[0];
    const st = { sport, games: 2, level: 'normale', slots: null };
    const reset = () => {
      const f = { peer: first.id, name: first.name, look: first.look };
      st.slots = st.sport === 'tennis' ? [[meSlot()], [f]] : [[meSlot(), cpu()], [f, cpu()]];
    };
    reset();
    const options = used => [cpu(), ...friends().filter(f => !used.has(f.id)).map(f => ({ peer: f.id, name: f.name, look: f.look }))];
    const html = () => {
      const slot = (s, t, i) => s.me ? `<div class="slot me"><b>${esc(s.name)}</b><small>tu</small></div>`
        : `<button class="slot ${s.peer ? 'friend' : ''}" data-slot="${t}-${i}"><b>${esc(s.name)}</b><small>${s.peer ? 'amico · tocca per cambiare' : 'tocca per scegliere un amico'}</small></button>`;
      return `
        <div class="tabs"><button data-sport="tennis" class="${st.sport === 'tennis' ? 'on' : ''}">Tennis · 1 contro 1</button><button data-sport="padel" class="${st.sport === 'padel' ? 'on' : ''}">Padel · 2 contro 2</button></div>
        <div class="vs"><div class="team"><label>${st.sport === 'padel' ? 'La tua coppia' : 'Tu'}</label>${st.slots[0].map((s, i) => slot(s, 0, i)).join('')}</div>
          <div class="vsl">contro</div>
          <div class="team"><label>Avversari</label>${st.slots[1].map((s, i) => slot(s, 1, i)).join('')}</div></div>
        <label>Durata</label><div class="opt">${[1, 2, 4].map(g => `<button data-games="${g}" class="${st.games === g ? 'on' : ''}">${g} game</button>`).join('')}</div>
        <label>Livello</label><div class="opt">${[['facile', 'Facile'], ['normale', 'Normale']].map(([v, l]) => `<button data-level="${v}" class="${st.level === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="fine left">${st.sport === 'tennis' ? 'Sul Campo Centrale.' : 'Sul campo da padel. I posti senza un amico li gioca il computer.'} Livello Facile: se non muovi le frecce il personaggio va da solo verso la palla.</p>`;
    };
    W.setMode('menu');
    const box = hud.panel({ tag: 'Partita tra amici', title: 'Sfida i tuoi amici', html: html(), buttons: [
      { label: 'Invia la sfida', primary: true, keep: true, onClick: () => { if (st.slots.flat().some(s => s.peer && !s.me)){ hud.closePanel(); sendInvites(st); } else hud.toast('Scegli almeno un amico'); } },
      { label: 'Annulla' },
    ], onClose: () => { if (W.mode === 'menu' && !lobby) W.setMode('explore'); } });
    const body = box.querySelector('.body');
    const wire = () => {
      body.innerHTML = html();
      body.querySelectorAll('[data-sport]').forEach(b => b.addEventListener('click', () => { st.sport = b.dataset.sport; reset(); wire(); }));
      body.querySelectorAll('[data-games]').forEach(b => b.addEventListener('click', () => { st.games = +b.dataset.games; wire(); }));
      body.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { st.level = b.dataset.level; wire(); }));
      body.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => {
        const [t, i] = b.dataset.slot.split('-').map(Number), cur = st.slots[t][i];
        const used = new Set(st.slots.flat().filter(s => s.peer && s !== cur).map(s => s.peer));
        const opts = options(used), k = opts.findIndex(o => o.peer === cur.peer);
        st.slots[t][i] = opts[(k + 1) % opts.length]; wire();
      }));
    };
    wire();
  }
  function sendInvites(st){
    const mid = newId(), players = [];
    st.slots.forEach((team, t) => team.forEach((s, i) => players.push({ pid: `p${t}${i}`, team: t, idx: i, peer: s.peer || null, name: s.name, look: s.look })));
    const guests = players.filter(p => p.peer && p.peer !== R.myId);
    lobby = { mid, sport: st.sport, games: st.games, level: st.level, players, pending: new Set(guests.map(p => p.peer)), accepted: new Set(), t0: performance.now() };
    const me = R.info();
    for (const g of guests) R.sendTo(g.peer, { t: 'minv', mid, sport: st.sport, games: st.games, level: st.level, from: `${me.nick} ${me.number}`, players: players.map(({ pid, team, peer, name }) => ({ pid, team, peer, name })) });
    W.setMode('explore');
    waitingNote();
  }
  function waitingNote(){
    if (!lobby) return;
    const names = lobby.players.filter(p => lobby.pending.has(p.peer)).map(p => p.name).join(', ');
    hud.note({ title: 'Sfida inviata', sub: names ? `In attesa di ${names}` : 'Si parte!', ms: 30000, action: { label: 'Annulla', fn: cancelLobby } });
  }
  function cancelLobby(){
    if (!lobby) return;
    for (const p of lobby.players) if (p.peer && p.peer !== R.myId) R.sendTo(p.peer, { t: 'mcancel', mid: lobby.mid });
    lobby = null; hud.clearNotes(); hud.toast('Sfida annullata');
  }
  function lobbyAnswer(from, ok, busy){
    if (!lobby || !lobby.pending.has(from)) return;
    lobby.pending.delete(from);
    const p = lobby.players.find(q => q.peer === from);
    if (ok) lobby.accepted.add(from);
    else { hud.toast(`${p.name} ${busy ? 'è impegnato' : 'ha detto di no'}: al suo posto il computer`); Object.assign(p, { peer: null, name: COMPUTER.name, look: COMPUTER.look }); }
    if (!lobby.pending.size) launch(); else { hud.clearNotes(); waitingNote(); }
  }
  function launch(){
    const L = lobby; lobby = null; hud.clearNotes();
    if (!L.accepted.size){ hud.note({ title: 'Nessuno ha accettato', sub: 'Riprova più tardi', ms: 4000 }); return; }
    for (const p of L.players) if (p.peer && p.peer !== R.myId && !L.accepted.has(p.peer)) Object.assign(p, { peer: null, name: COMPUTER.name, look: COMPUTER.look });
    const venue = L.sport === 'tennis' ? 'centrale' : (W.venues.padel ? 'padel' : 'village-padel');
    const cfg = { mid: L.mid, sport: L.sport, games: L.games, level: L.level, venue, seed: (Math.random()*2**31) >>> 0, host: R.myId, players: L.players.map(p => ({ ...p, look: p.peer === R.myId ? R.info().look : p.look })) };
    for (const p of cfg.players) if (p.peer && p.peer !== R.myId) R.sendTo(p.peer, { t: 'mstart', cfg });
    begin(cfg);
  }

  /* ============ ricevere un invito ============ */
  function onInvite(from, d){
    const busy = W.games.G.active || M || lobby || invite || !(W.mode === 'explore' || W.mode === 'drive');
    if (busy){ R.sendTo(from, { t: 'mans', mid: d.mid, ok: false, busy: true }); return; }
    invite = { mid: d.mid, from };
    const mine = d.players.find(p => p.peer === R.myId), team = t => d.players.filter(p => p.team === t).map(p => esc(p.name) + (p.peer === R.myId ? ' (tu)' : '')).join(' e ');
    const what = d.sport === 'tennis' ? 'una partita di tennis sul Campo Centrale' : 'una partita di padel, due contro due';
    const answer = ok => { if (!invite || invite.mid !== d.mid) return; clearTimeout(invite.timer); invite = null; R.sendTo(from, { t: 'mans', mid: d.mid, ok }); if (ok) hud.toast('Sfida accettata: si parte appena ci sono tutti'); };
    W.setMode('menu');
    hud.panel({ tag: 'Partita tra amici', title: `${d.from} ti sfida!`,
      html: `<p>${esc(d.from)} ti propone ${what}, ${d.games} game.</p><div class="vs small"><div class="team">${team(0)}</div><div class="vsl">contro</div><div class="team">${team(1)}</div></div><p class="fine left">Il tuo lato: ${mine && mine.team === 0 ? 'squadra di chi sfida' : 'avversari'}.</p>`,
      // prima la risposta, poi la chiusura (chiudere senza rispondere vale un «no»)
      buttons: [{ label: 'Accetta', primary: true, keep: true, onClick: () => { answer(true); hud.closePanel(); } }, { label: 'No, grazie', keep: true, onClick: () => { answer(false); hud.closePanel(); } }],
      onClose: () => { if (invite && invite.mid === d.mid) answer(false); if (W.mode === 'menu' && !M) W.setMode('explore'); } });
    invite.timer = setTimeout(() => { if (invite && invite.mid === d.mid){ hud.closePanel(); } }, (INVITE_TIME - 4)*1000);
  }

  /* ============ la partita ============ */
  function begin(cfg){
    if (hud.panelOpen()) hud.closePanel();
    if (W.games.G.active) W.games.exit();
    if (W.mode === 'drive') W.carts.exit();
    if (W.mode !== 'explore') W.setMode('explore');
    W.games.start('online', { cfg, venue: cfg.venue });
  }
  function scoreboard(names, games, labels, server){
    $('#scorebd').innerHTML = [0, 1].map(t => `<div class="${server === t ? 'srv' : ''}"><span>${esc(names[t])}</span><b>${games[t]}</b><i>${labels[t]}</i></div>`).join('');
  }
  function start(G, o){
    const cfg = o.cfg, V = W.venues[cfg.venue] || W.venues.centrale; G.V = V;
    const F = V.F, host = cfg.host === R.myId, me = cfg.players.find(p => p.peer === R.myId);
    const teams = [0, 1].map(t => cfg.players.filter(p => p.team === t).map(p => ({ id: p.pid, name: p.name.replace(/ \d+$/, ''), human: !!p.peer })));
    const looks = cfg.players.map(p => p.look);
    const names = [0, 1].map(t => cfg.players.filter(p => p.team === t).map(p => p.name.replace(/ \d+$/, '')).join(' / '));
    M = { cfg, host, me: me.pid, myTeam: me.team, V, F, names, sendT: 0, inT: 0, lastIn: '', edges: { hit: false, lob: false, jump: false }, remote: {}, evq: [], ended: false, G };
    if (host){
      M.core = new MatchCore({ sport: cfg.sport, teams, level: cfg.level, gamesToWin: cfg.games, rng: mulberry32(cfg.seed), firstServer: 1 });
      for (const p of cfg.players) if (p.peer && p.peer !== R.myId) M.remote[p.pid] = { peer: p.peer, move: { x: 0, y: 0 }, hit: false, lob: false, jump: false };
      M.view = new MatchRenderer(W, M.core, F, { looks, humanAvatar: W.hero, humanId: M.me });
    } else {
      // copia della partita da disegnare: stessi campi che usa MatchRenderer
      const court = COURTS[cfg.sport], players = [];
      teams.forEach((tm, t) => tm.forEach(p => players.push({ id: p.id, team: t, name: p.name, human: p.human, x: 0, y: 0, z: (t ? -1 : 1)*court.halfL, tx: 0, ty: 0, tz: 0, swing: 0, moving: 0, lastShot: '', speed: 6.6 })));
      const ball = newBall(); ball.held = true;
      M.mirror = { sport: cfg.sport, court, players, ball, phase: 'serve', serverP: players[0], score: { games: [0, 0], labels: ['0', '0'], server: 1 }, teamPlayers: t => players.filter(p => p.team === t) };
      M.view = new MatchRenderer(W, M.mirror, F, { looks, humanAvatar: W.hero, humanId: M.me });
      M.gotSnap = false;
    }
    G.phase = 'play'; G.stat2 = 0;
    show('#scorebd', true); scoreboard(names, [0, 0], ['0', '0'], 1);
    controls();
    W.engine.setFocus(F.x, F.z);
    M.view.sync(0); camera(0, true);
    hud.note({ title: cfg.sport === 'tennis' ? 'Tennis tra amici' : 'Padel tra amici', sub: `${names[0]} contro ${names[1]} · ${cfg.games} game`, ms: 3000 });
  }
  const controls = () => hud.instr('Joystick per muoverti · Colpo · Pallonetto · Salta', 'Frecce per muoverti · J o clic colpo · K pallonetto · Spazio salto');
  const P = () => (M.host ? M.core : M.mirror);
  const myPlayer = () => P().players.find(p => p.id === M.me);
  function camera(dt, snap = false){
    const c = P().court, h = myPlayer(), s = h.team === 0 ? 1 : -1, sport = M.cfg.sport;
    const back = sport === 'padel' ? c.halfL + 5.2 : c.halfL + 8.5, height = sport === 'padel' ? 4.8 : 6.2;
    const cam = W.engine.camera, pos = M.view.toWorld(h.x*.55, height, s*Math.max(back, h.z*s + 6)), at = M.view.toWorld(h.x*.35, .6, -3.5*s);
    if (snap) cam.position.copy(pos); else cam.position.lerp(pos, Math.min(1, dt*6));
    cam.lookAt(at);
  }
  function update(G, dt){
    if (!M || G.phase !== 'play') return;
    const input = W.input, mv = input.move();
    const cmd = { move: { x: mv.x, y: mv.y }, jump: input.pressed('jump'), hit: input.any('hit', 'lob'), lob: input.pressed('lob') };
    if (M.host) hostStep(dt, cmd); else guestStep(dt, cmd);
    M.view.sync(dt); camera(dt);
  }

  /* ---------- chi fa da arbitro ---------- */
  function hostStep(dt, cmd){
    const core = M.core, n = Math.max(1, Math.ceil(dt/(1/60)));
    for (let i = 0; i < n; i++){
      const inputs = { [M.me]: i === 0 ? cmd : { ...cmd, jump: false, hit: false, lob: false } };
      for (const [pid, r] of Object.entries(M.remote)){
        inputs[pid] = { move: r.move, hit: i === 0 && r.hit, lob: i === 0 && r.lob, jump: i === 0 && r.jump, late: true };
      }
      if (i === 0) for (const r of Object.values(M.remote)){ r.hit = r.lob = r.jump = false; }
      const ev = core.update(dt/n, inputs);
      for (const e of ev){ M.evq.push(slimEvent(e)); onEvent(e); }
      if (M.G.phase !== 'play' && M.ended) break;
    }
    if ((M.sendT -= dt) <= 0 || M.evq.some(e => e.type === 'match')){ M.sendT = SNAP; broadcastSnap(); }
  }
  function slimEvent(e){
    const o = { type: e.type };
    for (const k of ['team', 'player', 'shot', 'human', 'reason', 'second', 'winner']) if (e[k] !== undefined) o[k] = e[k];
    if (e.games) o.games = e.games;
    return o;
  }
  function broadcastSnap(){
    const core = M.core, b = core.ball, sc = core.score;
    const snap = { t: 'ms', mid: M.cfg.mid, ph: core.phase,
      b: [b.p.x, b.p.y, b.p.z, b.v.x, b.v.y, b.v.z, b.held ? 1 : 0, b.rolling ? 1 : 0, b.stopped ? 1 : 0].map(v => +(+v).toFixed(3)),
      P: core.players.map(p => [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +p.swing.toFixed(2), +p.moving.toFixed(2), Math.max(0, SHOTS.indexOf(p.lastShot || ''))]),
      sc: [sc.games[0], sc.games[1], ...pointLabels(sc), sc.server], sp: core.players.indexOf(core.serverP), ev: M.evq };
    M.evq = [];
    for (const r of Object.values(M.remote)) if (r.peer) R.sendTo(r.peer, snap);
  }
  function remoteInput(from, d){
    if (!M || !M.host || d.mid !== M.cfg.mid) return;
    const r = Object.values(M.remote).find(x => x.peer === from); if (!r) return;
    r.move = { x: d.mv[0], y: d.mv[1] }; if (d.h) r.hit = true; if (d.l) r.lob = true; if (d.j) r.jump = true;
  }
  // un amico esce o si scollega: gioca il computer al suo posto
  function toComputer(peer){
    if (!M || !M.host) return;
    const entry = Object.entries(M.remote).find(([, r]) => r.peer === peer); if (!entry) return;
    const [pid] = entry, p = M.core.players.find(q => q.id === pid), L = M.core.level;
    delete M.remote[pid];
    Object.assign(p, { human: false, reaction: L.reaction, speed: L.speed, reach: 1.25, skill: L.skill, react: 0, plan: null });
    hud.note({ title: `${p.name} ha lasciato la partita`, sub: 'Al suo posto gioca il computer', ms: 4000 });
  }

  /* ---------- chi gioca da un altro dispositivo ---------- */
  function guestStep(dt, cmd){
    const m = M.mirror, me = myPlayer();
    // comandi all'arbitro: subito i colpi, il movimento quando cambia (e ogni tanto comunque)
    M.edges.hit = M.edges.hit || cmd.hit; M.edges.lob = M.edges.lob || cmd.lob; M.edges.jump = M.edges.jump || cmd.jump;
    const key = cmd.move.x.toFixed(2) + ',' + cmd.move.y.toFixed(2);
    M.inT -= dt;
    if (M.edges.hit || M.edges.jump || key !== M.lastIn || M.inT <= 0){
      R.sendTo(M.cfg.host, { t: 'mi', mid: M.cfg.mid, mv: [+cmd.move.x.toFixed(2), +cmd.move.y.toFixed(2)], h: M.edges.hit ? 1 : 0, l: M.edges.lob ? 1 : 0, j: M.edges.jump ? 1 : 0 });
      M.edges = { hit: false, lob: false, jump: false }; M.lastIn = key; M.inT = INPUT_KEEPALIVE;
    }
    if (cmd.hit){ me.swing = .35; me.lastShot = cmd.lob ? 'lob' : 'drive'; }          // il braccio parte subito
    // il proprio giocatore si muove subito; l'arbitro lo corregge solo se ci si allontana
    const dir = me.team === 0 ? 1 : -1, sp = me.speed, Rr = m.court.runoff;
    const moving = Math.hypot(cmd.move.x, cmd.move.y) > .05;
    if (m.phase !== 'point' && m.phase !== 'fault' && m.phase !== 'over'){
      me.x += cmd.move.x*dir*sp*dt; me.z += -cmd.move.y*dir*sp*dt;
      me.x = Math.max(-Rr.x + .3, Math.min(Rr.x - .3, me.x)); me.z = Math.max(.4, Math.min(Rr.z - .3, me.z*dir))*dir;
    }
    me.moving = moving ? 1 : Math.max(0, me.moving - dt*4);
    const ex = me.tx - me.x, ez = me.tz - me.z, err = Math.hypot(ex, ez);
    const k = err > 1.6 ? Math.min(1, dt*10) : moving ? 0 : Math.min(1, dt*3);
    me.x += ex*k; me.z += ez*k; me.y += (me.ty - me.y)*Math.min(1, dt*15);
    // gli altri scivolano verso l'ultima posizione ricevuta
    for (const p of m.players){
      if (p === me) continue;
      const k2 = Math.hypot(p.tx - p.x, p.tz - p.z) > 3 ? 1 : Math.min(1, dt*14);
      p.x += (p.tx - p.x)*k2; p.z += (p.tz - p.z)*k2; p.y += (p.ty - p.y)*Math.min(1, dt*15);
    }
    for (const p of m.players) p.swing = Math.max(0, p.swing - dt);
    // la palla prosegue con la stessa fisica fino al prossimo aggiornamento
    if (!m.ball.held && M.gotSnap) stepBall(m.ball, dt, m.court);
  }
  function applySnap(from, s){
    if (!M || M.host || s.mid !== M.cfg.mid || from !== M.cfg.host) return;
    const m = M.mirror, b = m.ball;
    m.phase = s.ph;
    b.p = { x: s.b[0], y: s.b[1], z: s.b[2] }; b.v = { x: s.b[3], y: s.b[4], z: s.b[5] }; b.held = !!s.b[6]; b.rolling = !!s.b[7]; b.stopped = !!s.b[8];
    s.P.forEach((q, i) => {
      const p = m.players[i]; if (!p) return;
      p.tx = q[0]; p.ty = q[1]; p.tz = q[2]; if (p.id !== M.me || !M.gotSnap){ p.moving = q[4]; }
      if (!M.gotSnap){ p.x = q[0]; p.y = q[1]; p.z = q[2]; }
      if (q[3] > p.swing + .05) p.swing = q[3];
      p.lastShot = SHOTS[q[5]] || '';
    });
    m.serverP = m.players[s.sp] || m.serverP;
    m.score = { games: [s.sc[0], s.sc[1]], labels: [s.sc[2], s.sc[3]], server: s.sc[4] };
    M.gotSnap = true;
    for (const e of s.ev) onEvent(e);
  }

  /* ---------- eventi: stessi messaggi per tutti, dal punto di vista di ciascuno ---------- */
  function onEvent(e){
    const G = M.G, mine = e.team === M.myTeam;
    if (e.type === 'hit') W.bus.emit('sfx', e.shot === 'smash' ? 'smash' : 'hit');
    if (e.type === 'bounce') W.bus.emit('sfx', 'bounce');
    if (e.type === 'serveReady' && e.player === M.me) hud.instr(e.second ? 'Seconda palla: tocca Colpo per servire' : 'Tocca Colpo per servire, joystick per mirare', e.second ? 'Seconda palla: J per servire, frecce per mirare' : 'Al servizio: J o clic per servire, frecce per mirare');
    if (e.type === 'hit' && e.player === M.me) controls();
    if (e.type === 'fault') hud.flash('Fallo', e.second ? 'seconda palla' : reasonLabel(e.reason));
    if (e.type === 'point'){
      hud.flash(mine ? 'Punto!' : 'Punto per loro', reasonLabel(e.reason));
      W.bus.emit('crowd', mine ? 'cheer' : 'oh');
      if (mine && /vincente|ace/.test(e.reason)) G.stat2++;
      const sc = M.host ? { games: M.core.score.games, labels: pointLabels(M.core.score), server: M.core.score.server } : M.mirror.score;
      if (!M.host && e.games) sc.games = e.games;
      scoreboard(M.names, sc.games, sc.labels, sc.server);
    }
    if (e.type === 'game') hud.toast(`Game ${mine ? 'vostro' : 'loro'}: ${e.games[M.myTeam]}-${e.games[1 - M.myTeam]}`);
    if (e.type === 'match' && !M.ended){
      M.ended = true; G.phase = 'done'; G.won = e.winner === M.myTeam; G.score = e.games[M.myTeam]; G.oppGames = e.games[1 - M.myTeam];
      W.progress.badge('amici');
      setTimeout(() => W.games.end(), 900);
    }
  }
  // lo stato del tabellone arriva con ogni aggiornamento anche per chi non fa da arbitro
  setInterval(() => { if (M && !M.host && M.gotSnap && M.G.phase === 'play'){ const s = M.mirror.score; scoreboard(M.names, s.games, s.labels, s.server); } }, 500);

  function cleanup(){
    if (!M) return;
    const was = M; M = null;
    if (!was.ended){
      // si esce prima della fine: l'arbitro ferma la partita per tutti, gli altri lasciano il posto al computer
      if (was.host){ for (const r of Object.values(was.remote)) R.sendTo(r.peer, { t: 'mend', mid: was.cfg.mid }); }
      else R.sendTo(was.cfg.host, { t: 'mquit', mid: was.cfg.mid });
    }
    was.view.dispose(); show('#scorebd', false); hud.hideInstr();
    const [x, z] = was.V.exit(); W.player.place(x, z, was.F.x, was.F.z);
  }
  function abort(text){
    if (!M) return;
    M.ended = true; hud.note({ title: 'Partita interrotta', sub: text, ms: 5000 });
    W.games.exit();
  }

  /* ============ messaggi ============ */
  R.on((from, d) => {
    switch (d.t){
      case 'minv': onInvite(from, d); break;
      case 'mans': if (lobby && d.mid === lobby.mid) lobbyAnswer(from, d.ok, d.busy); break;
      case 'mcancel': if (invite && invite.mid === d.mid){ clearTimeout(invite.timer); invite = null; if (hud.panelOpen()) hud.closePanel(); hud.toast('La sfida è stata annullata'); } break;
      case 'mstart': if (!M) begin(d.cfg); break;
      case 'mi': remoteInput(from, d); break;
      case 'ms': applySnap(from, d); break;
      case 'mquit': if (M && M.host && d.mid === M.cfg.mid) toComputer(from); break;
      case 'mend': if (M && !M.host && d.mid === M.cfg.mid) abort('Chi arbitrava la partita è uscito'); break;
      case 'closed':
        if (lobby){ lobby = null; hud.clearNotes(); }
        if (invite){ clearTimeout(invite.timer); invite = null; }
        if (M) abort('La stanza degli amici è stata chiusa');
        break;
      case 'left':
        if (lobby && lobby.pending.has(from)) lobbyAnswer(from, false);
        if (M && M.host) toComputer(from);
        if (M && !M.host && from === M.cfg.host) abort('Chi arbitrava la partita si è scollegato');
        break;
    }
  });
  // controllo dei tempi degli inviti
  setInterval(() => {
    if (lobby && (performance.now() - lobby.t0)/1000 > INVITE_TIME){ for (const p of [...lobby.pending]) lobbyAnswer(p, false); }
  }, 1000);

  W.games.register({
    id: 'online', title: 'Partita tra amici', place: 'Foro Italico', kind: 'match', venue: 'centrale', hud: 'match', noAgain: true,
    intro: '', rules: [],
    start, update, cleanup,
    end: G => ({ title: G.won ? 'Vittoria!' : 'Sconfitta', won: !!G.won,
      stats: [{ v: G.score ?? 0, label: 'Game vinti' }, { v: G.oppGames ?? 0, label: 'Game persi' }, { v: G.stat2, label: 'Vincenti' }],
      note: G.won ? 'Hai battuto i tuoi amici: chiedi la rivincita dal pannello Amici.' : 'Rivincita? La lanci dal pannello Amici.' }),
  });
  return {
    openLobby,
    get active(){ return M; },
    get lobby(){ return lobby; },
    // per le prove automatiche
    test: { launchNow: () => lobby && launch(), accept: () => { const b = [...document.querySelectorAll('#panel .buttons button')].find(x => x.textContent === 'Accetta'); if (b) b.click(); } },
  };
}

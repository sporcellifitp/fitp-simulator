// Gioca con gli amici: una stanza condivisa con un link. Chi crea la stanza fa da punto d'incontro (host) e passa
// agli altri le posizioni di tutti, dieci volte al secondo. Connessione diretta tra i browser (WebRTC, libreria PeerJS
// in js/vendor/, MIT); per trovarsi si usa il servizio pubblico gratuito di PeerJS (0.peerjs.com).
//
// Limiti del prototipo, da sapere: fino a 8 giocatori; chi è nella stanza vede l'indirizzo IP degli altri (connessione
// diretta); se chi ha creato la stanza esce, la stanza si chiude; alcune reti aziendali o mobili bloccano WebRTC.
// Per un lancio pubblico serve un server FITP (per esempio un Worker Cloudflare): basta sostituire il trasporto qui.
// Niente chat libera: solo messaggi e saluti predefiniti, senza moderazione da gestire.
import * as THREE from 'three';
import { $, show, esc, isTouch } from '../core/util.js';
import { makeAvatar, pose } from '../entities/avatar.js';
import { makeCartMesh } from '../entities/cart.js';
import { hud } from '../ui/hud.js';

const MAX = 8, RATE = 1/10;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const QUICK = ['Ciao!', 'Vieni qui!', 'Seguimi!', 'Andiamo al Centrale?', 'Sfida al servizio?', 'Bel colpo!', 'Grazie!', 'A dopo!'];
const COLORS = ['#d8342c', '#2f8f57', '#7a3fa0', '#f08a3c', '#2b7bd6', '#c8643b', '#1d9aa8', '#b8327a'];

// server di segnalazione: di norma quello pubblico di PeerJS; per le prove «?peer=127.0.0.1:9000»
function peerConfig(){
  const m = /[?&]peer=([^&#]+)/.exec(location.search);
  if (!m) return {};
  const [host, port] = decodeURIComponent(m[1]).split(':');
  return { host, port: +(port || 443), path: '/fiw', secure: location.protocol === 'https:' && !/^(127\.|localhost)/.test(host) };
}
let libP = null;
const loadLib = () => libP || (libP = new Promise((res, rej) => {
  if (window.Peer) return res(window.Peer);
  const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js'; s.onload = () => res(window.Peer); s.onerror = () => rej(new Error('peerjs')); document.head.appendChild(s);
}));

export function createRoom(W){
  const scene = W.engine.scene, labels = $('#labels');
  let peer = null, host = false, code = null, me = null, hostConn = null, sendT = 0, status = 'off';
  const conns = new Map();                 // solo per chi ospita: id → connessione
  const players = new Map();               // gli altri: id → { nick, number, look, color, av, label, bubble, cur, tgt, car, … }
  const pendingLink = (() => { const m = /[#&]stanza=([A-Z0-9]{4,8})/i.exec(location.hash); return m ? m[1].toUpperCase() : null; })();

  const myInfo = () => { const p = W.ugc.profile.get(); return { nick: p.nick, number: p.number, look: p.look }; };
  const myState = () => {
    const car = W.mode === 'drive' && W.carts.cart, p = car ? W.carts.cart : W.player.pos;
    return { t: 's', x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +(car ? W.world.groundH(p.x, p.z) : W.player.pos.y).toFixed(2), ry: +(car ? W.carts.cart.h : W.hero.g.rotation.y).toFixed(3), st: W.player.st.state, car: !!car };
  };
  const link = () => location.origin + location.pathname + location.search + '#stanza=' + code;

  /* ---------- gli altri giocatori nel mondo ---------- */
  function addPlayer(id, info){
    if (players.has(id) || id === (peer && peer.id)) return players.get(id);
    const color = COLORS[players.size % COLORS.length];
    const av = makeAvatar(info.look); av.g.userData.dynamic = true; av.g.visible = false; scene.add(av.g);
    const label = document.createElement('div'); label.className = 'label friend'; label.style.background = color; label.textContent = `${info.nick} ${info.number}`; labels.appendChild(label);
    const bubble = document.createElement('div'); bubble.className = 'bubble hidden'; labels.appendChild(bubble);
    const o = { id, ...info, color, av, label, bubble, cur: null, tgt: null, ph: 0, bubbleT: 0, cart: null };
    players.set(id, o); paintPanel();
    return o;
  }
  function removePlayer(id){
    const o = players.get(id); if (!o) return;
    scene.remove(o.av.g); if (o.cart) scene.remove(o.cart); o.label.remove(); o.bubble.remove(); players.delete(id); paintPanel();
    hud.toast(`${o.nick} ${o.number} è uscito dalla stanza`);
  }
  function say(o, text){ o.bubble.textContent = text; o.bubble.classList.remove('hidden'); o.bubbleT = 4; }

  /* ---------- messaggi ---------- */
  // tutti i messaggi hanno { t, id? }: hello/welcome/join/leave/s (stato)/look/say/bye
  function handle(msg, from){
    if (host && msg.t !== 'hello') msg.id = from;      // chi ospita non si fida dell'id dichiarato
    switch (msg.t){
      case 'hello': {
        if (players.size + 1 >= MAX){ const c = conns.get(from); c && c.send({ t: 'full' }); return; }
        const o = addPlayer(from, msg.me); hud.toast(`${o.nick} ${o.number} è entrato nella stanza`, 'gold');
        const list = [{ id: peer.id, ...myInfo() }, ...[...players.values()].filter(p => p.id !== from).map(p => ({ id: p.id, nick: p.nick, number: p.number, look: p.look }))];
        conns.get(from).send({ t: 'welcome', you: from, players: list });
        broadcast({ t: 'join', p: { id: from, ...msg.me } }, from);
        return;
      }
      case 'welcome': for (const p of msg.players) addPlayer(p.id, p); status = 'in'; paintPanel(); hud.toast(`Sei nella stanza ${code}: ${players.size} amici con te`, 'gold'); return;
      case 'join': { const o = addPlayer(msg.p.id, msg.p); if (o) hud.toast(`${o.nick} ${o.number} è entrato nella stanza`); return; }
      case 'leave': removePlayer(msg.id); return;
      case 'full': hud.note({ title: 'Stanza piena', sub: `Ci sono già ${MAX} giocatori`, ms: 4000 }); leave(true); return;
      case 's': {
        const o = players.get(msg.id); if (!o) return;
        o.tgt = msg; if (!o.cur){ o.cur = { ...msg }; o.av.g.visible = true; if (!host && msg.id === hostId() && !o.met){ o.met = true; join2(o); } }
        if (host) broadcast(msg, from);
        return;
      }
      case 'look': { const o = players.get(msg.id); if (o){ o.look = msg.look; o.av.setLook(msg.look); } if (host) broadcast(msg, from); return; }
      case 'say': { const o = players.get(msg.id); if (o){ say(o, QUICK[msg.k] || '👋'); if (msg.k === 0) o.waveT = 1.5; } if (host) broadcast(msg, from); return; }
    }
  }
  const hostId = () => 'fiw-' + code;
  // chi arriva con il link compare accanto a chi l'ha invitato
  function join2(o){ const [x, z] = W.pois.safeSpot(o.tgt.x + 2.5, o.tgt.z + 2.5, null); if (W.mode === 'explore') W.player.place(x, z, o.tgt.x, o.tgt.z); }
  function broadcast(msg, except){ for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); }
  function send(msg){ if (host) broadcast({ ...msg, id: peer.id }); else if (hostConn && hostConn.open) hostConn.send(msg); }

  /* ---------- creare, entrare, uscire ---------- */
  async function create(){
    if (status !== 'off') return;
    status = 'connecting'; paintPanel();
    try {
      const Peer = await loadLib();
      code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random()*ALPHA.length)]).join('');
      peer = new Peer(hostId(), peerConfig()); host = true;
      peer.on('open', () => { status = 'in'; paintPanel(); history.replaceState(null, '', '#stanza=' + code); });
      peer.on('connection', c => {
        c.on('open', () => conns.set(c.peer, c));
        c.on('data', d => handle(d, c.peer));
        c.on('close', () => { conns.delete(c.peer); removePlayer(c.peer); broadcast({ t: 'leave', id: c.peer }); });
      });
      peer.on('error', e => fail(e));
    } catch (e){ fail(e); }
  }
  async function join(c){
    if (status !== 'off') return;
    code = c; status = 'connecting'; paintPanel();
    try {
      const Peer = await loadLib();
      peer = new Peer(peerConfig()); host = false;
      peer.on('open', () => {
        hostConn = peer.connect(hostId(), { reliable: true });
        hostConn.on('open', () => hostConn.send({ t: 'hello', me: myInfo() }));
        hostConn.on('data', d => handle(d, hostId()));
        hostConn.on('close', () => { if (status === 'in'){ hud.note({ title: 'La stanza è stata chiusa', sub: 'Chi l\'aveva creata è uscito', ms: 5000 }); leave(true); } });
      });
      peer.on('error', e => fail(e));
    } catch (e){ fail(e); }
  }
  function fail(e){
    const t = e && e.type;
    const msg = t === 'peer-unavailable' ? 'Questa stanza non esiste più: chiedi un link nuovo'
      : t === 'unavailable-id' ? 'Codice già in uso: riprova'
      : t === 'network' || t === 'server-error' || t === 'socket-error' ? 'Non riesco a collegarmi: controlla la connessione (alcune reti bloccano il gioco con gli amici)'
      : 'Collegamento non riuscito';
    hud.note({ title: 'Gioco con gli amici', sub: msg, ms: 6000 });
    leave(true);
  }
  function leave(quiet = false){
    if (peer){ try { if (!host && hostConn) hostConn.close(); peer.destroy(); } catch (e){} }
    for (const id of [...players.keys()]){ const o = players.get(id); scene.remove(o.av.g); if (o.cart) scene.remove(o.cart); o.label.remove(); o.bubble.remove(); players.delete(id); }
    conns.clear(); peer = null; hostConn = null; host = false; code = null; status = 'off';
    if (/stanza=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    paintPanel(); if (!quiet) hud.toast('Sei uscito dalla stanza');
  }

  /* ---------- pannello «Amici» ---------- */
  function paintPanel(){
    $('#roomChip').textContent = status === 'in' ? `Amici · ${players.size + 1}` : 'Amici';
    $('#roomChip').classList.toggle('live', status === 'in');
    const box = $('#friends .fbody'); if (!box || $('#friends').classList.contains('hidden')) return;
    if (status === 'off'){
      box.innerHTML = `<p>Crea una stanza e manda il link agli amici: aprendolo entrano nel tuo stesso Foro, vi vedete e vi muovete insieme.</p>
        <button class="primary" data-r="create">Crea una stanza</button>
        <p class="fine left">Gratis, fino a ${MAX} giocatori. La connessione è diretta tra i vostri browser: condividi il link solo con persone che conosci. Niente chat libera, solo messaggi già pronti.</p>`;
    } else if (status === 'connecting'){
      box.innerHTML = `<p>Collegamento in corso…</p>`;
    } else {
      const list = [...players.values()];
      box.innerHTML = `
        <div class="rlink"><small>Stanza <b>${esc(code)}</b> · manda questo link:</small><input readonly value="${esc(link())}"><div class="row">
          <button class="primary" data-r="share">${navigator.share ? 'Condividi il link' : 'Copia il link'}</button>${navigator.share ? '<button data-r="copy">Copia</button>' : ''}</div></div>
        <label>Nella stanza</label>
        <div class="plist"><div class="pl me"><i style="background:#0b2a5b"></i><b>${esc(myInfo().nick)} ${myInfo().number}</b><small>${host ? 'tu · hai creato la stanza' : 'tu'}</small></div>
          ${list.map(o => `<div class="pl"><i style="background:${o.color}"></i><b>${esc(o.nick)} ${o.number}</b><span><button data-go="${o.id}">Raggiungi</button><button data-nav="${o.id}">Guidami</button></span></div>`).join('') || '<p class="fine left">Nessuno ancora: manda il link!</p>'}</div>
        <label>Messaggi veloci</label>
        <div class="quick">${QUICK.map((q, i) => `<button data-q="${i}">${esc(q)}</button>`).join('')}</div>
        <button class="secondary" data-r="leave">Esci dalla stanza</button>`;
    }
    box.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.r;
      if (r === 'create') create();
      if (r === 'leave') leave();
      if (r === 'share' && navigator.share) navigator.share({ title: 'Foro Italico World', text: `Vieni a giocare con me al Foro Italico: stanza ${code}`, url: link() }).catch(() => {});
      if (r === 'copy' || (r === 'share' && !navigator.share)){ const i = box.querySelector('.rlink input'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(link()) : Promise.reject()).then(() => hud.toast('Link copiato'), () => { try { document.execCommand('copy'); hud.toast('Link copiato'); } catch (e){} }); }
    }));
    box.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const o = players.get(b.dataset.go); if (!o || !o.cur) return; closePanel(); const [x, z] = W.pois.safeSpot(o.cur.x + 2.5, o.cur.z + 2.5, null); W.player.place(x, z, o.cur.x, o.cur.z); }));
    box.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => { const o = players.get(b.dataset.nav); if (!o || !o.cur) return; closePanel(); W.nav.set({ x: o.cur.x, z: o.cur.z, r: 5, name: `${o.nick} ${o.number}`, at: () => o.cur && { x: o.cur.x, z: o.cur.z } }); }));
    box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { const k = +b.dataset.q; send({ t: 'say', k }); showMine(QUICK[k]); if (k === 0) W.player.st.emote = 2.5; closePanel(); }));
  }
  // il proprio messaggio compare sopra la propria testa
  const mine = document.createElement('div'); mine.className = 'bubble hidden'; labels.appendChild(mine); let mineT = 0;
  const showMine = t => { mine.textContent = t; mine.classList.remove('hidden'); mineT = 4; };
  function openPanel(){ W.setMode('menu'); show('#friends', true); paintPanel(); }
  function closePanel(){ show('#friends', false); if (W.mode === 'menu') W.setMode('explore'); }
  $('#roomChip').addEventListener('click', openPanel);
  $('#friendsClose').addEventListener('click', closePanel);
  W.bus.on('look', look => { if (status === 'in') send({ t: 'look', look }); });

  /* ---------- ogni fotogramma ---------- */
  const v = new THREE.Vector3();
  const project = (el, x, y, z, on) => {
    if (!on){ el.style.opacity = 0; return; }
    const cam = W.engine.camera; v.set(x, y, z); const d = cam.position.distanceTo(v); v.project(cam);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && d < 160;
    el.style.opacity = vis ? 1 : 0;
    if (vis) el.style.transform = `translate(${(v.x*.5 + .5)*innerWidth}px, ${(-v.y*.5 + .5)*innerHeight}px) translate(-50%,-100%)`;
  };
  return {
    get status(){ return status; }, get code(){ return code; }, get host(){ return host; }, get players(){ return players; },
    pendingLink, create, join, leave, openPanel, send, link,
    update(dt){
      const explore = W.mode === 'explore' || W.mode === 'drive' || W.mode === 'dialogue';
      if (status === 'in' && (sendT -= dt) <= 0){ sendT = RATE; send(myState()); }
      for (const o of players.values()){
        if (!o.cur || !o.tgt) continue;
        // si va verso l'ultima posizione ricevuta, senza scatti
        const k = Math.min(1, dt*9), c = o.cur, t = o.tgt, dx = t.x - c.x, dz = t.z - c.z, spd = Math.hypot(dx, dz)/RATE;
        if (Math.hypot(dx, dz) > 30){ c.x = t.x; c.z = t.z; } else { c.x += dx*k; c.z += dz*k; }
        c.y += (t.y - c.y)*k; let dr = t.ry - c.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.ry += dr*k;
        if (t.car){
          if (!o.cart){ o.cart = makeCartMesh(0xffffff, 0x1f4fa3); o.cart.userData.dynamic = true; scene.add(o.cart); }
          o.cart.position.set(c.x, W.world.groundH(c.x, c.z), c.z); o.cart.rotation.y = c.ry; o.cart.visible = true;
          const sx = Math.cos(c.ry)*.32, sz = -Math.sin(c.ry)*.32;
          o.av.g.position.set(c.x + sx, c.y + .55, c.z + sz); o.av.g.rotation.y = c.ry; pose(o.av, { state: 'sit', t: W.engine.time });
        } else {
          if (o.cart) o.cart.visible = false;
          o.av.g.position.set(c.x, c.y, c.z); o.av.g.rotation.y = c.ry;
          const moving = spd > .8; o.ph += dt*(spd > 8 ? 17 : 11)*(moving ? 1 : 0);
          o.waveT = Math.max(0, (o.waveT || 0) - dt);
          pose(o.av, { state: o.waveT > 0 ? 'wave' : t.st === 'jump' ? 'jump' : moving ? (spd > 8 ? 'run' : 'walk') : (t.st === 'cheer' ? 'cheer' : 'idle'), phase: o.ph, amt: 1, t: W.engine.time });
        }
        project(o.label, c.x, c.y + 2.75, c.z, explore);
        o.bubbleT = Math.max(0, o.bubbleT - dt); if (o.bubbleT <= 0) o.bubble.classList.add('hidden'); else project(o.bubble, c.x, c.y + 3.35, c.z, true);
      }
      mineT = Math.max(0, mineT - dt); if (mineT <= 0) mine.classList.add('hidden'); else { const p = W.player.pos; project(mine, p.x, p.y + 3.35, p.z, true); }
    },
  };
}

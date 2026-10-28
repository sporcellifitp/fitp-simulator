// Avvio: motore 3D, arena, menu, partita contro la CPU e sfida online.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { buildArena } from './arena.js';
import { loadPlayers } from './player.js';
import { GameCamera } from './camera.js';
import { Swipe } from './input.js';
import { Match } from './match.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Net, newRoomCode } from './net.js';

const store = {
  get(k, d) { try { return localStorage.getItem(`sta:${k}`) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`sta:${k}`, v); } catch { /* archivio non disponibile */ } },
};
const prefs = { level: store.get('level', 'normale'), format: store.get('format', 'breve'), muted: store.get('muted', '0') === '1', name: store.get('name', '') };

const canvas = document.getElementById('scene');
const lowEnd = /Android|iPhone|iPad/i.test(navigator.userAgent) && (navigator.hardwareConcurrency || 4) <= 4;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);
const gcam = new GameCamera(camera);
const ui = new UI(document.getElementById('ui'), prefs);
const audio = new Audio();
audio.muted = prefs.muted;
const swipe = new Swipe(document.getElementById('touch'));

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let arena = null, assets = null, match = null, net = null, paused = false;
let menuT = 0;

async function boot() {
  ui.progress(0.1, 'Costruzione dell\'arena…');
  arena = await buildArena(scene, { quality: lowEnd ? 'low' : 'high' });
  ui.progress(0.6, 'Ingresso dei giocatori…');
  assets = await loadPlayers(new GLTFLoader());
  ui.progress(1, 'Pronti!');
  renderer.compile(scene, camera);
  setTimeout(() => ui.hideLoading(), 250);
  const room = new URLSearchParams(location.search).get('room');
  if (room) ui.showOnline({ name: prefs.name, code: room.toUpperCase() });
  else ui.showMenu();
  window.__ready = true;
}

// ── menu ─────────────────────────────────────────────────────────────────
const firstGesture = async () => {
  await audio.unlock();
  audio.setMuted(prefs.muted);
  if (!match) audio.music(true);
};
window.addEventListener('pointerdown', firstGesture, { once: true });

ui.on('pref', (k, v) => { prefs[k] = v; store.set(k, v); });
ui.on('mute', () => {
  prefs.muted = !prefs.muted;
  store.set('muted', prefs.muted ? '1' : '0');
  audio.setMuted(prefs.muted);
  ui.setMuteLabel(prefs.muted);
});
ui.on('howto', () => ui.showHowto());
ui.on('back', () => { leaveOnline(); history.replaceState(null, '', location.pathname); ui.showMenu(); });
ui.on('cpu', () => startCpu());
ui.on('online', () => ui.showOnline({ name: prefs.name }));
ui.on('create', (name) => {
  prefs.name = name; store.set('name', name);
  const code = newRoomCode();
  history.replaceState(null, '', `?room=${code}`);
  joinRoom(code, name, true);
  ui.showWaiting(code, location.href);
});
ui.on('join', (name, code) => {
  if (!/^[A-Z0-9]{4,6}$/.test(code)) { ui.onlineMessage('Codice non valido'); return; }
  prefs.name = name; store.set('name', name);
  history.replaceState(null, '', `?room=${code}`);
  joinRoom(code, name, false);
  ui.showWaiting(code, location.href);
  ui.onlineMessage('Collegamento alla partita…');
});
ui.on('share', async (link) => {
  try {
    if (navigator.share) await navigator.share({ title: 'SuperTennis Arena', text: 'Ti sfido a tennis nell\'arena ESPORTS FITP!', url: link });
    else { await navigator.clipboard.writeText(link); ui.onlineMessage('Link copiato! In attesa dell\'avversario…'); }
  } catch { /* condivisione annullata */ }
});
ui.on('pause', () => {
  if (!match) return;
  paused = match.mode === 'cpu';
  ui.showPause(match.mode === 'online');
});
ui.on('resume', () => { paused = false; ui.hidePause(); });
ui.on('quit', () => { paused = false; ui.hidePause(); endMatch(); ui.showMenu(); });
ui.on('menu', () => { ui.hideEnd(); endMatch(); ui.showMenu(); });
ui.on('rematch', () => {
  ui.hideEnd();
  if (match?.mode === 'online') { net.reset(); return; }
  startCpu();
});

function endMatch() {
  if (match) { match.dispose(); match = null; }
  leaveOnline();
  history.replaceState(null, '', location.pathname);
  audio.crowd(false);
  audio.music(true);
}

function startCpu() {
  if (match) match.dispose();
  audio.music(false);
  match = new Match({ scene, arena, ui, audio, camera: gcam, swipe, assets, mode: 'cpu', mySeat: 0, difficulty: prefs.level, format: prefs.format, names: [prefs.name || 'Tu', 'CPU'], firstServer: 0 });
  ui.showHud();
  match.start();
}

// ── online ───────────────────────────────────────────────────────────────
function joinRoom(code, name, creator) {
  leaveOnline();
  net = new Net(code);
  let helloSent = false;
  net.on('status', (s) => {
    if (match) ui.netStatus(s === 'connected' ? '' : s === 'reconnecting' ? 'Connessione persa, riprovo…' : s);
  });
  net.on('state', (m) => {
    const seat = m.seats.indexOf(net.id);
    if (!helloSent && seat >= 0 && m.status === 'playing') { // prima i due giocatori devono essere in stanza
      helloSent = true;
      net.action({ type: 'hello', name });
      if (creator && seat === 0) net.action({ type: 'config', format: prefs.format });
    }
    if (seat < 0) { ui.onlineMessage('La partita è già piena.'); return; }
    const view = m.view;
    if (m.status === 'waiting' || !view) { if (!match) ui.onlineMessage('In attesa dell\'avversario…'); return; }
    if (match && match.mode === 'online' && view.pointSeq < match.pointSeq) {
      // rivincita: stato azzerato dal server
      match.dispose(); match = null;
    }
    if (!match) {
      if (m.connected < 2) { ui.onlineMessage('In attesa dell\'avversario…'); return; }
      audio.music(false);
      const names = view.names.map((n, i) => n || (i === 0 ? 'Giocatore 1' : 'Giocatore 2'));
      match = new Match({ scene, arena, ui, audio, camera: gcam, swipe, assets, mode: 'online', net, mySeat: seat, format: view.score.format, names, firstServer: view.score.server });
      match.score = view.score;
      match.pointSeq = view.pointSeq;
      match.lastShotSeq = view.shotSeq;
      ui.showHud();
      match.start();
    } else {
      match.names = view.names.map((n, i) => n || match.names[i]);
      match.onServerState(view);
    }
    ui.netStatus(m.connected < 2 ? 'L\'avversario si è scollegato…' : '');
  });
  net.on('rt', (d) => { if (d.k === 'pos' && match) match.onRemotePos(d); });
  net.connect();
}

function leaveOnline() {
  if (net) { net.close(); net = null; }
}

// ── ciclo ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (match) {
    if (!paused) {
      if (match.mode === 'online' && net) match.latency = net.latency;
      match.update(dt);
    }
  } else if (arena) {
    // menu: giro lento attorno al campo
    menuT += dt * 0.07;
    camera.position.set(Math.sin(menuT) * 26, 9 + Math.sin(menuT * 0.7) * 2, Math.cos(menuT) * 26);
    camera.lookAt(0, 0.5, 0);
    if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
  }
  renderer.render(scene, camera);
}
frame();
boot().catch((e) => {
  console.error(e);
  ui.progress(1, 'Errore nel caricamento: ricarica la pagina.');
});

// per i test automatici
window.__game = { get match() { return match; }, ui, startCpu };

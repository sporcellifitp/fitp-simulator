// Bacheca dei tifosi nella fan zone: messaggi con frasi e colori preimpostati (niente testo libero).
// Oggi i messaggi restano in questo browser; con un server passeranno da una moderazione prima di essere visibili a tutti.
import * as THREE from 'three';
import { $, esc } from '../core/util.js';
import { store } from '../core/store.js';
import { hud } from '../ui/hud.js';

export const PHRASES = [
  'Forza ragazzi!', 'Che partita!', 'Viva il tennis!', 'Viva il padel!', 'Ci vediamo al Centrale', 'Che bello il Foro!',
  'Tifo per il gioco pulito', 'Prossimo anno in campo io!', 'Grazie raccattapalle!', 'Evviva gli Internazionali!',
];
const INK = ['#1f4fa3', '#d8342c', '#2f8f57', '#c8643b', '#7a3fa0', '#0b2a5b'];
const SEED = [{ nick: 'Giulia', text: 'Viva il padel!', ink: '#1f4fa3' }, { nick: 'Luca', text: 'Grazie raccattapalle!', ink: '#7a3fa0' }, { nick: 'Sara', text: 'Che bello il Foro!', ink: '#d8342c' }];

export function createBoard(W, spot){
  let msgs = store.get('board', null) || SEED.slice();
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 640;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  function draw(){
    const x = canvas.getContext('2d');
    x.fillStyle = '#f6f1e7'; x.fillRect(0, 0, 1024, 640);
    x.fillStyle = '#0b2a5b'; x.fillRect(0, 0, 1024, 96);
    x.fillStyle = '#fff'; x.font = 'bold 56px "Barlow Condensed", Arial Narrow, sans-serif'; x.fillText('BACHECA DEI TIFOSI', 36, 68);
    msgs.slice(-8).reverse().forEach((m, i) => {
      const cx = 36 + (i % 2)*490, cy = 124 + Math.floor(i/2)*126;
      x.fillStyle = '#ffffff'; x.fillRect(cx, cy, 460, 108); x.fillStyle = m.ink; x.fillRect(cx, cy, 10, 108);
      x.fillStyle = m.ink; x.font = 'bold 40px "Barlow Condensed", Arial Narrow, sans-serif'; x.fillText(m.text, cx + 26, cy + 50);
      x.fillStyle = '#5b6678'; x.font = '30px Barlow, Arial, sans-serif'; x.fillText('— ' + m.nick, cx + 26, cy + 90);
    });
    tex.needsUpdate = true;
  }
  draw();
  if (spot){
    const g = new THREE.Group(); g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.rot;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.25), new THREE.MeshBasicMaterial({ map: tex })); panel.position.set(0, 2.5, .08); g.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.5, .14), new THREE.MeshLambertMaterial({ color: 0x0b2a5b })); back.position.set(0, 2.5, 0); g.add(back);
    for (const sx of [-2.4, 2.4]){ const leg = new THREE.Mesh(new THREE.BoxGeometry(.16, 1, .16), new THREE.MeshLambertMaterial({ color: 0x2a2f3a })); leg.position.set(sx, .5, 0); g.add(leg); }
    g.traverse(o => { o.userData.dynamic = true; o.castShadow = true; });
    W.engine.scene.add(g);
    W.interact.add({ id: 'board', x: spot.x + Math.sin(spot.rot)*1.8, z: spot.z + Math.cos(spot.rot)*1.8, r: 3, label: 'Scrivi sulla bacheca dei tifosi', short: 'Scrivi', act: () => open() });
  }
  function open(){
    let phrase = PHRASES[0], ink = INK[0];
    const html = () => `<p>Scegli una frase e un colore: il messaggio compare sulla bacheca con il tuo nome, <b>${esc(W.ugc.profile.get().nick)}</b>.</p>
      <div class="phr">${PHRASES.map(p => `<button class="${p === phrase ? 'on' : ''}" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <div class="sw">${INK.map(c => `<button style="background:${c}" data-c="${c}" class="${c === ink ? 'on' : ''}"></button>`).join('')}</div>
      <p class="fine">Per ora i messaggi restano su questo dispositivo.</p>`;
    W.setMode('menu');
    const box = hud.panel({ tag: 'Fan zone', title: 'Bacheca dei tifosi', html: html(), buttons: [
      { label: 'Pubblica', primary: true, onClick: () => { msgs.push({ nick: W.ugc.profile.get().nick, text: phrase, ink }); msgs = msgs.slice(-24); store.set('board', msgs); draw(); W.progress.badge('tifoso'); hud.toast('Messaggio pubblicato sulla bacheca'); } },
      { label: 'Annulla' },
    ], onClose: () => W.setMode('explore') });
    const body = box.querySelector('.body');
    const wire = () => {
      body.innerHTML = html();
      body.querySelectorAll('.phr button').forEach(b => b.addEventListener('click', () => { phrase = b.dataset.p; wire(); }));
      body.querySelectorAll('.sw button').forEach(b => b.addEventListener('click', () => { ink = b.dataset.c; wire(); }));
    };
    wire();
  }
  return { open, messages: () => msgs };
}

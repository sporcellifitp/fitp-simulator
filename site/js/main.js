// Avvio di Foro Italico World: carica la planimetria, costruisce il mondo, crea giocatore, sistemi, NPC e modalità di gioco.
// Tutti i moduli ricevono W, il contesto condiviso: così ognuno dichiara di cosa ha bisogno e si può estendere senza toccare gli altri.
import { $, show, isTouch, esc } from './core/util.js';
import { createBus } from './core/events.js';
import { createInput } from './core/input.js';
import { createEngine } from './core/engine.js';
import { loadLayout } from './world/layout.js';
import { setBounds } from './world/collision.js';
import { initGeom, batchStatic } from './world/geom.js';
import { buildWorld } from './world/build.js';
import { buildProps } from './world/props.js';
import { makeAvatar, pose } from './entities/avatar.js';
import { createPlayer } from './entities/player.js';
import { hud } from './ui/hud.js';
import { createInteract } from './systems/interact.js';
import { createPois } from './systems/pois.js';
import { createNpcs, createDialogue } from './systems/npcs.js';
import { createProgress } from './systems/progress.js';
import { createActivities } from './systems/activities.js';
import { createGames } from './games/registry.js';
import { registerServe } from './games/serve.js';
import { registerVetro } from './games/vetro.js';
import { registerRaccattapalle } from './games/raccattapalle.js';
import { createMedals } from './games/medaglie.js';
import { registerMatches } from './match/view.js';
import { createExhibitions } from './match/exhibitions.js';
import { createUgc } from './ugc/profile.js';
import { createBoard } from './ugc/board.js';
import { npcDefs } from './content/npcs.js';

if (isTouch) document.body.classList.add('touch');

const W = { mode: 'intro', live: {} };
W.bus = createBus();
W.engine = createEngine($('#app'));
W.input = createInput(W.engine.renderer.domElement);
W.hud = hud;
W.layout = await loadLayout();
setBounds(W.layout.bounds);
initGeom(W.engine.scene, W.engine.renderer);

// mondo statico, poi allestimenti (fusi a loro volta), poi tutto ciò che si muove
W.world = buildWorld(W);
W.interact = createInteract(W);
W.props = buildProps(W);
batchStatic();

W.hero = makeAvatar({});
W.engine.scene.add(W.hero.g);
W.player = createPlayer(W, W.hero);
W.player.active = true;
W.games = createGames(W);
W.pois = createPois(W);
W.progress = createProgress(W);
W.ugc = createUgc(W);
W.ugc.profile.apply();
W.ugc.board = createBoard(W, W.props.boardSpot);
W.dialogue = createDialogue(W);
W.medals = createMedals(W);
W.activities = createActivities(W);
registerServe(W); registerVetro(W); registerRaccattapalle(W);
W.matches = registerMatches(W);
W.exhibitions = createExhibitions(W);
W.npcs = createNpcs(W);
for (const d of npcDefs(W)) W.npcs.spawn(d);
W.bus.on('live:score', s => { W.live[s.venue] = s; });

/* ---------- modalità: intro, explore, dialogue, menu, game ---------- */
W.hud.setExplore = on => {
  for (const id of ['#brand', '#goto', '#menuBtns']) show(id, on);
  show('#hint', on && !isTouch);
  show('#attrib', on && !!W.layout.attribution);
  W.pois.setVisible(on);
  if (!on){ hud.prompt(null); show('#poi', false); }
};
W.setMode = m => {
  W.mode = m;
  if (m === 'explore'){ W.hud.setExplore(true); W.input.setContext('explore'); }
  if (m === 'dialogue' || m === 'menu'){ W.input.setContext('menu'); hud.prompt(null); }
};

/* ---------- sistemi, in ordine ---------- */
const E = W.engine;
E.add({ update: dt => { if (W.mode === 'explore') W.player.update(dt); } }, 20);
E.add({ update: dt => W.games.update(dt) }, 25);
E.add({ update: () => W.dialogue.update() }, 30);
E.add({ update: () => W.interact.update() }, 35);
E.add({ update: dt => W.npcs.update(dt) }, 40);
E.add({ update: dt => W.exhibitions.update(dt) }, 45);
E.add({ update: dt => { W.props.update(dt); if (W.mode === 'explore') W.medals.update(dt); } }, 50);
E.add({ update: () => W.pois.update() }, 60);
E.add({ update: dt => { for (const c of W.world.clouds){ c.position.x += dt*2.2; if (c.position.x > 380) c.position.x = -380; } } }, 70);
E.add({ update: () => {                                          // scorciatoie da tastiera in esplorazione
  if (W.mode !== 'explore') return;
  if (W.input.pressed('album')) W.progress.openAlbum();
  if (W.input.pressed('profile')) W.ugc.profile.open();
} }, 80);
{ // giro di telecamera dietro la schermata iniziale
  const S = W.layout.sites, a = S.centrale, b = S.marmi || S.centrale, o = { x: (a.x + b.x)/2, z: (a.z + b.z)/2 };
  E.add({ update: () => {
    if (W.mode !== 'intro') return;
    const t = performance.now()/9000; E.camera.position.set(o.x + Math.cos(t)*150, 70, o.z + Math.sin(t)*150); E.camera.lookAt(o.x, 0, o.z); E.setFocus(o.x, o.z);
  } }, 90);
}
E.add({ update: () => W.input.endFrame() }, 999);

/* ---------- avvio ---------- */
const start = W.layout.start;
W.player.place(start.x, start.z); W.hero.g.rotation.y = start.ry || 0; W.player.cam.yaw = W.hero.g.rotation.y + Math.PI;
function enterWorld(){ show('#intro', false); W.setMode('explore'); W.player.follow(0, true); }
if (W.layout.attribution){ $('#attrib').textContent = W.layout.attribution; $('#mapsrc').textContent = 'Planimetria da OpenStreetMap (' + W.layout.attribution + '). Alcuni impianti del 2026 sono posizionati a stima.'; }
if (isTouch) $('#controls').innerHTML = '<li><b>Joystick</b> per camminare (spingi fino al bordo per correre), <b>Salta</b> per saltare</li><li><b>Trascina</b> lo schermo per girare la visuale</li><li>Vicino a persone e campi compare il pulsante per <b>parlare</b> o <b>giocare</b></li>';
$('#start').disabled = false; $('#start').textContent = 'Entra al Foro';
$('#start').addEventListener('click', enterWorld);
$('#introProfile').addEventListener('click', () => { enterWorld(); W.ugc.profile.open(); });
for (const b of document.querySelectorAll('[data-quick]')){
  const a = W.activities.list().find(x => x.id === b.dataset.quick);
  if (!a){ b.remove(); continue; }
  b.disabled = false; b.addEventListener('click', () => { enterWorld(); a.go(); });
}
$('#mAlbum').addEventListener('click', () => W.progress.openAlbum());
$('#mProfile').addEventListener('click', () => W.ugc.profile.open());
$('#panelClose').addEventListener('click', () => hud.closePanel());
$('#shareBox button').addEventListener('click', () => { const i = $('#shareBox input'); i.select(); try { document.execCommand('copy'); hud.toast('Link copiato'); } catch (e){} });

// sfida ricevuta con un link
const ch = W.ugc.challenge.readFromUrl();
if (ch){
  const d = W.games.get(ch.game);
  show('#introChallenge', true);
  $('#introChallenge').innerHTML = `<b>${esc(ch.nick)}</b> ti sfida a «${esc(d ? d.title : ch.game)}»: batti <b>${ch.score}</b> punti con la stessa sequenza.<button class="primary" id="acceptCh">Accetta la sfida</button>`;
  $('#acceptCh').addEventListener('click', () => { enterWorld(); W.activities.go(ch.game); W.games.openHowto(ch.game, { seed: ch.seed, challenge: ch }); });
}
// scorciatoie per chi prova il prototipo: #centrale, #padel
if (location.hash === '#centrale' || location.hash === '#padel'){
  const F = location.hash === '#padel' ? W.world.PF : W.world.CF;
  if (F){ const [x, z] = F.w(0, 8); W.player.place(x, z, F.x, F.z); }
}
W.input.setContext('intro');
window.__fiw = W;   // per i test automatici
E.start();

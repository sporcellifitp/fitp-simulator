// Avvio di Foro Italico World: carica la planimetria, costruisce il mondo, crea giocatore, sistemi, NPC e modalità di gioco.
// Tutti i moduli ricevono W, il contesto condiviso: così ognuno dichiara di cosa ha bisogno e si può estendere senza toccare gli altri.
import { $, show, isTouch, esc } from './core/util.js';
import { createBus } from './core/events.js';
import { createInput } from './core/input.js';
import { createEngine } from './core/engine.js';
import { loadLayout } from './world/layout.js';
import * as collision from './world/collision.js';
import { initGeom, batchStatic } from './world/geom.js';
import { buildWorld } from './world/build.js';
import { buildProps } from './world/props.js';
import { buildVillage } from './world/village.js';
import { buildTour } from './world/tour.js';
import { buildSigns } from './world/signs.js';
import { createCarts } from './entities/cart.js';
import { createNav } from './systems/nav.js';
import { createEconomy } from './systems/economy.js';
import { createShop } from './ugc/shop.js';
import { CART_PRICE } from './content/shop.js';
import { makeAvatar, pose } from './entities/avatar.js';
import { createPlayer } from './entities/player.js';
import { hud } from './ui/hud.js';
import { createInteract } from './systems/interact.js';
import { createPois } from './systems/pois.js';
import { createNpcs, createDialogue } from './systems/npcs.js';
import { createProgress } from './systems/progress.js';
import { createActivities } from './systems/activities.js';
import { createRoute } from './systems/route.js';
import { createCharacters } from './ugc/characters.js';
import { createRoom } from './net/room.js';
import { registerOnline } from './match/online.js';
import { characters } from './core/store.js';
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

const W = { mode: 'intro', live: {}, venues: {}, cameraZones: [], CART_PRICE };
W.bus = createBus();
W.engine = createEngine($('#app'));
W.input = createInput(W.engine.renderer.domElement);
W.hud = hud;
W.layout = await loadLayout();
collision.setBounds(W.layout.bounds);
W.collision = collision;
initGeom(W.engine.scene, W.engine.renderer);

// mondo statico, Fan Village, allestimenti e cartelli (tutto fuso per materiale), poi tutto ciò che si muove
W.world = buildWorld(W);
W.interact = createInteract(W);
{
  const { CF, PF, DIM } = W.world, L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step;
  W.venues.centrale = { F: CF, sport: 'tennis', y0: 0, exit: () => CF.w(0, L + 4), label: 'Campo Centrale' };
  if (PF) W.venues.padel = { F: PF, sport: 'padel', y0: 0, exit: () => PF.w(7, 0), label: 'Campo da padel' };
}
W.village = buildVillage(W);
W.props = buildProps(W);

W.hero = makeAvatar({});
W.engine.scene.add(W.hero.g);
W.player = createPlayer(W, W.hero);
W.player.active = true;
W.games = createGames(W);
W.pois = createPois(W);
W.signs = buildSigns(W, signDests(), signPosts());
W.tour = buildTour(W);                 // museo itinerante: cerca le sue tappe quando il resto del mondo è a posto
batchStatic();
W.progress = createProgress(W);
W.economy = createEconomy(W);
W.ugc = createUgc(W);
W.ugc.profile.apply();
W.ugc.board = createBoard(W, W.village ? W.village.boardSpot : null);
W.shop = createShop(W);
W.dialogue = createDialogue(W);
W.medals = createMedals(W);
W.carts = createCarts(W);
W.nav = createNav(W);
W.activities = createActivities(W);
registerServe(W); registerVetro(W); registerRaccattapalle(W);
W.matches = registerMatches(W);
W.exhibitions = createExhibitions(W);
W.npcs = createNpcs(W);
for (const d of npcDefs(W)) W.npcs.spawn(d);
W.bus.on('live:score', s => { W.live[s.venue] = s; });
W.route = createRoute(W);               // Percorso del Foro: totem nelle tappe, strada calcolata sugli ostacoli
W.route.build();
W.room = createRoom(W);                 // gioca con gli amici: stanza condivisa con un link
W.online = registerOnline(W);           // partite di tennis e padel tra amici

/* ---------- modalità: intro, explore, dialogue, menu, game ---------- */
W.hud.setExplore = on => {
  for (const id of ['#goto', '#menuBtns', '#coins']) show(id, on);
  show('#brand', on && !isTouch);                // sul telefono il titolo lascia spazio al navigatore
  show('#hint', on && !isTouch);
  show('#attrib', on && !!W.layout.attribution);
  W.pois.setVisible(on);
  if (!on){ hud.prompt(null); show('#poi', false); }
};
W.setMode = m => {
  W.mode = m;
  if (m === 'explore'){ W.hud.setExplore(true); W.input.setContext('explore'); }
  if (m === 'dialogue' || m === 'menu'){ W.input.setContext('menu'); hud.prompt(null); }
  if (m === 'drive'){ W.hud.setExplore(true); hud.prompt(null); show('#poi', false); show('#hint', false); W.input.setContext('drive'); }
};

/* ---------- sistemi, in ordine ---------- */
const E = W.engine;
E.add({ update: dt => { if (W.mode === 'explore') W.player.update(dt); } }, 20);
E.add({ update: dt => W.carts.update(dt) }, 22);
E.add({ update: dt => W.games.update(dt) }, 25);
E.add({ update: () => W.dialogue.update() }, 30);
E.add({ update: () => W.interact.update() }, 35);
E.add({ update: dt => W.npcs.update(dt) }, 40);
E.add({ update: dt => W.room.update(dt) }, 41);
E.add({ update: dt => W.exhibitions.update(dt) }, 45);
E.add({ update: dt => { W.props.update(dt); if (W.village) W.village.update(dt); if (W.tour) W.tour.update(dt); if (W.mode === 'explore') W.medals.update(dt); } }, 50);
E.add({ update: () => W.nav.update() }, 65);
E.add({ update: dt => W.route.update(dt) }, 66);
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

/* ---------- cartelli: mete principali e dove piantare i pali ---------- */
function signDests(){
  const S = W.layout.sites, { CF, P, DIM } = W.world, L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step, out = [];
  const add = (id, name, xz, prio, kind) => { if (xz) out.push({ id, name, x: xz[0], z: xz[1], prio, kind }); };
  if (W.village) add('village', 'Fan Village', W.village.anchors.entrance, 0, 'village');
  add('centrale', 'Campo Centrale', CF.w(0, L + 3), 2);
  if (P.pietr) add('pietr', 'Pietrangeli', P.pietr.f.w(0, P.pietr.hl + 3), 3);
  if (P.marmi) add('marmi', 'Stadio dei Marmi', P.marmi.f.w(0, P.marmi.b + 3), 3);
  if (S.supertennis) add('st', 'SuperTennis Arena', [S.supertennis.x, S.supertennis.z], 4);
  if (S.fontana) add('fontana', 'Fontana della Sfera', [S.fontana.x, S.fontana.z], 5);
  if (S.ponte) add('uscita', 'Ponte Duca d\'Aosta', [S.ponte.x, S.ponte.z], 6, 'uscita');
  return out;
}
function signPosts(){
  const S = W.layout.sites, { CF, P, DIM } = W.world, L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step, out = [];
  const add = (id, xz) => { if (xz) out.push({ id, at: xz }); };
  const st = W.layout.start; add('start', [st.x + Math.cos(st.ry || 0)*4, st.z - Math.sin(st.ry || 0)*4]);
  if (W.village){ const e = W.village.F.w(9, W.village.v.l/2 + 5); add('village', e); add('plaza', W.village.F.w(-4, 10)); }
  if (S.fontana) add('fontana', [S.fontana.x + 11, S.fontana.z - 6]);
  add('centrale', CF.w(-7, L + 6));
  if (P.pietr) add('pietr', P.pietr.f.w(P.pietr.hw + 4, 9));
  if (P.marmi) add('marmi', P.marmi.f.w(8, P.marmi.b + 6));
  if (S.supertennis) add('st', [S.supertennis.x + 12, S.supertennis.z + 12]);
  return out;
}

/* ---------- avvio: si compare nel Fan Village e parte il Percorso del Foro ---------- */
const start = W.layout.start;
const spawn = () => {
  if (W.village){ const [x, z] = W.village.anchors.spawn, [ex, ez] = W.village.anchors.entrance; W.player.place(x, z, ex, ez); }
  else { W.player.place(start.x, start.z); W.hero.g.rotation.y = start.ry || 0; W.player.cam.yaw = W.hero.g.rotation.y + Math.PI; }
};
spawn();
let afterEnter = null;                    // azione da fare appena dentro (sfida ricevuta, stanza degli amici)
function enterWorld(){
  show('#intro', false); W.setMode('explore'); W.player.follow(0, true);
  const R = W.progress.st.route, room = W.room.pendingLink;
  if (!W.progress.st.welcomed){
    W.progress.st.welcomed = 1; W.progress.save();
    // chi arriva con il link di un amico lo raggiunge; gli altri partono con il Percorso del Foro
    if (!room) setTimeout(() => W.route.start(0), 500);
  } else if (R && R.on && !room) setTimeout(() => W.route.resume(), 500);
  if (room) setTimeout(() => W.room.join(room), 300);
  if (afterEnter){ const f = afterEnter; afterEnter = null; setTimeout(f, 50); }
}
// un solo pulsante: si entra con il proprio personaggio (chi non ce l'ha lo crea, chi ce l'ha scrive il nome)
W.who = createCharacters(W, { onEnter: enterWorld });
if (W.layout.attribution){ $('#attrib').textContent = W.layout.attribution; $('#mapsrc').textContent = 'Planimetria da OpenStreetMap (' + W.layout.attribution + '). Alcuni impianti del 2026 sono posizionati a stima.'; }
if (isTouch) $('#controls').innerHTML = '<li><b>Joystick</b> per camminare, spingilo oltre il bordo o tocca <b>Corri</b> per correre</li><li><b>Trascina</b> lo schermo per girare la visuale</li><li>Vicino a persone e campi compare il pulsante per <b>parlare</b> o <b>giocare</b></li>';
$('#start').disabled = false; $('#start').textContent = 'Entra con il tuo personaggio';
$('#start').addEventListener('click', () => W.who.open());
if (W.room.pendingLink){
  show('#introRoom', true);
  $('#introRoom').innerHTML = `Sei stato invitato in una stanza con gli amici (codice <b>${esc(W.room.pendingLink)}</b>): entra con il tuo personaggio e li raggiungi.`;
}
$('#mAlbum').addEventListener('click', () => W.progress.openAlbum());
$('#mProfile').addEventListener('click', () => W.ugc.profile.open());
$('#panelClose').addEventListener('click', () => hud.closePanel());
$('#shareBox button').addEventListener('click', () => { const i = $('#shareBox input'); i.select(); try { document.execCommand('copy'); hud.toast('Link copiato'); } catch (e){} });

// sfida ricevuta con un link
let challengeAction = null;
const ch = W.ugc.challenge.readFromUrl();
if (ch){
  const d = W.games.get(ch.game);
  show('#introChallenge', true);
  $('#introChallenge').innerHTML = `<b>${esc(ch.nick)}</b> ti sfida a «${esc(d ? d.title : ch.game)}»: batti <b>${ch.score}</b> punti con la stessa sequenza.<button class="primary" id="acceptCh">Accetta la sfida</button>`;
  challengeAction = () => { W.activities.go(ch.game); W.games.openHowto(ch.game, { seed: ch.seed, challenge: ch }); };
  $('#acceptCh').addEventListener('click', () => { afterEnter = challengeAction; W.who.open(); });
}
// scorciatoie per chi prova il prototipo: #centrale, #padel
if (location.hash === '#centrale' || location.hash === '#padel'){
  const F = location.hash === '#padel' ? W.world.PF : W.world.CF;
  if (F){ const [x, z] = F.w(0, 8); W.player.place(x, z, F.x, F.z); }
}
W.input.setContext('intro');
// dopo il cambio di personaggio la pagina si ricarica ed entra da sola
if (characters.takeAutoEnter()){ afterEnter = challengeAction; enterWorld(); }   // la sfida del link resta valida anche dopo il cambio
window.__fiw = W;   // per i test automatici
E.start();

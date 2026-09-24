// Resa grafica di una MatchCore dentro un campo del mondo, e le modalità «Partita di tennis» e «Partita di padel».
import * as THREE from 'three';
import { $, show, esc } from '../core/util.js';
import { makeAvatar, pose } from '../entities/avatar.js';
import { MatchCore } from './core.js';
import { pointLabels } from './rules.js';
import { hud } from '../ui/hud.js';

const REASON = { fuori: 'Fuori', rete: 'Rete', vincente: 'Vincente!', ace: 'Ace!', 'doppio fallo': 'Doppio fallo', vetro: 'Sul vetro', 'fuori dal recinto': 'Fuori dal recinto!', 'doppio colpo': 'Doppio colpo' };
export const reasonLabel = r => REASON[r] || r;

// Disegna giocatori e palla di una partita. F: sistema locale del campo; y0: quota del campo (Pietrangeli e arena sono ribassati).
export class MatchRenderer {
  constructor(W, core, F, { y0 = 0, looks = [], humanAvatar = null } = {}){
    this.W = W; this.core = core; this.F = F; this.y0 = y0;
    this.group = new THREE.Group(); this.group.position.set(F.x, y0, F.z); this.group.rotation.y = F.rot;
    W.engine.scene.add(this.group);
    this.avatars = core.players.map((p, i) => {
      if (p.human && humanAvatar){ this.group.add(humanAvatar.g); return humanAvatar; }
      const av = makeAvatar(looks[i] || {}); this.group.add(av.g); return av;
    });
    this.human = humanAvatar;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), new THREE.MeshLambertMaterial({ color: 0xd9f24a, emissive: 0x3a400e }));
    this.ball.castShadow = true; this.group.add(this.ball);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.12, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI/2; this.group.add(this.shadow);
    this.phase = 0;
  }
  sync(dt){
    const c = this.core, b = c.ball.p;
    this.phase += dt*14;
    c.players.forEach((p, i) => {
      const av = this.avatars[i];
      av.g.position.set(p.x, p.y, p.z);
      // guarda verso la rete, un po' girato verso la palla
      const base = p.team === 0 ? Math.PI : 0, look = Math.atan2(b.x - p.x, b.z - p.z);
      let d = look - base; d = Math.atan2(Math.sin(d), Math.cos(d));
      av.g.rotation.y = base + Math.max(-.9, Math.min(.9, d))*.6;
      const state = p.y > .05 ? 'jump' : p.moving > .2 ? 'run' : 'idle';
      pose(av, { state, phase: this.phase + i, amt: Math.min(1, p.moving), t: this.W.engine.time + i, swing: p.swing > 0 ? p.swing/.35 : 0, overhead: p.lastShot === 'smash' || (p === c.serverP && c.phase !== 'live' && c.sport === 'tennis') });
    });
    this.ball.visible = !c.ball.held || c.phase === 'serve';
    this.ball.position.set(b.x, b.y + .1, b.z);
    this.shadow.position.set(b.x, .03, b.z); this.shadow.visible = this.ball.visible;
  }
  toWorld(x, y, z){ const v = new THREE.Vector3(x, y, z); return this.group.localToWorld(v); }
  dispose(){
    if (this.human) this.W.engine.scene.add(this.human.g);
    this.W.engine.scene.remove(this.group);
    this.group.traverse(o => { if (o.geometry && o !== this.human) o.geometry.dispose?.(); });
  }
}

/* ---------- modalità giocabili ---------- */
const OPPONENTS = [
  { name: 'Leo', look: { shirt: 0xffffff, shorts: 0x2a2f3a, cap: 0xd8342c } },
  { name: 'Marta', look: { shirt: 0xd8342c, shorts: 0xffffff, cap: 0xffffff, hair: 0x6b3b1c } },
  { name: 'Tommaso', look: { shirt: 0x2f8f57, shorts: 0x0b2a5b, hasCap: false, hair: 0x1d1d1f } },
  { name: 'Irene', look: { shirt: 0xf3c623, shorts: 0x0b2a5b, cap: 0x0b2a5b } },
  { name: 'Samuele', look: { shirt: 0x0b2a5b, shorts: 0xffffff, cap: 0xf3c623 } },
];
const LEVEL_OPT = { key: 'level', label: 'Livello', def: 'normale', choices: [{ value: 'facile', label: 'Facile' }, { value: 'normale', label: 'Normale' }, { value: 'esperto', label: 'Esperto' }] };
const LEN_OPT = { key: 'games', label: 'Durata', def: 2, choices: [{ value: 1, label: '1 game' }, { value: 2, label: '2 game' }, { value: 4, label: '4 game' }] };

export function registerMatches(W){
  const { CF, PF } = W.world;
  let M = null;                      // { core, view, venue }

  function scoreboard(core){
    const sc = core.score, lab = pointLabels(sc), names = [0, 1].map(t => core.teamPlayers(t).map(p => p.name).join(' / '));
    $('#scorebd').innerHTML = [0, 1].map(t => `<div class="${sc.server === t ? 'srv' : ''}"><span>${esc(names[t])}</span><b>${sc.games[t]}</b><i>${lab[t]}</i></div>`).join('');
  }
  function controlsHint(){
    hud.instr('Joystick per muoverti · Colpo · Pallonetto · Salta', 'Frecce per muoverti · J o clic colpo · K pallonetto · Spazio salto');
  }
  function begin(G, sport, opts){
    const F = sport === 'padel' ? PF : CF, profile = W.ugc.profile.get();
    const rng = G.rng, pick = () => OPPONENTS[Math.floor(rng()*OPPONENTS.length)];
    const opp = [], used = new Set();
    while (opp.length < (sport === 'padel' ? 3 : 1)){ const o = pick(); if (!used.has(o.name)){ used.add(o.name); opp.push(o); } }
    const teams = sport === 'padel'
      ? [[{ human: true, name: profile.nick }, { name: opp[0].name }], [{ name: opp[1].name }, { name: opp[2].name }]]
      : [[{ human: true, name: profile.nick }], [{ name: opp[0].name }]];
    const looks = sport === 'padel' ? [null, opp[0].look, opp[1].look, opp[2].look] : [null, opp[0].look];
    const core = new MatchCore({ sport, teams, level: opts.level || 'normale', gamesToWin: +opts.games || 2, goldenPoint: false, rng, firstServer: 1 });
    const view = new MatchRenderer(W, core, F, { looks, humanAvatar: W.hero });
    M = { core, view, sport, F };
    G.phase = 'play';
    show('#scorebd', true); scoreboard(core); controlsHint();
    W.engine.setFocus(F.x, F.z);
    view.sync(0); camera(0, true);
  }
  function camera(dt, snap = false){
    const { core, view, sport } = M, h = core.players.find(p => p.human), c = core.court;
    const back = sport === 'padel' ? c.halfL + 5.2 : c.halfL + 8.5, height = sport === 'padel' ? 4.8 : 6.2;
    const cam = W.engine.camera, pos = view.toWorld(h.x*.55, height, Math.max(back, h.z + 6)), at = view.toWorld(h.x*.35, .6, -3.5);
    if (snap) cam.position.copy(pos); else cam.position.lerp(pos, Math.min(1, dt*6));
    cam.lookAt(at);
  }
  function update(G, dt){
    if (!M || G.phase !== 'play') return;
    const input = W.input, mv = input.move();
    const cmd = { move: mv, jump: input.pressed('jump'), hit: input.any('hit', 'lob'), lob: input.pressed('lob') };
    const { core, view } = M;
    // passi piccoli: la palla non deve «saltare» il giocatore quando il telefono va a scatti
    const n = Math.max(1, Math.ceil(dt/(1/60)));
    for (let i = 0; i < n; i++){
      const ev = core.update(dt/n, i === 0 ? cmd : { ...cmd, jump: false, hit: false, lob: false });
      for (const e of ev) onEvent(G, e);
      if (G.phase !== 'play') break;
    }
    view.sync(dt); camera(dt);
  }
  function onEvent(G, e){
    const core = M.core, human = core.players.find(p => p.human);
    if (e.type === 'hit') W.bus.emit('sfx', e.shot === 'smash' ? 'smash' : 'hit');
    if (e.type === 'bounce') W.bus.emit('sfx', 'bounce');
    if (e.type === 'serveReady') hud.instr(e.second ? 'Seconda palla: tocca Colpo per servire' : 'Tocca Colpo per servire, joystick per mirare', e.second ? 'Seconda palla: J per servire, frecce per mirare' : 'Al servizio: J o clic per servire, frecce per mirare');
    if (e.type === 'hit' && e.human) controlsHint();
    if (e.type === 'fault') hud.flash(e.second ? 'Fallo' : 'Fallo', e.second ? 'seconda palla' : reasonLabel(e.reason));
    if (e.type === 'point'){
      const mine = e.team === human.team;
      hud.flash(mine ? 'Punto!' : 'Punto per loro', reasonLabel(e.reason));
      scoreboard(core); W.bus.emit('crowd', mine ? 'cheer' : 'oh');
      if (mine && /vincente|ace/.test(e.reason)) G.stat2++;
    }
    if (e.type === 'game') hud.toast(`Game ${e.team === human.team ? 'tuo' : 'loro'}: ${e.games[human.team]}-${e.games[1 - human.team]}`);
    if (e.type === 'match'){ G.phase = 'done'; G.won = e.winner === human.team; G.score = e.games[human.team]; G.oppGames = e.games[1 - human.team]; setTimeout(() => W.games.end(), 900); }
  }
  function cleanup(){
    if (!M) return;
    M.view.dispose(); const F = M.F, sport = M.sport; M = null;
    show('#scorebd', false);
    const [x, z] = sport === 'padel' ? F.w(7, 0) : F.w(0, W.world.DIM.centrale.l/2 + W.world.DIM.centrale.tiers*W.world.DIM.centrale.step + 4);
    W.player.place(x, z, F.x, F.z);
  }
  const endInfo = (G, sport) => ({
    title: G.won ? 'Vittoria!' : 'Sconfitta',
    stats: [{ v: G.score ?? 0, label: 'Game vinti' }, { v: G.oppGames ?? 0, label: 'Game persi' }, { v: G.stat2, label: 'Vincenti' }],
    note: G.won ? (sport === 'padel' ? 'Hai vinto la partita di padel.' : 'Hai vinto la partita sul Centrale.') : 'Riprova: con le frecce raggiungi la palla prima, poi colpisci.',
    won: !!G.won,
  });

  W.games.register({
    id: 'tennis', title: 'Partita di tennis', place: 'Campo Centrale', kind: 'match', venue: 'centrale', hud: 'match', goLabel: 'In campo',
    intro: 'Singolare sul Campo Centrale contro un avversario comandato dal computer. Punteggio vero: 15, 30, 40, vantaggi e game.',
    rules: [
      '<b>Muoviti</b> con le frecce (o WASD, o il joystick): raggiungi la palla prima che rimbalzi due volte.',
      '<b>Colpisci</b> con J, un clic o il pulsante Colpo quando la palla è vicina. Tenendo una freccia a destra o a sinistra scegli la direzione.',
      '<b>Pallonetto</b> con K o il tasto destro; <b>salta</b> con Spazio: se la palla è alta, in salto parte lo smash.',
      'Al servizio premi Colpo: la palla deve cadere nel riquadro in diagonale. Due tentativi.',
      'Al livello <b>Facile</b>, se non tocchi le frecce il personaggio va da solo verso la palla: tu pensi solo a colpire.',
    ],
    options: [LEVEL_OPT, LEN_OPT],
    start(G, o){ begin(G, 'tennis', o); }, update, cleanup, end: G => endInfo(G, 'tennis'),
  });
  if (PF) W.games.register({
    id: 'padel', title: 'Partita di padel', place: 'Campo da padel', kind: 'match', venue: 'padel', hud: 'match', goLabel: 'In campo',
    intro: 'Doppio di padel: tu e un compagno contro due avversari. La palla deve rimbalzare nel campo avversario prima di toccare il vetro; dopo il rimbalzo si gioca anche con le pareti.',
    rules: [
      '<b>Muoviti</b> con le frecce: il tuo compagno copre l\'altra metà del campo.',
      '<b>Colpisci</b> con J o un clic, <b>pallonetto</b> con K: sopra gli avversari a rete è il colpo giusto.',
      '<b>Salta</b> con Spazio per lo smash sulle palle alte.',
      'Servizio dal basso, in diagonale nel riquadro avversario. Punteggio come nel tennis.',
      'Al livello <b>Facile</b>, se non tocchi le frecce il personaggio va da solo verso la palla: tu pensi solo a colpire.',
    ],
    options: [LEVEL_OPT, LEN_OPT],
    start(G, o){ begin(G, 'padel', o); }, update, cleanup, end: G => endInfo(G, 'padel'),
  });
  return { get active(){ return M; } };
}

// Registro delle modalità di gioco. Ogni modalità è un oggetto con:
//   id, title, place, kind ('minigame' | 'match' | 'activity'), intro, rules[], goLabel
//   options?: [{ key, label, choices:[{value,label}], def }]   scelte mostrate prima di giocare (livello, durata…)
//   start(G, opts), update(G, dt), tap?(G), cleanup(G), end: (G) => { title, stats:[{v,label}]×3 }
//   bestKey?, seedable?   record salvato e codice sfida
// Aggiungere un gioco significa scrivere un modulo che chiama games.register(def): nient'altro da toccare.
import { $, show, esc } from '../core/util.js';
import { store } from '../core/store.js';
import { hud } from '../ui/hud.js';
import { mulberry32 } from '../match/core.js';

export function createGames(W){
  const defs = new Map();
  const G = { active: false, phase: 'off' };
  let cur = null, howto = null, opts = {}, lastOpts = {};

  function register(def){ defs.set(def.id, def); return def; }
  function get(id){ return defs.get(id); }

  function openHowto(id, preset = {}){
    const d = defs.get(id); if (!d) return;
    howto = d; opts = { ...preset };
    for (const o of d.options || []) if (opts[o.key] == null) opts[o.key] = store.get('opt.' + d.id + '.' + o.key, o.def);
    const V = W.venues[preset.venue || d.venue];
    $('#hTag').textContent = V && V.label ? V.label : d.place; $('#hTitle').textContent = d.title; $('#hText').textContent = d.intro;
    $('#hList').innerHTML = d.rules.map(r => `<li>${r}</li>`).join('');
    const box = $('#hOpts'); box.innerHTML = '';
    for (const o of d.options || []){
      const row = document.createElement('div'); row.className = 'opt';
      row.innerHTML = `<span>${esc(o.label)}</span>`;
      for (const c of o.choices){
        const b = document.createElement('button'); b.textContent = c.label; b.className = opts[o.key] === c.value ? 'on' : '';
        b.addEventListener('click', () => { opts[o.key] = c.value; store.set('opt.' + d.id + '.' + o.key, c.value); for (const x of row.querySelectorAll('button')) x.className = ''; b.className = 'on'; });
        row.appendChild(b);
      }
      box.appendChild(row);
    }
    const ch = preset.challenge;
    show('#hChallenge', !!ch);
    if (ch) $('#hChallenge').textContent = `Sfida di ${ch.nick}: batti ${ch.score} punti con la stessa sequenza.`;
    $('#go').textContent = d.goLabel || 'Gioca';
    W.setMode('menu'); show('#howto', true);
  }

  function start(id, o = {}){
    const d = defs.get(id); if (!d) return;
    cur = d; lastOpts = { ...o };
    const seed = o.seed ?? ((Math.random()*2**31) >>> 0);
    Object.assign(G, { active: true, phase: 'wait', t: 0, n: 0, score: 0, stat2: 0, streak: 0, seed, rng: mulberry32(seed), opts: o, challenge: o.challenge || null, venue: o.venue || d.venue });
    W.setMode('game');
    W.hud.setExplore(false);
    W.input.setContext(d.kind === 'match' ? 'match' : d.kind === 'activity' ? 'activity' : 'minigame');
    show('#exit', true);
    if (d.hud !== 'none'){ show('#ghud', d.hud !== 'match'); $('#gUnit').textContent = d.unit || ''; $('#gBest').textContent = d.bestKey ? store.best(d.bestKey) : '–'; $('#gScore').textContent = 0; }
    W.bus.emit('game:start', { id });
    d.start(G, o);
  }

  function end(){
    if (!cur) return;
    const d = cur; G.active = false; G.phase = 'end';
    let best = null;
    if (d.bestKey){ best = Math.max(store.best(d.bestKey), G.score); store.setBest(d.bestKey, best); }
    const r = d.end(G, best);
    $('#endTag').textContent = d.title;
    $('#endTitle').textContent = r.title;
    const st = $('#endStats'); st.innerHTML = r.stats.map(s => `<div><b>${esc(s.v)}</b><small>${esc(s.label)}</small></div>`).join('');
    $('#endNote').textContent = r.note || ''; show('#endNote', !!r.note);
    show('#share', !!d.seedable);
    show('#again', !d.noAgain);                // le partite tra amici non si rigiocano da sole: serve una nuova sfida
    show('#shareBox', false);
    hud.hideInstr(); show('#end', true); W.input.setContext('menu');
    W.bus.emit('game:end', { id: d.id, score: G.score, stat2: G.stat2, won: r.won, G });
  }

  function exit(){
    const d = cur;
    G.active = false; G.phase = 'off';
    for (const id of ['#ghud', '#exit', '#instr', '#end', '#howto', '#scorebd']) show(id, false);
    if (d) d.cleanup(G);
    cur = null;
    W.setMode('explore');
    W.hud.setExplore(true);
  }

  $('#go').addEventListener('click', () => { show('#howto', false); start(howto.id, opts); });
  $('#nogo').addEventListener('click', () => { show('#howto', false); W.setMode(cur ? 'game' : 'explore'); });
  $('#again').addEventListener('click', () => { show('#end', false); const id = cur.id; cur.cleanup(G); start(id, { ...lastOpts, seed: lastOpts.challenge ? lastOpts.seed : undefined }); });
  $('#back').addEventListener('click', () => { show('#end', false); exit(); });
  $('#exit').addEventListener('click', () => exit());
  $('#share').addEventListener('click', () => W.ugc.challenge.share(cur, G));

  return {
    G, register, get, openHowto, start, end, exit, defs,
    get current(){ return cur; },
    update(dt){
      if (!G.active || !cur) return;
      if (W.input.pressed('back')){ exit(); return; }
      if (cur.tap && W.input.any('tap', 'jump', 'hit', 'interact')) cur.tap(G);
      cur.update(G, dt);
    },
  };
}

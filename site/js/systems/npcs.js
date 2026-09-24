// NPC: personaggi con nome, dialoghi e missioni, più il pubblico che passeggia.
// Una definizione (content/npcs.js) dice dove stanno, come sono vestiti, come si muovono e cosa dicono.
import * as THREE from 'three';
import { $, esc, rand } from '../core/util.js';
import { makeAvatar, pose } from '../entities/avatar.js';
import { collide, isFree } from '../world/collision.js';

const LOD_FAR = 170, LABEL_NEAR = 45;

export function createNpcs(W){
  const scene = W.engine.scene, list = [], v = new THREE.Vector3();
  const labels = $('#labels');

  function spawn(def){
    let [x, z] = def.at(W);
    if (!isFree(x, z, .5)) [x, z] = W.pois.safeSpot(x, z, null);
    const av = makeAvatar(def.look || {}, def.scale || 1);
    av.g.position.set(x, W.world.groundH(x, z), z);
    av.g.rotation.y = def.face != null ? def.face(W) : Math.random()*Math.PI*2;
    scene.add(av.g);
    const npc = { def, av, x, z, home: { x, z }, target: null, stuck: 0, speed: def.speed || rand(1.2, 1.8), phase: Math.random()*10, talk: 0, bubbleT: 0, visible: true };
    if (def.name){
      npc.label = document.createElement('div'); npc.label.className = 'label npc'; labels.appendChild(npc.label);
    }
    npc.bubble = document.createElement('div'); npc.bubble.className = 'bubble hidden'; labels.appendChild(npc.bubble);
    if (def.dialogue || def.barks){
      W.interact.add({ id: 'npc:' + (def.id || list.length), x: () => npc.x, z: () => npc.z, r: def.talkR || (def.dialogue ? 3.2 : 1.7),   // il pubblico si saluta solo avvicinandosi apposta
        label: def.dialogue ? `Parla con ${def.name}` : 'Saluta', short: def.dialogue ? 'Parla' : 'Saluta',
        map: def.map || null, weak: !def.dialogue,
        act: () => def.dialogue ? W.dialogue.open(npc) : say(npc, def.barks[Math.floor(Math.random()*def.barks.length)]) });
    }
    list.push(npc);
    return npc;
  }
  function say(npc, text, t = 3.2){
    npc.bubble.textContent = text; npc.bubble.classList.remove('hidden'); npc.bubbleT = t; npc.talk = t;
    const p = W.player.pos; npc.av.g.rotation.y = Math.atan2(p.x - npc.x, p.z - npc.z);
  }
  function pickTarget(npc){
    const d = npc.def, r = d.wander || 0;
    if (!r) return null;
    for (let i = 0; i < 8; i++){
      const a = Math.random()*Math.PI*2, rr = Math.random()*r, x = npc.home.x + Math.cos(a)*rr, z = npc.home.z + Math.sin(a)*rr;
      if (isFree(x, z, .6)) return { x, z, wait: rand(1, 5) };
    }
    return null;
  }
  function project(el, x, y, z, show){
    if (!show){ el.style.opacity = 0; return; }
    const cam = W.engine.camera; v.set(x, y, z); const dist = cam.position.distanceTo(v); v.project(cam);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < LABEL_NEAR;
    el.style.opacity = vis ? 1 : 0;
    if (vis) el.style.transform = `translate(${(v.x*.5 + .5)*innerWidth}px, ${(-v.y*.5 + .5)*innerHeight}px) translate(-50%,-100%)`;
  }

  return {
    list, spawn, say,
    byId: id => list.find(n => n.def.id === id),
    update(dt){
      const p = W.player.pos, explore = W.mode === 'explore' || W.mode === 'dialogue', t = W.engine.time;
      for (const npc of list){
        const d = Math.hypot(p.x - npc.x, p.z - npc.z), near = d < LOD_FAR;
        if (near !== npc.visible){ npc.visible = near; npc.av.g.visible = near; }
        if (!near){ if (npc.label) npc.label.style.opacity = 0; npc.bubble.style.opacity = 0; continue; }
        let state = npc.def.pose || 'idle', amt = 0;
        npc.talk = Math.max(0, npc.talk - dt);
        const busy = npc.talk > 0 || (W.dialogue.npc === npc);
        if (busy){ state = 'talk'; npc.av.g.rotation.y = Math.atan2(p.x - npc.x, p.z - npc.z); }
        else if (npc.def.wander){
          if (!npc.target || npc.target.done){ npc.waitT = (npc.waitT || 0) - dt; if (npc.waitT <= 0){ npc.target = pickTarget(npc); npc.waitT = npc.target ? npc.target.wait : 2; } }
          const tg = npc.target;
          if (tg && !tg.done){
            const dx = tg.x - npc.x, dz = tg.z - npc.z, dd = Math.hypot(dx, dz);
            if (dd < .4){ tg.done = true; npc.waitT = tg.wait; }
            else {
              const s = Math.min(dd, npc.speed*dt), pos = { x: npc.x + dx/dd*s, z: npc.z + dz/dd*s };
              collide(pos, .35);
              const moved = Math.hypot(pos.x - npc.x, pos.z - npc.z);
              npc.stuck = moved < s*.3 ? npc.stuck + dt : 0;
              if (npc.stuck > 1.2){ tg.done = true; npc.stuck = 0; }
              npc.x = pos.x; npc.z = pos.z; npc.av.g.rotation.y = Math.atan2(dx, dz);
              npc.phase += dt*npc.speed*5.5; state = 'walk'; amt = 1;
            }
          }
        } else if (d < 9 && explore && npc.def.dialogue){
          // i personaggi guardano chi si avvicina
          const want = Math.atan2(p.x - npc.x, p.z - npc.z); let dr = want - npc.av.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
          npc.av.g.rotation.y += dr*Math.min(1, dt*4);
          if (d < 5 && !npc.greeted){ npc.greeted = true; state = 'wave'; npc.waveT = 1.5; }
        }
        if (d > 14) npc.greeted = false;
        if (npc.waveT > 0){ npc.waveT -= dt; state = 'wave'; }
        npc.av.g.position.set(npc.x, W.world.groundH(npc.x, npc.z) + (state === 'sit' ? -.05 : 0), npc.z);
        pose(npc.av, { state, phase: npc.phase, amt, t: t + npc.phase });
        const top = npc.av.g.position.y + 2.7*(npc.def.scale || 1);
        if (npc.label){
          const mark = npc.def.marker ? npc.def.marker(W) : '';
          const txt = (mark ? mark + ' ' : '') + npc.def.name;
          if (npc.label.textContent !== txt){ npc.label.textContent = txt; npc.label.classList.toggle('quest', !!mark); }
          project(npc.label, npc.x, top, npc.z, explore && d < (mark ? 60 : 20));   // nomi solo da vicino, chi ha una missione anche da lontano
        }
        npc.bubbleT = Math.max(0, npc.bubbleT - dt);
        if (npc.bubbleT <= 0) npc.bubble.classList.add('hidden');
        else project(npc.bubble, npc.x, top + .55, npc.z, true);
      }
    },
  };
}

/* ---------- dialoghi ---------- */
// Un dialogo è { start: id | (W) => id, nodes: { id: { text, options: [{ label, next?, do?(W, npc), if?(W) }] } } }.
// Il testo può essere una funzione (W) => stringa; {nick} diventa il nome del giocatore.
export function createDialogue(W){
  const box = $('#dialog');
  let npc = null, node = null, opts = [], shownAt = 0;
  const fill = s => (typeof s === 'function' ? s(W) : s).replace(/\{nick\}/g, W.ugc.profile.get().nick);
  function render(id){
    const D = npc.def.dialogue, n = D.nodes[id];
    if (!n){ close(); return; }
    node = n;
    box.querySelector('.who').textContent = npc.def.name + (npc.def.role ? ' · ' + npc.def.role : '');
    box.querySelector('.say').textContent = fill(n.text);
    opts = (typeof n.options === 'function' ? n.options(W) : n.options || [{ label: 'Ciao!' }]).filter(o => !o.if || o.if(W));
    const ul = box.querySelector('.opts'); ul.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button'); b.innerHTML = `<kbd>${i + 1}</kbd> ${esc(fill(o.label))}`;
      b.addEventListener('click', () => choose(i, true)); ul.appendChild(b);
    });
  }
  function choose(i, fromClick = false){
    // un tocco che ha aperto il dialogo non deve scegliere anche un'opzione
    if (fromClick && performance.now() - shownAt < 450) return;
    const o = opts[i]; if (!o) return;
    const cur = npc;
    if (o.next) render(o.next); else close();
    if (o.do) o.do(W, cur);
  }
  function close(){
    box.classList.add('hidden');
    if (npc){ npc.talk = .6; }
    npc = null; node = null;
    if (W.mode === 'dialogue') W.setMode('explore');
  }
  return {
    get npc(){ return npc; },
    open(n){
      npc = n; W.setMode('dialogue');
      const p = W.player.pos; W.hero.g.rotation.y = Math.atan2(n.x - p.x, n.z - p.z);
      const D = n.def.dialogue; render(typeof D.start === 'function' ? D.start(W) : D.start);
      box.classList.remove('hidden'); shownAt = performance.now();
    },
    close,
    update(){
      if (!npc) return;
      for (let i = 1; i <= 6; i++) if (W.input.pressed('choice' + i)){ choose(i - 1); return; }
      if (W.input.pressed('back')) close();
    },
  };
}

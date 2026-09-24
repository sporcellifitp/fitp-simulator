// Oggetti interattivi: NPC, campi, chioschi, bacheca… Ognuno ha una posizione, un raggio e un'azione.
// Vicino al più prossimo compare il suggerimento «E: …»; con E (o il pulsante sul telefono) parte l'azione.
import { hud } from '../ui/hud.js';

export function createInteract(W){
  const items = new Map();
  let current = null;
  const sys = {
    items,
    add(it){ items.set(it.id, { r: 2.5, when: () => true, ...it }); return it.id; },
    remove(id){ items.delete(id); if (current && current.id === id) current = null; },
    get current(){ return current; },
    update(){
      if (W.mode !== 'explore'){ if (current){ current = null; hud.prompt(null); } return; }
      const p = W.player.pos; let best = null, bd = Infinity;
      for (const it of items.values()){
        const x = typeof it.x === 'function' ? it.x() : it.x, z = typeof it.z === 'function' ? it.z() : it.z;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < it.r && d < bd && it.when()){ bd = d; best = it; }
      }
      if (best !== current){
        current = best;
        const label = best ? (typeof best.label === 'function' ? best.label() : best.label) : null;
        hud.prompt(label);
        W.input.setContext('explore', { interact: best ? (best.short || 'Usa') : null });
      }
      if (current && W.input.pressed('interact')) current.act();
    },
  };
  return sys;
}

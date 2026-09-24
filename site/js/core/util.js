// Utilità condivise, senza dipendenze.
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const show = (el, on = true) => { if (typeof el === 'string') el = $(el); if (el) el.classList.toggle('hidden', !on); };
export const rand = (a, b) => a + Math.random()*(b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a)*t;
export const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// sistema di riferimento locale di un impianto: x,z nel mondo ↔ lx,lz locali (stessa convenzione di rotation.y)
export function frame(o){
  const rot = o.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
  return { x: o.x, z: o.z, rot, c, s,
    w(lx, lz){ return [o.x + lx*c + lz*s, o.z - lx*s + lz*c]; },
    l(x, z){ const dx = x - o.x, dz = z - o.z; return [dx*c - dz*s, dx*s + dz*c]; } };
}

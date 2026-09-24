// Input unico per tastiera, mouse e touch: i sistemi leggono azioni (muovi, salta, colpisci…), non tasti.
import { $, show, clamp, isTouch } from './util.js';

const KEYMAP = {
  Space: 'jump', KeyJ: 'hit', Enter: 'hit', KeyK: 'lob', KeyL: 'lob', KeyE: 'interact', KeyT: 'places',
  Escape: 'back', KeyP: 'profile', KeyB: 'album', KeyQ: 'emote',
};
export const ACTION_KEYS = KEYMAP;

export function createInput(canvas){
  const keys = new Set(), edges = new Set(), look = { dx: 0, dy: 0, zoom: 0 };
  const joy = { x: 0, y: 0, id: null };
  let drag = null, context = 'intro', blocked = false;

  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!e.repeat && KEYMAP[e.code]) edges.add(KEYMAP[e.code]);
    if (/^Digit[1-9]$/.test(e.code) && !e.repeat) edges.add('choice' + e.code.slice(5));
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && context !== 'intro') e.preventDefault();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // trascinare gira la visuale; un tocco breve senza trascinare è un «tap»
  canvas.addEventListener('pointerdown', e => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    if (context === 'minigame') edges.add('tap');
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    look.dx += e.clientX - drag.x; look.dy += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    if (moved < 8 && performance.now() - drag.t < 350 && context === 'match') edges.add('hit');
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', e => { look.zoom += e.deltaY*.01; }, { passive: true });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (context === 'match') edges.add('lob'); });

  // joystick
  {
    const base = $('#joy'), knob = $('#knob');
    const set = e => {
      const r = base.getBoundingClientRect(), dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
      const len = Math.hypot(dx, dy), max = 42, k = len > max ? max/len : 1;
      knob.style.transform = `translate(${dx*k}px,${dy*k}px)`; joy.x = dx*k/max; joy.y = dy*k/max;
    };
    base.addEventListener('pointerdown', e => { joy.id = e.pointerId; base.setPointerCapture(e.pointerId); set(e); });
    base.addEventListener('pointermove', e => { if (joy.id === e.pointerId) set(e); });
    const up = e => { if (joy.id !== e.pointerId) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
    base.addEventListener('pointerup', up); base.addEventListener('pointercancel', up);
  }
  // pulsanti touch: ognuno genera un'azione
  for (const b of document.querySelectorAll('#tbtns [data-act]')){
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); edges.add(b.dataset.act); b.classList.add('on'); });
    const off = () => b.classList.remove('on');
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }

  const k = c => keys.has(c);
  // aggancio per i test automatici: movimento e azioni simulate
  const test = { move: null, press(a){ edges.add(a); } };
  return {
    test,
    // x: destra positiva, y: avanti positiva, lunghezza massima 1
    move(){
      if (test.move) return test.move;
      if (blocked) return { x: 0, y: 0 };
      let x = 0, y = 0;
      if (k('KeyW') || k('ArrowUp')) y += 1;
      if (k('KeyS') || k('ArrowDown')) y -= 1;
      if (k('KeyA') || k('ArrowLeft')) x -= 1;
      if (k('KeyD') || k('ArrowRight')) x += 1;
      x += joy.x; y -= joy.y;
      const l = Math.hypot(x, y); if (l > 1){ x /= l; y /= l; }
      return { x, y };
    },
    running(){ return k('ShiftLeft') || k('ShiftRight') || Math.hypot(joy.x, joy.y) > .92; },
    pressed(a){ return !blocked && edges.has(a); },
    any(...as){ return !blocked && as.some(a => edges.has(a)); },
    look(){ const l = { ...look }; look.dx = look.dy = look.zoom = 0; return l; },
    endFrame(){ edges.clear(); },
    clear(){ edges.clear(); },
    set blocked(v){ blocked = v; if (v){ edges.clear(); } },
    get blocked(){ return blocked; },
    get context(){ return context; },
    // contesto: mostra i comandi giusti sul telefono
    setContext(c, opts = {}){
      context = c;
      const pad = c === 'explore' || c === 'match' || c === 'activity' || c === 'drive';
      show('#joy', isTouch && pad);
      show('#tbtns', isTouch && pad);
      for (const b of document.querySelectorAll('#tbtns [data-act]')){
        const a = b.dataset.act;
        const on = (c === 'explore' && (a === 'jump' || (a === 'interact' && opts.interact)))
                || (c === 'drive' && (a === 'jump' || a === 'interact'))
                || (c === 'activity' && a === 'jump')
                || (c === 'match' && (a === 'hit' || a === 'lob' || a === 'jump'));
        show(b, on);
        if (a === 'interact') b.textContent = c === 'drive' ? 'Scendi' : (opts.interact || 'Parla');
        if (a === 'jump') b.textContent = c === 'drive' ? 'Clacson' : 'Salta';
      }
    },
  };
}

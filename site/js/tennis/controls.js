// Comandi unificati: tastiera, mouse e telefono producono le stesse azioni di gioco, una volta per fotogramma:
//   { move:{x,y}, swing:{ power, lift, lob, aim, at, win, src } | null, toss:{ at } | null, auto }
// at: istante (secondi, orologio di performance.now) in cui la racchetta passa nel punto d'impatto, preso dall'evento e non
// dal fotogramma: così il giudizio del tempo non dipende da quanti fotogrammi al secondo fa il computer.
// La partita (match/core.js) non sa da quale dispositivo arrivano. Per aggiungere un dispositivo basta un'altra sorgente.
//
// Mouse: il puntatore sceglie dove mirare nel campo avversario; tieni premuto per caricare (potenza), rilascia per colpire:
//   la racchetta passa nel punto d'impatto 0,09 s dopo il rilascio. Tasto destro: pallonetto. Al servizio, premere lancia
//   la palla e rilasciare colpisce.
// Tastiera: frecce o WASD per muoversi; Spazio o J come il tasto sinistro, K come il destro.
// Telefono: ogni colpo riconosciuto dai sensori diventa uno swing con potenza, effetto e ritardo di rete già compensato.

export const MOUSE_DELAY = .09, MOUSE_WIN = .085, PHONE_WIN = .11;
const powerOf = held => Math.min(1, .35 + Math.max(0, held)/.55*.65);

export function createControls(canvas, { pick, now = () => performance.now()/1000 }){
  const keys = new Set();
  const q = [];                         // azioni in coda per il prossimo fotogramma
  const charge = { on: false, t0: 0, lob: false, src: null };
  let aim = null, mouseUsed = false, enabled = false, phoneAuto = false;

  const swingStart = (lob, src) => { if (!enabled || charge.on) return; charge.on = true; charge.t0 = now(); charge.lob = lob; charge.src = src; q.push({ toss: { at: charge.t0 } }); };
  const swingEnd = (src) => {
    if (!charge.on || charge.src !== src) return;
    charge.on = false; const t = now();
    q.push({ swing: { power: powerOf(t - charge.t0), lift: 0, lob: charge.lob, aim: mouseUsed && aim ? { ...aim } : null, at: t + MOUSE_DELAY, win: MOUSE_WIN, src } });
  };
  // il mirino resta nel campo avversario (fino a un metro e mezzo oltre le righe: mirare alle righe è un rischio)
  const clampAim = p => p && { x: Math.max(-5.6, Math.min(5.6, p.x)), z: Math.max(-13.4, Math.min(-1.5, p.z)) };

  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) && e.code !== 'Space') return;
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && enabled) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'KeyJ') swingStart(false, 'key:' + e.code);
    if (e.code === 'KeyK') swingStart(true, 'key:' + e.code);
  });
  addEventListener('keyup', e => {
    keys.delete(e.code);
    if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') swingEnd('key:' + e.code);
  });
  addEventListener('blur', () => { keys.clear(); if (charge.on) swingEnd(charge.src); });

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const p = pick(e.clientX, e.clientY); if (!p) return;
    aim = clampAim(p); mouseUsed = true;
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse'){ const p = pick(e.clientX, e.clientY); if (p){ aim = clampAim(p); mouseUsed = true; } }
    try { canvas.setPointerCapture(e.pointerId); } catch (err){}
    swingStart(e.button === 2, 'ptr');
  });
  canvas.addEventListener('pointerup', () => swingEnd('ptr'));
  canvas.addEventListener('pointercancel', () => swingEnd('ptr'));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  return {
    get aim(){ return mouseUsed ? aim : null; },
    get charging(){ return charge.on ? powerOf(now() - charge.t0) : 0; },
    set enabled(v){ enabled = v; if (!v){ charge.on = false; q.length = 0; } },
    get enabled(){ return enabled; },
    set phoneAuto(v){ phoneAuto = v; },
    // dal telefono: at = istante del colpo (secondi, orologio di questa pagina), già corretto per il ritardo di rete
    phoneSwing(s){
      if (!enabled) return;
      q.push({ swing: { power: s.power, lift: s.lift, lob: false, aim: null, at: s.at, win: PHONE_WIN, src: 'phone', side: s.side } });
    },
    phoneToss(){ if (enabled) q.push({ toss: { at: now() } }); },
    read(){
      let x = 0, y = 0;
      const k = c => keys.has(c);
      if (enabled){
        if (k('KeyW') || k('ArrowUp')) y += 1;
        if (k('KeyS') || k('ArrowDown')) y -= 1;
        if (k('KeyA') || k('ArrowLeft')) x -= 1;
        if (k('KeyD') || k('ArrowRight')) x += 1;
      }
      const l = Math.hypot(x, y); if (l > 1){ x /= l; y /= l; }
      const out = { move: { x, y }, swing: null, toss: null, auto: phoneAuto };
      // un'azione per fotogramma: il lancio prima, il colpo al fotogramma dopo (così il motore vede il lancio già partito)
      if (q.length){ const a = q.shift(); if (a.toss) out.toss = a.toss; if (a.swing) out.swing = a.swing; }
      return out;
    },
  };
}

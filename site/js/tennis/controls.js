// Controller phone-only di NATPF Simulator. Mouse e tastiera non producono input di gioco:
//   { move:{x,y}, swings:[{ at, power, lift, lob, aim, dir, src }], auto }
// at è l'istante dello swing (secondi, orologio di performance.now), preso dall'evento e non dal fotogramma: così il
// giudizio del tempo non dipende da quanti fotogrammi al secondo fa il computer. La partita non sa da dove arriva lo swing.
//
// Mouse: un clic è uno swing (come muovere la racchetta); tasto destro: pallonetto; con Maiuscolo: colpo forte.
//        Il puntatore sul campo avversario sposta un po' la mira (il tempo resta la cosa più importante).
// Tastiera: Spazio o J = swing, K = pallonetto, Maiuscolo = forte. Frecce o WASD: spostarsi a mano (di norma si va da soli).
// Al servizio il primo swing lancia la palla, il secondo la colpisce (meglio in cima al lancio).
// Telefono: ogni colpo riconosciuto dai sensori arriva già con il suo istante (orologi allineati, vedi link.js).

export function createControls(canvas, { pick, now = () => performance.now()/1000 }){
  const keys = new Set(), q = [];
  let aim = null, mouseUsed = false, enabled = false, autoMove = true, useAim = true;
  // l'istante dello swing è quello dell'evento (timeStamp), non quello in cui il codice riesce a leggerlo
  const push = (src, extra = {}, ts = null) => { if (!enabled || src !== 'phone') return; q.push({ at: (ts != null ? ts/1000 : now()) + .02, power: keys.has('ShiftLeft') || keys.has('ShiftRight') ? .95 : .62, lift: 0, lob: false, aim: useAim && mouseUsed && aim ? { ...aim } : null, dir: 0, src, ...extra }); };
  const clampAim = p => p && { x: Math.max(-5.2, Math.min(5.2, p.x)), z: Math.max(-12.6, Math.min(-2, p.z)) };

  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && enabled) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'KeyJ') push('key', {}, e.timeStamp);
    if (e.code === 'KeyK') push('key', { lob: true }, e.timeStamp);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const p = pick(e.clientX, e.clientY); if (p){ aim = clampAim(p); mouseUsed = true; } });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse'){ const p = pick(e.clientX, e.clientY); if (p){ aim = clampAim(p); mouseUsed = true; } }
    push('mouse', { lob: e.button === 2 }, e.timeStamp);
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  return {
    get aim(){ return useAim && mouseUsed ? aim : null; },
    set enabled(v){ enabled = v; if (!v) q.length = 0; },
    get enabled(){ return enabled; },
    set autoMove(v){ autoMove = v; },
    set useAim(v){ useAim = v; },
    // dal telefono: at già sull'orologio di questa pagina
    phoneSwing(s){ if (enabled) q.push({ at: s.at, power: s.power, lift: s.lift, lob: s.lob, aim: null, dir: s.dir, src: 'phone' }); },
    phoneToss(s){ if (enabled) q.push({ at: s.at, power: .5, toss: true, src: 'phone' }); },
    read(){
      let x = 0, y = 0;
      const k = c => keys.has(c);
      if (enabled && false){
        if (k('KeyW') || k('ArrowUp')) y += 1; if (k('KeyS') || k('ArrowDown')) y -= 1;
        if (k('KeyA') || k('ArrowLeft')) x -= 1; if (k('KeyD') || k('ArrowRight')) x += 1;
      }
      const l = Math.hypot(x, y); if (l > 1){ x /= l; y /= l; }
      const swings = q.splice(0, q.length);
      return { move: { x, y }, swings: swings.filter(s => !s.toss), tosses: swings.filter(s => s.toss), auto: autoMove };
    },
  };
}

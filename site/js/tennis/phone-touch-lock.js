// B51. Il gioco chiede il blocco per la durata dell'attività; lo staff può sospenderlo fino alla fine.
// (B54: nameTap = il computer chiede il nome: campo e tastiera devono restare toccabili, come «Sono pronto»)
// (17/11, prova natpf-phone-keep: alertTap = avviso con un pulsante da toccare, per esempio «Sensori fermi · Riattiva i
// sensori»; veil = velo «tocca per riprendere» dopo lo schermo spento. Il blocco li copriva (sta sopra) e il tocco non
// arrivava: il telefono restava fermo. Con questi due il blocco si toglie; la partita è già ferma per il telefono)
export function touchLockActive({ requested = false, overridden = false, paired = false, sensor, gate, readyTap = false, nameTap = false, alertTap = false, veil = false } = {}){
  return requested && !overridden && paired && sensor === 'ready' && !gate && !readyTap && !nameTap && !alertTap && !veil;
}

export const STAFF_TOUCH = Object.freeze({ holdMs: 3000, offerMs: 6000, maxMove: 20 });

// Una sola voce di protezione nella cronologia, riusata tra partite e dopo una ricarica.
export function createTouchLockHistory(nav, history, active){
  const key = 'natpfTouchLock';
  let guard = history.state?.[key] === 'guard';
  function arm(){
    if (guard) return;
    try {
      const current = history.state;
      history.replaceState({ ...current, [key]: 'base' }, '');
      history.pushState({ ...current, [key]: 'guard' }, '');
      guard = true;
    } catch { /* Il browser può limitare la cronologia. Resta beforeunload. */ }
  }
  nav.addEventListener('popstate', event => {
    const previous = guard;
    guard = event.state?.[key] === 'guard';
    if (!previous || event.state?.[key] !== 'base') return;
    if (active()) arm();
    else history.back();
  });
  nav.addEventListener('beforeunload', event => {
    if (!active()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  return { arm };
}

// Il pulsante di conferma compare dopo che entrambe le dita si sono staccate.
export function installStaffTouch(surface, button, unlock){
  const fingers = new Map();
  let timer, expires, held = false;
  function hideOffer(){
    clearTimeout(expires);
    button.classList.add('hidden');
  }
  const clearHold = () => {
    clearTimeout(timer);
    timer = null;
    held = false;
  };
  function reset(){
    hideOffer();
    clearHold();
    fingers.clear();
  }
  surface.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('button')) return;
    hideOffer();
    surface.setPointerCapture?.(event.pointerId);
    fingers.set(event.pointerId, [event.clientX, event.clientY]);
    if (fingers.size > 2) clearHold();
    if (fingers.size !== 2) return;
    timer = setTimeout(() => { held = true; }, STAFF_TOUCH.holdMs);
  });
  surface.addEventListener('pointermove', event => {
    const start = fingers.get(event.pointerId);
    if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > STAFF_TOUCH.maxMove) clearHold();
  });
  surface.addEventListener('pointercancel', reset);
  surface.addEventListener('pointerup', event => {
    if (!fingers.delete(event.pointerId)) return;
    clearTimeout(timer);
    if (fingers.size || !held) return;
    held = false;
    button.classList.remove('hidden');
    expires = setTimeout(hideOffer, STAFF_TOUCH.offerMs);
  });
  button.addEventListener('click', () => {
    if (button.classList.contains('hidden')) return;
    reset();
    unlock();
  });
  return reset;
}

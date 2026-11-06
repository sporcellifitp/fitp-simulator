// Telefono acceso e sensori vivi durante il gioco (richiesta del 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md §6). Senza
// DOM proprio: navigator, document e i timer si passano, così le prove lo usano da solo.
//
// Blocco dello schermo. Il browser lo rilascia quando la pagina va in secondo piano, e può rilasciarlo o negarlo anche
// con la pagina in primo piano (risparmio energetico, batteria scarica). Prima lo si riprendeva solo al ritorno in
// primo piano: perso con la pagina visibile, restava perso per tutta la partita e lo schermo si spegneva al tempo del
// telefono, con la pagina sospesa e il collegamento che cadeva. Ora si riprende subito al ritorno in primo piano, dopo
// un rilascio o un rifiuto con la pagina visibile (attese crescenti, fino a 8 s), e a ogni tocco sullo schermo.
// Nessun browser garantisce sensori e rete con il telefono bloccato: il blocco serve a non arrivarci.
export const KEEP = Object.freeze({ retryMs: [1000, 2000, 4000, 8000], sensorGapMs: 1500, sensorBackMs: 2000 });

// state: 1 tenuto, 0 non tenuto (negato, perso o in richiesta), -1 il browser non lo offre
export function createWakeKeeper({ nav = globalThis.navigator, doc = globalThis.document, onChange = () => {}, setTimer = setTimeout, clearTimer = clearTimeout } = {}){
  const supported = !!nav && 'wakeLock' in nav;
  let lock = null, pending = null, tries = 0, timer = null, denied = false, lost = 0;
  const visible = () => !doc?.hidden;
  const held = () => !!lock && !lock.released;
  function later(){
    clearTimer(timer); timer = null;
    if (!visible() || held()) return;
    const ms = KEEP.retryMs[Math.min(tries++, KEEP.retryMs.length - 1)];
    timer = setTimer(() => { timer = null; request(); }, ms);
  }
  function request(){
    if (!supported || !visible()) return Promise.resolve(held());
    if (held()) return Promise.resolve(true);
    if (pending) return pending;
    pending = (async () => {
      try {
        const l = await nav.wakeLock.request('screen');
        lock = l; denied = false; tries = 0;
        l.addEventListener?.('release', () => { if (lock !== l) return; lock = null; lost++; onChange(); later(); });
      } catch (e){ denied = true; later(); }
      pending = null; onChange();
      return held();
    })();
    return pending;
  }
  return {
    get state(){ return !supported ? -1 : held() ? 1 : 0; },
    get busy(){ return !!pending; },
    get denied(){ return denied; },
    get lost(){ return lost; },                    // rilasci arrivati senza che la pagina lo chiedesse
    request,
    // pagina tornata in primo piano, o un tocco sullo schermo: si riprova subito, ripartendo dalle attese brevi
    visible(){ tries = 0; return request(); },
    tap(){ if (held()) return Promise.resolve(true); tries = 0; return request(); },
  };
}

// Sensori vivi: con la pagina in primo piano il telefono manda il movimento di continuo (decine di campioni al secondo,
// anche fermo). Se smettono (il browser li ha sospesi e non li ha ripresi dopo lo schermo spento, un'altra app) il
// telefono lo dice e offre di riattivarli. Dopo il ritorno in primo piano o una riattivazione si danno backMs per
// ripartire. Prima di aver visto il primo campione decide la pagina (sensori non disponibili, dopo 1,5 s)
export function createSensorWatch({ gapMs = KEEP.sensorGapMs, backMs = KEEP.sensorBackMs } = {}){
  let last = null, since = -Infinity;
  return {
    get last(){ return last; },
    feed(now){ last = now; },
    // pagina di nuovo in primo piano, o sensori appena riattivati: tempo per ripartire
    restart(now){ since = now; },
    stalled(now, { active = true, visible = true } = {}){
      return !!active && !!visible && last != null && now - last > gapMs && now - since > backMs;
    },
  };
}

// Ritorno in primo piano (schermo riacceso, B9): se dopo delayMs il blocco dello schermo non è tenuto (iPhone vuole un
// tocco per riprenderlo dopo lo schermo spento) o i sensori non sono ripartiti, la pagina mostra un velo «Tocca lo schermo
// per riprendere»: un solo tocco riprende il blocco, il permesso dei sensori (iPhone, dentro il tocco), i sensori e lo
// schermo intero. Una volta per ritorno, entro windowMs (poi restano gli avvisi piccoli della pagina). Niente trucchi
// (audio o video muti): nessun browser dà i sensori a pagina nascosta, il velo serve a ripartire in fretta.
export const VEIL = Object.freeze({ delayMs: 1500, windowMs: 20000 });
export function createResumeVeil({ delayMs = VEIL.delayMs, windowMs = VEIL.windowMs } = {}){
  let since = null, shown = false;
  return {
    get shown(){ return shown; },
    // la pagina è di nuovo visibile
    back(now){ since = now; shown = false; },
    // a ogni controllo: true = mostrare il velo. active: sensori in uso (movimento, sensori attivi, pagina visibile);
    // wake: stato del blocco (1 tenuto, 0 no, -1 il browser non lo offre); lastSample: istante dell'ultimo campione
    update(now, { active = true, wake = 1, wakeBusy = false, lastSample = null } = {}){
      if (shown) return true;
      if (since == null || !active) return false;
      const dt = now - since;
      if (dt < delayMs) return false;
      if (dt > windowMs){ since = null; return false; }
      const noWake = wake === 0 && !wakeBusy, noSensors = !(lastSample != null && lastSample >= since);
      if (noWake || noSensors){ shown = true; return true; }
      since = null;                    // blocco tenuto e sensori ripartiti: per questo ritorno non serve altro
      return false;
    },
    // tocco sul velo (che ha già ripreso blocco, sensori e schermo intero)
    dismiss(){ shown = false; since = null; },
  };
}

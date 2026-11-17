// B62 · Salvaschermo: una partita dimostrativa in loop (richiesta dell'utente del 17/11/2026: «dopo un periodo di
// inattività sul ledwall vorrei mettere un finto gameplay in loop. Inattività di almeno 1 minuto che si sblocca come
// screensaver»). Prodotto: FIERA (docs/b62/salvaschermo.md).
// Come funziona:
//   - dopo «Salvaschermo» secondi senza nessuno (di base 60; si conta come il chiosco: tasti, clic, tocchi, mouse mosso,
//     gesti, tocchi e «Sono pronto» dei telefoni, telefono preso in mano: natpf_kiosk.last) e con il gioco in una pagina del
//     menu (menu, pagina della fiera, «Collega», «Pronto per la partita»…), il menu sparisce e a schermo intero parte la
//     partita dimostrativa del motore (CPU contro CPU, autoPlayMode, la stessa che girava dietro il menu prima della
//     B-sfondo fermo), con i personaggi scelti (Classici o Lob & Drop), e sopra una scritta discreta: «Gioca a tennis con
//     il telefono · Chiedi allo staff»;
//   - qualunque segno di vita lo chiude e si torna esattamente alla pagina di prima: mouse mosso, clic, tasto, rotellina,
//     tocco (il primo tocco o clic sveglia e basta: non preme il pulsante che c'è sotto), un gesto o un tocco su un
//     telefono, il telecomando dello staff; anche quando il gioco esce dal menu da solo (per esempio «Sono pronto» sui
//     telefoni della fiera);
//   - non parte mai in partita, negli scambi di prova, nell'allenamento e nei minigiochi, con un foglio aperto (pannello
//     dello stand, telecomando, telefoni dello stand, diagnostica, calibrazione dello schermo, tastiera a schermo, tutorial,
//     nickname), con la classifica a schermo intero (è per chi è in fila) e nella sfida tra due computer;
//   - «Salvaschermo» nel pannello dello stand: Dopo 1 min · Dopo 2 min · Dopo 5 min · No, salvato sul computer (chiave
//     natpf-tennis.salvaschermo). Di base «Dopo 1 min» nel programma Windows (fiera) e nel server di sviluppo, «No» nel
//     gioco dal browser (versione online), dove resta da scegliere.
// Solo disegno e stato della pagina: niente registro dello stand, nessun effetto su partite, classifica e telefoni.
export const SAVER_KEY = 'natpf-tennis.salvaschermo';
export const SAVER_STEPS = Object.freeze([60, 120, 300, 0]);   // secondi; 0 = spento
export const SAVER_TEXT = Object.freeze({ tag: 'Dimostrazione', title: 'Gioca a tennis con il telefono', sub: 'Chiedi allo staff: si comincia in un attimo' });
// mouse mosso: come il chiosco, solo spostamenti veri (non il tremolio di un mouse fermo)
export const SAVER_MOVE_PX = 3;
// dopo il risveglio il clic che segue il tocco o il clic di risveglio non arriva alla pagina (ms)
export const SAVER_SWALLOW_MS = 500;

const ok = v => SAVER_STEPS.includes(v);
// di base: acceso (1 minuto) nel programma Windows e in sviluppo, spento nel browser
export function saverDefault({ desktop = globalThis.natpfDesktop, dev = !!import.meta.env?.DEV } = {}){ return desktop || dev ? 60 : 0; }
export function readSaver({ storage = globalThis.localStorage, ...env } = {}){
  let v = null; try { v = storage?.getItem(SAVER_KEY); } catch {}
  const n = v == null || v === '' ? NaN : Number(v);
  return ok(n) ? n : saverDefault(env);
}
export function writeSaver(v, storage = globalThis.localStorage){ const n = ok(v) ? v : 0; try { storage?.setItem(SAVER_KEY, String(n)); } catch {} return n; }
export const nextSaver = v => SAVER_STEPS[(Math.max(0, SAVER_STEPS.indexOf(v)) + 1) % SAVER_STEPS.length];
export const saverButton = v => (!(v > 0) ? 'No' : v % 60 ? `Dopo ${v} s` : `Dopo ${v/60} min`);
export const saverToast = v => (v > 0 ? `Salvaschermo: dopo ${v/60} min senza nessuno, al menu, parte una partita dimostrativa; si chiude con il mouse, un tasto o un telefono` : 'Salvaschermo spento');

// Che cosa fare adesso (funzione pura): 'start', 'stop' o null. secs: impostazione (0 = spento); idle: secondi senza
// nessuno; here: il gioco è in una pagina del menu; busy: c'è un foglio aperto o qualcosa che non va coperto; on: acceso;
// woke: attività arrivata dopo l'accensione
export function saverAction({ secs = 0, idle = 0, here = false, busy = false, on = false, woke = false } = {}){
  if (on) return woke || !here || busy || !(secs > 0) ? 'stop' : null;
  return secs > 0 && here && !busy && idle >= secs ? 'start' : null;
}

// Fogli e stati che il salvaschermo non copre (la classifica a schermo intero è per chi aspetta il turno)
export function saverBusy(ui = {}, doc = globalThis.document){
  const E = ui.engine || {};
  return !!(ui.kiosk?.isOpen || ui.remote?.isOpen || ui.remote?.opening || ui.fieraSheet?.isOpen || ui.diag?.isOpen || ui.calibra?.isOpen
    || ui.tastiera?.visible || ui.training?.tutorial?.open || Object.values(ui.split?.tut || {}).some(t => t?.open) || ui.events?.nickname
    || ui.training?.active || ui.events?.active || ui.trial?.active || ui.prematch?.active
    || (E.versus?.active && E.roomId && E.roomId !== 'default')
    || doc?.documentElement?.classList?.contains('ranking-full'));
}

export class NatpfScreensaver {
  constructor(engine, ui, { win = globalThis.window, doc = globalThis.document, now = () => performance.now() } = {}){
    this.engine = engine; this.ui = ui; this.doc = doc; this.now = now;
    this.on = false; this.since = 0; this.wokeAt = -1e9; this.secs = readSaver();
    this._auto = null;
    if (!win?.addEventListener) return;
    // risveglio dal PC: in cattura e PRIMA della pagina (NatpfUi lo crea presto), così il tocco o il tasto che sveglia non
    // preme il pulsante sotto né manda «Invio avanti» al menu
    const wake = e => {
      if (!this.on) return;
      try { e.preventDefault?.(); } catch {}
      e.stopImmediatePropagation?.();
      this.stop(e.type === 'keydown' ? 'tasto' : e.type === 'wheel' ? 'rotellina' : 'clic');
    };
    for (const ev of ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'wheel']) win.addEventListener(ev, wake, { capture: true, passive: false });
    const swallow = e => { if (this.now() - this.wokeAt < SAVER_SWALLOW_MS){ try { e.preventDefault?.(); } catch {} e.stopImmediatePropagation?.(); } };
    // (un clic vero manda pointerdown, mousedown, pointerup, mouseup, click: dopo il primo, che sveglia, gli altri dello
    // stesso gesto non arrivano alla pagina; un tocco anche touchstart e touchend)
    for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'click', 'pointerup', 'mouseup', 'keyup', 'touchend']) win.addEventListener(ev, swallow, { capture: true, passive: false });
    win.addEventListener('pointermove', e => { if (this.on && Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) >= SAVER_MOVE_PX) this.stop('mouse'); }, { capture: true, passive: true });
  }
  setSecs(v){ this.secs = writeSaver(v); if (!(this.secs > 0)) this.stop('spento'); return this.secs; }
  // a ogni fotogramma (natpf_ui.tick)
  tick(){
    const ui = this.ui, K = ui.kiosk, last = K?.last ?? 0, t = this.now();
    const here = !!ui.lobby?.visible && this.engine.playerRole !== 'p2';
    const a = saverAction({ secs: this.secs, idle: (t - last)/1000, here, busy: saverBusy(ui, this.doc), on: this.on, woke: this.on && last > this.since + 1 });
    if (a === 'start') this.start();
    else if (a === 'stop') this.stop(!here ? 'fuori dal menu' : 'attività');
  }
  start(){
    if (this.on) return false;
    const E = this.engine;
    this.on = true; this.since = this.now();
    // la partita dimostrativa del motore, da capo (CPU contro CPU: nessun telefono, nessun punteggio vero)
    this._auto = !!E.autoPlayMode;
    E.autoPlayMode = true;
    try { E._setupMidRallyShowcase?.({ scorePlayer: 0, scoreOpponent: 0 }); E._snapCameraImmediate?.(); } catch {}
    this.doc?.documentElement?.classList?.add('natpf-salvaschermo');
    this._paint(true);
    this.ui.diag?.recorder?.log?.('salvaschermo', { acceso: true, dopo: this.secs });
    return true;
  }
  stop(why = 'attività'){
    if (!this.on) return false;
    const E = this.engine;
    this.on = false; this.wokeAt = this.now();
    this.doc?.documentElement?.classList?.remove('natpf-salvaschermo');
    this._paint(false);
    // di nuovo come prima: la dimostrazione si ferma (o resta, se c'era) e lo sfondo del menu si ridisegna fermo
    if (this._auto === false && this.ui.lobby?.visible) E.autoPlayMode = false;
    this._auto = null;
    E.natpfBackdropDirty = true;
    this.ui.kiosk?.poke?.();
    this.ui.diag?.recorder?.log?.('salvaschermo', { acceso: false, perche: why, durataS: Math.round((this.wokeAt - this.since)/1000) });
    return true;
  }
  _paint(on){
    const d = this.doc; if (!d?.createElement) return;
    let el = d.getElementById?.('natpf-salvaschermo');
    if (!el && on){
      el = d.createElement('div'); el.id = 'natpf-salvaschermo'; el.className = 'natpf-salvaschermo-layer'; el.setAttribute?.('aria-hidden', 'true');
      el.innerHTML = `<div class="saver-band"><span class="saver-tag">${SAVER_TEXT.tag}</span><b class="saver-title">${SAVER_TEXT.title}</b><span class="saver-sub">${SAVER_TEXT.sub}</span></div>`;
      d.body?.appendChild(el);
    }
    el?.classList?.toggle('on', !!on);
  }
}

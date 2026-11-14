// B39 · Stand con il solo mouse (14/11/2026, docs/b39/stand-solo-mouse.md). Allo stand si vede solo il ledwall e il mouse
// è solo dello staff. Qui le parti della pagina del gioco:
//   • comandi del menu del tasto destro del programma Windows (window.natpfDesktop.commands: diagnostica, calibrazione
//     dello schermo, azzera la calibrazione) e avvisi del programma (window.natpfDesktop.notices: file salvato in
//     Download › NATPF senza «Salva con nome», link negato);
//   • trappole (B39.1): nel programma i tasti laterali «indietro» e «avanti» del mouse e il tasto centrale non fanno niente
//     (prima «indietro» riportava alla pagina «Avvio del gioco…» e il gioco spariva; il programma svuota anche la
//     cronologia), i link per il telefono non aprono una seconda finestra sopra il gioco (avviso al posto), file e immagini
//     trascinati sulla pagina non la cambiano;
//   • pannello dello stand da ogni pagina (B39.3): ❚❚ tenuto 3 secondi in campo lo apre (il clic breve resta la pausa; i
//     marchi del menu li collega natpf_kiosk.js, tutti con natpf_hold.js); uscita dalla classifica a schermo intero con
//     «× Chiudi» in alto a destra, che compare quando si muove il mouse; nel pannello la riga sotto le voci spiega la voce
//     sotto il puntatore (prima le spiegazioni stavano solo nei fumetti);
//   • guardia del doppio clic (B39.2, natpf_click_guard.js): il secondo clic di un doppio clic e il clic arrivato subito
//     dopo un cambio di schermata non scelgono niente nella schermata nuova;
//   • puntatore per il ledwall (B39.5, natpf_cursor.js): grande, nascosto in campo dopo 3 s fermo, freccia sul bordo
//     dell'area quando esce dalla parte che si vede.
// Funzioni pure in testa (provate con node:test); la classe tocca il DOM solo nel costruttore e nei gestori.
import { HoldPress } from './natpf_hold.js';
import { ClickGuard } from './natpf_click_guard.js';
import { NatpfCursor } from './natpf_cursor.js';
export const LINK_TEXT = 'Il link è per il telefono: inquadra il QR con la fotocamera del telefono';
// spiegazione di ogni voce del pannello dello stand, nella riga sotto le voci quando il puntatore ci passa sopra (le voci con
// un fumetto, title, usano quello)
export const STAFF_HINTS = Object.freeze({
  kiosk: 'Modalità chiosco · Sì: dopo il tempo di «Ritorno al menu dopo» senza nessuno il gioco torna al menu, cancella il nome e scollega il telefono.',
  idle: 'Ritorno al menu dopo · il tempo del chiosco senza nessuno: 30, 45, 60 o 90 secondi.',
  ranking: 'Classifica · la classifica di oggi in grande sul ledwall. Per uscire: questa voce, oppure «× Chiudi» in alto a destra (muovi il mouse).',
  export: 'Classifica · salva le partite e i minigiochi di oggi in un file CSV (nel programma Windows in Download › NATPF).',
  reset: 'Classifica · cancella la classifica di oggi su questo PC. Chiede un secondo clic.',
  phone: 'Telefono · scollega il telefono di chi gioca: per giocare va rifatto il QR. Tra un visitatore e l’altro usa «Nuovo giocatore».',
  music: 'Musica · spegne o riaccende tutto l’audio del gioco (musica, effetti e voce). Non resta salvata: alla riapertura del gioco l’audio è acceso.',
  diag: 'Diagnostica · registra la sessione e la prova guidata, per chi sviluppa. Chiusa, torni qui.',
  remote: 'Telecomando dello staff · abbina il telefono dello staff (QR, codice, «Conferma» qui sul PC).',
  display: 'Schermo del gioco · sposta il gioco sullo schermo successivo; la scelta resta salvata.',
  newplayer: 'Nuovo giocatore · per chi arriva: nome, mano e tutorial da capo, il telefono resta collegato.',
  close: 'Chiudi · chiude il pannello; la partita riparte da dove era.',
  'registro-invia': 'Registro di gioco · manda subito le righe in coda.',
  'registro-scarica': 'Registro di gioco · salva la coda non ancora inviata in uno zip.',
});
export const staffHint = (cmd, title = '') => String(title || STAFF_HINTS[cmd] || '');
// quanto resta in vista «× Chiudi» della classifica a schermo intero dopo l'ultimo movimento del mouse
export const MOUSE_ACTIVE_MS = 4000;
// tasti del mouse che nel programma non fanno niente: 3 «indietro», 4 «avanti», 1 centrale (scorrimento automatico e link
// in una finestra nuova). Il tasto sinistro (0) e il destro (2, menu dello staff) restano
export const blockedMouseButton = e => !!e && (e.button === 3 || e.button === 4 || (e.button === 1 && /down$|auxclick/.test(e.type || '')));
// avviso per un file salvato dal programma (natpfDesktop.notices: { kind: 'download', ok, name, folder })
export function downloadText(n = {}){
  if (!n.ok) return 'Salvataggio non riuscito: riprova. Se succede ancora, controlla lo spazio sul disco.';
  return `Salvato in ${n.folder || 'Download'}: ${n.name || 'file'}`;
}
// durata dell'avviso: i testi lunghi restano di più (si leggono da lontano), da 2,6 a 7 s
export const toastMs = text => Math.round(Math.min(7000, Math.max(2600, 1200 + String(text || '').length*55)));

export class NatpfStandMouse {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    const desk = globalThis.window?.natpfDesktop;
    this.desktop = !!desk;
    // B39.2 · guardia del doppio clic, in cattura sulla finestra; ogni pagina nuova della lobby è un cambio di schermata
    // (i fogli aperti e chiusi li vede la guardia da sé)
    this.guard = new ClickGuard({ onDrop: (v, el) => ui.diag?.recorder?.log?.('mouse.clicScartato', { perche: v, voce: el?.id || el?.dataset?.staff || el?.dataset?.menu || '' }) });
    const lobby = ui.lobby;
    if (lobby?.go){
      const go = lobby.go.bind(lobby);
      lobby.go = (...a) => { const step = lobby.step, vis = lobby.visible, r = go(...a); if (lobby.step !== step || lobby.visible !== vis) this.guard.mark(); return r; };
    }
    try { desk?.commands?.onCommand?.(cmd => this.command(cmd)); } catch (e){ console.warn('[natpf-mouse] comandi', e?.message || e); }
    try { desk?.notices?.onNotice?.(n => this.notice(n)); } catch (e){ console.warn('[natpf-mouse] avvisi', e?.message || e); }
    const win = globalThis.window, doc = globalThis.document;
    if (this.desktop){
      // (in cattura, prima di tutto: Chromium torna indietro al rilascio del tasto, anche se la pagina ascolta auxclick)
      for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick']) win?.addEventListener?.(t, e => { if (blockedMouseButton(e)) e.preventDefault(); }, true);
      // link per il telefono («Apri il link del controller ↗», link dell'invito): nel programma niente seconda finestra
      // sopra il gioco (il programma la nega comunque, setWindowOpenHandler): lo si dice
      doc?.addEventListener?.('click', e => {
        const a = e.target?.closest?.('a[target="_blank"]');
        if (!a) return;
        e.preventDefault(); e.stopPropagation();
        this.ui.toast?.(LINK_TEXT, toastMs(LINK_TEXT));
      }, true);
    }
    // file trascinati sulla pagina: il browser li aprirebbe al posto del gioco; immagini e link non si trascinano
    win?.addEventListener?.('dragover', e => e.preventDefault());
    win?.addEventListener?.('drop', e => e.preventDefault());
    doc?.addEventListener?.('dragstart', e => { if (e.target?.closest?.('img, a')) e.preventDefault(); }, true);
    // B39.5 · puntatore del mouse per il ledwall
    try { this.cursor = new NatpfCursor(engine, ui); } catch (e){ console.warn('[natpf-mouse] puntatore', e?.message || e); }
    // B39.3 · ❚❚ tenuto 3 secondi in campo: pannello dello stand (il clic breve resta la pausa)
    const pauseBtn = doc?.getElementById?.('natpf-pause-btn');
    if (pauseBtn) this.pauseHold = new HoldPress(pauseBtn, { onDone: () => this.ui.kiosk?.open?.() });
    // mouse in movimento: html.mouse-active per MOUSE_ACTIVE_MS (mostra «× Chiudi» della classifica a schermo intero).
    // B39.7: html.input-mouse finché l'ultimo comando è del mouse (la riga dei tasti in basso nel menu si nasconde; un tasto
    // la rimette)
    const html = doc?.documentElement;
    win?.addEventListener?.('pointerdown', e => { if ((e.pointerType || 'mouse') === 'mouse') html?.classList?.add('input-mouse'); }, { capture: true, passive: true });
    win?.addEventListener?.('keydown', () => html?.classList?.remove('input-mouse'), { capture: true, passive: true });
    win?.addEventListener?.('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      html?.classList?.add('mouse-active');
      clearTimeout(this._moveT); this._moveT = setTimeout(() => html?.classList?.remove('mouse-active'), MOUSE_ACTIVE_MS);
    }, { passive: true });
    // B39.3 · uscita dalla classifica a schermo intero (prima: nessun pulsante, solo Esc o «Nuovo giocatore»)
    const title = doc?.getElementById?.('title-modal');
    if (title && doc.createElement){
      const b = this.rankingExit = doc.createElement('button');
      b.type = 'button'; b.className = 'ranking-exit'; b.textContent = '× Chiudi'; b.setAttribute?.('aria-label', 'Chiudi la classifica a schermo intero');
      b.addEventListener?.('click', e => { e.stopPropagation(); this.ui.lobby?.go?.('menu'); });
      title.appendChild?.(b);
    }
    // B39.3 · nel pannello dello stand la riga sotto le voci spiega la voce sotto il puntatore; uscendo torna com'era
    const staff = doc?.getElementById?.('natpf-staff');
    staff?.addEventListener?.('pointerover', e => {
      const b = e.target?.closest?.('[data-staff]'), note = doc.getElementById('staff-note');
      const t = b && staffHint(b.dataset.staff, b.getAttribute?.('title'));
      if (note && t){ note.textContent = t; this._hinting = true; }
    });
    staff?.addEventListener?.('pointerout', e => {
      if (!this._hinting || e.relatedTarget?.closest?.('[data-staff]')) return;
      this._hinting = false; this.ui.kiosk?.paint?.();
    });
  }
  // comandi del menu del tasto destro (elenco congelato nel preload: PAGE_COMMANDS di natpf-desktop/src/desktop-core.mjs)
  command(cmd){
    const ui = this.ui;
    if (cmd === 'diagnostica'){
      // dal pannello dello stand aperto: si chiude e torna alla chiusura della diagnostica
      const back = ui.kiosk?.isOpen ? 'staff' : null;
      if (back) ui.kiosk.close();
      if (!ui.diag?.isOpen) ui.diag?.open?.({ back });
      return true;
    }
    if (cmd === 'calibra'){
      if (ui.kiosk?.isOpen) ui.kiosk.close();
      if (ui.pause?.isOpen) ui.pause.close();
      ui.calibra?.open?.();
      ui._syncPause?.();
      return true;
    }
    if (cmd === 'azzera-calibrazione'){
      if (ui.calibra?.isOpen) ui.calibra.cancel();
      ui.screen?.save?.({ preset: 'full', margins: { t: 0, r: 0, b: 0, l: 0 } });
      ui.lobby?.visible && ui.lobby.paint?.();
      const t = 'Calibrazione dello schermo azzerata: il gioco usa tutta la finestra';
      ui.toast?.(t, toastMs(t));
      return true;
    }
    return false;
  }
  notice(n){
    if (!n) return;
    const t = n.kind === 'link' ? LINK_TEXT : n.kind === 'download' ? downloadText(n) : '';
    if (t) this.ui.toast?.(t, toastMs(t));
  }
}

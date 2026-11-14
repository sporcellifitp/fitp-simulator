// B39 · Stand con il solo mouse (14/11/2026, docs/b39/stand-solo-mouse.md). Allo stand si vede solo il ledwall e il mouse
// è solo dello staff. Qui le parti della pagina del gioco:
//   • comandi del menu del tasto destro del programma Windows (window.natpfDesktop.commands: diagnostica, calibrazione
//     dello schermo, azzera la calibrazione) e avvisi del programma (window.natpfDesktop.notices: file salvato in
//     Download › NATPF senza «Salva con nome», link negato);
//   • trappole (B39.1): nel programma i tasti laterali «indietro» e «avanti» del mouse e il tasto centrale non fanno niente
//     (prima «indietro» riportava alla pagina «Avvio del gioco…» e il gioco spariva; il programma svuota anche la
//     cronologia), i link per il telefono non aprono una seconda finestra sopra il gioco (avviso al posto), file e immagini
//     trascinati sulla pagina non la cambiano.
// Funzioni pure in testa (provate con node:test); la classe tocca il DOM solo nel costruttore e nei gestori.
export const LINK_TEXT = 'Il link è per il telefono: inquadra il QR con la fotocamera del telefono';
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

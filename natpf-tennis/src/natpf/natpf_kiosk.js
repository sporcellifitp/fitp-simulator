// Stand per eventi: modalità chiosco e pannello dell'addetto.
// Chiosco (si accende dal pannello): dopo N secondi senza nessuno (nessun tasto, clic, tocco o colpo del telefono)
// si torna al menu principale, si dimentica il nickname e si scollega il telefono, così lo stand è pronto per il
// visitatore successivo. Durante una partita o una sfida si aspetta il doppio, poi si chiude anche quella.
// Pannello dell'addetto: Ctrl+Maiusc+K, oppure tenere premuto 3 secondi il marchio NATPF in alto a sinistra nel menu.
// Ha anche la sensibilità della mira del telefono (B16, opzione dello staff: natpf_aim_level.js).
// E il formato in fiera (B18: punto decisivo e servizio come nel tie-break, natpf_fair_format.js): dal B20 tre valori,
// «No · Solo stesso schermo · Sì», di base «Solo stesso schermo».
// E lo «scambio che si scalda» (B20, natpf_hot_rally.js): No · Sì, spento di base.
// E le due opzioni dello stesso schermo del B25 (natpf_duo_rules.js), spente di base: «Lancio automatico» (No · 30 s) e
// «Stesso schermo: campo aperto» (No · Sì).
// B27: «Telecomando dello staff» (natpf_remote.js) e, nel programma Windows, «Schermo del gioco» (monitor successivo),
// nella riga dei pulsanti in basso.
import { readAimLevel, writeAimLevel, aimLevelLabel, aimLevelButton, nextAimLevel } from './natpf_aim_level.js';
import { readFairMode, writeFairMode, nextFairMode, fairForcedByUrl } from './natpf_fair_format.js';
import { readHotRally, writeHotRally, hotButton, hotToast } from './natpf_hot_rally.js';
import { readAutoToss, writeAutoToss, autoTossButton, autoTossToast, readOpenCourt, writeOpenCourt, openCourtButton, openCourtToast } from './natpf_duo_rules.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const KIOSK_KEY = 'natpf-tennis.chiosco';
export const IDLE_STEPS = [30, 45, 60, 90];
// cosa vuol dire ogni mira, per l'avviso del pannello dello stand (natpf_aim_level.js, docs/GUIDA_MISURA_MIRA.md §1)
const AIM_HINT = { alta: 'più palle angolate', media: 'un po’ meno angolate dell’alta', bassa: 'meno angolate, com’era prima' };
// cosa fare dopo `idle` secondi fermi (funzione pura): niente, tornare al menu, chiudere la partita in corso
// formato in fiera: scritta del pulsante e avviso dopo il clic (funzioni pure). forced: l'indirizzo (?formato=…) comanda
// B20: tre valori, «No · Solo stesso schermo · Sì» (natpf_fair_format.FAIR_MODES: 'no' | 'split' | 'si'), di base «Solo
// stesso schermo». Per compatibilità il modo può arrivare anche come vero/falso (Sì/No)
const fairMode = m => (m === true ? 'si' : m === 'si' || m === 'split' ? m : 'no');
const FAIR_LABEL = { no: 'No', split: 'Solo stesso schermo', si: 'Sì · punto decisivo' };
const FAIR_SAVED = { no: 'spento', split: 'solo per lo stesso schermo', si: 'acceso' };
export const fairButton = (mode, forced = false) => `${FAIR_LABEL[fairMode(mode)]}${forced ? ' (indirizzo)' : ''}`;
export function fairToast(mode, forced = false){
  const m = fairMode(mode);
  const t = m === 'si' ? 'Formato in fiera acceso: punto decisivo sul 40-40 e servizio che passa ogni due punti (batte anche la CPU o il Player 2); al massimo al meglio di 3'
    : m === 'split' ? 'Formato in fiera solo nello stesso schermo: tra due persone punto decisivo sul 40-40 e servizio che passa ogni due punti; contro la CPU formato classico'
    : 'Formato in fiera spento: un battitore per game, parità e vantaggi';
  return forced ? `Formato in fiera salvato ${FAIR_SAVED[m]}, ma in questa pagina comanda l’indirizzo (?formato=…)` : `${t}. Vale dalla prossima partita; resta salvata`;
}
export function kioskAction({ enabled, idle, limit, inGame, atRest }){
  if (!enabled) return null;
  if (inGame) return idle >= limit*2 ? 'end-game' : null;
  return !atRest && idle >= limit ? 'reset' : null;
}

export class NatpfKiosk {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(KIOSK_KEY) || '{}'); } catch {}
    this.enabled = !!saved.enabled; this.limit = IDLE_STEPS.includes(saved.limit) ? saved.limit : 45;
    this.last = performance.now();
    const poke = () => { this.last = performance.now(); };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) window.addEventListener(ev, poke, { capture: true, passive: true });
    ui.phone?.onSwing?.(poke);
    this.el = $('natpf-staff');
    this.el?.addEventListener('pointerdown', e => e.stopPropagation());
    this.el?.addEventListener('click', e => { const b = e.target.closest('[data-staff]'); if (b){ e.stopPropagation(); this.run(b.dataset.staff); } });
    window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyK'){ e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); } }, true);
    // tenere premuto il marchio del menu per 3 secondi
    const brand = document.querySelector('.lobby-brand');
    if (brand){
      let t = null;
      brand.addEventListener('pointerdown', () => { clearTimeout(t); t = setTimeout(() => this.open(), 3000); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) brand.addEventListener(ev, () => clearTimeout(t));
    }
    setInterval(() => this.check(), 1000);
  }
  _save(){ try { localStorage.setItem(KIOSK_KEY, JSON.stringify({ enabled: this.enabled, limit: this.limit })); } catch {} }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  open(){ show(this.el); this.paint(); }
  close(){ show(this.el, false); }
  toggle(){ this.isOpen ? this.close() : this.open(); }
  check(){
    if (this.isOpen) return;
    const E = this.engine, ui = this.ui, lobby = ui.lobby;
    const inGame = !lobby.visible && (!E.autoPlayMode || ui.training.active || !!ui.events.active);
    const atRest = lobby.visible && lobby.step === 'menu' && !ui.events.nickname && !ui.phone.connected;
    const a = kioskAction({ enabled: this.enabled, idle: (performance.now() - this.last)/1000, limit: this.limit, inGame, atRest });
    if (a === 'end-game'){ ui.backToMenu(); this.reset(); }
    else if (a === 'reset') this.reset();
  }
  // stand libero per il prossimo visitatore
  reset(){
    const ui = this.ui;
    // guida chiusa con la sua funzione prima di nascondere i pannelli (dopo, per lei, è già chiusa)
    if (ui.onboarding?.isOpen) ui.onboarding.close();
    for (const m of document.querySelectorAll('.natpf-sheet-backdrop:not(#natpf-staff)')) m.classList.add('hidden');
    ui.events.nickname = '';
    // come «Nuovo giocatore» (natpf_new_player.resetVisitor): niente record degli ospiti di prima né colpi speciali
    // imparati da un ospite senza nome (il setter del nickname li toglie solo se c'era un nome; revisione dell'insieme B18.1)
    ui.events.forgetGuest?.();
    ui.events.forgetLearned?.();
    // B25: le fasce dei due giocatori dello stesso schermo tornano «Adulto» (sono di chi gioca, non dello stand)
    ui.split?.resetBands?.();
    // il visitatore successivo rivede il tutorial prima di calibrare (gioco singolo e stesso schermo)
    // (il tutorial visto è segnato sul telefono, per abbinamento: si dimentica anche con lo stesso telefono)
    if (ui.split) ui.split.closeTutorials?.();
    ui.phone?.forgetTutorial?.(); ui.engine?.natpfPhone2?.forgetTutorial?.();
    if (ui.phone.connected) ui.phone.forget?.();
    ui.lobby.go('menu');
    // pausa ricalcolata a pannelli chiusi: prima restava attiva e il visitatore successivo trovava il gioco fermo
    ui._syncPause?.();
    this.last = performance.now();
  }
  run(cmd){
    const ui = this.ui;
    if (cmd === 'close') return this.close();
    // «Nuovo giocatore» (B18, natpf_new_player.js): azzera chi gioca senza scollegare il telefono e lo porta al passo giusto
    if (cmd === 'newplayer'){ this.close(); ui.newPlayer?.(); return; }
    if (cmd === 'kiosk'){ this.enabled = !this.enabled; this._save(); }
    if (cmd === 'idle'){ this.limit = IDLE_STEPS[(IDLE_STEPS.indexOf(this.limit) + 1) % IDLE_STEPS.length]; this._save(); }
    if (cmd === 'ranking'){ this.close(); if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.go('ranking'); document.documentElement.classList.add('ranking-full'); return; }
    if (cmd === 'export') ui.events.exportCsv();
    if (cmd === 'reset'){ if (confirm('Azzerare la classifica di oggi?')) ui.events.resetBoard(); }
    if (cmd === 'phone'){ ui.phone.forget?.(); }
    // B27: telecomando dello staff (natpf_remote.js: QR dello staff, codice, «Scollega») e monitor del gioco (programma
    // Windows: window.natpfDesktop.displays, monitor successivo; la scelta resta salvata)
    if (cmd === 'remote'){ ui.remote?.open(); return; }
    if (cmd === 'display'){
      Promise.resolve(window.natpfDesktop?.displays?.next?.()).then(r => { if (r?.current?.label) ui.toast?.(`Gioco su ${r.current.label}; resta salvato`); return ui.remote?._refreshDisplays?.(true); }).then(() => this.paint(), () => this.paint());
      return;
    }
    if (cmd === 'music') $('btn-audio-toggle')?.click();
    // mira del telefono: alta → media → bassa → alta; vale dal colpo successivo (anche per il secondo telefono). L'avviso
    // dice anche cosa vuol dire (nel foglio non c'è posto per un paragrafo: a 1024 × 600 «Chiudi» finiva fuori vista)
    if (cmd === 'aim'){ const v = writeAimLevel(nextAimLevel(readAimLevel())); ui.toast?.(`Mira del telefono: ${aimLevelLabel(v)} · ${AIM_HINT[v]}; resta salvata`); }
    // formato in fiera: no → solo stesso schermo → sì → no, salvato; vale dalla partita dopo (quella in corso resta con la
    // sua regola)
    if (cmd === 'fair'){
      const forced = fairForcedByUrl(), mode = writeFairMode(nextFairMode(readFairMode({ search: '' })));
      ui.toast?.(fairToast(mode, forced));
      ui.diag?.recorder?.log?.('stand.formatoFiera', { acceso: mode === 'si', modo: mode, indirizzo: forced });
    }
    // B20: «scambio che si scalda» (natpf_hot_rally.js), no ↔ sì, salvato; vale dalla partita dopo, nello stesso schermo
    if (cmd === 'hot'){
      const on = writeHotRally(!readHotRally());
      ui.toast?.(hotToast(on));
      ui.diag?.recorder?.log?.('stand.scambioCaldo', { acceso: on });
    }
    // B25: «lancio automatico» e «campo aperto» (natpf_duo_rules.js), no ↔ sì, salvati; valgono dalla partita dopo, nello
    // stesso schermo con i due telefoni
    if (cmd === 'autotoss'){
      const on = writeAutoToss(!readAutoToss());
      ui.toast?.(autoTossToast(on));
      ui.diag?.recorder?.log?.('stand.lancioAuto', { acceso: on });
    }
    if (cmd === 'open'){
      const on = writeOpenCourt(!readOpenCourt());
      ui.toast?.(openCourtToast(on));
      ui.diag?.recorder?.log?.('stand.campoAperto', { acceso: on });
    }
    this.paint();
  }
  paint(){
    if (!this.el) return;
    const set = (k, v, on) => { const b = this.el.querySelector(`[data-staff="${k}"] b`); if (b){ b.textContent = v; b.parentElement.classList.toggle('on', !!on); } };
    set('kiosk', this.enabled ? 'Sì' : 'No', this.enabled);
    set('idle', `${this.limit} s`);
    const audio = this.engine.audioEngine; set('music', audio && audio.muted ? 'No' : 'Sì', !(audio && audio.muted));
    set('phone', this.ui.phone.connected ? 'Scollega' : 'Nessuno collegato');
    set('aim', aimLevelButton(readAimLevel()));
    const fair = readFairMode(); set('fair', fairButton(fair, fairForcedByUrl()), fair !== 'no');
    const hot = readHotRally(); set('hot', hotButton(hot), hot);
    const auto = readAutoToss(); set('autotoss', autoTossButton(auto), auto);
    const open = readOpenCourt(); set('open', openCourtButton(open), open);
    // B27: telecomando dello staff e, nel programma Windows con più monitor, il monitor del gioco
    const remote = this.ui.remote; set('remote', remote ? remote.staffLabel : '—', !!remote?.link?.connected);
    const disp = this.el.querySelector('[data-staff="display"]'), d = remote?.displays;
    show(disp, !!window.natpfDesktop?.displays);
    if (disp && !d) remote?._refreshDisplays?.();
    set('display', d?.current ? `${d.current.label}${d.list?.length > 1 ? ' ›' : ''}` : '—', false);
    const n = $('staff-note');
    if (n) n.textContent = this.enabled ? `Chiosco attivo: dopo ${this.limit} s senza nessuno si torna al menu, il nickname si azzera e il telefono si scollega (in partita dopo ${this.limit*2} s).` : 'Chiosco spento: il gioco resta dove l’ha lasciato l’ultimo visitatore.';
  }
}

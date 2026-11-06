// Stand per eventi: modalità chiosco e pannello dell'addetto.
// Chiosco (si accende dal pannello): dopo N secondi senza nessuno (nessun tasto, clic, tocco o colpo del telefono)
// si torna al menu principale, si dimentica il nickname e si scollega il telefono, così lo stand è pronto per il
// visitatore successivo. Durante una partita o una sfida si aspetta il doppio, poi si chiude anche quella.
// Pannello dell'addetto: Ctrl+Maiusc+K, oppure tenere premuto 3 secondi il marchio NATPF in alto a sinistra nel menu.
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const KIOSK_KEY = 'natpf-tennis.chiosco';
export const IDLE_STEPS = [30, 45, 60, 90];
// cosa fare dopo `idle` secondi fermi (funzione pura): niente, tornare al menu, chiudere la partita in corso
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
    if (cmd === 'kiosk'){ this.enabled = !this.enabled; this._save(); }
    if (cmd === 'idle'){ this.limit = IDLE_STEPS[(IDLE_STEPS.indexOf(this.limit) + 1) % IDLE_STEPS.length]; this._save(); }
    if (cmd === 'ranking'){ this.close(); if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.go('ranking'); document.documentElement.classList.add('ranking-full'); return; }
    if (cmd === 'export') ui.events.exportCsv();
    if (cmd === 'reset'){ if (confirm('Azzerare la classifica di oggi?')) ui.events.resetBoard(); }
    if (cmd === 'phone'){ ui.phone.forget?.(); }
    if (cmd === 'music') $('btn-audio-toggle')?.click();
    this.paint();
  }
  paint(){
    if (!this.el) return;
    const set = (k, v, on) => { const b = this.el.querySelector(`[data-staff="${k}"] b`); if (b){ b.textContent = v; b.parentElement.classList.toggle('on', !!on); } };
    set('kiosk', this.enabled ? 'Sì' : 'No', this.enabled);
    set('idle', `${this.limit} s`);
    const audio = this.engine.audioEngine; set('music', audio && audio.muted ? 'No' : 'Sì', !(audio && audio.muted));
    set('phone', this.ui.phone.connected ? 'Scollega' : 'Nessuno collegato');
    const n = $('staff-note');
    if (n) n.textContent = this.enabled ? `Chiosco attivo: dopo ${this.limit} s senza nessuno si torna al menu, il nickname si azzera e il telefono si scollega (in partita dopo ${this.limit*2} s).` : 'Chiosco spento: il gioco resta dove l’ha lasciato l’ultimo visitatore.';
  }
}

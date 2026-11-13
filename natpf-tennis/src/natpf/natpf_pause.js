// Menu di pausa: in partita l'HUD mostra solo tabellone, game ed esito del colpo. Musica, voce, visuale, movimento
// della webcam, moviola, ricalibrazione del telefono, schermo intero, aiuto e ritorno al menu stanno qui (pulsante
// tondo ⏸ o Esc).
// I comandi riusano i pulsanti dell'HUD del motore base, che restano nel DOM ma non si vedono.
// B43 (controllo «solo mouse», n. 14 e 15): «Torna al menu» chiede un secondo clic (natpf_confirm.js: accanto c'è
// «Riprendi ›», un clic impreciso chiudeva la partita del visitatore); «Diagnostica» apre il pannello con la partita che
// resta ferma e alla chiusura si torna qui (prima la partita ripartiva dietro la diagnostica); aprendo la pausa con la
// diagnostica aperta, la diagnostica si chiude (copriva «Torna al menu»).
import { TwoStep } from './natpf_confirm.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const text = sel => (document.querySelector(sel)?.textContent || '').trim();

export class NatpfPause {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-pause');
    this.btn = $('natpf-pause-btn');
    this.btn?.addEventListener('click', e => { e.stopPropagation(); this.open(); });
    this.el?.addEventListener('pointerdown', e => e.stopPropagation());
    this.confirm = new TwoStep();
    this.el?.addEventListener('click', e => { const b = e.target.closest('[data-pause]'); if (b){ e.stopPropagation(); this.press(b); } });
  }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  // in campo (lobby chiusa): partita, allenamento o P2 in una stanza
  get inGame(){ return document.documentElement.classList.contains('autoplay-mode') && !this.engine.autoPlayMode; }
  open(){
    if (!this.el || !this.inGame) return;
    // B43: la diagnostica (in basso a sinistra, sopra la pausa) si chiude: copriva «Torna al menu» (controllo A3)
    if (this.ui.diag?.isOpen) this.ui.diag.close({ quiet: true });
    show(this.el); this.paint(); this.ui.syncVolumes?.(); this.ui._syncPause(); this.el.querySelector('[data-pause="resume"]')?.focus();
  }
  close(){ this.confirm?.disarm(); show(this.el, false); this.ui._syncPause(); }
  toggle(){ this.isOpen ? this.close() : this.open(); }
  // clic su una voce: «Torna al menu» vuole il secondo clic (solo i clic: run('menu') dal codice e il «Menu» del
  // telecomando, che chiede conferma sul telefono, restano diretti). true se la voce è partita
  press(b, cmd = b?.dataset?.pause){
    if (!cmd) return false;
    if (cmd === 'menu'){ if (!this.confirm.click(b, 'menu')) return false; }
    else this.confirm.disarm();
    this.run(cmd);
    return true;
  }
  run(cmd){
    const click = id => $(id)?.click();
    switch (cmd){
      case 'resume': this.close(); return;
      case 'music': click('btn-audio-toggle'); break;
      case 'voice': click('btn-voice-toggle'); break;
      case 'view': this.engine.setViewMode(this.engine.viewMode === 'first' ? 'third' : 'first'); break;
      case 'move': this.engine.natpfBody?.toggle(); break;
      // schermo intero sì/no (natpf_screen.js): la pausa resta aperta e si aggiorna quando il browser ha cambiato
      case 'fullscreen': this.ui.screen?.fullscreen?.toggle()?.then?.(() => this.paint()); break;
      case 'replay': this.close(); click('btn-replay-trigger'); return;
      case 'phone': this.close(); this.ui.openPhone(); return;
      case 'help': this.close(); this.ui.onboarding.open(); return;
      // B43: la partita resta ferma con la diagnostica aperta (natpf_ui._syncPause) e alla chiusura si torna alla pausa
      case 'diag': this.close(); this.ui.diag?.open({ back: 'pause' }); return;
      case 'menu': this.close(); this.ui.backToMenu(); return;
    }
    this.paint();
  }
  paint(){
    if (!this.isOpen) return;
    const set = (cmd, label, on) => { const b = this.el.querySelector(`[data-pause="${cmd}"]`); if (!b) return; b.querySelector('b').textContent = label; b.classList.toggle('on', !!on); };
    const audio = this.engine.audioEngine;
    const music = audio ? !audio.muted : true;
    set('music', music ? 'Sì' : 'No', music);
    const voice = audio?.voice ? !!audio.voice.enabled : !/no/i.test(text('[data-voice-label]'));
    set('voice', voice ? 'Sì' : 'No', voice);
    set('view', this.engine.viewMode === 'first' ? '1ª persona' : '3ª persona', true);
    const fs = this.ui.screen?.fullscreen;
    show(this.el.querySelector('[data-pause="fullscreen"]'), !!fs);
    if (fs) set('fullscreen', fs.label, fs.frameless);
    const webcam = this.ui.controller === 'webcam';
    show(this.el.querySelector('[data-pause="move"]'), webcam && !!this.engine.natpfBody);
    if (webcam && this.engine.natpfBody) set('move', this.engine.natpfBody.enabled ? 'Segue il corpo' : 'Automatico', this.engine.natpfBody.enabled);
    show(this.el.querySelector('[data-pause="phone"]'), this.ui.controller === 'phone');
    // niente moviola nel riscaldamento e nelle sfide (dopo il replay il lanciapalle non ripartiva), né prima di aver finito
    // un punto: la moviola rimette in scena l'ultimo punto giocato (natpf_replay.js)
    show(this.el.querySelector('[data-pause="replay"]'), !this.ui.training?.active && !this.ui.events?.active && !this.ui.trial?.active && !!this.engine.natpfReplay?.available);
    set('diag', this.ui.diag?.recorder?.active ? 'In registrazione' : 'Registra la sessione', !!this.ui.diag?.recorder?.active);
    const kicker = this.el.querySelector('.sheet-kicker'); if (kicker) kicker.textContent = this.ui.trial?.active ? 'Scambi di prova in pausa' : this.ui.training?.active ? 'Allenamento in pausa' : 'Partita in pausa';
  }
}

// Stand per eventi: modalità chiosco e pannello dell'addetto.
// Chiosco (si accende dal pannello): dopo N secondi senza nessuno (nessun tasto, clic, tocco, né gesti o tocchi sul telefono
// o telefono mosso) si torna al menu principale e si azzera chi gioca, così lo stand è pronto per il visitatore successivo.
// Durante una partita o una sfida si aspetta il doppio, poi si chiude anche quella.
// B45.1 «telefono che non si scollega» (14/11): il chiosco NON scollega più i telefoni (Player 1 e Player 2, col QR o dello
// stand). Prima scollegava di proposito la racchetta col QR, e il telefono diceva «Scollegato – Il computer ha scollegato il
// telefono… inquadra il nuovo QR» a schermo acceso: in fiera sembrava una caduta della rete. Ora azzera solo il giocatore
// come «Nuovo giocatore» (nome, mano destra per tutti e due, profilo imparato e calibrazione, tutorial, nomi dello stesso
// schermo); «Telefono: Scollega» del pannello e del telecomando resta. Anche i messaggi del telefono contano come attività
// (gesti della calibrazione, tocchi, «Sono pronto», sensori attivati, telefono mosso: natpf_phone_racket.onActivity e
// movedAt), non solo i colpi. «A riposo» (niente da azzerare) = al menu senza nome e senza nessuno dall'ultimo azzeramento.
// Pannello dell'addetto: Ctrl+Maiusc+K (F9 nel programma Windows), oppure tenere premuto 3 secondi il marchio NATPF in
// alto a sinistra nel menu.
// Ha anche la sensibilità della mira del telefono (B16, opzione dello staff: natpf_aim_level.js).
// E il formato in fiera (B18: punto decisivo e servizio come nel tie-break, natpf_fair_format.js): dal B20 tre valori,
// «No · Solo stesso schermo · Sì», di base «Solo stesso schermo».
// E lo «scambio che si scalda» (B20, natpf_hot_rally.js): Sì · No; dal B42 acceso di base, in tutti i modi.
// E le due opzioni dello stesso schermo del B25 (natpf_duo_rules.js), spente di base: «Lancio automatico» (No · 30 s) e
// «Stesso schermo: campo aperto» (No · Sì).
// B27: «Telecomando dello staff» (natpf_remote.js) e, nel programma Windows, «Schermo del gioco» (monitor successivo),
// nella riga dei pulsanti in basso.
// B30: «Registro di gioco» (natpf_registro.js): Sì · No (di base sempre Sì), stato in parole semplici, «Invia adesso» e
// «Scarica la coda», in una riga sotto la nota.
// B43 (controllo «solo mouse», voci A1, A2, A5): il pannello aperto in campo ferma la partita (anche scambi di prova,
// allenamento e minigiochi: natpf_ui._syncPause) e alla chiusura la fa ripartire; sta sopra la pausa e sopra tutto il
// resto tranne la calibrazione dello schermo (natpf-ui.css); in campo «Nuovo giocatore», «Classifica a schermo intero» e
// «Telefono: Scollega» chiedono un secondo clic (natpf_confirm.js).
import { readAimLevel, writeAimLevel, aimLevelLabel, aimLevelButton, nextAimLevel } from './natpf_aim_level.js';
import { readFairMode, writeFairMode, nextFairMode, fairForcedByUrl } from './natpf_fair_format.js';
import { readHotRally, writeHotRally, hotButton, hotToast } from './natpf_hot_rally.js';
import { readAutoToss, writeAutoToss, autoTossButton, autoTossToast, readOpenCourt, writeOpenCourt, openCourtButton, openCourtToast } from './natpf_duo_rules.js';
// B28: «Calibrazione: Giocando · Con i gesti · Nessuna» (natpf_trial_learn.js), di base «Giocando»
import { readSavedCalMode, writeCalMode, nextCalMode, calModeButton, calModeToast, calModeFromUrl } from './natpf_trial_learn.js';
import { TwoStep } from './natpf_confirm.js';
// B38: «Tastiera a schermo: Automatica · Sempre · Mai» (natpf_tastiera.js), di base «Automatica»
import { readOskMode, writeOskMode, nextOskMode, oskButton, oskToast } from './natpf_tastiera.js';
import { HoldPress } from './natpf_hold.js';
// B46: chi arriva dopo parte destro (Player 1 e Player 2), come con «Nuovo giocatore»
import { resetHands } from './natpf_hand.js';
// B47: «Battuta: Sempre lo stesso · Alternata» (natpf_battuta.js), di base «Sempre lo stesso»
import { readServeRule, writeServeRule, nextServeRule, serveRuleButton, serveRuleToast, serveRuleForcedByUrl } from './natpf_battuta.js';
// B41.4: «Modalità fiera: No · Sì» e, con la modalità accesa, «Telefoni dello stand ›» al posto di «Telefono: Scollega»
import { fairPanelButton, fairPanelToast } from './natpf_fiera.js';
// riassunto dei due posti nella voce «Telefoni dello stand» (funzione pura): «1 ✓ · 2 da abbinare ›»
const STAND_SHORT = { ready: '✓', prep: 'sensori', lost: 'scollegato', unpaired: 'da abbinare', pairing: 'abbinamento', ask: 'da confermare', off: '—' };
export const standPanelSummary = (v1, v2) => `1 ${STAND_SHORT[v1?.state] || '—'} · 2 ${STAND_SHORT[v2?.state] || '—'} ›`;
// B45.1: cadute del collegamento di oggi nella riga sotto le voci
import { rigaCadute, leggiCadute } from './natpf_cadute.js';
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
    // B45.1: niente da azzerare (nessuno dall'avvio o dall'ultimo azzeramento): al menu il chiosco non riparte di continuo
    this.clean = true;
    const poke = this.poke = () => { this.last = performance.now(); this.clean = false; };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) window.addEventListener(ev, poke, { capture: true, passive: true });
    // B39.5 (controllo «solo mouse», A4): anche il mouse che si muove (lo staff che legge o cerca una voce senza cliccare),
    // al più una volta al secondo e solo per spostamenti veri (non il tremolio di un mouse fermo)
    let moveAt = 0;
    window.addEventListener('pointermove', e => { const now = performance.now(); if (now - moveAt < 1000 || Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) < 3) return; moveAt = now; poke(); }, { capture: true, passive: true });
    ui.phone?.onSwing?.(poke);
    // B45.1: gesti della calibrazione, tocchi sul telefono, «Sono pronto», sensori attivati (il Telefono 2 nasce dopo: check)
    ui.phone?.onActivity?.(poke);
    this.el = $('natpf-staff');
    this.el?.addEventListener('pointerdown', e => e.stopPropagation());
    // B43: conferma in due passi (solo i clic: run() dal codice resta immediato) per le voci che in campo chiudono la
    // partita o tolgono il telefono a chi gioca
    // (onChange: disarmato, il pulsante riprende la scritta di adesso, non quella di quando era armato)
    this.confirm = new TwoStep({ onChange: on => { if (!on) this.paint(); } });
    this.el?.addEventListener('click', e => { const b = e.target.closest('[data-staff]'); if (b){ e.stopPropagation(); this.press(b); } });
    window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyK'){ e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); } }, true);
    // B37: nel programma Windows anche F9 e la voce del menu «Pannello dello stand (F9)» (processo principale, ponte del
    // preload: window.natpfDesktop.staffPanel). Sul PC dello stand Ctrl+Maiusc+K non arrivava al gioco
    window.natpfDesktop?.staffPanel?.onToggle?.(a => { poke(); a === 'open' ? this.open() : a === 'close' ? this.close() : this.toggle(); });
    // tenere premuto il marchio del menu per 3 secondi. B39: anche il titolo grande della pagina principale (lì il marchio
    // piccolo è nascosto), con l'anello che si riempie e una pressione che tollera piccoli spostamenti (natpf_hold.js);
    // in campo ❚❚ tenuto 3 secondi (natpf_stand_mouse.js)
    for (const brand of document.querySelectorAll?.('.lobby-brand, .menu-brand') || []) new HoldPress(brand, { onDone: () => { poke(); this.open(); } });
    setInterval(() => this.check(), 1000);
  }
  _save(){ try { localStorage.setItem(KIOSK_KEY, JSON.stringify({ enabled: this.enabled, limit: this.limit })); } catch {} }
  // calibrazione dello stand cambiata (voce «Calibrazione», o «Modalità fiera» accesa che la porta su «Giocando»)
  // (revisione del B28, difetto 4) l'opzione nuova vale dal prossimo «Gioca» senza rifare il QR e niente passa a chi
  // arriva dopo: una calibrazione con i gesti fatta prima del cambio non vale più «per la prossima partita»; con
  // «Con i gesti» un telefono rimasto con il profilo dato dal gioco torna a calibrare (subito se si è al menu,
  // altrimenti al prossimo «Gioca»); con le altre un telefono fermo ai gesti riceve il profilo semplice
  _calChanged(){
    const ui = this.ui;
    for (const p of [ui.phone, this.engine?.natpfPhone2]){
      if (!p) continue;
      p.gestureAt = null;
      if (ui.lobby?.visible && !ui.training?.active && !ui.trial?.active) p.demoteIfStale?.();
      p._autoProfile?.();
    }
  }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  // B43: aperto o chiuso, la partita si ferma o riparte (natpf_ui._syncPause conta il pannello)
  open(){ show(this.el); this.paint(); this.ui._syncPause?.(); }
  close(){ this.confirm?.disarm(); show(this.el, false); this.ui._syncPause?.(); }
  // in campo (partita, scambi di prova, allenamento, minigioco), non a partita finita
  get gameRunning(){ return !!this.ui.pause?.inGame && this.engine.phase !== 'MATCH_OVER'; }
  // voci che in campo vogliono il secondo clic: chiudono la partita («Nuovo giocatore», «Classifica a schermo intero»)
  // o tolgono il telefono a chi gioca («Telefono: Scollega», solo con un telefono collegato)
  // B39: «Classifica · Azzera oggi» sempre (prima una finestra confirm() di Windows, piccola e fuori stile sul ledwall)
  // (B41.4: con la modalità fiera «Telefono» apre il foglio «Telefoni dello stand»: niente da confermare)
  needsConfirm(cmd){ return cmd === 'reset' || (this.gameRunning && (cmd === 'newplayer' || (cmd === 'ranking' && !this.rankingFull) || (cmd === 'phone' && !this.ui.fiera?.on && !!this.ui.phone?.connected))); }
  // classifica a schermo intero in vista (B33): la stessa voce del pannello la chiude (B39)
  get rankingFull(){ return !!document.documentElement?.classList?.contains('ranking-full'); }
  // clic su una voce (mouse, tastiera o OK del telecomando sul pulsante a fuoco): dove serve, prima la conferma. true se
  // la voce è partita
  press(b, cmd = b?.dataset?.staff){
    if (!cmd) return false;
    if (this.needsConfirm(cmd)){ if (!this.confirm.click(b, cmd)) return false; }
    else this.confirm.disarm();
    this.run(cmd);
    return true;
  }
  toggle(){ this.isOpen ? this.close() : this.open(); }
  check(){
    // B39.5 (A4): niente azzeramento con un foglio dello staff aperto (pannello, telecomando con l'abbinamento in corso,
    // diagnostica): prima il chiosco chiudeva l'abbinamento del telecomando di chi aveva in mano il telefono e non il mouse.
    // La calibrazione dello schermo no (B8: lasciata aperta, il chiosco la annulla); chi la sta facendo muove il mouse, e
    // dal B39.5 il movimento conta come attività
    const ui0 = this.ui;
    // (B41.4: anche il foglio «Telefoni dello stand»)
    if (this.isOpen || ui0.remote?.isOpen || ui0.remote?.opening || ui0.fieraSheet?.isOpen || ui0.diag?.isOpen){ this.last = performance.now(); return; }
    const E = this.engine, ui = this.ui, lobby = ui.lobby;
    // B45.1: il Telefono 2 (stesso schermo, fiera) nasce dopo il chiosco: i suoi gesti e tocchi contano anche loro
    const p2 = E.natpfPhone2;
    if (p2 && p2 !== this._p2){ this._p2 = p2; p2.onActivity?.(this.poke); p2.onSwing?.(this.poke); }
    // telefono preso in mano (sensori in movimento): qualcuno c'è
    for (const p of [ui.phone, p2]){ const m = p?.connected ? p.movedAt : null; if (m != null && m > this.last) this.poke(); }
    const inGame = !lobby.visible && (!E.autoPlayMode || ui.training.active || !!ui.events.active);
    // (B41.2: il telefono dello stand resta sempre collegato, non vuol dire che c'è qualcuno; B45.1: neanche quello col QR)
    // (B39.5, A4: anche la classifica a schermo intero lasciata in vista per chi è in fila: si azzera chi gioca ma la
    // classifica resta)
    // (B41.5: con la modalità fiera la pagina della fiera è il menu: a riposo senza un visitatore in corso)
    const fairHome = !!ui.fieraPage?.here;
    const atMenu = lobby.visible && (lobby.step === 'menu' || fairHome || (lobby.step === 'ranking' && this.rankingFull));
    const atRest = atMenu && !ui.events.nickname && this.clean && (!fairHome || ui.fiera?.visitor == null);
    const a = kioskAction({ enabled: this.enabled, idle: (performance.now() - this.last)/1000, limit: this.limit, inGame, atRest });
    if (a === 'end-game'){ ui.backToMenu(); this.reset(); }
    else if (a === 'reset') this.reset({ stay: atMenu && lobby.step === 'ranking' });
  }
  // stand libero per il prossimo visitatore. stay: resta la pagina in vista (classifica a schermo intero)
  reset({ stay = false } = {}){
    const ui = this.ui;
    // B41.5: con la modalità fiera è «Prossimo giocatore» (natpf_new_player.resetFairVisitor): i telefoni dello stand restano
    // collegati e si torna alla pagina della fiera
    if (ui.fiera?.on && ui.fieraPage){
      if (ui.onboarding?.isOpen) ui.onboarding.close();
      for (const m of document.querySelectorAll('.natpf-sheet-backdrop:not(#natpf-staff)')) m.classList.add('hidden');
      ui.fieraPage.next({ causa: 'chiosco' });
      ui._syncPause?.();
      this.last = performance.now(); this.clean = true;
      return;
    }
    // guida chiusa con la sua funzione prima di nascondere i pannelli (dopo, per lei, è già chiusa)
    if (ui.onboarding?.isOpen) ui.onboarding.close();
    for (const m of document.querySelectorAll('.natpf-sheet-backdrop:not(#natpf-staff)')) m.classList.add('hidden');
    ui.events.nickname = '';
    // come «Nuovo giocatore» (natpf_new_player.resetVisitor): niente record degli ospiti di prima né colpi speciali
    // imparati da un ospite senza nome (il setter del nickname li toglie solo se c'era un nome; revisione dell'insieme B18.1)
    ui.events.forgetGuest?.();
    ui.events.forgetLearned?.();
    // B25: le fasce dei due giocatori dello stesso schermo tornano «Adulto» (sono di chi gioca, non dello stand). B45.1: anche
    // i nomi dei due giocatori, come «Nuovo giocatore» (natpf_split_ui.resetNames rimette anche le fasce)
    if (ui.split?.resetNames) ui.split.resetNames(); else ui.split?.resetBands?.();
    if (ui.split?.fails) ui.split.fails = { p1: 0, p2: 0 };
    // B46 «dritto e rovescio al sicuro»: la mano torna «Destra» per tutti e due (è di chi gioca: una mano sinistra rimasta da
    // chi c'era prima dava a un destro ogni dritto come rovescio). Non al riavvio del programma: lì resta quella salvata
    resetHands(ui, 'chiosco');
    // B18.2 gruppo 3: «Chi gioca» al valore di base, livello Evento da capo, spiegazione del colpo super da rivedere
    ui.lobby?.resetWho?.(); ui.superHint?.reset?.(); ui.serveCoach?.newPlayer?.();   // (B44: l'icona del lancio di nuovo ai primi servizi)
    ui.cue?.resetHint?.();   // (B45.1: come «Nuovo giocatore», la scritta del segnale del momento giusto si rivede)
    // il visitatore successivo rivede il tutorial prima di calibrare (gioco singolo e stesso schermo)
    // (il tutorial visto è segnato sul telefono, per abbinamento: si dimentica anche con lo stesso telefono)
    if (ui.split) ui.split.closeTutorials?.();
    // B45.1: i telefoni restano collegati (prima la racchetta col QR si scollegava: in fiera sembrava una caduta della rete).
    // Chi arriva dopo non eredita niente: tutorial visto, profilo e calibrazione, colpi e segno imparati (resetPlayer, come
    // «Nuovo giocatore» dal menu: il telefono ricalibra da solo; con «Giocando» riceve subito il profilo semplice)
    const phones = [ui.phone, ui.engine?.natpfPhone2].filter(Boolean);
    for (const p of phones){
      if (p.resetPlayer) p.resetPlayer({ gate: false, causa: 'chiosco' }); else p.forgetTutorial?.();
    }
    if (!stay) ui.lobby.go('menu');
    // (B45.1: con i telefoni ancora collegati, la pagina «Collega»/«Partita» dello stesso schermo lasciata in vista ha già
    // riaperto il tutorial nelle due metà appena è stato dimenticato, e i telefoni lo aspettavano con il menu sullo schermo.
    // Si chiude: lo riapre la metà di ciascuno quando il visitatore dopo arriva nella pagina «Collega»)
    if (ui.split){ ui.split.closeTutorials?.(); for (const p of phones) p.forgetTutorial?.(); }
    // pausa ricalcolata a pannelli chiusi: prima restava attiva e il visitatore successivo trovava il gioco fermo
    ui._syncPause?.();
    this.last = performance.now(); this.clean = true;
  }
  run(cmd){
    const ui = this.ui;
    if (cmd === 'close') return this.close();
    // «Nuovo giocatore» (B18, natpf_new_player.js): azzera chi gioca senza scollegare il telefono e lo porta al passo giusto
    if (cmd === 'newplayer'){ this.close(); ui.newPlayer?.(); return; }
    if (cmd === 'kiosk'){ this.enabled = !this.enabled; this._save(); }
    if (cmd === 'idle'){ this.limit = IDLE_STEPS[(IDLE_STEPS.indexOf(this.limit) + 1) % IDLE_STEPS.length]; this._save(); }
    // B33: a schermo intero si apre sulla classifica delle partite (le schede dei minigiochi restano accanto)
    // (B39: con la classifica già a schermo intero la stessa voce la chiude e torna al menu, come Esc)
    if (cmd === 'ranking' && this.rankingFull){ this.close(); ui.lobby.go('menu'); return; }
    if (cmd === 'ranking'){ this.close(); if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.rankingTab = 'partite'; ui.lobby.go('ranking'); document.documentElement.classList.add('ranking-full'); return; }
    if (cmd === 'export') ui.events.exportCsv();
    // (B39: la conferma è il secondo clic sul pulsante, needsConfirm)
    if (cmd === 'reset'){ ui.events.resetBoard(); ui.toast?.('Classifica di oggi azzerata'); }
    // B39: diagnostica dal pannello (prima solo Maiusc+D o dalla pausa in campo): alla chiusura si torna al pannello
    if (cmd === 'diag'){ this.close(); ui.diag?.open?.({ back: 'staff' }); return; }
    // B41.4: con la modalità fiera «Telefoni dello stand ›» (foglio con QR, numero, «Conferma», «Scollega»); senza, come prima
    if (cmd === 'phone' && ui.fiera?.on && ui.fieraSheet){ ui.fieraSheet.open(); return; }
    if (cmd === 'phone'){ ui.phone.forget?.(); }
    // B41.4: «Modalità fiera: No · Sì», salvata. Accesa: la calibrazione va su «Giocando» se non lo era (decisione dell'utente
    // del 14/11: ogni visitatore fa i suoi scambi di prova), si apre «Telefoni dello stand» e la pagina della fiera prende il
    // posto del menu. Spenta: il menu di sempre
    if (cmd === 'fiera' && ui.fiera){
      const F = ui.fiera, on = !F.on;
      let calSet = false;
      if (on && !F.forced && readSavedCalMode() !== 'play' && !calModeFromUrl()){ writeCalMode('play'); this._calChanged(); calSet = true; }
      F.setOn(on);
      ui.toast?.(fairPanelToast(on, { forced: F.forced, calSet }), 6000);
      const L = ui.lobby;
      if (L?.visible && !ui.trial?.active && ['menu', 'match'].includes(L.step)) L.go('menu');
      if (on && ui.fieraSheet){ ui.fieraSheet.open(); return; }
    }
    // B27: telecomando dello staff (natpf_remote.js: QR dello staff, codice, «Scollega») e monitor del gioco (programma
    // Windows: window.natpfDesktop.displays, monitor successivo; la scelta resta salvata)
    if (cmd === 'remote'){ ui.remote?.open(); return; }
    // B30: registro dello stand (acceso · spento, invio, scarico della coda): lo fa natpf_registro.js, che ridipinge
    if (cmd.startsWith('registro')){ ui.registro?.comando(cmd); return; }
    if (cmd === 'display'){
      Promise.resolve(window.natpfDesktop?.displays?.next?.()).then(r => { if (r?.current?.label) ui.toast?.(`Gioco su ${r.current.label}; resta salvato`); return ui.remote?._refreshDisplays?.(true); }).then(() => this.paint(), () => this.paint());
      return;
    }
    if (cmd === 'music') $('btn-audio-toggle')?.click();
    // B38: tastiera a schermo, automatica → sempre → mai → automatica; salvata, vale subito
    if (cmd === 'osk'){ const m = ui.tastiera?.setMode ? ui.tastiera.setMode(nextOskMode(readOskMode())) : writeOskMode(nextOskMode(readOskMode())); ui.toast?.(oskToast(m)); }
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
    // B20: «scambio che si scalda» (natpf_hot_rally.js), sì ↔ no, salvato; vale dalla partita dopo (B42: acceso di base,
    // in tutti i modi tranne la webcam per due)
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
    // B28: calibrazione del telefono, giocando → con i gesti → nessuna → giocando; salvata, vale dalla partita dopo (il
    // telefono già pronto resta com'è finché non si gioca o si ricalibra)
    if (cmd === 'cal'){
      const forced = !!calModeFromUrl(), mode = writeCalMode(nextCalMode(readSavedCalMode()));
      ui.toast?.(calModeToast(mode, forced));
      ui.diag?.recorder?.log?.('stand.calibrazione', { modo: mode, indirizzo: forced });
      this._calChanged();
    }
    // B47: battuta, sempre lo stesso ↔ alternata, salvata; vale dalla partita dopo
    if (cmd === 'battuta'){
      const forced = serveRuleForcedByUrl(), rule = writeServeRule(nextServeRule(readServeRule({ search: '' })));
      ui.toast?.(serveRuleToast(rule, forced));
      ui.diag?.recorder?.log?.('stand.battuta', { regola: rule, indirizzo: forced });
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
    // (B43: un pulsante armato per la conferma tiene la sua scritta «Sicuro? Clicca ancora»)
    const set = (k, v, on) => { const b = this.el.querySelector(`[data-staff="${k}"] b`); if (b){ if (!this.confirm?.isArmed(k)) b.textContent = v; b.parentElement.classList.toggle('on', !!on); } };
    set('kiosk', this.enabled ? 'Sì' : 'No', this.enabled);
    set('idle', `${this.limit} s`);
    const audio = this.engine.audioEngine; set('music', audio && audio.muted ? 'No' : 'Sì', !(audio && audio.muted));
    // B41.4: modalità fiera; accesa, la voce «Telefono» diventa «Telefoni dello stand ›» con lo stato dei due posti
    const F = this.ui.fiera, fon = !!F?.on;
    set('fiera', fairPanelButton(fon, !!F?.forced), fon);
    const ph = this.el.querySelector('[data-staff="phone"] span'), pt = fon ? 'Telefoni dello stand' : 'Telefono';
    if (ph && ph.textContent !== pt) ph.textContent = pt;
    // (B41.5: in fiera «Nuovo giocatore» è «Prossimo giocatore»: i telefoni dello stand restano collegati, pagina della fiera;
    // armato per il secondo clic in partita tiene «Sicuro? Clicca ancora»)
    const nb = this.el.querySelector('[data-staff="newplayer"]'), nt = fon ? 'Prossimo giocatore' : 'Nuovo giocatore';
    if (nb && !this.confirm?.isArmed('newplayer') && nb.textContent !== nt) nb.textContent = nt;
    // (la riga sotto le voci spiega la voce sotto il puntatore dal title, se c'è: natpf_stand_mouse.staffHint)
    const pb = ph?.parentElement;
    if (pb){ if (fon) pb.setAttribute?.('title', 'Telefoni dello stand: abbina il Telefono 1 e il Telefono 2 una volta (QR, numero, «Conferma» qui sul PC), stato, batteria e «Scollega». I telefoni restano collegati.'); else pb.removeAttribute?.('title'); }
    set('phone', fon ? standPanelSummary(F.status('p1'), F.status('p2')) : this.ui.phone.connected ? 'Scollega' : 'Nessuno collegato', fon && F.status('p1').state === 'ready');
    set('ranking', this.rankingFull ? 'Chiudi lo schermo intero' : 'A schermo intero', this.rankingFull);
    set('aim', aimLevelButton(readAimLevel()));
    const osk = readOskMode(); set('osk', oskButton(osk), osk !== 'mai');
    const fair = readFairMode(); set('fair', fairButton(fair, fairForcedByUrl()), fair !== 'no');
    const bt = readServeRule(); set('battuta', serveRuleButton(bt, serveRuleForcedByUrl()), bt === 'fissa');
    const hot = readHotRally(); set('hot', hotButton(hot), hot);
    const auto = readAutoToss(); set('autotoss', autoTossButton(auto), auto);
    const open = readOpenCourt(); set('open', openCourtButton(open), open);
    const cal = readSavedCalMode(); set('cal', calModeButton(cal, !!calModeFromUrl()), cal === 'play');
    // B27: telecomando dello staff e, nel programma Windows con più monitor, il monitor del gioco
    const remote = this.ui.remote; set('remote', remote ? remote.staffLabel : '—', !!remote?.link?.connected);
    const disp = this.el.querySelector('[data-staff="display"]'), d = remote?.displays;
    show(disp, !!window.natpfDesktop?.displays);
    if (disp && !d) remote?._refreshDisplays?.();
    set('display', d?.current ? `${d.current.label}${d.list?.length > 1 ? ' ›' : ''}` : '—', false);
    show($('staff-registro'), !!this.ui.registro); this.ui.registro?.dipingi();
    const n = $('staff-note');
    // (B45.2: su una riga a 1024 × 600, come prima della B45.1: la frase lunga andava a capo e il foglio scorreva di 5 px con
    // il chiosco e le opzioni accese, prova natpf-stesso-schermo-b25; cosa si azzera lo dicono la spiegazione della voce,
    // natpf_stand_mouse.STAFF_HINTS, e la guida)
    // (B41.5: in fiera il chiosco fa «Prossimo giocatore»: si torna alla pagina della fiera, i telefoni dello stand restano)
    if (n) n.textContent = this.enabled ? (fon ? `Chiosco attivo: dopo ${this.limit} s senza nessuno si torna alla pagina della fiera, i telefoni restano collegati (in partita ${this.limit*2} s).` : `Chiosco attivo: dopo ${this.limit} s senza nessuno si torna al menu e chi gioca si azzera, il telefono resta collegato (in partita ${this.limit*2} s).`) : 'Chiosco spento: il gioco resta dove l’ha lasciato l’ultimo visitatore.';
    // B45.1: cadute del collegamento di oggi, per posto, con il motivo più frequente (natpf_cadute.js); niente se nessuna
    const c = $('staff-cadute');
    if (c){ const t = rigaCadute(leggiCadute()); c.textContent = t; show(c, !!t); }
  }
}

// Telecomando dello staff (B27), lato gioco: il collegamento con il telefono dello staff (site/js/tennis/remote-link.js),
// la fotografia del gioco per il telefono (natpf_remote_map.js: dove siamo, cosa può fare ogni pulsante) e i comandi.
// Foglio: Pannello dello stand → «Telecomando dello staff» (#natpf-remote). Il gioco è sul ledwall, quindi il foglio lo
// vede anche il pubblico (regole in site/js/tennis/remote-pairing.js): QR e codice valgono solo a foglio aperto; chi li
// presenta deve essere confermato QUI sul computer («Conferma», solo con un tasto o un clic veri: event.isTrusted; mai
// dal telecomando, che quel pulsante non lo raggiunge né lo preme); dopo l'abbinamento niente più QR («Abbina un altro
// telefono» ne apre uno nuovo). Abbinato una volta, il gioco si rimette in ascolto da solo a ogni avvio (indirizzo e
// chiave in localStorage); senza abbinamento non si collega a niente (nessun effetto sulla versione web).
// Il telecomando non tira colpi e non tocca la racchetta del giocatore: in campo frecce e OK non fanno niente
// (natpf_remote_map.navPlan), i tasti mandati alla pagina sono solo quelli del menu e delle finestre. Non apre finestre
// di Windows (conferme, salvataggi) né link: quei controlli li salta (NO_REMOTE).
import { createRemoteLink } from '@natpf/tennis/remote-link.js';
import { showCode } from '@natpf/tennis/remote-pairing.js';
import { remoteScreen, remoteCommands, navPlan, confirmText, scoreLine, nextCpu, cpuName } from './natpf_remote_map.js';
import { nearestTile } from './natpf_lobby.js';
import { phonePageUrl } from './natpf_phone_racket.js';
import { lanOrigin } from './natpf_lan.js';
import { isLanMode } from '@natpf/tennis/lan-transport.js';

const NATPF_BASE = '/natpf/';
const loadScript = src => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(src)); document.head.appendChild(s); });

const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
// in vista: non nascosto e con un rettangolo sullo schermo (nelle prove senza disegno basta la classe)
const visible = el => !!el && !el.classList.contains('hidden') && (typeof el.getClientRects !== 'function' || el.getClientRects().length > 0) && (typeof getComputedStyle !== 'function' || getComputedStyle(el).visibility !== 'hidden');
const FOCUSABLE = 'button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
// Controlli che il telecomando non raggiunge con le frecce e non preme con OK: aprono una finestra di Windows che dal
// telefono non si chiude e ferma il gioco (confirm() di «Azzera oggi» e di «Elimina» nella diagnostica, il salvataggio
// del CSV e delle sessioni), aprono un'altra finestra (link, target=_blank: nel programma Windows una finestra nuova) o
// sono riservati al computer («Conferma» dell'abbinamento, data-no-remote). Chi aggiunge un confirm() nel gioco lo
// aggiunge qui (lo controlla test/natpf-telecomando.test.mjs)
export const NO_REMOTE = 'a, [href], [target="_blank"], [data-no-remote], [data-remote="confirm"], [data-staff="reset"], [data-staff="export"], [data-diag="del"], [data-diag="save"], input[type="file"]';
// strato aperto → elemento (per il fuoco) e azione «indietro»
const LAYER_EL = { staff: () => $('natpf-staff'), remote: () => $('natpf-remote'), dialog: () => document.querySelector('dialog[open]'), nick: () => $('natpf-nick'),
  diag: () => document.querySelector('.natpf-diag:not(.hidden)'), hold: () => $('natpf-phone-hold'), phonePanel: () => $('natpf-phone-modal'), pause: () => $('natpf-pause'),
  victory: () => $('victory-modal'), guest: () => $('natpf-guest-modal') };
const KEY_OF = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Enter: 'Enter', Escape: 'Escape' };

export class NatpfRemote {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-remote');
    this.lanOrigin = null;
    // pagina del telefono accanto a quella della racchetta (/natpf/tennis/), con l'indirizzo di rete del computer in LAN
    this.link = createRemoteLink({ pageUrl: () => new URL('telecomando.html', phonePageUrl(window.location, this.lanOrigin)).href });
    this.link.on('change', () => this.paint());
    this.link.on('cmd', c => this._onCmd(c));
    lanOrigin().then(o => { this.lanOrigin = o; this.paint(); }).catch(() => {});
    // già abbinato: in ascolto subito (il telefono si ricollega da solo dopo il riavvio del gioco o del PC)
    if (this.link.paired) this._libs().then(() => this.link.start());
    this.el?.addEventListener('pointerdown', e => e.stopPropagation());
    this.el?.addEventListener('click', e => {
      const b = e.target.closest('[data-remote]'); if (!b) return;
      e.stopPropagation();
      const cmd = b.dataset.remote;
      if (cmd === 'close') this.close();
      // «Conferma»: solo un clic o un tasto veri sul computer (mai un clic fatto dal codice: il telecomando, uno script)
      if (cmd === 'confirm'){ if (e.isTrusted && this.link.confirm()) this.ui.toast?.('Telecomando abbinato: quel telefono ora comanda il gioco'); }
      if (cmd === 'refuse') this.link.refuse();
      // «Scollega»: due passi nella pagina (niente finestre di Windows: dal telefono non si chiuderebbero)
      if (cmd === 'forget'){
        if (b.dataset.armed === '1'){ this._disarm(); this.link.forget(); this.ui.toast?.('Telecomando scollegato: per usarlo di nuovo va abbinato da capo'); }
        else { b.dataset.armed = '1'; b.textContent = 'Sicuro? Premi ancora per scollegare'; clearTimeout(this._armT); this._armT = setTimeout(() => this._disarm(), 5000); }
      } else this._disarm();
      if (cmd === 'new') this._libs().then(() => { this.link.pairing(true); this.paint(); });
      this.paint();
    });
    // Esc nel pannello del telecomando: indietro al pannello dello stand (il menu sotto non lo riceve)
    window.addEventListener('keydown', e => { if (this.isOpen && e.code === 'Escape' && !e.repeat){ e.preventDefault(); e.stopImmediatePropagation(); this.close(); } }, true);
    // chi usa il mouse o il tocco non vede più il fuoco evidenziato dal telecomando
    window.addEventListener('pointerdown', e => { if (e.isTrusted) document.documentElement.classList.remove('remote-nav'); }, { capture: true, passive: true });
    this._t = setInterval(() => { try { this.publish(); } catch (e){ console.error(e); } }, 400);
  }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  _disarm(){ clearTimeout(this._armT); const b = this.el?.querySelector('[data-remote="forget"]'); if (b && b.dataset.armed === '1'){ b.dataset.armed = ''; b.textContent = 'Scollega il telecomando'; } }
  // dal pannello dello stand. Senza un telecomando abbinato parte l'abbinamento (QR e codice nuovi, 5 minuti); con un
  // telecomando abbinato il foglio dice solo «abbinato»: per un altro telefono serve «Abbina un altro telefono»
  async open(){
    if (!this.el) return;
    this.ui.kiosk?.close();
    await this._libs();
    if (!this.link.paired && this.link.secure) this.link.pairing(true);
    show(this.el);
    this.paint();
    this.el.querySelector('[data-remote="close"]')?.focus({ preventScroll: true });
  }
  // librerie del sito sotto /natpf/ (come la racchetta, natpf_phone_racket._start): PeerJS fuori dalla LAN, QR
  _libs(){
    return this._libsP || (this._libsP = (async () => {
      if (!isLanMode() && !window.Peer) await loadScript(`${NATPF_BASE}js/vendor/peerjs.min.js`).catch(() => {});
      if (!window.qrcode) await loadScript(`${NATPF_BASE}js/vendor/qrcode.js`).catch(() => {});
    })().finally(() => { if (!window.qrcode || (!isLanMode() && !window.Peer)) this._libsP = null; }));
  }
  // foglio chiuso: QR e codice non valgono più da subito, chi stava chiedendo è rifiutato
  close({ toStaff = true } = {}){ if (!this.isOpen) return; this._disarm(); show(this.el, false); this.link.pairing(false); if (toStaff) this.ui.kiosk?.open(); }
  // scritta del pulsante nel pannello dello stand
  get staffLabel(){ return this.link.connected ? 'Collegato ✓' : this.link.paired ? 'Abbinato, non collegato' : 'Abbina'; }
  // vista del foglio: 'request' un telefono chiede (numero, Conferma/Rifiuta) · 'pair' QR e codice · 'paired' abbinato,
  // niente QR · 'closed' niente QR (tempo scaduto, troppi tentativi, pagina non in https)
  get view(){ const L = this.link; return L.S.request ? 'request' : L.S.pairing ? 'pair' : L.paired ? 'paired' : 'closed'; }
  paint(){
    this.ui.kiosk?.paint?.();
    if (!this.isOpen) return;
    const L = this.link, view = this.view, url = view === 'pair' ? L.url() : null;
    const was = this.el.dataset.view;
    this.el.dataset.view = view;
    for (const v of this.el.querySelectorAll('[data-remote-view]')) show(v, v.dataset.remoteView === view);
    const box = $('remote-qr');
    if (box){
      // fuori dalla vista dell'abbinamento il QR si toglie dalla pagina (non resta dietro, nemmeno nascosto)
      if (!url){ if (box.dataset.url){ box.innerHTML = ''; box.dataset.url = ''; } }
      else if (window.qrcode && box.dataset.url !== url){ const q = window.qrcode(0, 'M'); q.addData(url); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); box.dataset.url = url; }
    }
    const code = $('remote-code'); if (code) code.textContent = view === 'pair' && L.code ? showCode(L.code) : '—';
    const num = $('remote-num'); if (num) num.textContent = L.S.request ? String(L.S.request.num) : '—';
    // un telefono chiede: il fuoco va su «Rifiuta» (un Invio distratto non conferma nessuno)
    if (view === 'request' && was !== 'request') this.el.querySelector('[data-remote="refuse"]')?.focus({ preventScroll: true });
    const closed = $('remote-closed-text');
    if (closed) closed.textContent = !L.secure ? 'Il telecomando vuole il gioco aperto in https (programma Windows o indirizzo https): qui non si può abbinare.'
      : L.S.closedWhy === 'expired' ? 'Tempo scaduto (5 minuti): il QR di prima non vale più. «Nuovo QR» per riprovare.'
      : L.S.closedWhy === 'attempts' ? 'Troppi tentativi sbagliati: abbinamento chiuso. «Nuovo QR» per riprovare.'
      : 'Nessun telecomando abbinato. «Nuovo QR» per abbinare il telefono dello staff.';
    const state = $('remote-state');
    if (state) state.textContent = view === 'request' ? ''
      : L.connected ? 'Telecomando collegato ✓'
      : L.paired ? 'Telecomando abbinato, adesso non collegato: si ricollega da solo appena il telefono apre la pagina.'
      : L.S.state === 'error' ? `Collegamento non disponibile (${L.S.error}): controlla la rete.` : view === 'pair' ? 'Nessun telecomando abbinato.' : '';
    show(this.el.querySelector('[data-remote="forget"]'), L.paired && view !== 'request');
    const fresh = this.el.querySelector('[data-remote="new"]');
    if (fresh){ show(fresh, (view === 'paired' || view === 'closed') && L.secure); const t = L.paired ? 'Abbina un altro telefono' : 'Nuovo QR'; if (fresh.textContent !== t) fresh.textContent = t; }
  }

  /* ---------- fotografia del gioco ---------- */
  snapshot(){
    const ui = this.ui, E = this.engine, L = ui.lobby, T = ui.training, D = window.natpfDesktop;
    const tut = T?.tutorial;
    const coach = $('coach-exit'), next = $('coach-next'), nickSkip = $('nick-cancel');
    const trial = !!ui.trial?.active;
    // (B28) scambi di prova: «Salta» va alla partita; nell'allenamento «Avanti ›» passa all'esercizio dopo (nella
    // calibrazione con i gesti salta solo quella); nel pannello del telefono «Salta la calibrazione»
    const skip = ui.intro?.active ? 'Salta l’intro'
      : visible($('natpf-nick')) && nickSkip && /salta/i.test(nickSkip.textContent) ? 'Salta il nome'
      : trial ? (ui.pause?.isOpen ? null : 'Salta gli scambi di prova')
      : T?.active && visible(next) ? (T.cal ? 'Salta la calibrazione' : 'Avanti: esercizio dopo')
      : T?.active && visible(coach) ? (T.cal ? 'Salta la calibrazione' : T.lesson ? 'Salta la lezione' : 'Salta il riscaldamento')
      : visible($('natpf-phone-modal')) && visible($('natpf-phone-skip')) ? 'Salta la calibrazione' : null;
    const splitTut = !!ui.split && ['p1', 'p2'].some(id => ui.split.tut?.[id]?.open);
    const fs = ui.screen?.fullscreen;
    return {
      intro: !!ui.intro?.active,
      staff: !!ui.kiosk?.isOpen,
      remote: this.isOpen,
      dialog: !!document.querySelector('dialog[open]'),
      nick: visible($('natpf-nick')),
      diag: !!ui.diag?.on && !!document.querySelector('.natpf-diag:not(.hidden)'),
      calibra: !!ui.calibra?.isOpen,
      guide: !!ui.onboarding?.isOpen,
      tutorial: !!tut?.open, tutorialReview: !!tut?.open && tut.opts?.mode === 'review',
      hold: visible($('natpf-phone-hold')),
      phonePanel: visible($('natpf-phone-modal')),
      pause: !!ui.pause?.isOpen,
      victory: visible($('victory-modal')),
      guest: visible($('natpf-guest-modal')),
      lobby: { visible: !!L?.visible, step: L?.step, mode: L?.mode, splitTutorial: splitTut },
      training: { active: !!T?.active, lesson: !!T?.lesson, cal: !!T?.cal, mode: L?.mode },
      minigame: ui.events?.active ? (ui.events.active.c?.label || 'in corso') : null,
      inField: !!ui.pause?.inGame,
      trial, recalTrial: !!ui.recalTrialDue?.(), calMode: ui.phone?.calMode || null,
      split: !!ui.split?.session, versus: !!ui.versus?.hostActive || E.playerRole === 'p2',
      controller: ui.controller,
      phone: { connected: !!ui.phone?.connected, ready: !!ui.phone?.ready },
      cpu: ui.lobby?.cpuLevel || document.querySelector('#difficulty-mode-group [data-difficulty].selected')?.dataset.difficulty || 'evento',
      desktop: D?.displays ? { displays: this.displays?.list?.length || 0, label: this.displays?.current?.label || '' } : null,
      fullscreen: { available: !!fs, on: !!fs?.frameless, gesture: !!fs && !D },
      skip,
      canReview: !!tut && !tut.open && (!!L?.visible || !!T?.active),
      connectReady: L?.step === 'connect' && this._connectReady(),
      splitReady: !!L?.state?.().splitReady,
    };
  }
  _connectReady(){ try { const L = this.ui.lobby, st = L.state(); return L.mode === 'split' ? !!st.splitReady : this.ui.controller === 'phone' ? !!st.phoneLinked : this.ui.controller === 'webcam' ? !!st.webcamActive : true; } catch { return false; } }
  // stato per il telefono (mandato solo quando cambia)
  publish(){
    // foglio chiuso da altri (chiosco che azzera lo stand, «Nuovo giocatore»): QR e codice non valgono più
    if ((this.link.S.pairing || this.link.S.request) && !this.isOpen) this.link.pairing(false);
    if (!this.link.connected) return;
    this._refreshDisplays();
    const s = this.snapshot();
    const screen = remoteScreen(s), { cmds, labels, hints } = remoteCommands(s, screen);
    const E = this.engine, P = this.ui.phone, P2 = E.natpfPhone2;
    let detail = '';
    if (screen.id === 'match' || screen.under === 'match' || screen.id === 'pause' || screen.id === 'victory') detail = scoreLine(E.score, { names: s.split ? ['P1', 'P2'] : s.versus ? ['Tu', 'P2'] : ['Tu', 'CPU'] });
    else if (screen.id === 'minigame') detail = `Punti ${this.ui.events.active?.score ?? 0}`;
    else if (screen.id.startsWith('lobby:') && s.lobby.mode) detail = { cpu: 'Contro la CPU', friend: 'Sfida un amico', training: 'Allenamento', challenge: 'Minigiochi', split: 'Stesso schermo' }[s.lobby.mode] || '';
    if (screen.id === 'pause' || screen.id === 'staff' || screen.id === 'remote') detail = [detail, s.minigame ? `Minigioco: ${s.minigame}` : ''].filter(Boolean).join(' · ');
    const L = P?.state || {};
    this.link.status({
      pg: screen.id, label: screen.label, detail,
      phone: { mode: s.controller, connected: !!P?.connected, ready: !!P?.ready, battery: Number.isFinite(L.battery) ? L.battery : null, charging: !!L.charging,
        ...(s.split && P2 ? { p2: { connected: !!P2.connected, battery: Number.isFinite(P2.state?.battery) ? P2.state.battery : null } } : {}) },
      cmds, labels, hints,
    });
  }
  // monitor del programma Windows (window.natpfDesktop.displays): letti ogni pochi secondi, non a ogni stato
  _refreshDisplays(force = false){
    const D = window.natpfDesktop?.displays;
    if (!D?.list || (!force && this._dispAt && performance.now() - this._dispAt < 3000)) return this._dispP;
    this._dispAt = performance.now();
    return this._dispP = Promise.resolve(D.list()).then(r => { this.displays = r; this.ui.kiosk?.paint?.(); return r; }, () => null);
  }

  /* ---------- comandi ---------- */
  async _onCmd({ c, y, reply }){
    let out = null;
    try {
      const s = this.snapshot();
      const screen = remoteScreen(s), { cmds } = remoteCommands(s, screen);
      if (cmds[c] !== 1){ reply({ ok: false, msg: typeof cmds[c] === 'string' ? cmds[c] : 'Non adesso' }); return; }
      const ask = confirmText(c, screen);
      if (ask && !y){ reply({ ok: true, ask, cmd: c }); return; }
      document.documentElement.classList.add('remote-nav');
      // il telecomando in uso è qualcuno allo stand: il chiosco non azzera lo stand sotto le mani dello staff
      if (this.ui.kiosk) this.ui.kiosk.last = performance.now();
      this.ui.diag?.recorder?.log?.('telecomando', { comando: c, pagina: screen.id });
      const plan = navPlan(screen, c);
      // (i comandi diretti sono asincroni: si aspettano qui, così un errore arriva al telefono con il motivo)
      out = plan ? this._nav(screen, plan) : await this._direct(c, s, screen);
    } catch (e){
      console.error(e);
      out = { ok: false, msg: `Comando non riuscito: ${String(e?.message || e).slice(0, 80)}` };
    }
    reply(out || { ok: true });
    setTimeout(() => { try { this.publish(); } catch (e){ console.error(e); } }, 60);
  }
  // tasto della tastiera alla pagina (stessi gestori di frecce, Invio ed Esc): sull'elemento a fuoco, come un tasto vero
  _key(code){
    const target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    const init = { key: KEY_OF[code] || code, code, bubbles: true, cancelable: true, composed: true };
    const down = new KeyboardEvent('keydown', init);
    target.dispatchEvent(down);
    target.dispatchEvent(new KeyboardEvent('keyup', init));
    return down.defaultPrevented;
  }
  _layer(screen){ return LAYER_EL[screen.id]?.() || null; }
  _focusables(layer){ return [...layer.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && visible(el) && el.getAttribute('aria-hidden') !== 'true' && !el.matches(NO_REMOTE)); }
  _nav(screen, plan){
    if (plan.kind === 'blocked') return { ok: false, msg: plan.why };
    if (plan.kind === 'pause'){ this.ui.pause?.open(); return { ok: true, msg: 'Pausa' }; }
    if (plan.kind === 'key'){
      // intro: OK entra nel menu
      if (screen.id === 'intro'){ this._key(plan.code); return { ok: true }; }
      const handled = this._key(plan.code);
      // nessun modulo l'ha usato: OK preme il pulsante a fuoco (i fogli sopra il menu, la lobby senza voce scelta)
      if (!handled && plan.code === 'Enter'){ const a = document.activeElement; if (a && a !== document.body && a.matches?.('button, [role="button"]') && !a.matches(NO_REMOTE)) a.click(); }
      return { ok: true };
    }
    const layer = this._layer(screen);
    if (!layer) return { ok: false, msg: 'Niente da comandare qui' };
    const items = this._focusables(layer);
    const cur = items.includes(document.activeElement) ? document.activeElement : null;
    if (plan.kind === 'focus'){
      if (!items.length) return { ok: false, msg: 'Nessun pulsante qui' };
      const prefer = items.find(el => el.matches('.lobby-primary, .primary, .btn-primary')) || items[0];
      const d = plan.dir === 'ArrowDown' || plan.dir === 'ArrowRight' ? 1 : -1;
      const next = !cur ? prefer : nearestTile(items, cur, plan.dir) || items[(items.indexOf(cur) + d + items.length) % items.length];
      next.focus({ preventScroll: true }); next.scrollIntoView?.({ block: 'nearest' });
      return { ok: true, msg: (next.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) };
    }
    if (plan.kind === 'press'){
      // (un controllo che il telecomando non deve premere può avere il fuoco per un clic fatto sul computer: OK lo rifiuta)
      const focused = document.activeElement;
      if (focused && focused !== document.body && layer.contains(focused) && focused.matches?.(NO_REMOTE)) return { ok: false, msg: 'Questo si fa dal computer (tastiera o mouse)' };
      const el = cur || items.find(x => x.matches('.lobby-primary, .primary, .btn-primary')) || null;
      if (!el) return { ok: false, msg: 'Scegli prima un pulsante con le frecce' };
      if (el.matches('input, textarea') && el.form){ el.form.requestSubmit?.(); return { ok: true }; }
      el.click();
      return { ok: true, msg: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) };
    }
    if (plan.kind === 'back') return this._back(screen, layer);
    return { ok: false };
  }
  _back(screen, layer){
    const click = id => { const b = $(id); if (b && visible(b)){ b.click(); return true; } return false; };
    switch (screen.id){
      case 'staff': this.ui.kiosk.close(); return { ok: true, msg: 'Pannello chiuso' };
      case 'remote': this.close(); return { ok: true };
      case 'dialog': layer.close?.(); return { ok: true };
      case 'nick': click('nick-cancel'); return { ok: true };
      case 'diag': this.ui.diag.close(); return { ok: true };
      case 'phonePanel': click('natpf-phone-close'); return { ok: true };
      case 'pause': this.ui.pause.close(); return { ok: true, msg: 'Si riprende' };
      case 'victory': click('btn-return-title'); return { ok: true, msg: 'Menu' };
      case 'hold': this.ui.pause.open(); return { ok: true, msg: 'Pausa' };
      default: this._key('Escape'); return { ok: true };
    }
  }
  // chiude fogli e finestre sopra il menu o il campo (prima di Menu e Nuovo giocatore)
  _closeLayers(){
    const ui = this.ui;
    if (this.isOpen) this.close({ toStaff: false });
    ui.kiosk?.close();
    for (const d of document.querySelectorAll('dialog[open]')) try { d.close(); } catch {}
    if (ui.onboarding?.isOpen) ui.onboarding.close();
    if (ui.calibra?.isOpen) ui.calibra.cancel();
    if (ui.training?.tutorial?.open && !ui.training.tutorialOpen) ui.training.tutorial.close('review');
    if (visible($('natpf-phone-modal'))) ui.closePhone?.();
    if (visible($('natpf-nick'))) $('natpf-nick').classList.add('hidden');
    if (ui.pause?.isOpen) ui.pause.close();
  }
  async _direct(c, s, screen){
    const ui = this.ui, L = ui.lobby;
    switch (c){
      case 'play': {
        if (screen.id === 'victory'){ $('btn-play-again')?.click(); return { ok: true, msg: 'Gioca ancora' }; }
        const step = L.step;
        if (step === 'menu' || !['mode', 'controller', 'connect', 'match', 'result'].includes(step)){ L.setMode('cpu'); L.go(ui.controller === 'phone' && ui.phone?.connected ? 'connect' : 'controller'); return { ok: true, msg: 'Contro la CPU' }; }
        if (step === 'mode'){ L.setMode('cpu'); L.go('controller'); return { ok: true }; }
        if (step === 'controller'){ L.go('connect'); return { ok: true }; }
        if (step === 'result'){ L._resultAction('again'); return { ok: true, msg: 'Si rigioca il minigioco' }; }
        L.next(); return { ok: true, msg: step === 'match' ? 'Si gioca!' : 'Avanti' };
      }
      case 'menu': {
        this._closeLayers();
        if (L.visible && !ui.training?.active && !ui.events?.active) L.go('menu'); else ui.backToMenu();
        return { ok: true, msg: 'Menu principale' };
      }
      case 'pause': if (ui.pause.isOpen) ui.pause.close(); else ui.pause.open(); return { ok: true, msg: ui.pause.isOpen ? 'Pausa' : 'Si riprende' };
      case 'newplayer': {
        this._closeLayers();
        const route = ui.newPlayer();
        return { ok: true, msg: route === 'menu' ? 'Nuovo giocatore: si riparte dal menu' : 'Nuovo giocatore: nome, tutorial e calibrazione da capo' };
      }
      case 'recal': {
        // come «Ricalibra» del pannello del telefono (B28): in partita con «Calibrazione: Giocando» sono gli scambi
        // di prova e poi si rigioca il punto; altrimenti il profilo riparte (o si rifanno i gesti) con il pannello aperto
        const field = s.inField || screen.id === 'pause';
        if (field) ui.pause.close();
        if (ui.recalibrate()) return { ok: true, msg: 'Scambi di prova: poi si rigioca il punto' };
        if (field) ui.openPhone();
        return { ok: true, msg: ui.phone.autoSimple ? 'Profilo del telefono da capo: il gioco impara dai colpi' : 'Il telefono del giocatore ricalibra' };
      }
      case 'gestures': ui.training.reviewGestures(); return { ok: true, msg: 'Rivedi i gesti: Indietro per chiudere' };
      case 'cpu': {
        const next = nextCpu(s.cpu);
        // come «Altre impostazioni» → «Livello della CPU»: vale per tutti e cinque i livelli, anche senza tessera
        if (L.setLevel) L.setLevel(next); else document.querySelector(`#difficulty-mode-group [data-difficulty="${next}"]`)?.click();
        L.paint?.();
        return { ok: true, msg: cpuName(next) };
      }
      case 'screen': {
        const r = await window.natpfDesktop?.displays?.next?.();
        await this._refreshDisplays(true);
        return { ok: !!r, msg: r?.current?.label ? `Gioco su ${r.current.label}` : 'Monitor non cambiato' };
      }
      case 'fullscreen': { const on = await ui.screen?.fullscreen?.toggle?.(); return { ok: true, msg: (on ?? ui.screen?.fullscreen?.frameless) ? 'Schermo intero' : 'In finestra' }; }
      case 'staff': ui.kiosk.isOpen ? ui.kiosk.close() : (this.isOpen ? this.close({ toStaff: false }) : ui.kiosk.open()); return { ok: true };
      case 'skip': {
        if (ui.intro?.active){ ui.intro.finishAnimation(); ui.intro.start(); return { ok: true, msg: 'Intro saltata' }; }
        if (visible($('natpf-nick'))){ $('nick-cancel')?.click(); return { ok: true }; }
        if (ui.trial?.active){ ui.trial.skip(); return { ok: true, msg: 'Scambi di prova saltati: si gioca' }; }
        if (ui.training?.active && visible($('coach-next'))){ $('coach-next').click(); return { ok: true, msg: ui.training.cal ? 'Calibrazione saltata' : 'Esercizio dopo' }; }
        if (visible($('coach-exit'))){ $('coach-exit').click(); return { ok: true, msg: 'Saltato' }; }
        if (visible($('natpf-phone-modal')) && visible($('natpf-phone-skip'))){ $('natpf-phone-skip').click(); return { ok: true, msg: 'Calibrazione saltata' }; }
        return { ok: false, msg: 'Niente da saltare' };
      }
    }
    return { ok: false, msg: 'Comando sconosciuto' };
  }
}

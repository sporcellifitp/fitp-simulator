// Interfaccia NATPF sopra l'HUD di Argon: scelta della racchetta (smartphone NATPF, webcam di Argon,
// mouse/tastiera di Argon) e della visuale, pannello di collegamento del telefono con le fasi della calibrazione
// NATPF (collega → impugna → prova → verifica → pronto), invito del Player 2 per il 1v1 tra due computer.
// I testi del collegamento seguono quelli di site/js/tennis/main.js.
import { guestInviteUrl } from './natpf_lan.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const store = {
  get(k, d){ try { return localStorage.getItem('natpf-argon.' + k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('natpf-argon.' + k, v); } catch {} },
};
const CONTROLLERS = [
  { id: 'phone', label: '📱 Smartphone', hint: 'Il telefono è la racchetta (NATPF)' },
  { id: 'webcam', label: '📷 Webcam', hint: 'La webcam segue la mano (Argon)' },
  { id: 'mouse', label: '🖱️ Mouse / tastiera', hint: 'Trascina o premi Spazio (Argon)' },
];
const VIEWS = [ { id: 'third', label: 'Terza persona' }, { id: 'first', label: 'Prima persona' } ];
const STEPS = ['collega', 'impugna', 'prova', 'verifica', 'pronto'];
const PHONE_ERR = {
  denied: 'Sul telefono è stato negato l’accesso ai sensori di movimento. Su iPhone ricarica la pagina del telefono e tocca «Consenti»; su Android consenti «Sensori di movimento» dal lucchetto nella barra degli indirizzi.',
  nomotion: 'Il browser del telefono non manda i dati dei sensori di movimento. Usa Chrome su Android o Safari su iPhone e inquadra di nuovo il QR.',
  insecure: 'Il telefono ha aperto la pagina senza https e il browser non dà i sensori. Apri il gioco in https (npm run dev:https in LAN, oppure l’indirizzo pubblicato) e inquadra di nuovo il QR.',
};
const REVIEW_FAIL = {
  servizio: 'Non è stato registrato alcun gesto di servizio. Ripeti senza forzare il movimento oppure scegli i tocchi sul telefono.',
  piccolo: 'Non riesco a distinguere questi gesti dal rumore. Sul telefono scegli movimento compatto o il controllo con i tocchi.',
};

export class NatpfUi {
  constructor(engine){
    this.engine = engine;
    this.phone = engine.natpfPhone;
    this.controller = store.get('controller', 'mouse');
    if (!CONTROLLERS.some(c => c.id === this.controller)) this.controller = 'mouse';
    this.modal = $('natpf-phone-modal');
    this.qrToken = null;
    this._buildSetup();
    this._bindPhoneModal();
    this._bindStart();
    this.onViewChange(engine.viewMode);
    this.phone.onChange(() => this.paintPhone());
    $('btn-natpf-view')?.addEventListener('click', e => { e.stopPropagation(); this.engine.setViewMode(this.engine.viewMode === 'first' ? 'third' : 'first'); });
    // Player 2 arrivato con il link di invito: sceglie racchetta e visuale prima di entrare
    if (engine.playerRole === 'p2' && engine.urlRoom && engine.urlRoom !== 'DEFAULT'){
      show($('natpf-guest-modal'));
      $('natpf-guest-go')?.addEventListener('click', () => { show($('natpf-guest-modal'), false); if (this.controller === 'phone' && !this.phone.ready) this.openPhone(); });
    }
    // la scelta salvata vale anche per Argon (webcam accesa all'avvio della partita)
    this.selectController(this.controller, { open: false });
  }

  /* ---------- racchetta e visuale ---------- */
  _buildSetup(){
    for (const box of document.querySelectorAll('[data-natpf-setup]')){
      box.innerHTML = `
        <div class="natpf-setup-row"><span class="natpf-setup-label">Racchetta</span>
          <div class="wii-green-btn-row natpf-choice-row">${CONTROLLERS.map(c => `<button type="button" class="wii-green-choice" data-natpf-controller="${c.id}" title="${c.hint}"><span class="choice-main">${c.label}</span></button>`).join('')}</div></div>
        <div class="natpf-setup-row"><span class="natpf-setup-label">Visuale</span>
          <div class="wii-green-btn-row natpf-choice-row">${VIEWS.map(v => `<button type="button" class="wii-green-choice" data-natpf-view="${v.id}"><span class="choice-main">${v.label}</span></button>`).join('')}</div></div>`;
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        if (b.dataset.natpfController) this.selectController(b.dataset.natpfController);
        if (b.dataset.natpfView) this.engine.setViewMode(b.dataset.natpfView);
      });
    }
  }
  selectController(id, { open = true } = {}){
    this.controller = id; store.set('controller', id);
    const hud = this.engine.hud, mc = this.engine.motionController;
    for (const b of document.querySelectorAll('[data-natpf-controller]')) b.classList.toggle('selected', b.dataset.natpfController === id);
    // Argon: inputMode «webcam» accende la webcam all'avvio della partita; telefono e mouse non la usano
    const inputMode = id === 'webcam' ? 'webcam' : id === 'phone' ? 'phone' : 'mouse';
    if (hud) hud.selectedInputMode = inputMode;
    this.engine.matchConfig.inputMode = inputMode;
    if (id === 'webcam' && open) hud?.callbacks?.onSelectInputMode?.('webcam');
    if (id !== 'webcam' && mc?.webcamActive){ mc.disableWebcam(); hud?.updateMotionStatus?.({ webcamActive: false, phoneConnected: this.phone.ready }); }
    if (id === 'phone'){ this.phone.start().catch(err => this._warn(`Collegamento non disponibile (${err.message}).`)); if (open) this.openPhone(); }
  }
  onViewChange(view){
    for (const b of document.querySelectorAll('[data-natpf-view]')) b.classList.toggle('selected', b.dataset.natpfView === view);
    const label = $('natpf-view-label'); if (label) label.textContent = view === 'first' ? '1ª persona' : '3ª persona';
  }
  // Con lo smartphone scelto si entra in campo quando la racchetta è pronta (mouse e tastiera restano attivi).
  _bindStart(){
    $('btn-start-match')?.addEventListener('click', e => {
      if (this.controller === 'phone' && !this.phone.ready){ e.stopImmediatePropagation(); this.openPhone({ beforeStart: true }); }
    }, true);
  }

  /* ---------- invito del Player 2 (1v1 tra due computer, relay di Argon) ---------- */
  async onRoomCreated(room){
    const box = $('natpf-invite'); if (!box || !room?.roomId) return;
    // in LAN (lan/server.mjs) l'indirizzo di rete del computer al posto di localhost, con ?lan=1 (natpf_lan.js)
    const { url, reachable } = await guestInviteUrl(room.roomId);
    box.innerHTML = `<b>Player 2</b>: apri sull'altro computer <a href="${url}" target="_blank" rel="noopener">${url}</a> <button type="button" class="wii-pill-btn" data-copy>Copia</button>
      ${!reachable ? '<small>Il gioco è aperto da localhost: per un altro computer usa l’indirizzo di rete (avvia-lan.cmd lo mostra, es. https://192.168.x.x:8443).</small>' : ''}`;
    box.querySelector('[data-copy]')?.addEventListener('click', ev => { ev.stopPropagation(); navigator.clipboard?.writeText(url).then(() => { ev.target.textContent = 'Copiato ✓'; }).catch(() => {}); });
    show(box);
  }

  /* ---------- pannello del telefono ---------- */
  openPhone({ beforeStart = false } = {}){
    this.beforeStart = beforeStart;
    this.phone.start().catch(err => this._warn(`Collegamento non disponibile (${err.message}).`));
    show(this.modal); this.paintPhone();
  }
  closePhone(){ show(this.modal, false); }
  _bindPhoneModal(){
    const on = (id, fn) => $(id)?.addEventListener('click', e => { e.stopPropagation(); fn(); });
    on('natpf-phone-close', () => { this.closePhone(); if (this.beforeStart && this.phone.ready) $('btn-start-match')?.click(); });
    on('natpf-phone-confirm', () => this.phone.confirm());
    on('natpf-phone-retry', () => this.phone.retry());
    on('natpf-phone-invert', () => this.phone.invert());
    on('natpf-phone-skipgrip', () => this.phone.skipGrip());
    on('natpf-phone-recal', () => this.phone.recalibrate());
    on('natpf-phone-forget', () => { this.phone.forget(); this.qrToken = null; });
    // il pannello non deve far partire swing del mouse sotto
    this.modal?.addEventListener('pointerdown', e => e.stopPropagation());
  }
  _warn(text){ const w = $('natpf-phone-warn'); if (w){ w.textContent = text; show(w, !!text); } }
  step(){
    const p = this.phone, L = p.state;
    if (!p.connected) return 'collega';
    if (PHONE_ERR[L.phone]) return 'errore';
    if (L.phone === 'ready') return 'pronto';
    if (L.phone === 'cal'){ const s = p.cal.step; if (s === 'swings' || s === 'shots') return 'prova'; if (s === 'review' || s === 'free') return 'verifica'; return 'impugna'; }
    return 'collega';
  }
  paintPhone(){
    if (!this.modal || this.modal.classList.contains('hidden')) return;
    const p = this.phone, L = p.state, step = this.step(), cal = p.cal;
    const k = STEPS.indexOf(step);
    for (const li of document.querySelectorAll('#natpf-phone-steps li')){ const i = STEPS.indexOf(li.dataset.s); li.className = i === k ? 'on' : (i < k || step === 'pronto') ? 'done' : ''; }
    // QR (cambia a ogni nuovo codice monouso) o spunta quando il telefono è collegato
    const qr = $('natpf-qr'), link = $('natpf-phone-link'), url = p.pairingUrl;
    if (p.connected){ if (this.qrToken !== 'ok'){ qr.innerHTML = '<div class="natpf-qr-ok">✓</div>'; this.qrToken = 'ok'; } }
    else if (url && (L.state === 'waiting' || L.state === 'lost') && this.qrToken !== p.link.token && window.qrcode){
      const q = window.qrcode(0, 'M'); q.addData(url); q.make();
      qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); qr.dataset.url = url; this.qrToken = p.link.token;
    } else if (!url || L.state === 'starting' || L.state === 'error'){ qr.innerHTML = '<div class="natpf-qr-wait">…</div>'; this.qrToken = null; }
    if (link){ link.href = url || '#'; show(link, !!url && !p.connected); }

    let status = 'Preparo la connessione…', hint = '', tag = 'Scansiona il QR';
    if (L.state === 'waiting') status = 'Inquadra il codice con la fotocamera del telefono';
    if (L.state === 'lost'){ status = 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo'; tag = 'Scollegato'; }
    if (L.state === 'error'){ status = `Connessione non disponibile (${L.error}). Riprova o verifica la connessione a internet.`; tag = 'Errore'; }
    if (step === 'collega' && p.connected){ status = 'Telefono collegato: sul telefono tocca «Attiva i sensori»'; tag = 'Collegato'; }
    if (step === 'impugna'){ status = cal.grip ? 'Telefono in verticale ✓ resta così un attimo…' : 'Tieni il telefono in verticale nel palmo, schermo verso il palmo, come il manico di una racchetta'; hint = 'Presa comoda, senza stringere: va bene anche da seduti.'; tag = 'Impugnatura'; }
    if (step === 'prova'){ status = 'Fai i gesti che chiede il telefono: un colpetto comodo verso sinistra o verso destra, poi fermati.'; hint = cal.idle ? 'Non sento movimenti: prova un gesto più deciso, oppure sul telefono scegli movimento compatto o i tocchi.' : 'Non serve conoscere il tennis: basta un gesto naturale.'; tag = 'Calibrazione'; }
    if (step === 'verifica'){
      const r = cal.review;
      if (r && !r.pass){ status = 'Calibrazione da rifare'; hint = REVIEW_FAIL[r.why] || 'Le due direzioni non si distinguono. Tieni il telefono sempre nello stesso modo e fai gli swing davvero da una parte all’altra.'; }
      else { status = cal.freeOk ? 'Gesto letto ✓ ora conferma la racchetta' : 'Gesti riconosciuti! Prova un colpetto libero con il telefono…'; hint = 'Muovi normalmente per rispondere; accompagna verso l’alto per alzare la palla, un tocco corto e morbido per una palla corta.'; }
      tag = 'Verifica';
    }
    if (step === 'pronto'){ status = 'Racchetta pronta ✓'; hint = 'Guarda la palla sul computer e colpisci quando arriva alla racchetta. Al servizio: un gesto lancia la palla, il secondo la colpisce in alto.'; tag = `Pronto${L.rtt != null ? ` · ${L.rtt} ms` : ''}`; }
    if (step === 'errore'){ status = 'Sensori non disponibili'; hint = PHONE_ERR[L.phone]; tag = 'Errore'; }
    $('natpf-phone-status').textContent = status; $('natpf-phone-hint').textContent = hint;
    const t = $('natpf-phone-tag'); t.textContent = tag; t.classList.toggle('online', step === 'pronto');
    $('natpf-phone-dots').innerHTML = step === 'prova' ? cal.attempts.map(a => `<i class="${a || ''}"></i>`).join('') : '';

    show($('natpf-phone-confirm'), step === 'verifica' && !!cal.review?.pass);
    const confirm = $('natpf-phone-confirm'); if (confirm) confirm.disabled = !cal.freeOk;
    show($('natpf-phone-retry'), step === 'verifica' || step === 'prova');
    show($('natpf-phone-invert'), step === 'verifica');
    show($('natpf-phone-skipgrip'), step === 'impugna');
    show($('natpf-phone-recal'), step === 'pronto' || step === 'errore');
    show($('natpf-phone-forget'), p.connected);
    $('natpf-phone-close').textContent = this.beforeStart && step === 'pronto' ? '🎾 Inizia la partita' : 'Torna al campo';

    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) && !new URLSearchParams(location.search).get('phone') && !p.lanOrigin;
    this._warn(p.connected ? '' : local ? 'Il gioco è aperto da questo computer (localhost): un telefono vero non può raggiungerlo. Apri il gioco dall’indirizzo di rete in https (npm run dev:https) o da quello pubblicato.'
      : location.protocol !== 'https:' ? 'Questa pagina non è in https: sul telefono i sensori di movimento non funzioneranno. Usa npm run dev:https in LAN o l’indirizzo pubblicato.' : '');
  }
}

// «Sono pronto» dal telefono (B41.6; richiesta dell'utente del 13/11: «nella schermata "Pronto per la partita" l'utente
// deve toccare sullo smartphone "Sono pronto" (dove ora c'è "Pronto") e quando entrambi sono pronti la partita parte da
// sola, senza che uno clicchi su Gioca»). Vale anche fuori dalla modalità fiera.
// Sulla pagina «Pronto per la partita» (passo `match` della lobby) ogni telefono che gioca (contro la CPU il Telefono 1;
// nello stesso schermo tutti e due) riceve l'offerta «Sono pronto» (NatpfPhoneRacket.offerNext con rd 1: la pagina del
// telefono di oggi lo mostra grande al posto di «Pronto»; quella del B28 come il pulsante «Avanti ›» con la stessa
// scritta, che funziona lo stesso; quelle di prima lo ignorano e resta «Gioca»). Sul computer, in basso accanto a «Gioca»,
// la spunta di chi è pronto. Quando sono pronti tutti, un conto alla rovescia di 3 s (lo stesso riquadro dello stesso
// schermo, annunciato sui telefoni con «ev count») e la partita parte da sola: è lo stesso «Gioca» (natpf_ui._bindStart).
// «Gioca» sul computer resta per lo staff. Un telefono che cade (scollegato, pagina nascosta, sensori fermi, non più
// pronto) ferma il conto e deve toccare di nuovo; «Aspetta» (o Esc) ferma il conto e tutti ritoccano.
// Con la calibrazione «Giocando» gli scambi di prova restano PRIMA di questa pagina (B35): qui non si tocca il loro ordine.
// Funzioni pure in cima (test in test/natpf-ready-go.test.mjs), poi il controllore.
import { createCountdown, READY_COUNTDOWN_MS, defaultName } from './natpf_ready.js';
import { phoneHealthOf, WATCH } from './natpf_phone_watch.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
// stallMs: sensori fermi da così (ms senza dati dal telefono pronto) prima che il tocco non valga più: lo stesso tempo della
// pausa in partita e delle schede dello stesso schermo (natpf_split_ui.SPLIT_STALL_MS), così un pacchetto in ritardo (o il
// computer sotto carico) non annulla il conto
export const READY_GO = Object.freeze({ label: 'Sono pronto', done: 'Pronto ✓', ms: READY_COUNTDOWN_MS, stallMs: WATCH.sensorGapMs + WATCH.graceMs });

// Chi gioca con il telefono su questa pagina (funzione pura): [] se «Sono pronto» qui non vale. Solo contro la CPU e
// nello stesso schermo con i due telefoni; non nella sfida tra due computer (lì c'è il «Sono pronto» del Player 2), non
// con la webcam, il mouse o la tastiera, non durante gli scambi di prova o l'introduzione
export function readyGoIds({ visible = false, step = '', mode = '', controller = '', webcam = false, trial = false, guest = false, intro = false } = {}){
  if (!visible || step !== 'match' || trial || guest || intro) return [];
  if (mode === 'cpu') return controller === 'phone' ? ['p1'] : [];
  if (mode === 'split') return webcam ? [] : ['p1', 'p2'];
  return [];
}
// Perché un telefono non può dire «Sono pronto» (funzione pura): '' se può
export function readyGoWhy({ connected = false, ready = false, health = null } = {}){
  if (!connected) return 'telefono scollegato';
  if (health?.why === 'pagina nascosta') return 'schermo del telefono spento';
  if (health?.why === 'sensori fermi' && !(health.gapMs < READY_GO.stallMs)) return 'sensori fermi';
  if (!ready) return 'telefono non pronto';
  return '';
}
// Stato della pagina (funzione pura): players [{ id, name, why, tapped }] → chi può toccare, chi ha toccato, si parte?
export function readyGoState(players = []){
  const list = players.map(p => ({ id: p.id, name: String(p.name || '').trim() || defaultName(p.id), why: p.why || '', ok: !p.why, tapped: !p.why && !!p.tapped }));
  const all = list.length > 0 && list.every(p => p.tapped);
  return { list, all, waiting: list.filter(p => !p.tapped) };
}
// Riga sotto il pulsante del telefono dopo il tocco (funzione pura)
export function readyGoNote(st, id){
  const others = st.list.filter(p => p.id !== id && !p.tapped).map(p => p.name);
  return others.length ? `Aspetto ${others.join(' e ')}` : 'Si parte tra poco…';
}
// Etichetta di un giocatore sul computer (funzione pura): solo = contro la CPU (un telefono solo)
export function readyGoChip(p, { solo = false } = {}){
  const who = solo ? 'Telefono' : p.name;
  if (p.tapped) return { cls: 'is-ok', text: `${who} pronto ✓` };
  if (p.ok) return { cls: 'is-wait', text: `${who}: tocca «Sono pronto»` };
  return { cls: 'is-ko', text: `${who}: ${p.why}` };
}
// Perché il conto si è fermato (funzione pura): il primo che non è più pronto
export function readyGoCancel(st, { solo = false } = {}){
  const w = st.list.find(p => !p.ok);
  if (!w) return 'Conto fermato';
  return `Conto annullato · ${solo ? 'telefono' : w.name}: ${w.why}`;
}

export class NatpfReadyGo {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.taps = { p1: false, p2: false };
    this.countdown = createCountdown({ ms: READY_GO.ms });
    this.cd = { running: false, left: 0, why: null, whyUntil: 0 };
    this.active = false; this.ids = []; this.st = null; this._bound = new WeakSet(); this._paintKey = '';
    // da quando un telefono sembra con i sensori fermi (vedi tick)
    this._stall = { p1: null, p2: null };
    this.el = $('ready-go'); this.ov = $('ready-go-count');
    this.ov?.addEventListener('pointerdown', e => e.stopPropagation());
    this.ov?.addEventListener('click', e => { if (e.target.closest('[data-ready-go-hold]')){ e.stopPropagation(); this.hold(); } });
    // (Esc con il conto in corso lo ferma e non torna indietro di pagina: natpf_lobby.back, come lo stesso schermo)
  }
  phone(id){ return id === 'p2' ? this.engine.natpfPhone2 : this.ui.phone; }
  _ids(){
    const ui = this.ui, L = ui.lobby;
    return readyGoIds({ visible: !!L?.visible, step: L?.step, mode: L?.mode, controller: ui.controller, webcam: !!ui.split?.webcam, trial: !!ui.trial?.active, guest: this.engine.playerRole === 'p2', intro: !!ui.intro?.active });
  }
  _name(id){ return this.ui.lobby?.mode === 'split' ? (this.ui.split?.name?.(id) || defaultName(id)) : defaultName(id); }
  _bind(p, id){
    if (!p || this._bound.has(p)) return;
    this._bound.add(p);
    p.onNext?.(() => this._tap(id));
  }
  // «Sono pronto» toccato sul telefono (messaggio nx y 1): conta solo se l'offerta era per lui, su questa pagina
  _tap(id){
    if (!this.active || !this.ids.includes(id)) return;
    // (solo la nostra offerta: un «Salta ›» degli scambi di prova toccato un attimo prima non vale come «Sono pronto»)
    if (!this.phone(id)?.nextExtra?.rd) return;
    const pl = this.st?.list?.find(x => x.id === id);
    if (!pl?.ok || this.taps[id]) return;
    this.taps[id] = true;
    this.ui.diag?.recorder?.log?.('pronto.tocco', { chi: id });
    this.tick();
  }
  // ai telefoni che giocano (pagina del telefono: «ev» k 'count', come lo stesso schermo): n 3, 2, 1, 0; stop con il motivo
  _announce(m){ for (const id of this.ids){ const p = this.phone(id); if (p?.connected) p.link?.send?.({ t: 'ev', k: 'count', ...m }); } }
  // ogni 100 ms (natpf_ui)
  tick(now = performance.now()){
    const ids = this._ids();
    if (!ids.length){ this._leave(); return; }
    if (!this.active || ids.join() !== this.ids.join()){ this._leave(); this.active = true; this.ids = ids; }
    const players = ids.map(id => {
      const p = this.phone(id); this._bind(p, id);
      let why = readyGoWhy({ connected: !!p?.connected, ready: !!p?.ready, health: p?.connected ? phoneHealthOf(p, now) : null });
      // «sensori fermi» deve durare WATCH.graceMs: il computer fermo per un attimo (un fotogramma pesante, la memoria che
      // si libera) fa sembrare fermi i sensori di tutti i telefoni, poi i dati arrivano insieme. Scollegato, schermo
      // spento e non pronto valgono subito
      if (why === 'sensori fermi'){ this._stall[id] ??= now; if (now - this._stall[id] < WATCH.graceMs) why = ''; }
      else this._stall[id] = null;
      if (why) this.taps[id] = false;                 // chi cade deve toccare di nuovo
      return { id, name: this._name(id), why, tapped: this.taps[id] };
    });
    const st = this.st = readyGoState(players), solo = ids.length === 1;
    // offerte ai telefoni (tolte a chi non può: solo le nostre, non quelle di scambi di prova o esercizi)
    for (const pl of st.list){
      const p = this.phone(pl.id); if (!p) continue;
      if (pl.ok) p.offerNext?.(pl.tapped ? READY_GO.done : READY_GO.label, { rd: 1, me: pl.tapped ? 1 : 0, ...(pl.tapped ? { tx: readyGoNote(st, pl.id) } : {}) });
      else if (p.nextExtra?.rd) p.offerNext(null);
    }
    const r = this.countdown.update(st.all, now);
    const R = this.ui.diag?.recorder;
    if (r.cancelled){
      this.cd.why = readyGoCancel(st, { solo }); this.cd.whyUntil = now + 8000;
      this._announce({ stop: 1, txt: this.cd.why });
      R?.log?.('pronto.conto', { stato: 'annullato', motivo: this.cd.why });
    }
    if (r.running && r.left !== this.cd.left){
      if (!this.cd.running){ this.cd.why = null; R?.log?.('pronto.conto', { stato: 'partito' }); }
      this._announce({ n: r.left });
    }
    this.cd.running = r.running; this.cd.left = r.left;
    if (r.fire){ this._fire(); return; }
    this._paint(st, now);
  }
  // «Aspetta» (o Esc): il conto si ferma, tutti ritoccano «Sono pronto» quando vogliono
  hold(){
    const was = this.cd.running;
    this.countdown.reset(); this.taps = { p1: false, p2: false };
    Object.assign(this.cd, { running: false, left: 0, why: null });
    if (was){ this._announce({ stop: 1, soft: 1, txt: 'Partenza fermata sul computer.' }); this.ui.diag?.recorder?.log?.('pronto.conto', { stato: 'fermato' }); }
    this.tick();
  }
  // a zero: lo stesso «Gioca» della pagina (natpf_ui._bindStart fa i controlli di sempre)
  _fire(){
    this._announce({ n: 0 });
    this.ui.diag?.recorder?.log?.('pronto.conto', { stato: 'si gioca' });
    this._leave();
    const b = $('btn-start-match'); if (b){ b.disabled = false; b.click(); }
  }
  // fuori dalla pagina (o «Gioca»): niente offerte, niente spunte, niente conto
  _leave(){
    if (!this.active && !this.cd.running) return;
    for (const id of this.ids){ const p = this.phone(id); if (p?.nextExtra?.rd) p.offerNext(null); }
    this.active = false; this.ids = []; this.st = null; this.taps = { p1: false, p2: false }; this._stall = { p1: null, p2: null };
    this.countdown.reset(); this.cd = { running: false, left: 0, why: null, whyUntil: 0 };
    this._paint(null);
  }
  // in basso, accanto a «Gioca»: una spunta per giocatore; al centro il riquadro del conto alla rovescia
  _paint(st, now = performance.now()){
    const el = this.el, ov = this.ov;
    const on = !!st, solo = (st?.list?.length || 0) === 1;
    const chips = on ? st.list.map(p => ({ id: p.id, ...readyGoChip(p, { solo }) })) : [];
    const why = on && !this.cd.running && this.cd.why && now < this.cd.whyUntil ? this.cd.why : '';
    const key = on ? `${chips.map(c => `${c.id}:${c.cls}:${c.text}`).join('|')}|${why}` : '';
    if (el && key !== this._paintKey){
      this._paintKey = key;
      el.innerHTML = chips.map(c => `<span class="rg-chip ${c.cls}" data-p="${c.id}"><i aria-hidden="true"></i><b>${c.text.replace(/[<>&]/g, '')}</b></span>`).join('') + (why ? `<span class="rg-why">${why.replace(/[<>&]/g, '')}</span>` : '');
      el.closest?.('.lobby-bottom')?.classList.toggle('with-ready-go', on);
    }
    show(el, on);
    if (ov){
      show(ov, on && this.cd.running);
      if (on && this.cd.running){
        const num = ov.querySelector('[data-ready-go-count]'), n = String(this.cd.left);
        if (num && num.textContent !== n){ num.textContent = n; num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick'); }
        const names = ov.querySelector('[data-ready-go-names]'), t = solo ? 'Tieni il telefono come in partita.' : `${st.list.map(p => p.name).join(' e ')}, tenete il telefono come in partita.`;
        if (names && names.textContent !== t) names.textContent = t;
        // (contro la CPU un telefono solo: «Pronto», non «Tutti pronti»)
        const kick = ov.querySelector('.split-countdown-kicker'), k = solo ? 'Pronto · si gioca tra' : 'Tutti pronti · si gioca tra';
        if (kick && kick.textContent !== k) kick.textContent = k;
      }
    }
  }
}

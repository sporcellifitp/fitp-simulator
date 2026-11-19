// Livello dopo «Rivincita» (B47; richiesta dell'utente del 14/11: «in modalità evento quindi fiera, dopo "rivincita", devo
// poter impostare i livelli di difficoltà (es. adulto bambino ragazzo)»). A fine partita «Rivincita» (o «Gioca ancora»)
// non riparte subito e non riporta al menu: apre una scelta del livello grande, da fare con il mouse, già segnata con il
// livello di prima (basta un clic su «Gioca»):
//   · contro la CPU «Chi gioca: Bambino · Ragazzo · Adulto», le stesse tessere della pagina «Partita» (natpf_who.js); se il
//     livello di adesso è CPU Esperta o CPU Leggenda (scelto in «Altre impostazioni») c'è anche quello, segnato;
//   · nello stesso schermo la fascia di ciascun giocatore (Bambino · Ragazzo · Adulto, natpf_duo_rules.js), con i nomi.
// La scelta vale subito come nel menu (lobby.setLevel, split.setBand). Poi «Gioca» → conto alla rovescia grande
// (natpf_prematch.js) → partita. Gli scambi di prova si rifanno come prima della B47: dal pulsante del computer sì se
// sono dovuti (come «Rivincita» → pagina «Partita» → «Gioca»); dalla rivincita chiesta dai due telefoni nello stesso
// schermo no (B20: la stessa partita da capo). La rivincita dai telefoni apre la stessa scelta e parte da sola dopo
// REMATCH.autoMs se nessuno tocca niente (così si gioca anche senza nessuno al computer, come prima).
// «Altre impostazioni» porta alla pagina «Partita» (il percorso di prima), «‹ Indietro» (o Esc) torna alla schermata finale.
// Mouse, tastiera (frecce, Invio, Esc) e telecomando dello staff (frecce, OK, Indietro: strato «rematch» di
// natpf_remote_map.js). Nella sfida tra due computer «Rivincita» resta immediata (l'altro computer aspetta).
// B64 (ridondanze, decisione dell'utente del 17/11: «la fascia la imposto anche dopo»): nello stesso schermo la rivincita non
// chiede più la fascia: «Stessi giocatori, stesse fasce» con le due fasce di prima scritte e un piccolo «Cambia fascia» che
// apre la scelta di sempre. Contro la CPU resta «Chi gioca» (il livello dopo la rivincita è la richiesta del B47).
// Funzioni pure in cima (test/natpf-b47-rivincita.test.mjs), poi il controllore.
import { WHO_LEVEL, whoOfLevel, isCpuLevel, opponentLevelName } from './natpf_who.js';
import { BANDS, BAND_LABEL, bandOf } from './natpf_duo_rules.js';
import { nearestTile } from './natpf_lobby.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const REMATCH = Object.freeze({ autoMs: 10000, kicker: 'Rivincita', titleCpu: 'Chi gioca?', titleSplit: 'Chi gioca? Scegli la fascia di ciascuno',
  titleSplitSame: 'Stessi giocatori, stesse fasce', subSplitSame: 'Premi «Gioca» per la rivincita', bandsBtn: 'Cambia fascia',
  sub: 'Il livello di prima è già segnato: cambialo se serve e premi «Gioca»' });
// le tessere di «Chi gioca» (come la pagina «Partita»: index.html, #difficulty-mode-group)
const WHO_TILES = Object.freeze([
  { who: 'bambino', name: 'Bambino', desc: 'Palla più lenta e più tempo per colpire', icon: '<circle cx="24" cy="15" r="6" /><path d="M14 40c1-9 5-13 10-13s9 4 10 13" />' },
  { who: 'ragazzo', name: 'Ragazzo', desc: 'Avversario facile, per prendere confidenza', icon: '<circle cx="24" cy="13" r="6.5" /><path d="M12 41c1-11 6-16 12-16s11 5 12 16" />' },
  { who: 'adulto', name: 'Adulto', desc: 'La partita si regola su come giochi', icon: '<circle cx="24" cy="11" r="7" /><path d="M9 42c1-13 7-19 15-19s14 6 15 19" />' },
]);

// Tessere contro la CPU (funzione pura): Bambino · Ragazzo · Adulto, più il livello di adesso se non viene da «Chi gioca»
// (Avversario esperto, Avversario Leggenda: nel menu stanno in «Altre impostazioni»). selected: la tessera segnata
export function rematchCpuTiles(level = 'evento'){
  const cur = isCpuLevel(level) ? level : WHO_LEVEL.adulto;
  const tiles = WHO_TILES.map(t => ({ level: WHO_LEVEL[t.who], who: t.who, name: t.name, desc: t.desc, icon: t.icon, selected: WHO_LEVEL[t.who] === cur }));
  if (!whoOfLevel(cur)) tiles.push({ level: cur, who: null, name: opponentLevelName(cur), desc: 'Livello scelto in «Altre impostazioni»', icon: '<path d="M10 34l6-16 8 9 8-9 6 16z" /><circle cx="24" cy="12" r="3" />', selected: true });
  return tiles;
}
// Righe dello stesso schermo (funzione pura): per ciascun giocatore nome e fasce, con quella di adesso segnata
export function rematchSplitRows(names = {}, bands = {}){
  return ['p1', 'p2'].map(id => ({ id, name: String(names[id] || (id === 'p2' ? 'Player 2' : 'Player 1')), bands: BANDS.map(b => ({ band: b, label: BAND_LABEL[b], selected: bandOf(bands[id]) === b })) }));
}
// riga della partenza da sola (rivincita dai telefoni): '' se non c'è
// (la differenza tra due orari con i decimali può valere 10000,000000002 ms: senza il margine diceva «tra 11 s»)
export function rematchAutoLine(leftMs = 0){
  const s = Math.ceil(Math.max(0, +leftMs || 0)/1000 - 1e-6);
  return s > 0 ? `Rivincita chiesta dai telefoni: si parte da soli tra ${s} s, oppure scegli e premi «Gioca»` : '';
}

export class NatpfRematch {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-rematch');
    this.open_ = false; this.origin = 'computer'; this.autoUntil = 0; this._key = '';
    this.el?.addEventListener?.('pointerdown', e => { e.stopPropagation(); this._touch(); });
    this.el?.addEventListener?.('click', e => {
      const t = e.target;
      const lv = t.closest?.('[data-rematch-level]'); if (lv){ e.stopPropagation(); this.pickLevel(lv.dataset.rematchLevel); return; }
      const bd = t.closest?.('[data-rematch-band]'); if (bd){ e.stopPropagation(); const [id, band] = bd.dataset.rematchBand.split(':'); this.pickBand(id, band); return; }
      const a = t.closest?.('[data-rematch-act]'); if (!a) return;
      e.stopPropagation();
      const act = a.dataset.rematchAct;
      if (act === 'play') this.play(); else if (act === 'more') this.more(); else if (act === 'cancel') this.cancel(); else if (act === 'bands') this.showBands();
    });
  }
  get isOpen(){ return this.open_; }
  get split(){ return !!this.engine.natpfSplit?.active; }
  // si apre a fine partita contro la CPU o nello stesso schermo (origin: 'computer' | 'phones'); false se qui non vale
  open({ origin = 'computer' } = {}){
    const L = this.ui.lobby, E = this.engine;
    if (!this.el || E.playerRole === 'p2' || L?.mode === 'friend' || this.ui.versus?.hostActive) return false;
    if (!this.split && L?.mode !== 'cpu') return false;
    this.open_ = true; this.origin = origin === 'phones' ? 'phones' : 'computer'; this.bands = false;
    this.autoUntil = this.origin === 'phones' ? performance.now() + REMATCH.autoMs : 0;
    E.hud?.hideVictoryModal?.();
    this._key = ''; this.paint();
    show(this.el, true);
    this.ui.diag?.recorder?.log?.('rivincita.scelta', { origine: this.origin, stessoSchermo: this.split });
    // «Gioca» già a fuoco: Invio (o OK del telecomando) e si gioca con il livello di prima
    this._focus(this.el.querySelector?.('[data-rematch-act="play"]'));
    return true;
  }
  // un tocco dello staff (mouse, tasto): la partenza da sola della rivincita dai telefoni non vale più
  _touch(){ if (this.autoUntil){ this.autoUntil = 0; this.paint(); } }
  // si chiude senza fare niente (menu, chiosco, «Nuovo giocatore»)
  close(){ this.open_ = false; this.autoUntil = 0; show(this.el, false); }
  // ‹ Indietro: di nuovo la schermata finale (è ancora lì, solo nascosta)
  cancel(){ if (!this.open_) return; this.close(); show($('victory-modal'), true); this._focus($('btn-play-again')); }
  // contro la CPU: il livello vale subito, come le tessere del menu (lobby.setLevel: l'HUD, il livello Evento da capo)
  pickLevel(level){
    this._touch();
    if (!isCpuLevel(level)) return;
    const L = this.ui.lobby;
    if (level !== this.level()) L?.setLevel ? L.setLevel(level) : null;
    this.paint();
  }
  pickBand(id, band){ this._touch(); if (!['p1', 'p2'].includes(id)) return; this.ui.split?.setBand?.(id, band); this.paint(); }
  // B64: «Cambia fascia» apre la scelta delle fasce (stesso schermo)
  showBands(){ this._touch(); if (!this.split) return; this.bands = true; this.paint(); this._focus(this.el?.querySelector?.('.rematch-band.selected')); }
  level(){ const L = this.ui.lobby; return L?.cpuLevel || this.engine.hud?.selectedDifficulty || WHO_LEVEL.adulto; }
  // «Altre impostazioni»: il percorso di prima della B47 (pagina «Partita»; contro la CPU prima gli scambi di prova se dovuti)
  more(){
    const ui = this.ui, L = ui.lobby;
    this.close();
    ui.backToMenu('match');
    if (L?.mode === 'cpu' && L._pageTrial?.()) ui.wipe('Scambi di prova');
  }
  // «Gioca»: la stessa partita da capo con il livello scelto; conto alla rovescia grande (natpf_prematch.js), prima gli
  // scambi di prova se dovuti (solo dal pulsante del computer, come prima della B47)
  play(){
    if (!this.open_) return false;
    const ui = this.ui, E = this.engine, L = ui.lobby, split = this.split;
    const phones = split ? (ui.split?.webcam ? [] : [ui.split.phone('p1'), ui.split.phone('p2')]) : [ui.phone];
    this.close();
    ui.diag?.recorder?.log?.('rivincita.gioca', { origine: this.origin, livello: split ? null : this.level(), fasce: split ? { ...(E.natpfSplitBands || {}) } : null });
    // (come «Gioca» della pagina: con «Con i gesti» un telefono rimasto con il profilo del gioco rifà i gesti)
    if (this.origin === 'computer') ui.demoteStale?.(phones);
    // telefono non pronto (o stesso schermo con uno dei due non pronto): il percorso di sempre, dalla pagina «Partita»
    const notReady = split ? !ui.split?.bothReady?.() : ui.controller === 'phone' && !ui.phone?.soonReady;
    if (notReady){ this.more(); ui.toast?.(split ? 'Servono i due telefoni pronti: dalla pagina «Partita»' : 'Il telefono non è pronto: dalla pagina «Partita»'); return false; }
    E.hud?.hideVictoryModal?.();
    if (split){
      ui.split?._rematchClear?.();
      if (this.origin === 'computer' && ui.trial?.due?.({ split: true })){ ui.wipe('Scambi di prova'); ui.trial.start({ split: true, then: () => this._splitGo() }); return true; }
      if (this.origin === 'computer' && !ui.split?.webcam) ui.freshForActivity?.(phones);
      this._splitGo();
      return true;
    }
    const warmed = !!ui.trialSkipOnce && (!!ui.phone?.profile?.trial || !!ui.phone?.gestureProfile);
    if (!warmed && !L?.trialPlayed && ui.trial?.due?.({ split: false })){ ui.wipe('Scambi di prova'); ui.trial.start({ split: false, then: () => ui._startMatchNow() }); return true; }
    if (!warmed) ui.freshForActivity?.();
    ui.trialSkipOnce = false;
    if (L) L.trialPlayed = false;
    ui._startMatchNow();
    return true;
  }
  // stesso schermo: come la rivincita dai telefoni (natpf_split_ui._rematchGo), con le fasce scelte (startNewMatch le legge)
  _splitGo(){
    const E = this.engine, ui = this.ui;
    ui.wipe?.('Rivincita');
    E.hud?.hideVictoryModal?.();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    E.startNewMatch({ showStartBanner: true });
    ui._syncPause?.();
  }
  // ogni 100 ms (natpf_ui): la partenza da sola della rivincita dai telefoni e il ridisegno (il livello può cambiare dal
  // telecomando dello staff)
  tick(now = performance.now()){
    if (!this.open_) return;
    if (this.autoUntil && now >= this.autoUntil){ this.autoUntil = 0; this.play(); return; }
    this.paint(now);
  }
  // tasti (natpf_lobby._key, prima di tutto il resto): frecce tra i pulsanti, Invio preme, Esc indietro. true se usato
  key(e){
    if (!this.open_) return false;
    if (e.code === 'Tab') return false;
    this._touch();
    if (e.code === 'Escape' || e.code === 'Backspace'){ if (!e.repeat) this.cancel(); return true; }
    const items = this._items(), cur = items.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)){
      if (!items.length) return true;
      const d = e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1;
      const near = cur >= 0 ? nearestTile(items, items[cur], e.code) : null;
      this._focus(near || items[(cur < 0 ? 0 : cur + d + items.length) % items.length]);
      return true;
    }
    // (Invio senza un pulsante a fuoco: «Gioca», come la pagina «Partita»)
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space'){
      if (!e.repeat){ if (cur >= 0) items[cur].click(); else this.play(); }
      return true;
    }
    return false;
  }
  _items(){ return [...(this.el?.querySelectorAll?.('button') || [])].filter(b => !b.disabled && !b.classList.contains('hidden') && b.offsetParent !== null); }
  _focus(el){ try { el?.focus?.({ preventScroll: true }); } catch {} }
  paint(now = performance.now()){
    const el = this.el; if (!el || !this.open_) return;
    const E = this.engine, split = this.split;
    const set = (sel, t) => { const n = el.querySelector?.(sel); if (n && n.textContent !== t) n.textContent = t; return n; };
    set('[data-rematch="kicker"]', REMATCH.kicker);
    const same = split && !this.bands;
    set('[data-rematch="title"]', same ? REMATCH.titleSplitSame : split ? REMATCH.titleSplit : REMATCH.titleCpu);
    const help = split ? this.ui.split?.helpNote?.() || '' : '', sub = same ? REMATCH.subSplitSame : REMATCH.sub;
    set('[data-rematch="sub"]', help ? `${sub}. ${help}` : sub);
    const auto = set('[data-rematch="auto"]', this.autoUntil ? rematchAutoLine(this.autoUntil - now) : '');
    auto?.classList?.toggle?.('hidden', !this.autoUntil);
    if (el.dataset) el.dataset.mode = split ? 'split' : 'cpu';
    const body = el.querySelector?.('[data-rematch="body"]'); if (!body) return;
    let html;
    if (same){
      // le fasce di prima scritte (non da scegliere) e «Cambia fascia»
      const rows = rematchSplitRows(E.natpfSplitNames || {}, E.natpfSplitBands || {});
      html = `<div class="rematch-same">${rows.map(r => { const b = r.bands.find(x => x.selected) || r.bands[r.bands.length - 1]; return `<div class="rematch-player rematch-player-same" data-rematch-player="${r.id}"><b class="rematch-name">${esc(r.name)}</b><span class="rematch-band rematch-band-same selected" data-rematch-band="${r.id}:${b.band}">${b.label}</span></div>`; }).join('')}<button type="button" class="rematch-btn ghost rematch-change" data-rematch-act="bands">${REMATCH.bandsBtn}</button></div>`;
    } else if (split){
      const rows = rematchSplitRows(E.natpfSplitNames || {}, E.natpfSplitBands || {});
      html = rows.map(r => `<div class="rematch-player" data-rematch-player="${r.id}"><b class="rematch-name">${esc(r.name)}</b><div class="rematch-bands" role="radiogroup" aria-label="Fascia di ${esc(r.name)}">${r.bands.map(b => `<button type="button" class="rematch-band${b.selected ? ' selected' : ''}" data-rematch-band="${r.id}:${b.band}" role="radio" aria-checked="${b.selected}">${b.label}</button>`).join('')}</div></div>`).join('');
    } else {
      html = `<div class="rematch-tiles" role="radiogroup" aria-label="Chi gioca">${rematchCpuTiles(this.level()).map(t => `<button type="button" class="rematch-tile${t.selected ? ' selected' : ''}" data-rematch-level="${t.level}" role="radio" aria-checked="${t.selected}"><svg class="rematch-icon" viewBox="0 0 48 48" aria-hidden="true">${t.icon}</svg><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}</div>`;
    }
    // (ridisegnato solo se cambia: il fuoco della tastiera e del telecomando resta sul pulsante)
    if (html !== this._key){
      const had = typeof document !== 'undefined' ? document.activeElement : null, sel = had?.dataset?.rematchLevel ? `[data-rematch-level="${had.dataset.rematchLevel}"]` : had?.dataset?.rematchBand ? `[data-rematch-band="${had.dataset.rematchBand}"]` : null;
      this._key = html; body.innerHTML = html;
      if (sel) this._focus(body.querySelector?.(sel));
    }
  }
}

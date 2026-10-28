// Interfaccia: menu, sala online, tabellone, scritte di gioco e schermata finale. Testi in italiano.
import { superTennisCanvas } from './textures.js';
import { FORMATS } from './rules.js';
import { LEVELS } from './ai.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class UI {
  constructor(root, prefs) {
    this.root = root;
    this.prefs = prefs;
    this.cb = {};
    root.innerHTML = `
      <div class="hud hidden">
        <div class="sb">
          <div class="sb-row me"><span class="srv"></span><span class="nm"></span><span class="gm"></span><span class="pt"></span></div>
          <div class="en me"><i></i></div>
          <div class="sb-row op"><span class="srv"></span><span class="nm"></span><span class="gm"></span><span class="pt"></span></div>
          <div class="en op"><i></i></div>
        </div>
        <button class="hud-btn pause" aria-label="Pausa">II</button>
        <div class="spd"></div>
        <div class="banner"></div>
        <div class="popup"></div>
        <div class="hint"><span></span></div>
        <div class="shot-type"></div>
        <div class="wl wl-0"></div><div class="wl wl-1"></div>
        <div class="ft"></div>
        <div class="net-status"></div>
      </div>
      <div class="versus hidden"><div class="vs-a"></div><div class="vs-mid">VS</div><div class="vs-b"></div></div>
      <div class="screen menu hidden"></div>
      <div class="screen online hidden"></div>
      <div class="screen howto hidden"></div>
      <div class="screen pausem hidden"></div>
      <div class="screen end hidden"></div>
      <div class="loading"><div class="ld-logo"></div><div class="ld-bar"><i></i></div><div class="ld-txt">Caricamento dell'arena…</div></div>`;
    $('.pause', root).onclick = () => this.cb.pause?.();
    const logo = superTennisCanvas(80, '#ffffff', { arena: true });
    logo.className = 'st-logo';
    $('.ld-logo', root).append(logo);
  }

  on(name, fn) { this.cb[name] = fn; }

  progress(v, txt) {
    $('.ld-bar i', this.root).style.width = `${Math.round(v * 100)}%`;
    if (txt) $('.ld-txt', this.root).textContent = txt;
  }
  hideLoading() { $('.loading', this.root).classList.add('gone'); }

  show(name) {
    for (const s of this.root.querySelectorAll('.screen')) s.classList.toggle('hidden', !s.classList.contains(name));
    $('.hud', this.root).classList.toggle('hidden', name !== 'hud');
  }

  // ── menu principale ─────────────────────────────────────────────────────
  showMenu() {
    const m = $('.menu', this.root);
    const p = this.prefs;
    m.innerHTML = `
      <div class="brand"><img src="assets/brand/esports-fitp.png" alt="ESPORTS FITP" class="esp"></div>
      <div class="title"></div>
      <div class="btns">
        <button class="big primary" data-a="cpu"><b>GIOCA 1 CONTRO 1</b><small>contro il computer</small></button>
        <button class="big pink" data-a="online"><b>SFIDA ONLINE</b><small>con un link, da due telefoni</small></button>
        <button class="big ghost" data-a="howto"><b>COME SI GIOCA</b></button>
      </div>
      <div class="opts">
        <label>Difficoltà<select data-o="level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${p.level === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label>Partita<select data-o="format">${Object.entries(FORMATS).map(([k, v]) => `<option value="${k}" ${p.format === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <button class="chip" data-a="mute">${p.muted ? 'Audio: no' : 'Audio: sì'}</button>
      </div>
      <div class="foot">Arena ESPORTS FITP · SuperTennis</div>`;
    const t = superTennisCanvas(90, '#ffffff', { arena: true });
    t.className = 'st-logo';
    $('.title', m).append(t);
    m.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => this.cb[b.dataset.a]?.(); });
    m.querySelectorAll('[data-o]').forEach((s) => { s.onchange = () => this.cb.pref?.(s.dataset.o, s.value); });
    this.show('menu');
  }

  setMuteLabel(muted) {
    const b = $('.menu [data-a="mute"]', this.root);
    if (b) b.textContent = muted ? 'Audio: no' : 'Audio: sì';
  }

  // ── sala online ─────────────────────────────────────────────────────────
  showOnline({ name = '', code = '' } = {}) {
    const o = $('.online', this.root);
    o.innerHTML = `
      <h2>SFIDA ONLINE</h2>
      <label class="field">Il tuo nome<input maxlength="14" class="nm" value="${escapeHtml(name)}" placeholder="Giocatore"></label>
      <button class="big primary" data-a="create"><b>CREA UNA PARTITA</b><small>e manda il link all'avversario</small></button>
      <div class="or">oppure</div>
      <div class="join"><input class="code" maxlength="6" placeholder="CODICE" value="${escapeHtml(code)}" autocapitalize="characters"><button class="big pink" data-a="join"><b>ENTRA</b></button></div>
      <button class="back" data-a="back">‹ Menu</button>`;
    const nm = $('.nm', o), cd = $('.code', o);
    $('[data-a="create"]', o).onclick = () => this.cb.create?.(nm.value.trim() || 'Giocatore');
    $('[data-a="join"]', o).onclick = () => this.cb.join?.(nm.value.trim() || 'Giocatore', cd.value.trim().toUpperCase());
    $('[data-a="back"]', o).onclick = () => this.cb.back?.();
    this.show('online');
  }

  showWaiting(code, link) {
    const o = $('.online', this.root);
    o.innerHTML = `
      <h2>PARTITA CREATA</h2>
      <div class="code-big">${code}</div>
      <p>Manda questo link all'avversario. La partita parte appena entra.</p>
      <div class="link">${escapeHtml(link)}</div>
      <button class="big primary" data-a="share"><b>CONDIVIDI IL LINK</b></button>
      <div class="wait"><span class="dot"></span> In attesa dell'avversario…</div>
      <button class="back" data-a="back">‹ Annulla</button>`;
    $('[data-a="share"]', o).onclick = () => this.cb.share?.(link);
    $('[data-a="back"]', o).onclick = () => this.cb.back?.();
    this.show('online');
  }

  onlineMessage(text) {
    const w = $('.online .wait', this.root);
    if (w) w.innerHTML = `<span class="dot"></span> ${escapeHtml(text)}`;
  }

  showHowto() {
    const s = $('.howto', this.root);
    s.innerHTML = `
      <h2>COME SI GIOCA</h2>
      <div class="rules">
        <div><b>Corsa automatica</b><span>Il tuo giocatore corre da solo verso la palla. Tu decidi il colpo.</span></div>
        <div><b>Il gesto è il colpo</b><span>La direzione del dito sceglie dove va la palla (diagonale o lungolinea), la lunghezza quanto va profonda. Mentre trascini vedi il mirino, la traiettoria e il nome del colpo; in rosso se finirebbe fuori.</span></div>
        <div><b>↑ Su</b><span><i>Topspin</i>, il colpo base. Su <i>veloce e lungo</i>: <i>piatto</i>, più forte ma più rischioso. Su <i>lento</i>: <i>pallonetto</i>.</span></div>
        <div><b>↓ Giù</b><span>Lungo: <i>tagliato</i>, basso e profondo (il rovescio tagliato è a una mano). Corto: <i>palla corta</i>, rimbalza appena oltre la rete.</span></div>
        <div><b>Bersaglio e anello</b><span>Il bersaglio verde mostra dove rimbalzerà la palla dell'avversario. L'anello attorno al tuo giocatore si stringe e diventa verde quando è il momento giusto per scorrere.</span></div>
        <div><b>Tempismo</b><span>Scorri quando la palla sta arrivando: nell'ultimo mezzo secondo prima dell'impatto il colpo è <i>PERFETTO</i>, più preciso e veloce. Troppo presto sbagli di più; se non scorri, non colpisci.</span></div>
        <div><b>Servizio</b><span>Scorri verso l'alto: a destra o a sinistra per angolare, più veloce per servire più forte (ma rischi il fallo).</span></div>
        <div><b>Rete</b><span>Se sei vicino alla rete il giocatore gioca la volée; sui pallonetti alti schiaccia.</span></div>
      </div>
      <button class="big primary" data-a="back"><b>HO CAPITO</b></button>`;
    $('[data-a="back"]', s).onclick = () => this.cb.back?.();
    this.show('howto');
  }

  showPause(online) {
    const s = $('.pausem', this.root);
    s.innerHTML = `
      <h2>PAUSA</h2>
      <button class="big primary" data-a="resume"><b>${online ? 'TORNA IN CAMPO' : 'RIPRENDI'}</b></button>
      <button class="big ghost" data-a="quit"><b>ESCI DALLA PARTITA</b></button>`;
    $('[data-a="resume"]', s).onclick = () => this.cb.resume?.();
    $('[data-a="quit"]', s).onclick = () => this.cb.quit?.();
    $('.pausem', this.root).classList.remove('hidden');
  }
  hidePause() { $('.pausem', this.root).classList.add('hidden'); }

  // ── partita ─────────────────────────────────────────────────────────────
  showHud() { this.show('hud'); }

  showVersus(a, b) {
    const v = $('.versus', this.root);
    $('.vs-a', v).textContent = a;
    $('.vs-b', v).textContent = b;
    v.classList.remove('hidden');
    v.classList.add('in');
  }
  hideVersus() { $('.versus', this.root).classList.add('hidden'); }

  score({ names, games, points, serving, tiebreak }) {
    const rows = this.root.querySelectorAll('.sb-row');
    rows.forEach((r, i) => {
      $('.nm', r).textContent = names[i];
      $('.gm', r).textContent = games[i];
      $('.pt', r).textContent = points[i];
      $('.srv', r).classList.toggle('on', serving === i);
    });
    $('.sb', this.root).classList.toggle('tb', !!tiebreak);
  }

  hint(text, kind) {
    const e = $('.hint', this.root);
    if (!text) { e.classList.remove('show'); return; }
    $('span', e).textContent = text;
    e.dataset.kind = kind || '';
    e.classList.add('show');
  }

  // Etichetta sopra un giocatore (nome del colpo che sta preparando), in pixel dello schermo.
  worldLabel(i, text, x, y) {
    const e = $(`.wl-${i}`, this.root);
    if (!text) { e.classList.remove('show'); return; }
    if (e.textContent !== text) e.textContent = text;
    e.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    e.classList.add('show');
  }

  // Scritta che sale dal giocatore: +PRECISIONE, CRITICO!
  floatText(text, cls, x, y) {
    const e = $('.ft', this.root);
    e.textContent = text;
    e.className = `ft ${cls || ''}`;
    e.style.left = `${Math.round(x)}px`;
    e.style.top = `${Math.round(y)}px`;
    void e.offsetWidth;
    e.classList.add('show');
    clearTimeout(this._ft);
    this._ft = setTimeout(() => e.classList.remove('show'), 900);
  }

  energy(me, op) {
    $('.en.me i', this.root).style.width = `${Math.round(me * 100)}%`;
    $('.en.op i', this.root).style.width = `${Math.round(op * 100)}%`;
    $('.en.me', this.root).classList.toggle('low', me < 0.3);
  }

  // Nome del colpo che si sta preparando col gesto (colorato come il mirino).
  shotType(name, color) {
    const e = $('.shot-type', this.root);
    if (!name) { e.classList.remove('show'); return; }
    e.textContent = name;
    e.style.color = color;
    e.style.borderColor = color;
    e.classList.add('show');
  }

  speed(kmh, mine) {
    const e = $('.spd', this.root);
    e.innerHTML = `<b>${kmh}</b> km/h`;
    e.classList.toggle('mine', mine);
    e.classList.remove('show');
    void e.offsetWidth;
    e.classList.add('show');
  }

  popup(text, cls) {
    const e = $('.popup', this.root);
    e.textContent = text;
    e.className = `popup ${cls || ''}`;
    void e.offsetWidth;
    e.classList.add('show');
    clearTimeout(this._pt);
    this._pt = setTimeout(() => e.classList.remove('show'), 900);
  }

  banner(text, cls, dur = 1.4) {
    const e = $('.banner', this.root);
    e.textContent = text;
    e.className = `banner ${cls || ''}`;
    void e.offsetWidth;
    e.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => e.classList.remove('show'), dur * 1000);
  }

  netStatus(text) {
    const e = $('.net-status', this.root);
    e.textContent = text || '';
    e.classList.toggle('show', !!text);
  }

  endScreen({ win, score, me, names }) {
    const s = $('.end', this.root);
    const op = me === 0 ? 1 : 0;
    const sets = score.history.length ? score.history[score.history.length - 1] : score.games;
    s.innerHTML = `
      <div class="rays"></div>
      <div class="end-card ${win ? 'win' : 'lose'}">
        <div class="end-title">${win ? 'VITTORIA!' : 'SCONFITTA'}</div>
        <div class="end-score"><span>${escapeHtml(names[me])}</span><b>${sets[me]} - ${sets[op]}</b><span>${escapeHtml(names[op])}</span></div>
        <div class="end-sub">${win ? 'Grande partita nell\'arena ESPORTS FITP!' : 'Gioca lontano dall\'avversario e cerca il tempo perfetto.'}</div>
        <button class="big primary" data-a="rematch"><b>RIVINCITA</b></button>
        <button class="big ghost" data-a="menu"><b>MENU</b></button>
      </div>`;
    s.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => this.cb[b.dataset.a]?.(); });
    s.classList.remove('hidden');
  }
  hideEnd() { $('.end', this.root).classList.add('hidden'); }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

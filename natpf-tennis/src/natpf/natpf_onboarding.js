// «Come si gioca» (rifatta il 30/10/2026 su richiesta dell'utente: «testi a caso, rendili più grandi e intuitivi, una
// modale che scorre card per card»). Una modale a schede: una scheda per passo, con il titolo grande, la clip del gioco
// vero (fotogrammi in un'unica immagine animata con CSS: public/guide/*.jpg, generati da scripts/guide-clips.mjs) o la
// figura della presa, e due blocchi di testo grande: «Cosa fai tu» e «Cosa succede in campo». Si sfoglia con
// Indietro/Avanti (sull'ultima «Fine»), con i puntini, con le frecce ←/→ (Home/Fine, 1–6), con uno swipe del dito;
// Esc chiude. In alto si sceglie la racchetta (smartphone, webcam, mouse e tastiera): cambiano i testi, non il passo.
// Si apre dal benvenuto, con «?», con il tasto H, dal menu (Guida) e dalla pausa. API: open(), close(), isOpen, key(e).
import { gripSvg, GRIP_TEXT } from '@natpf/tennis/grip-art.js';
const $ = id => document.getElementById(id);
export const GUIDE_CONTROLLERS = Object.freeze([['phone', 'Smartphone'], ['webcam', 'Webcam'], ['mouse', 'Mouse e tastiera']]);
export const ONBOARDING_KEY = 'natpf-tennis.onboarded';
// clip: nome del file in public/guide/ e numero di fotogrammi (orizzontali, 320×180 ciascuno)
export const GUIDE_CLIPS = Object.freeze({ run: 12, hit: 12, aim: 12, serve: 12, shots: 12 });
// impugnatura: la figura condivisa con la pagina del telefono (prima il telefono con il display verso chi guarda, il
// contrario della presa chiesta)
const grip = gripSvg({ cls: 'guide-svg guide-grip', compact: true });

export const GUIDE = [
  { id: 'grip', title: 'Impugna la racchetta', art: () => grip, you: {
    phone: `${GRIP_TEXT} Nel riscaldamento fai due colpetti, un dritto e un rovescio: il telefono impara il tuo gesto.`,
    webcam: 'Mettiti <b>tra 1 e 4 metri</b> dalla webcam (quella del portatile o una separata), con la mano che colpisce ben visibile e la luce davanti. Vicino (1 m) fai swing più corti, davanti al corpo.',
    mouse: '<b>Spazio</b> o un trascinamento del mouse colpiscono. Funziona sempre, anche insieme agli altri.',
  }, game: 'In campo la racchetta segue il tuo telefono (o la tua mano).' },
  { id: 'run', title: 'Il giocatore corre da solo', clip: 'run', you: {
    all: 'Non devi spostarti: <b>pensi solo al colpo</b>. Guarda la palla che arriva verso la racchetta.',
  }, game: 'Il tuo giocatore va da solo verso la palla. Cambi visuale (prima o terza persona) nel menu o con <kbd>V</kbd>.' },
  { id: 'hit', title: 'Colpisci quando la palla arriva', clip: 'hit', you: {
    phone: 'Mentre la palla arriva <b>porta indietro il telefono</b> come una racchetta, poi un <b>colpo deciso</b> nel verso opposto quando la palla è vicina. Dritto o rovescio li sceglie il verso del colpo; la preparazione non conta come colpo.',
    webcam: 'Uno <b>swing della mano</b> verso sinistra o verso destra quando la palla arriva.',
    mouse: '<kbd>Spazio</kbd> quando la palla arriva alla racchetta.',
  }, game: 'La racchetta in campo si carica con te. A terra compare un anello: <b class="q-g">verde</b> perfetto, <b class="q-y">giallo</b> buono, <b class="q-r">rosso</b> fuori tempo.' },
  { id: 'aim', title: 'Scegli dove va la palla', clip: 'aim', you: {
    phone: 'Il <b>tempo</b> sceglie la direzione, rispetto al <b>tuo ritmo</b>: colpisci <b>un attimo prima del solito</b> e la palla va <b>incrociata</b>, <b>un attimo dopo il solito</b> e va <b>lungolinea</b>; con il tuo tempo solito va al centro. Girare il dorso del telefono la sposta ancora un poco. Un colpo <b>più forte del tuo solito</b> va più in fondo, uno più morbido resta più corto.',
    webcam: 'Il verso dello swing sceglie la direzione; colpire <b>prima</b> la incrocia, colpire <b>dopo</b> la manda lungolinea. Uno swing più veloce la manda più in fondo.',
    mouse: '<kbd>Q</kbd>/<kbd>E</kbd> o <kbd>A</kbd>/<kbd>D</kbd> mirano a sinistra o a destra.',
  }, game: 'Con il tempo si va da una riga all’altra: un incrociato stretto fa correre l’avversario, una palla profonda lo spinge indietro. Troppo presto o troppo tardi la palla esce di lato.' },
  { id: 'serve', title: 'Il servizio', clip: 'serve', you: {
    phone: '<b>1</b> alza il telefono (o tocca lo schermo): lanci la palla. <b>2</b> un colpetto quando è in alto: servizio.',
    webcam: '<b>1</b> alza la mano di scatto: lanci la palla. <b>2</b> swing quando è in alto.',
    mouse: '<b>1</b> <kbd>↑</kbd> o <kbd>W</kbd> lancia la palla. <b>2</b> <kbd>Spazio</kbd> quando è in alto.',
  }, game: 'Quando servi tu, in basso compare «Al servizio».' },
  { id: 'shots', title: 'Colpi speciali', clip: 'shots', you: {
    phone: 'Chiudi il colpo con la racchetta <b>che sale</b>, dal basso verso l’alto: pallonetto. Colpo <b>lento e morbido dall’alto verso il basso</b>: palla corta; deciso dall’alto verso il basso: tagliato (schiacciata se la palla è alta). Gesto veloce e dritto: colpo piatto. Negli esercizi dell’Allenamento il gioco impara il tuo pallonetto e la tua palla corta.',
    webcam: 'Swing verso l’alto: lob. Verso il basso: tagliato. Sulle palle alte lo smash parte da solo.',
    mouse: '<kbd>1</kbd> topspin · <kbd>2</kbd> tagliato · <kbd>3</kbd> lob · <kbd>4</kbd> smash.',
  }, game: 'Il lob scavalca chi è a rete, la palla corta sorprende chi sta in fondo.' },
];
// testo «Cosa fai tu» di un passo per una racchetta
export const guideText = (step, controller) => step.you[controller] || step.you.all || step.you.phone;
// passo successivo/precedente, sempre dentro la guida (niente giro dall'ultimo al primo)
export const guideStep = (index, delta, count = GUIDE.length) => Math.max(0, Math.min(count - 1, index + delta));
// swipe: almeno SWIPE_PX in orizzontale e più orizzontale che verticale. 1 = avanti (dito verso sinistra), -1 = indietro
export const SWIPE_PX = 48;
export function swipeDirection(dx, dy){
  if (!Number.isFinite(dx) || Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy || 0)*1.3) return 0;
  return dx < 0 ? 1 : -1;
}
const clipHtml = id => `<div class="guide-clip" style="--frames:${GUIDE_CLIPS[id]};background-image:url('./guide/${id}.jpg')" role="img" aria-label="Clip del gioco"></div>`;
const plain = html => String(html).replace(/<[^>]+>/g, '');

export class NatpfOnboarding {
  constructor({ getController, onPractice, onOpen, onClose } = {}){
    this.el = $('natpf-onboarding');
    this.getController = getController || (() => 'phone');
    this.onPractice = onPractice; this.onOpen = onOpen; this.onClose = onClose;
    this.controller = null; this.index = 0; this._swipe = null;
    this.ctrlBox = this.el.querySelector('.onb-ctrl');
    this.ctrlBox.addEventListener('click', e => { const b = e.target.closest?.('[data-onb-ctrl]'); if (b) this.setController(b.dataset.onbCtrl); });
    $('onb-close').addEventListener('click', () => this.close());
    $('onb-prev').addEventListener('click', () => this.prev());
    $('onb-next').addEventListener('click', () => this.next());
    $('onb-practice').addEventListener('click', () => { this.close(); this.onPractice?.(); });
    $('onb-dots').addEventListener('click', e => { const d = e.target.closest?.('[data-onb-step]'); if (d) this.go(+d.dataset.onbStep); });
    // swipe sulle schede: con il dito dagli eventi touch (arrivano anche quando il browser fa scorrere il testo e
    // annulla i pointer), con mouse o penna dai pointer (trascinamento)
    const cards = $('onb-cards');
    const start = (x, y) => { this._swipe = { x, y }; };
    const end = (x, y) => {
      const s = this._swipe; this._swipe = null; if (!s) return;
      const d = swipeDirection(x - s.x, y - s.y);
      if (d) this.go(this.index + d);
    };
    cards.addEventListener('touchstart', e => { const t = e.changedTouches?.[0]; if (t) start(t.clientX, t.clientY); }, { passive: true });
    cards.addEventListener('touchend', e => { const t = e.changedTouches?.[0]; if (t) end(t.clientX, t.clientY); }, { passive: true });
    cards.addEventListener('touchcancel', () => { this._swipe = null; }, { passive: true });
    cards.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') start(e.clientX, e.clientY); });
    cards.addEventListener('pointerup', e => { if (e.pointerType !== 'touch') end(e.clientX, e.clientY); });
    // testo più lungo della scheda (schermi bassi): sfuma in fondo finché non lo si scorre tutto
    cards.addEventListener('scroll', e => { if (e.target?.classList?.contains('guide-copy')) this._markMore(e.target); }, true);
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
    for (const b of document.querySelectorAll('[data-open-onboarding]')) b.addEventListener('click', e => { e.stopPropagation(); this.open(); });
  }
  get isOpen(){ return !this.el.classList.contains('hidden'); }
  get count(){ return GUIDE.length; }
  get isLast(){ return this.index >= GUIDE.length - 1; }
  // racchette tra cui scegliere: mouse e tastiera solo se la modalità prova è attiva (o se è la racchetta in uso)
  controllers(){
    const c = this.controller;
    return GUIDE_CONTROLLERS.filter(([id]) => id !== 'mouse' || id === c || document.querySelector('[data-natpf-controller="mouse"]:not(.hidden)'));
  }
  open(at = 0){
    const known = id => GUIDE_CONTROLLERS.some(([k]) => k === id);
    const c = this.getController(); this.controller = known(c) ? c : 'phone';
    this.index = guideStep(0, Number.isFinite(at) ? at : 0); this._prevFocus = document.activeElement;
    this.el.classList.remove('hidden'); this.paint();
    $('onb-next').focus?.(); this.onOpen?.();
  }
  close(){
    if (!this.isOpen) return;
    this.el.classList.add('hidden'); this._swipe = null;
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    // il fuoco torna dove era (il pulsante «?» o la voce del menu), se si vede ancora
    const back = this._prevFocus; this._prevFocus = null;
    if (back && back !== document.body && back.offsetParent !== null) back.focus?.();
    this.onClose?.();
  }
  static seen(){ try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return true; } }
  go(i){
    const n = guideStep(0, Number.isFinite(i) ? i : this.index);
    if (n === this.index) return;
    this.index = n; this.paint();
    // il fuoco non resta su «Indietro» quando si spegne (primo passo)
    if (this.index === 0 && document.activeElement === $('onb-prev')) $('onb-next').focus?.();
  }
  // «Avanti»; sull'ultima scheda «Fine» chiude
  next(){ if (this.isLast) this.close(); else this.go(this.index + 1); }
  prev(){ this.go(this.index - 1); }
  setController(id){
    if (!GUIDE_CONTROLLERS.some(([k]) => k === id) || id === this.controller) return;
    this.controller = id; this.paint();
  }
  // tasti mentre la guida è aperta (dalla lobby, prima di ogni altro gestore): true se il tasto è della guida
  key(e){
    const code = e.code, active = document.activeElement;
    if (code === 'Escape'){ this.close(); return true; }
    if (code === 'ArrowRight' || code === 'PageDown'){ this.go(this.index + 1); return true; }
    if (code === 'ArrowLeft' || code === 'PageUp'){ this.go(this.index - 1); return true; }
    if (code === 'Home'){ this.go(0); return true; }
    if (code === 'End'){ this.go(GUIDE.length - 1); return true; }
    if (/^Digit[1-9]$/.test(code) && +code.slice(5) <= GUIDE.length){ this.go(+code.slice(5) - 1); return true; }
    // ↑/↓ scorrono il testo della scheda se non ci sta tutto (schermi bassi)
    if (code === 'ArrowDown' || code === 'ArrowUp'){
      this.el.querySelector?.('.guide-card.on .guide-copy')?.scrollBy?.({ top: code === 'ArrowDown' ? 120 : -120, behavior: 'smooth' });
      return true;
    }
    // Invio e Spazio su un pulsante della guida: lo preme il browser; altrimenti Invio = Avanti/Fine
    const onButton = active && active !== document.body && active.tagName === 'BUTTON' && this.el.contains?.(active);
    if (code === 'Enter' || code === 'NumpadEnter'){ if (onButton) return false; this.next(); return true; }
    if (code === 'Tab') return this._trapTab(e);
    return false;
  }
  // il fuoco resta dentro la finestra (Tab dall'ultimo pulsante torna al primo e viceversa)
  _trapTab(e){
    const list = [...(this.el.querySelectorAll?.('button') || [])].filter(b => !b.disabled && !b.classList.contains('hidden') && b.offsetParent !== null && !b.closest?.('[inert]'));
    if (list.length < 2) return false;
    const i = list.indexOf(document.activeElement), last = list.length - 1;
    if (i < 0){ list[e.shiftKey ? last : 0].focus(); return true; }
    if (!e.shiftKey && i === last){ list[0].focus(); return true; }
    if (e.shiftKey && i === 0){ list[last].focus(); return true; }
    return false;
  }
  paint(){
    const c = this.controller, i = this.index, n = GUIDE.length, step = GUIDE[i];
    // puntini e racchette si ridisegnano: il fuoco della tastiera passa al pulsante nuovo corrispondente
    const f = document.activeElement, refocus = f?.dataset?.onbStep != null ? `#onb-dots [data-onb-step="${i}"]`
      : f?.dataset?.onbCtrl ? `.onb-ctrl [data-onb-ctrl="${c}"]` : null;
    this.ctrlBox.innerHTML = this.controllers().map(([id, label]) => `<button type="button" class="seg-btn${id === c ? ' selected' : ''}" data-onb-ctrl="${id}" aria-pressed="${id === c}">${label}</button>`).join('');
    const track = $('onb-track');
    track.innerHTML = GUIDE.map((g, k) => `<article class="guide-card${k === i ? ' on' : ''}" data-step="${g.id}" role="group" aria-roledescription="scheda" aria-label="Passo ${k + 1} di ${n}: ${g.title}"${k === i ? '' : ' aria-hidden="true" inert'}>
      <div class="guide-media">${g.clip ? clipHtml(g.clip) : `<div class="guide-clip guide-art">${g.art()}</div>`}</div>
      <div class="guide-copy">
        <h3 class="guide-card-title"><i aria-hidden="true">${k + 1}</i>${g.title}</h3>
        <section class="guide-block guide-you"><h4>Cosa fai tu</h4><p>${guideText(g, c)}</p></section>
        <section class="guide-block guide-game"><h4>Cosa succede in campo</h4><p>${g.game}</p></section>
      </div></article>`).join('');
    track.style.setProperty?.('--i', String(i));
    track.dataset.step = String(i);
    $('onb-dots').innerHTML = GUIDE.map((g, k) => `<button type="button" class="guide-dot${k === i ? ' on' : ''}" data-onb-step="${k}" aria-label="Passo ${k + 1}: ${g.title}"${k === i ? ' aria-current="step"' : ''}></button>`).join('');
    $('onb-count').textContent = `Passo ${i + 1} di ${n}`;
    $('onb-live').textContent = `Passo ${i + 1} di ${n}: ${plain(step.title)}`;
    const prev = $('onb-prev'), next = $('onb-next');
    prev.disabled = i === 0;
    next.textContent = this.isLast ? 'Fine ✓' : 'Avanti ›';
    next.setAttribute('aria-label', this.isLast ? 'Fine: chiudi la guida' : `Avanti: passo ${i + 2} di ${n}`);
    // «Prova nel riscaldamento» sull'ultima scheda, solo dal menu (in campo, partita o riscaldamento, no)
    $('onb-practice').classList.toggle('hidden', !this.isLast || document.documentElement.classList.contains('autoplay-mode'));
    this.el.dataset.controller = c;
    if (refocus) this.el.querySelector?.(refocus)?.focus?.();
    requestAnimationFrame(() => this._markMore(this.el.querySelector?.('.guide-card.on .guide-copy')));
  }
  _markMore(el){
    if (!el?.classList) return;
    el.classList.toggle('more', el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }
}

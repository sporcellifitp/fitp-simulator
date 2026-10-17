// Onboarding guidato: cinque passi su come si gioca, con le istruzioni della racchetta scelta (smartphone NATPF,
// webcam o mouse/tastiera di Argon), poi il punto di prova. Si apre da solo la prima volta e poi con «Come si
// gioca», il pulsante «Aiuto» o il tasto H.
const $ = id => document.getElementById(id);
const CONTROLLERS = [['phone', 'Smartphone'], ['webcam', 'Webcam'], ['mouse', 'Mouse e tastiera']];
export const ONBOARDING_KEY = 'natpf-argon.onboarded';

const art = {
  grip: `<svg viewBox="0 0 160 140"><rect x="64" y="10" width="34" height="66" rx="7" class="a-dev"/><rect x="69" y="17" width="24" height="50" rx="3" class="a-scr"/><path d="M46 74q0-16 16-14l44 2q14 2 12 18l-5 40q-2 14-18 14H70q-20 0-22-18z" class="a-hand"/><path d="M62 82h44M62 94h44M62 106h40" class="a-line"/><path d="M128 30q16 20 4 46" class="a-arrow"/><path d="M128 76l4 0 2-6" class="a-arrow"/></svg>`,
  webcam: `<svg viewBox="0 0 160 140"><circle cx="40" cy="38" r="18" class="a-dev"/><circle cx="40" cy="38" r="7" class="a-scr"/><path d="M40 56v14M28 70h24" class="a-line"/><circle cx="118" cy="44" r="12" class="a-hand"/><path d="M118 56v40M118 70l-22 10M118 70l20-14M118 96l-12 30M118 96l12 30" class="a-line"/><path d="M62 38h30" class="a-arrow" stroke-dasharray="5 5"/></svg>`,
  mouse: `<svg viewBox="0 0 160 140"><rect x="30" y="30" width="34" height="56" rx="17" class="a-dev"/><path d="M47 30v18" class="a-line"/><path d="M74 58h40" class="a-arrow"/><path d="M106 50l8 8-8 8" class="a-arrow"/><rect x="40" y="100" width="80" height="18" rx="4" class="a-scr"/><text x="80" y="113" class="a-txt">SPAZIO</text></svg>`,
  run: `<svg viewBox="0 0 160 140"><rect x="20" y="20" width="120" height="100" class="a-court"/><path d="M20 70h120M80 20v100" class="a-line"/><circle cx="104" cy="44" r="5" class="a-ball"/><path d="M104 44Q90 70 64 98" class="a-arrow" stroke-dasharray="5 5"/><circle cx="52" cy="102" r="8" class="a-hand"/><path d="M60 102h18" class="a-arrow"/><path d="M72 96l6 6-6 6" class="a-arrow"/></svg>`,
  serve: `<svg viewBox="0 0 160 140"><path d="M50 128V86" class="a-line"/><circle cx="50" cy="76" r="9" class="a-hand"/><circle cx="62" cy="22" r="7" class="a-ball"/><path d="M58 70Q58 40 62 30" class="a-arrow" stroke-dasharray="4 5"/><path d="M72 22h44" class="a-arrow"/><path d="M108 14l8 8-8 8" class="a-arrow"/><text x="92" y="48" class="a-txt">2</text><text x="40" y="52" class="a-txt">1</text></svg>`,
  shots: `<svg viewBox="0 0 160 140"><rect x="30" y="10" width="100" height="120" class="a-court"/><path d="M30 70h100" class="a-line"/><circle cx="80" cy="116" r="6" class="a-hand"/><path d="M80 110 48 24M80 110l32-86" class="a-arrow"/><path d="M80 110q0-60 0-88" class="a-arrow" stroke-dasharray="3 5"/><path d="M80 110q-6-24-14-34" class="a-arrow"/><text x="40" y="20" class="a-txt">dritto</text><text x="118" y="20" class="a-txt">rovescio</text><text x="80" y="16" class="a-txt">lob</text><text x="58" y="70" class="a-txt">corta</text></svg>`,
  timing: `<svg viewBox="0 0 160 140"><rect x="10" y="56" width="46" height="26" class="a-early"/><rect x="56" y="56" width="48" height="26" class="a-sweet"/><rect x="104" y="56" width="46" height="26" class="a-late"/><text x="33" y="73" class="a-txt">PRESTO</text><text x="80" y="73" class="a-txt">PERFETTO</text><text x="127" y="73" class="a-txt">TARDI</text><path d="M80 44v52" class="a-cursor"/><text x="33" y="104" class="a-txt">incrociato</text><text x="127" y="104" class="a-txt">lungolinea</text></svg>`,
};

const STEPS = [
  { title: 'Prendi la racchetta', art: c => art[c === 'phone' ? 'grip' : c], copy: {
    phone: ['Tieni il telefono <b>in verticale nel palmo</b>, con lo <b>schermo verso il palmo</b>: è il manico della racchetta.', 'Presa comoda, senza stringere: va bene anche da seduti. La prima volta il telefono ti chiede quattro piccoli gesti per imparare il tuo movimento.'],
    webcam: ['Mettiti a <b>1,5–2 metri</b> dalla webcam, con la mano che colpisce ben visibile.', 'Meglio la luce davanti a te che alle spalle. Il riquadro in basso a destra mostra quello che vede la webcam.'],
    mouse: ['Puoi giocare anche senza sensori: <b>trascina il mouse</b> per colpire oppure usa la <b>tastiera</b>.', 'Utile per provare, o quando telefono e webcam non sono a portata. Funziona sempre, anche insieme agli altri.'],
  } },
  { title: 'Il giocatore corre da solo', art: () => art.run, copy: {
    all: ['Non devi muoverti nel campo: <b>il tuo giocatore va da solo verso la palla</b>. Tu pensi solo al colpo.', 'Guarda la palla che arriva verso la racchetta. In <b>prima persona</b> hai la racchetta davanti a te, in <b>terza persona</b> vedi tutto il giocatore: cambi visuale con <kbd>V</kbd>.'],
  } },
  { title: 'Il servizio', art: () => art.serve, copy: {
    phone: ['<b>1</b> · un primo gesto (o un tocco sullo schermo del telefono) <b>lancia la palla</b>.', '<b>2</b> · un secondo gesto deciso <b>la colpisce</b> mentre è in alto.'],
    webcam: ['<b>1</b> · alza la mano di scatto: <b>lanci la palla</b>.', '<b>2</b> · fai lo swing mentre la palla è in alto: <b>servizio</b>.'],
    mouse: ['<b>1</b> · <kbd>↑</kbd> o <kbd>W</kbd> (oppure trascina verso l’alto) <b>lancia la palla</b>.', '<b>2</b> · <kbd>Spazio</kbd> quando la palla è in alto. La barra in basso a destra indica il momento migliore.'],
  } },
  { title: 'I colpi', art: () => art.shots, list: {
    phone: [['Dritto e rovescio', 'muovi il telefono verso sinistra o verso destra: il lato giusto lo sceglie il gioco'], ['Lob', 'accompagna il gesto verso l’alto'], ['Slice', 'gesto tagliato, dall’alto verso il basso'], ['Palla corta', 'tocco corto e morbido'], ['Smash', 'gesto deciso quando la palla è alta sopra di te'], ['Forza', 'più veloce è il gesto, più veloce va la palla']],
    webcam: [['Dritto e rovescio', 'swing della mano verso sinistra o verso destra'], ['Lob', 'swing verso l’alto'], ['Slice', 'swing verso il basso'], ['Smash', 'swing molto veloce su una palla alta'], ['Mira', 'la direzione dello swing sposta la palla']],
    mouse: [['Colpo', '<kbd>Spazio</kbd> o trascinamento orizzontale'], ['Tipi di colpo', '<kbd>1</kbd> topspin · <kbd>2</kbd> slice · <kbd>3</kbd> lob · <kbd>4</kbd> smash'], ['Col mouse', 'trascina in basso per lo slice, in alto per il lob'], ['Mira', '<kbd>Q</kbd>/<kbd>E</kbd> o <kbd>A</kbd>/<kbd>D</kbd> a sinistra o a destra']],
  } },
  { title: 'Il tempo giusto', art: () => art.timing, copy: {
    all: ['Colpisci quando la palla <b>arriva alla racchetta</b>: al momento giusto il colpo è <b>PERFETTO</b> e più potente.', 'Un po’ in anticipo la palla va <b>incrociata</b>, un po’ in ritardo va <b>lungolinea</b>; troppo tardi ti supera. Fai un punto di prova: un allenatore ti dice quando colpire.'],
  } },
];

export class NatpfOnboarding {
  constructor({ getController, onPractice, onOpen, onClose } = {}){
    this.el = $('natpf-onboarding');
    this.getController = getController || (() => 'mouse');
    this.onPractice = onPractice; this.onOpen = onOpen; this.onClose = onClose;
    this.step = 0; this.controller = null;
    const ctrl = this.el.querySelector('.onb-ctrl');
    ctrl.innerHTML = CONTROLLERS.map(([id, label]) => `<button type="button" data-onb-ctrl="${id}">${label}</button>`).join('');
    ctrl.addEventListener('click', e => { const b = e.target.closest('[data-onb-ctrl]'); if (b){ this.controller = b.dataset.onbCtrl; this.paint(); } });
    $('onb-dots').innerHTML = STEPS.map((_, i) => `<button type="button" aria-label="Passo ${i + 1}" data-onb-step="${i}"></button>`).join('');
    $('onb-dots').addEventListener('click', e => { const b = e.target.closest('[data-onb-step]'); if (b){ this.step = +b.dataset.onbStep; this.paint(); } });
    $('onb-prev').addEventListener('click', () => { this.step = Math.max(0, this.step - 1); this.paint(); });
    $('onb-next').addEventListener('click', () => { if (this.step < STEPS.length - 1){ this.step++; this.paint(); } else this.close(); });
    $('onb-skip').addEventListener('click', () => this.close());
    $('onb-practice').addEventListener('click', () => { this.close(); this.onPractice?.(); });
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    for (const b of document.querySelectorAll('[data-open-onboarding]')) b.addEventListener('click', e => { e.stopPropagation(); this.open(); });
  }
  get isOpen(){ return !this.el.classList.contains('hidden'); }
  open(step = 0){ this.step = step; this.controller = this.getController(); this.el.classList.remove('hidden'); this.paint(); $('onb-next').focus(); this.onOpen?.(); }
  close(){ if (!this.isOpen) return; this.el.classList.add('hidden'); try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {} this.onClose?.(); }
  static seen(){ try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return true; } }
  key(e){
    if (e.code === 'ArrowRight' || e.code === 'Enter'){ $('onb-next').click(); return true; }
    if (e.code === 'ArrowLeft'){ $('onb-prev').click(); return true; }
    if (e.code === 'Escape'){ this.close(); return true; }
    return false;
  }
  paint(){
    const s = STEPS[this.step], c = this.controller, last = this.step === STEPS.length - 1;
    $('onb-count').textContent = `Come si gioca · ${this.step + 1} di ${STEPS.length}`;
    $('onb-title').textContent = s.title;
    $('onb-art').innerHTML = s.art(c);
    const copy = s.copy && (s.copy[c] || s.copy.all);
    $('onb-copy').innerHTML = copy ? copy.map(p => `<p>${p}</p>`).join('') : `<dl class="onb-list">${s.list[c].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
    for (const b of this.el.querySelectorAll('[data-onb-ctrl]')) b.classList.toggle('on', b.dataset.onbCtrl === c);
    // le istruzioni cambiano solo nei passi che dipendono dalla racchetta
    this.el.querySelector('.onb-ctrl').classList.toggle('muted', !!(s.copy && s.copy.all));
    for (const b of this.el.querySelectorAll('[data-onb-step]')) b.classList.toggle('on', +b.dataset.onbStep === this.step);
    $('onb-prev').classList.toggle('hidden', this.step === 0);
    $('onb-skip').classList.toggle('hidden', last);
    $('onb-practice').classList.toggle('hidden', !last);
    $('onb-next').textContent = last ? 'Vai alla lobby' : 'Avanti ›';
  }
}

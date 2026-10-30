// «Come si gioca»: una sola finestra con tutte le istruzioni visibili insieme (non schede da sfogliare). Ogni riga ha
// accanto una clip del gioco vero (fotogrammi del gioco in un'unica immagine, animati con CSS: public/guide/*.jpg,
// generati da scripts/guide-clips.mjs) e due frasi: cosa fai tu, cosa succede in campo. Le istruzioni cambiano con la
// racchetta (smartphone, webcam, mouse e tastiera). Si apre dal benvenuto, con «?» e con il tasto H.
import { gripSvg, GRIP_TEXT } from '@natpf/tennis/grip-art.js';
const $ = id => document.getElementById(id);
const CONTROLLERS = [['phone', 'Smartphone'], ['webcam', 'Webcam'], ['mouse', 'Mouse e tastiera']];
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
    phone: 'Chiudi il colpo con la racchetta <b>che sale</b>, dal basso verso l’alto: pallonetto. Colpo <b>lento e morbido dall’alto verso il basso</b>: palla corta; deciso dall’alto verso il basso: tagliato (schiacciata se la palla è alta). Gesto veloce e dritto: colpo piatto. Nel riscaldamento il gioco impara il tuo pallonetto e la tua palla corta.',
    webcam: 'Swing verso l’alto: lob. Verso il basso: tagliato. Sulle palle alte lo smash parte da solo.',
    mouse: '<kbd>1</kbd> topspin · <kbd>2</kbd> tagliato · <kbd>3</kbd> lob · <kbd>4</kbd> smash.',
  }, game: 'Il lob scavalca chi è a rete, la palla corta sorprende chi sta in fondo.' },
];
const clipHtml = id => `<div class="guide-clip" style="--frames:${GUIDE_CLIPS[id]};background-image:url('./guide/${id}.jpg')" role="img" aria-label="Clip del gioco"></div>`;

export class NatpfOnboarding {
  constructor({ getController, onPractice, onOpen, onClose } = {}){
    this.el = $('natpf-onboarding');
    this.getController = getController || (() => 'phone');
    this.onPractice = onPractice; this.onOpen = onOpen; this.onClose = onClose;
    this.controller = null;
    this.ctrlBox = this.el.querySelector('.onb-ctrl');
    this.ctrlBox.addEventListener('click', e => { const b = e.target.closest('[data-onb-ctrl]'); if (b){ this.controller = b.dataset.onbCtrl; this.paint(); } });
    $('onb-close').addEventListener('click', () => this.close());
    $('onb-next').addEventListener('click', () => this.close());
    $('onb-practice').addEventListener('click', () => { this.close(); this.onPractice?.(); });
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
    for (const b of document.querySelectorAll('[data-open-onboarding]')) b.addEventListener('click', e => { e.stopPropagation(); this.open(); });
  }
  get isOpen(){ return !this.el.classList.contains('hidden'); }
  open(){
    this.controller = this.getController(); this.el.classList.remove('hidden'); this.paint();
    // in campo (partita o riscaldamento) niente «Prova nel riscaldamento»
    $('onb-practice').classList.toggle('hidden', document.documentElement.classList.contains('autoplay-mode'));
    $('onb-rows').scrollTop = 0; $('onb-next').focus(); this.onOpen?.();
  }
  close(){ if (!this.isOpen) return; this.el.classList.add('hidden'); try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {} this.onClose?.(); }
  static seen(){ try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return true; } }
  key(e){
    if (e.code === 'Escape' || e.code === 'Enter'){ this.close(); return true; }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp'){ $('onb-rows').scrollBy({ top: e.code === 'ArrowDown' ? 160 : -160, behavior: 'smooth' }); return true; }
    return false;
  }
  paint(){
    const c = this.controller;
    // mouse e tastiera solo se la modalità prova è attiva
    const ctrls = CONTROLLERS.filter(([id]) => id !== 'mouse' || document.querySelector('[data-natpf-controller="mouse"]:not(.hidden)'));
    this.ctrlBox.innerHTML = ctrls.map(([id, label]) => `<button type="button" data-onb-ctrl="${id}" class="${id === c ? 'on' : ''}">${label}</button>`).join('');
    $('onb-rows').innerHTML = GUIDE.map((g, i) => `<article class="guide-row">
      ${g.clip ? clipHtml(g.clip) : `<div class="guide-clip guide-art">${g.art()}</div>`}
      <div class="guide-text"><h3><i>${i + 1}</i>${g.title}</h3>
        <p class="guide-you"><span>Tu</span><em>${g.you[c] || g.you.all}</em></p>
        <p class="guide-game"><span>In campo</span><em>${g.game}</em></p></div></article>`).join('');
  }
}

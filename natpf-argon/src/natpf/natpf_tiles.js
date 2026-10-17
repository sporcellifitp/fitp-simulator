// Tessere della lobby NATPF: racchetta (smartphone NATPF, webcam e mouse/tastiera di Argon) e visuale.
// Le stesse tessere servono nella lobby e nel pannello del Player 2.
const svg = body => `<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
export const ICONS = {
  phone: svg('<rect x="18" y="5" width="13" height="24" rx="3"/><path d="M14 27c0-3 2-4 4-4h12c3 0 5 2 4 6l-2 11c-1 3-3 4-6 4h-6c-4 0-6-2-6-5z"/><path d="M18 30h13M18 34h12"/>'),
  webcam: svg('<circle cx="24" cy="20" r="11"/><circle cx="24" cy="20" r="4"/><path d="M16 41h16M24 31v10"/>'),
  mouse: svg('<rect x="14" y="7" width="20" height="32" rx="10"/><path d="M24 7v11"/><path d="M38 32h6M41 29v6" />'),
  third: svg('<path d="M6 40 18 18h12l12 22z"/><circle cx="24" cy="34" r="3"/><path d="M24 31v-6M10 8h10v7H10zM20 10l5-2v8l-5-2"/>'),
  first: svg('<path d="M4 42 18 20h12l14 22"/><path d="M33 40c3-6 4-11 9-14M36 25a6 6 0 1 0 8 4"/><circle cx="12" cy="38" r="3"/>'),
};
export const CONTROLLER_TILES = [
  { id: 'phone', name: 'Smartphone', tag: 'NATPF', desc: 'Il telefono diventa la racchetta: impugnalo in verticale nel palmo' },
  { id: 'webcam', name: 'Webcam', tag: 'Mano libera', desc: 'La webcam segue la tua mano, senza niente da impugnare' },
  { id: 'mouse', name: 'Mouse e tastiera', tag: 'Classico', desc: 'Trascina per colpire, oppure Spazio e frecce' },
];
export const VIEW_TILES = [
  { id: 'third', name: 'Terza persona', tag: 'Camera TV', desc: 'Vedi il tuo giocatore e tutto il campo' },
  { id: 'first', name: 'Prima persona', tag: 'In campo', desc: 'Racchetta e mani davanti a te, come in un FPS' },
];

const tile = (attr, t, compact) => `<button type="button" class="lobby-tile${compact ? ' compact' : ''}" ${attr}="${t.id}" role="radio">
  ${ICONS[t.id]}<span class="tile-name">${t.name}</span><span class="tile-tag">${t.tag}</span>
  ${compact ? '' : `<span class="tile-desc">${t.desc}</span>`}<span class="tile-status" data-tile-status="${t.id}"></span></button>`;
export const controllerTiles = (compact = false) => CONTROLLER_TILES.map(t => tile('data-natpf-controller', t, compact)).join('');
export const viewTiles = (compact = false) => VIEW_TILES.map(t => tile('data-natpf-view', t, compact)).join('');

// Stato mostrato sotto ogni racchetta.
export function controllerStatus(id, { phone, webcamActive }){
  if (id === 'phone') return phone.ready ? 'Pronto ✓' : phone.connected ? 'Collegato · da calibrare' : 'Da collegare · mostra il QR';
  if (id === 'webcam') return webcamActive ? 'Attiva ✓' : 'Si accende all’inizio della partita';
  return 'Sempre disponibile';
}

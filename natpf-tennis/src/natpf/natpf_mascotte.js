// B58 · Lob e Drop a fine partita (richiesta dell'utente del 16/11/2026, docs/b58/mascotte-fine-partita.md). Nella
// schermata di fine partita, accanto al titolo («Vince Ada!», «Bella sfida, Ada!»: lo spazio libero della schermata di oggi,
// la card resta com'è), compare UNA animazione delle due mascotte, scelta a caso: fra le 10 di vittoria se chi ha giocato
// vince, fra le 10 di sconfitta se perde; mai la stessa della partita prima. Nello stesso schermo quella di vittoria (per
// chi vince); a pari niente.
// Solo FIERA (decisione dell'utente del 16/11: «aggiornare solo su fiera»): si vedono nel programma Windows
// (window.natpfDesktop) e nel server di sviluppo per le prove; il gioco nel browser (Cloudflare) non le ha e lo zip non
// porta i file (scripts/pacchetto-cloudflare.mjs).
// File: natpf-tennis/public/media/mascotte/*.webp, 320×320, 10 fotogrammi, 1,6 s in loop, fondo trasparente (ricavati
// dalle GIF con il fondo bianco, docs/b58). Prericarica: le prossime due (una di vittoria e una di sconfitta) si scelgono
// in anticipo e si caricano prima della fine della partita; a fine partita si usa quella giusta, l'altra resta prenotata.
// Con «riduci movimento» del sistema si vede il primo fotogramma fermo; se il file manca la mascotte non c'è (nessuna
// immagine rotta). Solo disegno: niente rete, niente registro dello stand, nessun effetto sul gioco.

export const MASCOT_DIR = './media/mascotte/';
export const MASCOT_KEY = 'natpf-tennis.mascotte';
const five = p => [1, 2, 3, 4, 5].map(n => `${p}-0${n}.webp`);
export const MASCOTS = Object.freeze({
  win: Object.freeze([...five('lob-win'), ...five('drop-win')]),
  lose: Object.freeze([...five('lob-lose'), ...five('drop-lose')]),
});
export const OUTCOMES = Object.freeze(['win', 'lose']);
export const mascotUrl = file => MASCOT_DIR + file;
const known = file => typeof file === 'string' && (MASCOTS.win.includes(file) || MASCOTS.lose.includes(file));
const outcomeOf = file => (MASCOTS.win.includes(file) ? 'win' : MASCOTS.lose.includes(file) ? 'lose' : null);

// Dove si vedono: programma Windows (FIERA) e server di sviluppo (prove nel browser). import.meta.env c'è solo con vite
export function mascotsOn({ desktop = globalThis.natpfDesktop, dev = !!import.meta.env?.DEV } = {}){
  return !!desktop || !!dev;
}

// Scelta a caso fra quelle dell'esito, escluse quelle in avoid (se le esclude tutte, fra tutte)
export function pickMascot(outcome, avoid = [], rnd = Math.random){
  const list = MASCOTS[outcome] || [];
  if (!list.length) return null;
  const pool = list.filter(f => !avoid.includes(f)), from = pool.length ? pool : list;
  const r = Number(rnd());
  return from[Math.min(from.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * from.length)))];
}

// Quale animazione serve, dal modello delle card (natpf_end_card.cardModel): contro la CPU e tra due computer l'esito di
// chi guarda (la prima card); nello stesso schermo quella di vittoria se c'è un solo vincitore; a pari nessuna
export function mascotOutcome(model){
  const cards = model?.cards || [];
  if (!cards.length) return null;
  if (model.split) return cards.filter(c => c.won).length === 1 ? 'win' : null;
  return cards[0].won ? 'win' : 'lose';
}

// HTML dell'animazione (dentro #victory-mascot, accanto al titolo): solo file dell'elenco
export const mascotHtml = file => (known(file) ? `<img src="${mascotUrl(file)}" alt="" decoding="async" draggable="false" data-file="${file}" data-outcome="${outcomeOf(file)}">` : '');

// Stato salvato sul computer: l'ultima mostrata e le due prenotate. Valori sconosciuti scartati
export function readState(storage = globalThis.localStorage){
  let raw = null;
  try { raw = JSON.parse(storage?.getItem(MASCOT_KEY) || 'null'); } catch { raw = null; }
  const s = raw && typeof raw === 'object' ? raw : {};
  return { last: known(s.last) ? s.last : null, win: MASCOTS.win.includes(s.win) ? s.win : null, lose: MASCOTS.lose.includes(s.lose) ? s.lose : null };
}

const browserPreload = () => {
  const held = new Map();
  return file => {
    if (held.has(file) || typeof globalThis.Image !== 'function') return;
    const img = new globalThis.Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => held.delete(file);
    held.set(file, img);
    img.src = mascotUrl(file);
  };
};

// Giro delle mascotte: prepare() prenota e carica le prossime due, take(esito) dà quella da mostrare adesso
export class MascotRotation {
  constructor({ storage = globalThis.localStorage, rnd = Math.random, preload = browserPreload() } = {}){
    this.storage = storage; this.rnd = rnd; this.preload = preload;
    this.state = readState(storage);
  }
  _save(){ try { this.storage?.setItem(MASCOT_KEY, JSON.stringify(this.state)); } catch {} }
  // prenota (se manca) una di vittoria e una di sconfitta diverse dall'ultima mostrata, e le carica
  prepare(){
    const s = this.state;
    for (const o of OUTCOMES) if (!s[o] || s[o] === s.last) s[o] = pickMascot(o, [s.last], this.rnd);
    this._save();
    for (const o of OUTCOMES) try { this.preload?.(s[o]); } catch {}
    return { win: s.win, lose: s.lose };
  }
  // quella da mostrare per l'esito: la prenotata (o una nuova), mai l'ultima mostrata; poi diventa l'ultima
  take(outcome){
    if (!OUTCOMES.includes(outcome)) return null;
    const s = this.state;
    const file = s[outcome] && s[outcome] !== s.last ? s[outcome] : pickMascot(outcome, [s.last], this.rnd);
    s.last = file; s[outcome] = null;
    this._save();
    return file;
  }
}

// Giro unico del programma (null dove le mascotte non si vedono)
let rotation;
export function mascotRotation(opts){
  if (rotation === undefined) rotation = mascotsOn(opts) ? new MascotRotation() : null;
  return rotation;
}
// «riduci movimento»: del sistema o già segnato dai ritratti (natpf_ritratti.js mette .natpf-reduce-motion)
export function reduceMotion(win = globalThis){
  try { return !!win.document?.documentElement?.classList?.contains('natpf-reduce-motion') || !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; }
}

// Dopo aver messo l'immagine nella pagina (box = #victory-mascot): se il file manca il riquadro sparisce; con «riduci
// movimento» resta fermo sul primo fotogramma (canvas al posto dell'immagine animata)
export function mountMascot(box, { reduce = false } = {}){
  const img = box?.querySelector?.('img');
  if (!img) return false;
  const gone = () => { box.classList.add('hidden'); try { box.closest?.('#victory-modal')?.classList.remove('has-mascot'); } catch {} };
  const still = () => {
    if (!reduce || !img.naturalWidth) return;
    try {
      const c = img.ownerDocument.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight; c.className = 'end-mascot-still';
      c.dataset.file = img.dataset.file || '';
      c.getContext('2d').drawImage(img, 0, 0);
      img.replaceWith(c);
    } catch {}
  };
  if (img.complete) (img.naturalWidth ? still() : gone());
  else { img.addEventListener('load', still, { once: true }); img.addEventListener('error', gone, { once: true }); }
  return true;
}

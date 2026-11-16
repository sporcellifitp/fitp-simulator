// B58 · Lob e Drop a fine partita (richiesta dell'utente del 16/11/2026, docs/b58/mascotte-fine-partita.md). Nella card
// della partita (natpf_end_card.js) la finestra del personaggio, a sinistra, mostra un'animazione delle due mascotte al
// posto del ritratto del personaggio (decisione dell'utente del 16/11, 16.10: «devono essere l'immagine del personaggio a
// sinistra, dentro la card»): di vittoria se quella card vince, di sconfitta se perde, scelta a caso fra le 10 dell'esito,
// mai una della partita prima. Contro la CPU e tra due computer una card (chi guarda); nello stesso schermo le due card,
// ciascuna con il suo esito; a pari nessuna (restano i ritratti).
// Solo FIERA (decisione dell'utente del 16/11: «aggiornare solo su fiera»): si vedono nel programma Windows
// (window.natpfDesktop) e nel server di sviluppo per le prove; il gioco nel browser (Cloudflare) non le ha e lo zip non
// porta i file (scripts/pacchetto-cloudflare.mjs, FIERA_ONLY).
// File: natpf-tennis/public/media/mascotte/*.webp, 320×320, 10 fotogrammi, 1,6 s in loop, fondo trasparente (ricavati
// dalle GIF con il fondo bianco, docs/b58). Prericarica: le prossime due (una di vittoria e una di sconfitta) si scelgono
// in anticipo e si caricano prima della fine della partita; a fine partita si usano quelle che servono, le altre restano
// prenotate. Con «riduci movimento» del sistema si vede il primo fotogramma fermo; se il file manca torna il ritratto
// (nessuna immagine rotta). Solo disegno: niente rete, niente registro dello stand, nessun effetto sul gioco.

export const MASCOT_DIR = './media/mascotte/';
export const MASCOT_KEY = 'natpf-tennis.mascotte';
const five = p => [1, 2, 3, 4, 5].map(n => `${p}-0${n}.webp`);
export const MASCOTS = Object.freeze({
  win: Object.freeze([...five('lob-win'), ...five('drop-win')]),
  lose: Object.freeze([...five('lob-lose'), ...five('drop-lose')]),
});
export const OUTCOMES = Object.freeze(['win', 'lose']);
export const mascotUrl = file => MASCOT_DIR + file;
export const knownMascot = file => typeof file === 'string' && (MASCOTS.win.includes(file) || MASCOTS.lose.includes(file));
export const mascotOutcomeOf = file => (MASCOTS.win.includes(file) ? 'win' : MASCOTS.lose.includes(file) ? 'lose' : null);

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

// Quali card ricevono un'animazione e di che esito (modello di natpf_end_card.cardModel): una per card, con l'esito della
// card; nello stesso schermo solo se c'è un vincitore (a pari restano i ritratti)
export function mascotPlan(model){
  const cards = model?.cards || [];
  if (!cards.length) return [];
  if (model.split && cards.filter(c => c.won).length !== 1) return [];
  return cards.map((c, index) => ({ index, outcome: c.won ? 'win' : 'lose' }));
}

// Modello con le animazioni sulle card del piano (files nello stesso ordine del piano; non tocca quello di partenza)
export function withMascots(model, plan, files){
  if (!model?.cards?.length || !plan?.length) return model;
  const at = new Map(plan.map((p, i) => [p.index, files?.[i]]));
  return { ...model, cards: model.cards.map((c, i) => {
    const f = at.get(i);
    return knownMascot(f) && mascotOutcomeOf(f) === (c.won ? 'win' : 'lose') ? { ...c, mascot: f } : c;
  }) };
}

// Stato salvato sul computer: quelle della partita prima e le due prenotate. Valori sconosciuti scartati (anche lo
// stato della 16.9, con una sola «last» come testo, si rilegge)
export function readState(storage = globalThis.localStorage){
  let raw = null;
  try { raw = JSON.parse(storage?.getItem(MASCOT_KEY) || 'null'); } catch { raw = null; }
  const s = raw && typeof raw === 'object' ? raw : {};
  const last = (Array.isArray(s.last) ? s.last : [s.last]).filter(knownMascot).slice(0, 4);
  return { last, win: MASCOTS.win.includes(s.win) ? s.win : null, lose: MASCOTS.lose.includes(s.lose) ? s.lose : null };
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

// Giro delle mascotte: prepare() prenota e carica le prossime due, takeFor(esiti) dà quelle da mostrare adesso
export class MascotRotation {
  constructor({ storage = globalThis.localStorage, rnd = Math.random, preload = browserPreload() } = {}){
    this.storage = storage; this.rnd = rnd; this.preload = preload;
    this.state = readState(storage);
  }
  _save(){ try { this.storage?.setItem(MASCOT_KEY, JSON.stringify(this.state)); } catch {} }
  // prenota (se manca) una di vittoria e una di sconfitta diverse da quelle della partita prima, e le carica
  prepare(){
    const s = this.state;
    for (const o of OUTCOMES) if (!s[o] || s.last.includes(s[o])) s[o] = pickMascot(o, s.last, this.rnd);
    this._save();
    for (const o of OUTCOMES) try { this.preload?.(s[o]); } catch {}
    return { win: s.win, lose: s.lose };
  }
  // quelle da mostrare per gli esiti di questa partita (una per card): prima le prenotate, mai una della partita prima
  // né due uguali nella stessa partita; poi diventano «quelle della partita prima»
  takeFor(outcomes){
    const s = this.state, out = [];
    for (const o of outcomes || []){
      if (!OUTCOMES.includes(o)){ out.push(null); continue; }
      const avoid = [...s.last, ...out];
      const f = s[o] && !avoid.includes(s[o]) ? s[o] : pickMascot(o, avoid, this.rnd);
      if (s[o] === f) s[o] = null;
      out.push(f);
    }
    const shown = out.filter(Boolean);
    if (shown.length){ s.last = shown; this._save(); }
    return out;
  }
  take(outcome){ return this.takeFor([outcome])[0]; }
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

// Dopo aver messo le card nella pagina (root = #victory-cards): se un file manca la card torna al ritratto disegnato;
// con «riduci movimento» l'animazione resta ferma sul primo fotogramma (canvas al posto dell'immagine animata)
export function mountMascots(root, { reduce = false } = {}){
  const imgs = [...(root?.querySelectorAll?.('img.card-mascot') || [])];
  for (const img of imgs){
    const gone = () => { const card = img.closest?.('.end-card'); img.remove?.(); card?.removeAttribute?.('data-mascot'); };
    const still = () => {
      if (!reduce || !img.naturalWidth) return;
      try {
        const c = img.ownerDocument.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight; c.className = 'card-mascot card-mascot-still';
        c.dataset.file = img.dataset.file || ''; c.dataset.outcome = img.dataset.outcome || '';
        c.getContext('2d').drawImage(img, 0, 0);
        img.replaceWith(c);
      } catch {}
    };
    if (img.complete) (img.naturalWidth ? still() : gone());
    else { img.addEventListener('load', still, { once: true }); img.addEventListener('error', gone, { once: true }); }
  }
  return imgs.length;
}

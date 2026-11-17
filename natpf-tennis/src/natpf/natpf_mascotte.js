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
// prenotate. Se il file manca torna il ritratto (nessuna immagine rotta). Solo disegno: niente rete, niente registro
// dello stand, nessun effetto sul gioco.
// Collaudo dell'utente del 17/11 sulla 17.1 (ledwall, stesso schermo): «uno dovrebbe essere Drop e l'altro Lob, qui hai
// messo entrambi Lob» e «ti ho chiesto esplicitamente gif e quindi immagini animate, io sul display vedo immagini
// statiche». Da allora: (1) il personaggio segue la card: Drop per chi gioca (Player 1), Lob per l'avversario (Player 2
// o CPU), come in campo con «Lob & Drop» (natpf_personaggi, LOOKS); con i personaggi classici una card sola sceglie fra
// i due, due card uno per parte. (2) Sempre animate, anche con «riduci movimento» del sistema (prima: primo fotogramma
// fermo; un PC dello stand con le animazioni di Windows spente le mostrava ferme). (3) Oltre ai 10 fotogrammi del file
// (in metà dei file si muove meno del 2% dei pixel: da lontano sembrano ferme) la figura intera si muove con i piedi:
// saltelli, passi avanti, indietro e di lato (natpf-hud.css, .card-mascot[data-move]); tre giri diversi per esito.

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
export const CHARACTERS = Object.freeze(['drop', 'lob']);
export const mascotCharacterOf = file => (knownMascot(file) ? file.split('-')[0] : null);
// giro della figura intera (natpf-hud.css): tre per esito, dal numero del file (01 e 04: a, 02 e 05: b, 03: c), così
// due animazioni di fila o le due card dello stesso schermo raramente si muovono allo stesso modo
export const MOVES = Object.freeze(['a', 'b', 'c']);
export function mascotMove(file){
  if (!knownMascot(file)) return null;
  const n = Number(file.match(/-(\d\d)\.webp$/)?.[1]) || 1;
  return MOVES[(n - 1) % MOVES.length];
}

// Dove si vedono: programma Windows (FIERA) e server di sviluppo (prove nel browser). import.meta.env c'è solo con vite
export function mascotsOn({ desktop = globalThis.natpfDesktop, dev = !!import.meta.env?.DEV } = {}){
  return !!desktop || !!dev;
}

// Scelta a caso fra quelle dell'esito (e del personaggio, se detto), escluse quelle in avoid (se le esclude tutte, fra tutte)
export function pickMascot(outcome, avoid = [], rnd = Math.random, who = null){
  const list = (MASCOTS[outcome] || []).filter(f => !who || mascotCharacterOf(f) === who);
  if (!list.length) return null;
  const pool = list.filter(f => !avoid.includes(f)), from = pool.length ? pool : list;
  const r = Number(rnd());
  return from[Math.min(from.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * from.length)))];
}

// Personaggio della card (17/11): quello in campo con «Lob & Drop» (look della card), altrimenti dal lato quando le card
// sono due (chi gioca Drop, l'avversario Lob); una card sola con i personaggi classici: tutti e due (null)
export function mascotCharacter(card, { two = false } = {}){
  if (CHARACTERS.includes(card?.look)) return card.look;
  if (!two) return null;
  return card?.side === 'opponent' ? 'lob' : 'drop';
}
// Quali card ricevono un'animazione, di che esito e di che personaggio (modello di natpf_end_card.cardModel): una per
// card, con l'esito della card; nello stesso schermo solo se c'è un vincitore (a pari restano i ritratti)
export function mascotPlan(model){
  const cards = model?.cards || [];
  if (!cards.length) return [];
  if (model.split && cards.filter(c => c.won).length !== 1) return [];
  const two = cards.length > 1;
  return cards.map((c, index) => ({ index, outcome: c.won ? 'win' : 'lose', who: mascotCharacter(c, { two }) }));
}

// Modello con le animazioni sulle card del piano (files nello stesso ordine del piano; non tocca quello di partenza)
export function withMascots(model, plan, files){
  if (!model?.cards?.length || !plan?.length) return model;
  const at = new Map(plan.map((p, i) => [p.index, { f: files?.[i], who: p.who || null }]));
  return { ...model, cards: model.cards.map((c, i) => {
    const { f, who } = at.get(i) || {};
    return knownMascot(f) && mascotOutcomeOf(f) === (c.won ? 'win' : 'lose') && (!who || mascotCharacterOf(f) === who) ? { ...c, mascot: f } : c;
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
  // quelle da mostrare per questa partita (una per card; esito, o { outcome, who } con il personaggio della card): prima
  // le prenotate se vanno bene, mai una della partita prima né due uguali nella stessa partita; poi diventano «quelle
  // della partita prima»
  takeFor(items){
    const s = this.state, out = [];
    for (const it of items || []){
      const o = typeof it === 'string' ? it : it?.outcome, who = typeof it === 'string' ? null : (CHARACTERS.includes(it?.who) ? it.who : null);
      if (!OUTCOMES.includes(o)){ out.push(null); continue; }
      const avoid = [...s.last, ...out];
      const ok = f => f && !avoid.includes(f) && (!who || mascotCharacterOf(f) === who);
      const f = ok(s[o]) ? s[o] : pickMascot(o, avoid, this.rnd, who);
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
// Dopo aver messo le card nella pagina (root = #victory-cards): se un file manca la card torna al ritratto disegnato.
// Sempre animate (17/11: niente più primo fotogramma fermo con «riduci movimento»: l'utente le vuole animate)
export function mountMascots(root){
  const imgs = [...(root?.querySelectorAll?.('img.card-mascot') || [])];
  for (const img of imgs){
    const gone = () => { const card = img.closest?.('.end-card'); img.remove?.(); card?.removeAttribute?.('data-mascot'); };
    if (img.complete){ if (!img.naturalWidth) gone(); }
    else img.addEventListener('error', gone, { once: true });
  }
  return imgs.length;
}

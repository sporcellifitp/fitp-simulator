// Personaggi in campo (B24, richiesta dell'utente dell'11/11/2026: «vorrei prevedere la possibilità di usare Lob & Drop
// come due personaggi del campo»). Scelta di chi gioca: Opzioni → «Personaggi in campo: Di sempre · Lob & Drop».
//   · «Di sempre» (di base): i tennisti di prima (Player 1 bianco, CPU blu, Player 2 con i dettagli rosa);
//   · «Lob & Drop»: le due mascotte. Chi sta dalla parte del Player 1 è Drop (blu, fascia bianca), chi sta dall'altra
//     parte (CPU o Player 2) è Lob (giallo, visiera blu, occhiali). Vale contro la CPU, nello stesso schermo e nella
//     sfida tra due computer.
// Salvata sul computer (localStorage, chiave natpf-tennis.personaggi: 'lobdrop' oppure 'sempre'). Dall'indirizzo:
// ?personaggi=lobdrop oppure ?personaggi=sempre vale per quell'avvio e non tocca il valore salvato; se poi si sceglie
// dalle Opzioni vale la scelta (e resta salvata).
// Sfida tra due computer: ogni computer disegna i personaggi secondo la SUA opzione, niente passa in rete (nessun
// messaggio nuovo, nessun campo nuovo: un computer con una versione di prima non si accorge di niente). Su tutti e due
// gli schermi Drop è il Player 1 (chi ha aperto la partita) e Lob il Player 2.
// Solo disegno: non cambia fisica, colpi, esiti, sorteggi (niente Math.random) né il riconoscimento dei gesti.
// Qui niente three.js: il modulo serve anche al menu e ai ritratti. I modelli sono in natpf_lob_drop.js.

export const CAST_KEY = 'natpf-tennis.personaggi';
export const CAST_PARAM = 'personaggi';
export const CASTS = Object.freeze(['sempre', 'lobdrop']);
export const CAST_LABEL = Object.freeze({ sempre: 'Di sempre', lobdrop: 'Lob & Drop' });
export const resolveCast = v => (CASTS.includes(v) ? v : null);

// Valore dell'indirizzo (?personaggi=): null se manca o non è uno dei due
export function castFromSearch(search = ''){
  try { return resolveCast(String(new URLSearchParams(search || '').get(CAST_PARAM) || '').toLowerCase()); } catch { return null; }
}
export function readSavedCast({ storage = globalThis.localStorage } = {}){
  try { return resolveCast(storage?.getItem(CAST_KEY)) || 'sempre'; } catch { return 'sempre'; }
}
// Scelta all'avvio: prima l'indirizzo, poi il valore salvato, altrimenti «Di sempre»
export function readCast({ storage = globalThis.localStorage, search = globalThis.location?.search } = {}){
  return castFromSearch(search) || readSavedCast({ storage });
}

// Scelta in uso: letta una volta sola (a ogni fotogramma si legge solo questa variabile)
let current = null;
export const getCast = () => current || (current = readCast());
const listeners = new Set();
export function onCastChange(fn){ listeners.add(fn); return () => listeners.delete(fn); }
// Dalle Opzioni: vale subito (i personaggi cambiano al fotogramma dopo) e resta salvata
export function setCast(value, { storage = globalThis.localStorage, save = true } = {}){
  const next = resolveCast(value) || 'sempre', changed = next !== current;
  current = next;
  if (save) try { storage?.setItem(CAST_KEY, next); } catch {}
  if (changed) for (const fn of listeners) try { fn(next); } catch (err) { console.warn('[natpf-personaggi]', err); }
  return next;
}
// Per le prove: dimentica la scelta in uso (alla prossima lettura si rilegge da indirizzo e valore salvato)
export function resetCast(){ current = null; }

// Aspetto dei due lati del campo. lato: 'player' (dalla parte del Player 1) o 'opponent' (CPU o Player 2).
const LOOKS = Object.freeze({
  sempre: Object.freeze({ cpu: Object.freeze({ player: 'p1', opponent: 'cpu' }), versus: Object.freeze({ player: 'p1', opponent: 'p2' }) }),
  lobdrop: Object.freeze({ cpu: Object.freeze({ player: 'drop', opponent: 'lob' }), versus: Object.freeze({ player: 'drop', opponent: 'lob' }) }),
});
// multiplayer: partita tra due persone (due computer o stesso schermo). Restituisce sempre lo stesso oggetto (niente
// allocazioni: si chiama a ogni fotogramma).
export function castLooks(cast = getCast(), multiplayer = false){
  return (LOOKS[cast] || LOOKS.sempre)[multiplayer ? 'versus' : 'cpu'];
}
export const castToast = cast => (cast === 'lobdrop' ? 'In campo: Lob & Drop' : 'In campo: i personaggi di sempre');

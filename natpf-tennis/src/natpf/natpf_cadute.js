// B45.1 «telefono che non si scollega» (richiesta dell'utente del 14/11: «capire quando si scollega perché lo fa»).
// Perché è caduto il collegamento di un telefono, in una parola per il registro dello stand e in una frase per lo staff;
// quante cadute oggi per posto (Telefono 1, Telefono 2) e il motivo più frequente, per la riga del pannello dello stand.
// Funzioni pure (le provano i test) più la piccola memoria della giornata nel browser (localStorage, CADUTE_KEY): resta
// anche se la pagina del gioco si ricarica e anche con il registro spento.
//
// Motivi (campo «motivo» della riga «tel» del registro: solo testi in campi già previsti, il Worker non va ricaricato):
//   silenzio                     nessun messaggio per LIFE.silentMs (10 s) né dal telefono né al telefono: Wi-Fi ferma, telefono
//                                fuori portata; «causa» dice chi se n'è accorto (computer o telefono)
//   rete cambiata                il telefono ha perso o cambiato rete (evento online/offline, tipo di rete di Chrome su
//                                Android) poco prima della caduta: dati mobili, un'altra Wi-Fi, Wi-Fi che stacca
//   telefono: pagina nascosta    la pagina del telefono era nascosta (schermo spento, altra app, tendina, chiamata)
//   telefono: pagina chiusa      la pagina del telefono è stata chiusa o ricaricata
//   ricollega                    «Ricollega»: chiesto dal gioco (causa computer: il movimento non arrivava ma il telefono
//                                rispondeva) o toccato sul telefono (causa telefono)
//   pagina del gioco ricaricata  la pagina del gioco sul computer si è ricaricata (o il programma è stato chiuso): cadono tutti
//                                i telefoni; lo dice il racconto del telefono che rientra nella pagina nuova
//   chiuso                       canale chiuso senza un motivo noto (dal telefono, o la strada diretta che il browser dà per
//                                persa)
//   telefono: scollegato         «Scollega» toccato sul telefono (staff)
//   chiosco                      solo nelle righe di prima della B45.1: il chiosco scollegava di proposito il telefono col QR
//                                (dalla B45.1 non succede più)
import { giornoDi } from './registro/registro_formato.js';

export const MOTIVI = Object.freeze(['silenzio', 'rete cambiata', 'telefono: pagina nascosta', 'telefono: pagina chiusa', 'ricollega', 'pagina del gioco ricaricata', 'chiuso', 'telefono: scollegato', 'chiosco']);
// parole per lo staff (pannello dello stand)
// (brevi: una riga intera per telefono sotto la nota del chiosco, B45.2; prima nello spazio della riga dei pulsanti in basso)
export const MOTIVO_TESTO = Object.freeze({
  silenzio: 'Wi-Fi ferma 10 s',
  'rete cambiata': 'rete cambiata',
  'telefono: pagina nascosta': 'pagina nascosta',
  'telefono: pagina chiusa': 'pagina chiusa',
  ricollega: '«Ricollega»',
  'pagina del gioco ricaricata': 'gioco ricaricato',
  chiuso: 'collegamento chiuso',
  'telefono: scollegato': '«Scollega» sul telefono',
  chiosco: 'chiosco',
});
// racconto del telefono (messaggio «dev», campo cd: link.js lo legge): parola del telefono → motivo
const TEL_W = Object.freeze({ silenzio: 'silenzio', chiuso: 'chiuso', nascosta: 'telefono: pagina nascosta', pagina: 'telefono: pagina chiusa', ricollega: 'ricollega', rete: 'rete cambiata' });
export const TEL_PAROLE = Object.freeze(Object.keys(TEL_W));

// Motivo finale di una caduta: quello visto dal computer (pc: { motivo, causa }, evento «drop» di link.js) corretto con il
// racconto del telefono (tel: { w, rete }), se c'è. Il telefono sa meglio del computer se aveva cambiato rete, se la sua
// pagina era nascosta o chiusa, se il «Ricollega» l'ha toccato lui e se il silenzio l'ha visto lui per primo.
// → { motivo, causa } (causa: 'computer' | 'telefono' | null)
export function motivoFinale(pc = null, tel = null){
  const base = { motivo: MOTIVI.includes(pc?.motivo) ? pc.motivo : 'chiuso', causa: pc?.causa === 'computer' || pc?.causa === 'telefono' ? pc.causa : null };
  if (!tel || !TEL_W[tel.w]) return base;
  if (tel.rete || tel.w === 'rete') return { motivo: 'rete cambiata', causa: 'telefono' };
  if (tel.w === 'nascosta' || tel.w === 'pagina') return { motivo: TEL_W[tel.w], causa: 'telefono' };
  if (tel.w === 'ricollega') return { motivo: 'ricollega', causa: base.motivo === 'ricollega' && base.causa === 'computer' ? 'computer' : 'telefono' };
  // il telefono ha visto il silenzio e ha chiuso: per il computer era solo «chiuso»
  if (tel.w === 'silenzio' && base.motivo === 'chiuso') return { motivo: 'silenzio', causa: 'telefono' };
  return base;
}
// Il telefono che entra in questa pagina del gioco racconta una caduta avvenuta prima che la pagina partisse (o appena
// partita): l'ha fatto cadere la pagina del gioco ricaricata o chiusa. tel.ms: età della caduta quando il telefono l'ha
// raccontata (niente orologi da allineare); now, pageStart: istanti di questa pagina (ms)
export const PAGE_GRACE_MS = 1500;
export function cadutaPrimaDellaPagina({ tel = null, now = 0, pageStart = 0 } = {}){
  return !!tel && Number.isFinite(tel.ms) && tel.ms >= 0 && now - tel.ms <= pageStart + PAGE_GRACE_MS;
}

/* ---------- cadute di oggi, per posto ---------- */
export const CADUTE_KEY = 'natpf-tennis.cadute';
export const SLOTS = Object.freeze(['p1', 'p2']);
const vuoto = giorno => ({ giorno, p1: { n: 0, m: {} }, p2: { n: 0, m: {} } });
// stato della giornata (oggetto semplice): un giorno nuovo riparte da zero
export function cadutePulite(v, giorno){
  if (!v || typeof v !== 'object' || v.giorno !== giorno) return vuoto(giorno);
  const out = vuoto(giorno);
  for (const s of SLOTS){
    const x = v[s]; if (!x || typeof x !== 'object') continue;
    out[s].n = Number.isInteger(x.n) && x.n > 0 ? x.n : 0;
    for (const [k, c] of Object.entries(x.m || {})) if (MOTIVI.includes(k) && Number.isInteger(c) && c > 0) out[s].m[k] = c;
  }
  return out;
}
// una caduta in più per quel posto e quel motivo (pura: restituisce lo stato nuovo)
export function contaCaduta(stato, slot, motivo){
  const s = SLOTS.includes(slot) ? slot : 'p1', m = MOTIVI.includes(motivo) ? motivo : 'chiuso';
  const out = cadutePulite(stato, stato?.giorno), x = out[s];
  x.n++; x.m[m] = (x.m[m] || 0) + 1;
  return out;
}
// il motivo di una caduta già contata si è chiarito (racconto del telefono): un conto passa da un motivo all'altro
export function correggiCaduta(stato, slot, prima, dopo){
  const s = SLOTS.includes(slot) ? slot : 'p1', out = cadutePulite(stato, stato?.giorno), x = out[s];
  if (prima === dopo || !MOTIVI.includes(dopo) || !(x.m[prima] > 0)) return out;
  x.m[prima]--; if (!x.m[prima]) delete x.m[prima];
  x.m[dopo] = (x.m[dopo] || 0) + 1;
  return out;
}
// motivo più frequente (a parità: il primo nell'ordine di MOTIVI, che mette prima le cause di rete)
export function motivoFrequente(m = {}){
  let best = null, n = 0;
  for (const k of MOTIVI) if ((m[k] || 0) > n){ best = k; n = m[k]; }
  return best;
}
// riga del pannello dello stand: «Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s», una riga per telefono
// (a capo tra le due); un posto senza cadute non compare, '' se nessuno è caduto
export function rigaCadute(stato){
  const parts = [];
  for (const s of SLOTS){
    const x = stato?.[s]; if (!x?.n) continue;
    const top = motivoFrequente(x.m);
    parts.push(`Telefono ${s === 'p2' ? 2 : 1}: ${x.n} ${x.n === 1 ? 'caduta' : 'cadute'} oggi${top ? ` · motivo più frequente: ${MOTIVO_TESTO[top]}` : ''}`);
  }
  return parts.join('\n');
}
// memoria della giornata nel browser (storage sostituibile nelle prove)
export function leggiCadute(storage = globalThis.localStorage, giorno = giornoDi()){
  let v = null; try { v = JSON.parse(storage?.getItem?.(CADUTE_KEY) || 'null'); } catch {}
  return cadutePulite(v, giorno);
}
export function scriviCadute(stato, storage = globalThis.localStorage){ try { storage?.setItem?.(CADUTE_KEY, JSON.stringify(stato)); } catch {} return stato; }
export function segnaCaduta(slot, motivo, { storage = globalThis.localStorage, giorno = giornoDi() } = {}){
  return scriviCadute(contaCaduta(leggiCadute(storage, giorno), slot, motivo), storage);
}
export function chiarisciCaduta(slot, prima, dopo, { storage = globalThis.localStorage, giorno = giornoDi() } = {}){
  return scriviCadute(correggiCaduta(leggiCadute(storage, giorno), slot, prima, dopo), storage);
}

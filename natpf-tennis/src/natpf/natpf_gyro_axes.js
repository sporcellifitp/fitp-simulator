// B74 · «Assi del giroscopio: Come oggi · Corretti (prova)», interruttore dello staff nel pannello dello stand
// (docs/b74/verifica-assi.md, docs/b74/assi-giroscopio.md; decisione dell'utente del 20/11: «Verifica e correzione spenta»).
//
// Chrome su Android (e l'app NATPF Racchetta 1.0.5) manda la rotazione del giroscopio con α attorno a x, β attorno a y, γ
// attorno a z; il codice del telefono la legge nell'ordine del W3C (α attorno a z). La verifica del B74 sui campioni veri lo
// conferma (gravità ruotata con il giroscopio: 5,2° di errore con l'ordine di Chrome, 20,7° con quello del codice).
//   • «Come oggi» (di base): il gioco di sempre, identico. Il computer non manda niente di nuovo al telefono.
//   • «Corretti (prova)»: il computer manda ax 1 nella configurazione del telefono (cfg); un telefono Android riordina la
//     rotazione all'ingresso (site/js/tennis/motion-sign.js) e rifà la calibrazione (con «Giocando» il profilo semplice
//     arriva subito). iPhone e gli altri restano com'erano. Le soglie dei colpi (tarate sui numeri di oggi) non cambiano.
//     DA PROVARE sul telefono vero prima di accenderla per tutti (docs/b74/assi-giroscopio.md §3).
// Dove si cambia: pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows, 3 s sul marchio NATPF del menu, ❚❚ tenuto
// 3 s in campo) → «Assi del giroscopio». Resta salvata (localStorage, chiave natpf-tennis.assiGiroscopio: 'oggi' |
// 'corretti'; senza chiave «Come oggi»); il chiosco e «Nuovo giocatore» non la toccano (è dello stand). Vale subito: i
// telefoni collegati la ricevono (natpf_phone_racket.update) e quelli che cambiano ordine rifanno la calibrazione; nel
// registro la riga «partita» la scrive (stand.assi, tel.assi: registro_registratore.js).
export const AXES_MODES = Object.freeze(['oggi', 'corretti']);
export const AXES_DEFAULT = 'oggi';
export const AXES_KEY = 'natpf-tennis.assiGiroscopio';
export const axesModeFrom = v => (AXES_MODES.includes(v) ? v : AXES_DEFAULT);
export function readAxesMode({ storage = globalThis.localStorage } = {}){
  try { return axesModeFrom(storage?.getItem(AXES_KEY)); } catch { return AXES_DEFAULT; }
}
export function writeAxesMode(mode, { storage = globalThis.localStorage } = {}){
  const v = axesModeFrom(mode);
  try { storage?.setItem(AXES_KEY, v); } catch {}
  return v;
}
export const nextAxesMode = mode => (axesModeFrom(mode) === 'corretti' ? 'oggi' : 'corretti');
// interruttore acceso adesso (il computer lo manda ai telefoni come ax 1)
export const axesOn = ({ storage = globalThis.localStorage } = {}) => readAxesMode({ storage }) === 'corretti';

// pannello dello stand: scritta del pulsante e avviso dopo il clic (funzioni pure)
export const axesButton = mode => (axesModeFrom(mode) === 'corretti' ? 'Corretti · prova' : 'Come oggi');
export const axesToast = mode => (axesModeFrom(mode) === 'corretti'
  ? 'Assi del giroscopio: Corretti (prova). Solo i telefoni Android, che rifanno la calibrazione; iPhone come prima. Da provare sul telefono vero; resta salvata'
  : 'Assi del giroscopio: Come oggi, come sempre (i telefoni Android collegati rifanno la calibrazione); resta salvata');

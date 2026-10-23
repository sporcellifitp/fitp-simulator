// Figura dell'impugnatura del telefono (segnalazione del 23/10, sera: «la figura non è chiara, devo capire esattamente
// come tenere il telefono in mano e con quale orientamento»). Prima un rettangolo stretto con una macchia per la mano e
// una freccia, e nella guida il telefono con il display verso chi guarda, il contrario della presa chiesta.
// Tre viste della mano destra con il telefono come il manico di una racchetta:
//   • di lato: si vede il display, che guarda a destra o a sinistra; la cima del telefono (fotocamera) in alto, un
//     poco in avanti verso lo schermo; le dita chiuse attorno ai lati lunghi;
//   • dallo schermo (come ti vede il computer): del telefono si vede solo il bordo stretto, che spunta dal pugno;
//   • così no: il telefono piatto con il display verso lo schermo (o verso di sé).
// Una sola figura per il computer (pannello del telefono, guida) e per la pagina del telefono. Senza DOM: una stringa.
const C = Object.freeze({ ink: '#0b1433', dev: '#dfe6ff', scr: '#2f6bff', skin: '#f0c7a0', crease: '#b9875f', accent: '#e8ff3a', ok: '#2bd36b', no: '#ff4d5e' });
const line = `stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"`;
// schermo del computer, nel colore del testo (si vede su fondo chiaro e scuro)
const monitor = (x, y) => `<g transform="translate(${x} ${y})" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"><rect x="-12" y="-9" width="24" height="16" rx="2.5"/><path d="M-5 11 h10 M0 7 v4"/></g>`;
const text = (x, y, t, size = 10, weight = 700, fill = 'currentColor') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="inherit">${t}</text>`;
const tick = (x, y) => `<path d="M${x} ${y} l4 4 8 -10" stroke="${C.ok}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DI LATO (visto dalla tua destra, lo schermo è a destra): il display guarda verso chi osserva, la cima del telefono in alto
// e un poco in avanti; il pugno con il dorso della mano, le nocche davanti e il pollice sopra; l'avambraccio va indietro
const side = cx => `<g transform="translate(${cx} 84) rotate(14)"><rect x="-11" y="-62" width="22" height="92" rx="5" fill="${C.dev}" ${line}/><rect x="-8" y="-56" width="16" height="78" rx="2.5" fill="${C.scr}"/><circle cx="0" cy="-59" r="1.6" fill="${C.ink}"/></g>
  <path d="M${cx - 12} 116 L${cx - 30} 150 H${cx - 4} L${cx + 8} 122 Z" fill="${C.skin}" ${line}/>
  <rect x="${cx - 22}" y="86" width="44" height="38" rx="12" fill="${C.skin}" ${line}/>
  <path d="M${cx + 22} 92 q5 4 0 8 M${cx + 22} 101 q5 4 0 8 M${cx + 22} 110 q5 4 0 8" fill="none" ${line}/>
  <path d="M${cx - 14} 100 h22 M${cx - 14} 110 h20" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 20} 92 q2 -12 22 -12 h10 q8 0 7 6 q-1 5 -9 5 h-12 q-14 0 -18 1z" fill="${C.skin}" ${line}/>
  ${monitor(cx + 38, 20)}<path d="M${cx + 18} 20 h6 M${cx + 21} 16 l4 4 -4 4" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DALLO SCHERMO (come ti vede il computer): del telefono solo il bordo stretto, che spunta dal pugno; le dita chiuse
// attorno ai lati lunghi, il pollice sopra
const front = cx => `<rect x="${cx - 4.5}" y="22" width="9" height="92" rx="3" fill="${C.dev}" ${line}/><rect x="${cx + 1.5}" y="28" width="1.6" height="76" rx=".8" fill="${C.scr}"/>
  <rect x="${cx - 11}" y="118" width="22" height="32" fill="${C.skin}" ${line}/>
  <rect x="${cx - 22}" y="86" width="44" height="38" rx="12" fill="${C.skin}" ${line}/>
  <path d="M${cx - 18} 98 h16 M${cx - 18} 106 h16 M${cx - 18} 114 h15" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 20} 92 q4 -11 24 -10 h6 q8 0 7 6 q-1 5 -9 5 h-10 q-14 0 -18 -1z" fill="${C.skin}" ${line}/>`;
// COSÌ NO: piatto, con il display verso lo schermo (o verso di te)
const no = cx => `<rect x="${cx - 20}" y="34" width="40" height="76" rx="7" fill="${C.dev}" ${line}/><rect x="${cx - 15}" y="40" width="30" height="62" rx="3" fill="${C.scr}" opacity=".9"/>
  <path d="M${cx - 27} 38 L${cx + 27} 106 M${cx + 27} 38 L${cx - 27} 106" stroke="${C.no}" stroke-width="6" stroke-linecap="round"/>`;

// compact: solo le due viste giuste (spazi piccoli)
export function gripSvg({ cls = 'natpf-grip-art', compact = false, id = '' } = {}){
  const W = compact ? 220 : 330;
  const aria = 'Impugnatura: il telefono in piedi nel pugno come il manico di una racchetta, la cima in alto e un poco in avanti, il display che guarda a destra o a sinistra; dallo schermo si vede solo il bordo stretto. Non tenerlo piatto con il display verso lo schermo o verso di te.';
  const parts = [side(55), tick(10, 22), text(55, 176, 'DI LATO'), text(55, 190, 'display a destra o a sinistra', 7.5, 500),
    front(165), tick(128, 22), text(165, 176, 'DALLO SCHERMO'), text(165, 190, 'si vede solo il bordo', 7.5, 500)];
  if (!compact) parts.push(no(275), text(275, 176, 'COSÌ NO', 10, 700, C.no), text(275, 190, 'display verso lo schermo', 7.5, 500));
  return `<svg ${id ? `id="${id}" ` : ''}class="${cls}" viewBox="0 0 ${W} 196" role="img" aria-label="${aria}">${parts.join('')}</svg>`;
}
// la presa in parole (stessa cosa della figura), per i pannelli e la guida
export const GRIP_TEXT = 'Telefono <b>in piedi nel pugno</b>, come il manico di una racchetta: la cima in alto, un poco in avanti; il <b>display di lato</b> (a destra o a sinistra); dallo schermo si vede solo il bordo.';
export const GRIP_TEXT_PLAIN = GRIP_TEXT.replace(/<\/?b>/g, '');

// Figura dell'impugnatura del telefono. Presa di riferimento dal 29/10 (scelta dell'utente): impugnatura a martello. Il
// pugno stringe la base del telefono come il manico di un martello e il telefono prosegue in avanti dall'avambraccio:
// cima verso lo schermo e un poco in alto, bordo stretto in alto, display di lato. Le prese di prima (in piedi nel pugno;
// base nel palmo con lo schermo in alto) restano riconosciute, ma non si insegnano più.
// Due viste della mano destra:
//   • di lato (lo schermo del computer a destra): avambraccio, pugno, il telefono in avanti; si vede il display;
//   • da dietro (come la vede chi gioca): dal pugno esce il bordo stretto del telefono, che punta verso lo schermo.
// Una sola figura per il computer (pannello del telefono, guida) e per la pagina del telefono. Senza DOM: una stringa.
const C = Object.freeze({ ink: '#0b1433', dev: '#dfe6ff', scr: '#2f6bff', skin: '#f0c7a0', crease: '#b9875f', accent: '#e8ff3a', ok: '#2bd36b', no: '#ff4d5e' });
const line = `stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"`;
// schermo del computer, nel colore del testo (si vede su fondo chiaro e scuro)
const monitor = (x, y) => `<g transform="translate(${x} ${y})" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"><rect x="-12" y="-9" width="24" height="16" rx="2.5"/><path d="M-5 11 h10 M0 7 v4"/></g>`;
const text = (x, y, t, size = 10, weight = 700, fill = 'currentColor') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="inherit">${t}</text>`;
const tick = (x, y) => `<path d="M${x} ${y} l4 4 8 -10" stroke="${C.ok}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DI LATO (visto dalla tua destra, lo schermo del computer è a destra): avambraccio da dietro, pugno con il pollice
// sopra, telefono in avanti appena sopra l'orizzontale; il display guarda verso chi osserva
const side = cx => `<path d="M${cx - 50} 142 L${cx - 24} 116 L${cx - 12} 128 L${cx - 38} 154 Z" fill="${C.skin}" ${line}/>
  <g transform="translate(${cx - 14} 104) rotate(-8)"><rect x="0" y="-11" width="64" height="22" rx="5" fill="${C.dev}" ${line}/><rect x="6" y="-8" width="54" height="16" rx="2.5" fill="${C.scr}"/><circle cx="61" cy="0" r="1.6" fill="${C.ink}"/></g>
  <rect x="${cx - 32}" y="94" width="38" height="36" rx="12" fill="${C.skin}" ${line}/>
  <path d="M${cx - 28} 108 h28 M${cx - 28} 118 h26" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 26} 96 q6 -8 24 -8 q7 0 6 5 q-1 4 -7 4 l-20 3 z" fill="${C.skin}" ${line}/>
  ${monitor(cx + 34, 22)}<path d="M${cx + 8} 76 l10 -10 M${cx + 18} 66 v8 M${cx + 18} 66 h-8" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DA DIETRO (come la vedi tu): dal pugno esce il bordo stretto del telefono, in alto, che punta verso lo schermo
const front = cx => `${monitor(cx, 20)}
  <path d="M${cx - 4} 52 L${cx + 4} 52 L${cx + 7} 116 L${cx - 7} 116 Z" fill="${C.dev}" ${line}/>
  <path d="M${cx + 1.5} 56 L${cx + 3} 56 L${cx + 5} 112 L${cx + 2.5} 112 Z" fill="${C.scr}"/>
  <rect x="${cx - 24}" y="104" width="48" height="40" rx="13" fill="${C.skin}" ${line}/>
  <path d="M${cx - 20} 118 h32 M${cx - 20} 128 h30 M${cx - 20} 137 h28" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 22} 108 q4 -10 20 -10 h6 q8 0 7 6 q-1 5 -9 5 h-8 q-12 0 -16 -1z" fill="${C.skin}" ${line}/>
  <path d="M${cx - 12} 144 L${cx - 16} 176 H${cx + 16} L${cx + 12} 144 Z" fill="${C.skin}" ${line}/>`;

// compact: una sola dimensione (spazi piccoli); le viste sono sempre due
export function gripSvg({ cls = 'natpf-grip-art', compact = false, id = '', hand = 'right' } = {}){
  const W = 220;
  const aria = 'Impugnatura a martello: il pugno stringe la base del telefono come il manico di un martello, la cima punta in avanti verso lo schermo, il bordo stretto in alto e il display di lato.';
  const draw = (shape, cx) => hand === 'left' ? `<g transform="translate(${2*cx} 0) scale(-1 1)">${shape}</g>` : shape;
  const parts = [draw(side(52), 52), tick(36, 22), text(52, 186, 'DI LATO'), text(52, 197, 'cima in avanti, display di lato', 7.5, 500),
    draw(front(165), 165), tick(128, 22), text(165, 186, 'DA DIETRO'), text(165, 197, 'bordo stretto in alto', 7.5, 500)];
  return `<svg ${id ? `id="${id}" ` : ''}class="${cls}" data-hand="${hand === 'left' ? 'left' : 'right'}" viewBox="0 0 ${W} 200" role="img" aria-label="${hand === 'left' ? 'Mano sinistra. ' : 'Mano destra. '}${aria}">${parts.join('')}</svg>`;
}
// la presa in parole (stessa cosa della figura), per i pannelli e la guida
export const GRIP_TEXT = 'Impugnatura a martello: <b>stringi la base del telefono nel pugno</b>, come il manico di un martello. La <b>cima punta in avanti</b>, verso lo schermo, con il <b>bordo stretto in alto</b> e il display di lato. Calibra e gioca con la stessa presa.';
export const GRIP_TEXT_PLAIN = GRIP_TEXT.replace(/<\/?b>/g, '');

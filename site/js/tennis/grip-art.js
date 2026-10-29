// Figura dell'impugnatura del telefono. Presa di riferimento dal 29/10 (foto dell'utente): base del telefono nel palmo
// come il manico di una racchetta, cima che punta in avanti verso lo schermo e un poco in alto, schermo che guarda in alto
// (verso chi gioca). Prima: in piedi nel pugno con il display di lato (il riconoscimento la regge ancora).
// Due viste della mano destra:
//   • di lato (lo schermo del computer a destra): avambraccio, mano che stringe la base, telefono inclinato in avanti, il
//     display sopra;
//   • da dietro (come la vede chi gioca): il telefono punta verso lo schermo e si vede il display.
// Una sola figura per il computer (pannello del telefono, guida) e per la pagina del telefono. Senza DOM: una stringa.
const C = Object.freeze({ ink: '#0b1433', dev: '#dfe6ff', scr: '#2f6bff', skin: '#f0c7a0', crease: '#b9875f', accent: '#e8ff3a', ok: '#2bd36b', no: '#ff4d5e' });
const line = `stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"`;
// schermo del computer, nel colore del testo (si vede su fondo chiaro e scuro)
const monitor = (x, y) => `<g transform="translate(${x} ${y})" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"><rect x="-12" y="-9" width="24" height="16" rx="2.5"/><path d="M-5 11 h10 M0 7 v4"/></g>`;
const text = (x, y, t, size = 10, weight = 700, fill = 'currentColor') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="inherit">${t}</text>`;
const tick = (x, y) => `<path d="M${x} ${y} l4 4 8 -10" stroke="${C.ok}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DI LATO (visto dalla tua destra, lo schermo del computer è a destra): avambraccio da dietro, mano che stringe la base
// con il pollice sopra, telefono inclinato in avanti di circa 25° sopra l'orizzontale con il display verso l'alto
const side = cx => `<path d="M${cx - 50} 150 L${cx - 22} 122 L${cx - 10} 134 L${cx - 36} 160 Z" fill="${C.skin}" ${line}/>
  <g transform="translate(${cx - 12} 118) rotate(-25)"><rect x="-6" y="-6" width="74" height="12" rx="4" fill="${C.dev}" ${line}/><rect x="2" y="-6" width="64" height="3.4" rx="1.4" fill="${C.scr}"/></g>
  <rect x="${cx - 30}" y="104" width="36" height="32" rx="11" fill="${C.skin}" ${line}/>
  <path d="M${cx - 26} 116 h26 M${cx - 26} 125 h24" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 22} 106 q6 -9 22 -12 q6 -1 6 4 q0 4 -6 5 l-18 6 z" fill="${C.skin}" ${line}/>
  ${monitor(cx + 34, 22)}<path d="M${cx + 4} 64 l8 -8 M${cx + 12} 56 v7 M${cx + 12} 56 h-7" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// DA DIETRO (come la vedi tu): il telefono punta verso lo schermo, il display si vede; la mano stringe la base
const front = cx => `${monitor(cx, 20)}
  <path d="M${cx - 14} 44 L${cx + 14} 44 L${cx + 24} 128 L${cx - 24} 128 Z" fill="${C.dev}" ${line}/>
  <path d="M${cx - 10} 49 L${cx + 10} 49 L${cx + 19} 124 L${cx - 19} 124 Z" fill="${C.scr}"/>
  <rect x="${cx - 30}" y="112" width="60" height="34" rx="13" fill="${C.skin}" ${line}/>
  <path d="M${cx + 26} 120 q10 -12 4 -30 q-2 -5 -7 -2 q-4 2 -3 7 l2 22 z" fill="${C.skin}" ${line}/>
  <path d="M${cx - 24} 126 h40 M${cx - 24} 135 h38" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${cx - 12} 146 L${cx - 18} 176 H${cx + 18} L${cx + 12} 146 Z" fill="${C.skin}" ${line}/>`;

// compact: una sola dimensione (spazi piccoli); le viste sono sempre due
export function gripSvg({ cls = 'natpf-grip-art', compact = false, id = '', hand = 'right' } = {}){
  const W = 220;
  const aria = 'Impugnatura: la base del telefono nel palmo come il manico di una racchetta, la cima che punta in avanti verso lo schermo e un poco in alto, lo schermo che guarda in alto, verso di te.';
  const draw = (shape, cx) => hand === 'left' ? `<g transform="translate(${2*cx} 0) scale(-1 1)">${shape}</g>` : shape;
  const parts = [draw(side(52), 52), tick(36, 22), text(52, 186, 'DI LATO'), text(52, 197, 'schermo verso l’alto', 7.5, 500),
    draw(front(165), 165), tick(128, 22), text(165, 186, 'DA DIETRO'), text(165, 197, 'cima verso lo schermo', 7.5, 500)];
  return `<svg ${id ? `id="${id}" ` : ''}class="${cls}" data-hand="${hand === 'left' ? 'left' : 'right'}" viewBox="0 0 ${W} 200" role="img" aria-label="${hand === 'left' ? 'Mano sinistra. ' : 'Mano destra. '}${aria}">${parts.join('')}</svg>`;
}
// la presa in parole (stessa cosa della figura), per i pannelli e la guida
export const GRIP_TEXT = 'La <b>base del telefono nel palmo</b>, come il manico di una racchetta. La <b>cima punta in avanti</b>, verso lo schermo e un poco in alto; lo <b>schermo guarda in alto</b>, verso di te. Calibra e gioca con la stessa presa.';
export const GRIP_TEXT_PLAIN = GRIP_TEXT.replace(/<\/?b>/g, '');

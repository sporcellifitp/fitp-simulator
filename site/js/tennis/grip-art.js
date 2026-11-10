// Figura e testi dell'impugnatura del telefono, con UN interruttore per tutta l'interfaccia (computer e telefono).
// Presa di riferimento dal 04/11/2026 (scelta dell'utente, foto docs/riferimenti/presa-palmo-utente-2026-11-04.webp):
// PRESA NEL PALMO. Il telefono appoggia nel palmo con lo schermo verso chi gioca, le dita avvolgono la parte bassa, il
// pollice resta sul bordo; la cima è inclinata in avanti (verso lo schermo, ~40°) e un poco verso l'interno (~35°).
// Fino al 04/11 la presa insegnata era l'impugnatura a martello (pugno sulla base, cima in avanti, display di lato).
// ROLLBACK (su richiesta dell'utente): GRIP_STYLE = 'martello'. Cambiano insieme foto, figura, testi della guida, della
// calibrazione e della lezione, e la posa del telefono nell'animazione 3D (natpf_gesture_motion.GRIP_POSE). Il
// riconoscimento dei colpi non dipende dalla presa insegnata (test natpf-gesture-demo: tutte e due le prese).
// Una sola figura per il computer (pannello del telefono, guida) e per la pagina del telefono. Senza DOM: una stringa.
// Dal 09/11/2026 (B17.1, foto dell'utente docs/riferimenti/presa-utente-2026-11-09-*.webp, docs/b17/presa-foto.md):
// PRESA A RACCHETTA. Il telefono è disteso lungo l'avambraccio come il manico di una racchetta, cima in avanti verso lo
// schermo di gioco e alzata di 15–25°, dorso sul palmo, quattro dita attorno al bordo lungo inferiore, pollice disteso
// lungo il bordo lungo superiore, polso dritto; lo schermo guarda lo schermo di gioco. «palmo» e «martello» restano come
// rollback (GRIP_STYLE = 'palmo' o 'martello').
export const GRIP_STYLES = Object.freeze(['racchetta', 'palmo', 'martello']);
export const GRIP_STYLE = 'racchetta';
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

// PRESA NEL PALMO, DI FRONTE (come la vedi tu): il telefono con lo schermo verso di te, la cima inclinata verso l'interno;
// il palmo dietro la parte bassa, le dita attorno al bordo sinistro, il pollice sul bordo destro, l'avambraccio in basso
const palmFront = cx => `${monitor(cx, 20)}
  <g transform="translate(${cx} 106) rotate(-35)">
    <path d="M-8 30 L8 30 L12 62 L-12 62 Z" fill="${C.skin}" ${line}/>
    <ellipse cx="2" cy="26" rx="21" ry="14" fill="${C.skin}" ${line}/>
    <rect x="-17" y="-34" width="34" height="64" rx="6" fill="${C.dev}" ${line}/>
    <rect x="-14" y="-30" width="28" height="56" rx="3" fill="${C.scr}"/>
    <circle cx="0" cy="-6" r="8" fill="none" stroke="${C.ok}" stroke-width="2.4"/>
    <rect x="-23" y="4" width="13" height="7" rx="3.5" fill="${C.skin}" ${line}/>
    <rect x="-23" y="12" width="13" height="7" rx="3.5" fill="${C.skin}" ${line}/>
    <rect x="-22" y="20" width="12" height="7" rx="3.5" fill="${C.skin}" ${line}/>
    <rect x="12" y="-16" width="9" height="26" rx="4.5" fill="${C.skin}" ${line}/>
  </g>`;
// PRESA NEL PALMO, DI LATO (visto dalla tua destra, lo schermo del computer è a destra): la cima in avanti verso lo
// schermo, lo schermo del telefono guarda te e un poco in alto; il palmo dietro, il pollice sul bordo
const palmSide = cx => `<g transform="translate(${cx - 4} 112) rotate(40)">
    <path d="M6 22 L-14 52 L-24 46 L-4 18 Z" fill="${C.skin}" ${line}/>
    <rect x="-4" y="-38" width="9" height="66" rx="3" fill="${C.dev}" ${line}/>
    <rect x="-4" y="-34" width="2.6" height="58" fill="${C.scr}"/>
    <rect x="4" y="-4" width="12" height="30" rx="6" fill="${C.skin}" ${line}/>
    <rect x="-9" y="-10" width="8" height="18" rx="4" fill="${C.skin}" ${line}/>
  </g>
  ${monitor(cx + 34, 22)}<path d="M${cx + 8} 76 l10 -10 M${cx + 18} 66 v8 M${cx + 18} 66 h-8" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

// PRESA A RACCHETTA, DI LATO (visto dalla tua destra, lo schermo del computer è a destra): l'avambraccio arriva da
// sinistra, il pugno con il pollice disteso sopra, il telefono prosegue in avanti alzato di ~20°, bordo lungo in alto; si
// vede il dorso (fotocamere) perché lo schermo guarda avanti e un poco a sinistra
const racketSide = cx => `<path d="M${cx - 62} 118 L${cx - 30} 112 L${cx - 30} 134 L${cx - 62} 140 Z" fill="${C.skin}" ${line}/>
  <g transform="translate(${cx - 12} 112) rotate(-20)">
    <rect x="-4" y="-7" width="76" height="14" rx="4" fill="${C.dev}" ${line}/>
    <rect x="52" y="-4" width="12" height="8" rx="2" fill="${C.ink}"/><circle cx="56" cy="-1" r="1.4" fill="${C.dev}"/><circle cx="60" cy="1" r="1.4" fill="${C.dev}"/>
    <rect x="-2" y="-10" width="30" height="7" rx="3.5" fill="${C.skin}" ${line}/>
  </g>
  <rect x="${cx - 34}" y="104" width="30" height="36" rx="11" fill="${C.skin}" ${line}/>
  <path d="M${cx - 30} 118 h22 M${cx - 30} 128 h20" stroke="${C.crease}" stroke-width="2.2" stroke-linecap="round"/>
  ${monitor(cx + 34, 22)}<path d="M${cx + 8} 76 l10 -10 M${cx + 18} 66 v8 M${cx + 18} 66 h-8" stroke="${C.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// PRESA A RACCHETTA, DI FRONTE (come la vede lo schermo di gioco, davanti a te: la tua destra è a sinistra): il telefono in
// orizzontale con lo schermo verso chi guarda, la cima a sinistra e un poco in alto; le dita avvolgono il bordo lungo in
// basso (polpastrelli sul bordo del vetro), il pollice disteso lungo il bordo in alto, il polso dietro la base
const racketFront = cx => `${monitor(cx, 20)}
  <g transform="translate(${cx} 112) rotate(-12)">
    <path d="M26 6 L54 20 L48 34 L22 20 Z" fill="${C.skin}" ${line}/>
    <ellipse cx="22" cy="12" rx="18" ry="16" fill="${C.skin}" ${line}/>
    <rect x="-44" y="-21" width="84" height="42" rx="6" fill="${C.dev}" ${line}/>
    <rect x="-40" y="-17" width="76" height="34" rx="3" fill="${C.scr}"/>
    <circle cx="-34" cy="-11" r="1.6" fill="${C.ink}"/>
    <circle cx="-2" cy="0" r="9" fill="none" stroke="${C.ok}" stroke-width="2.4"/>
    <rect x="-16" y="14" width="8" height="14" rx="4" fill="${C.skin}" ${line}/>
    <rect x="-5" y="15" width="8" height="14" rx="4" fill="${C.skin}" ${line}/>
    <rect x="6" y="15" width="8" height="13" rx="4" fill="${C.skin}" ${line}/>
    <rect x="17" y="14" width="7" height="12" rx="3.5" fill="${C.skin}" ${line}/>
    <rect x="-12" y="-27" width="40" height="9" rx="4.5" fill="${C.skin}" ${line}/>
  </g>`;

// Profili della presa: testi (guida, pannelli, telefono), figura e didascalie delle due viste
export const GRIPS = Object.freeze({
  racchetta: Object.freeze({
    name: 'Presa a racchetta',
    text: 'Presa a racchetta: <b>telefono disteso nel palmo, lungo l’avambraccio</b>, <b>cima in avanti</b> verso lo schermo di gioco e un poco in alto. <b>Dita sotto, attorno al bordo</b>; <b>pollice disteso lungo il bordo</b>; lo schermo guarda lo schermo di gioco. Stessa presa per calibrare e giocare.',
    short: 'Disteso nel palmo come un manico, cima in avanti',
    aria: 'Presa a racchetta: il telefono disteso lungo l’avambraccio come il manico di una racchetta, la cima in avanti verso lo schermo di gioco e un poco in alto, le quattro dita attorno al bordo lungo inferiore, il pollice disteso lungo il bordo superiore, lo schermo verso lo schermo di gioco.',
    views: [[racketSide, 'DI LATO', 'cima in avanti, un poco in alto'], [racketFront, 'DI FRONTE', 'schermo verso lo schermo di gioco']],
    photo: { file: 'presa-racchetta-davanti.webp', alt: 'Presa a racchetta vista dallo schermo di gioco: il telefono disteso nel palmo lungo l’avambraccio, cima in avanti, dita attorno al bordo inferiore, pollice lungo il bordo superiore, schermo in vista' },
    ui: {
      connectTitle: 'Tieni il telefono come un manico',
      connectHint: 'Disteso nel palmo lungo l’avambraccio, cima in avanti, pollice lungo il bordo, schermo verso lo schermo di gioco. Poi si va in campo da soli.',
      split: 'Presa a racchetta: telefono disteso nel palmo, cima in avanti, schermo verso lo schermo di gioco.',
      still: 'Fermo, disteso nel palmo con la cima in avanti: misuro i sensori',
      stillMoved: 'Si è mosso: fermo ancora un attimo',
      lessonGrip: 'Telefono disteso nel palmo, cima in avanti. Dita sotto, attorno al bordo. Pollice lungo il bordo, schermo verso lo schermo di gioco.',
      lessonHand: 'Il telefono prosegue l’avambraccio come un manico, pollice in alto, polso dritto. Con quale mano giochi?',
    },
  }),
  palmo: Object.freeze({
    name: 'Presa nel palmo',
    text: 'Presa nel palmo: <b>appoggia il telefono nel palmo</b>, <b>schermo verso di te</b>. Dita attorno alla parte bassa, pollice sul bordo. <b>Cima inclinata in avanti</b>, verso lo schermo. Stessa presa per calibrare e giocare.',
    short: 'Nel palmo, schermo verso di te, cima in avanti',
    aria: 'Presa nel palmo: il telefono appoggiato nel palmo con lo schermo verso chi gioca, le dita attorno alla parte bassa, il pollice sul bordo, la cima inclinata in avanti verso lo schermo e un poco verso l’interno.',
    views: [[palmSide, 'DI LATO', 'cima in avanti'], [palmFront, 'DI FRONTE', 'schermo verso di te']],
    photo: { file: 'presa-palmo-schermo.webp', alt: 'Presa nel palmo: il telefono appoggiato nel palmo con lo schermo verso chi gioca, le dita attorno alla parte bassa, il pollice sul bordo, la cima inclinata in avanti' },
    ui: {
      connectTitle: 'Tieni il telefono nel palmo',
      connectHint: 'Schermo verso di te, cima inclinata in avanti. Poi si va in campo da soli.',
      split: 'Presa nel palmo: schermo verso di te, cima inclinata in avanti.',
      still: 'Fermo nel palmo, schermo verso di te: misuro i sensori',
      stillMoved: 'Si è mosso: fermo ancora un attimo',
      lessonGrip: 'Appoggia il telefono nel palmo, schermo verso di te, cima inclinata in avanti.',
      lessonHand: 'Schermo verso di te, polso libero. Con quale mano giochi?',
    },
  }),
  martello: Object.freeze({
    name: 'Impugnatura a martello',
    text: 'Impugnatura a martello: <b>stringi la base del telefono nel pugno</b>, come il manico di un martello. La <b>cima punta in avanti</b>, verso lo schermo, con il <b>bordo stretto in alto</b> e il display di lato. Calibra e gioca con la stessa presa.',
    short: 'Nel pugno come un martello, cima in avanti',
    aria: 'Impugnatura a martello: il pugno stringe la base del telefono come il manico di un martello, la cima punta in avanti verso lo schermo, il bordo stretto in alto e il display di lato.',
    views: [[side, 'DI LATO', 'cima in avanti, display di lato'], [front, 'DA DIETRO', 'bordo stretto in alto']],
    photo: { file: 'presa-martello.webp', alt: 'Impugnatura a martello: il pugno sulla base del telefono, che prosegue in avanti con il display di lato' },
    ui: {
      connectTitle: 'Impugna il telefono come un manico',
      connectHint: 'Impugnatura a martello: la base nel pugno, la cima in avanti verso lo schermo, il bordo stretto in alto e il display di lato. Si parte da soli.',
      split: 'Impugnatura a martello: la base del telefono nel pugno, la cima in avanti verso lo schermo, il bordo stretto in alto.',
      still: 'Nel pugno come il manico di un martello, la cima in avanti, il bordo stretto in alto: misuro i sensori',
      stillMoved: 'Si è mosso: tienilo fermo ancora un attimo, nel pugno come un martello',
      lessonGrip: 'Stringi la base del telefono nel pugno, come il manico di un martello. La cima punta in avanti, verso lo schermo e un poco in alto.',
      lessonHand: 'Il bordo stretto del telefono sta in alto, il display guarda di lato. Il polso resta libero: il gioco segue anche le sue rotazioni. Con quale mano giochi?',
    },
  }),
});
export const GRIP = GRIPS[GRIP_STYLE];

// compact: una sola dimensione (spazi piccoli); le viste sono sempre due
export function gripSvg({ cls = 'natpf-grip-art', compact = false, id = '', hand = 'right', style = GRIP_STYLE } = {}){
  const W = 220, G = GRIPS[style] || GRIP;
  const draw = (shape, cx) => hand === 'left' ? `<g transform="translate(${2*cx} 0) scale(-1 1)">${shape}</g>` : shape;
  const [[a, la, sa], [b, lb, sb]] = G.views;
  const parts = [draw(a(52), 52), tick(36, 22), text(52, 186, la), text(52, 197, sa, 7.5, 500),
    draw(b(165), 165), tick(128, 22), text(165, 186, lb), text(165, 197, sb, 7.5, 500)];
  return `<svg ${id ? `id="${id}" ` : ''}class="${cls}" data-hand="${hand === 'left' ? 'left' : 'right'}" data-grip="${style}" viewBox="0 0 ${W} 200" role="img" aria-label="${hand === 'left' ? 'Mano sinistra. ' : 'Mano destra. '}${G.aria}">${parts.join('')}</svg>`;
}
// la presa in parole (stessa cosa della figura), per i pannelli e la guida
export const GRIP_TEXT = GRIP.text;

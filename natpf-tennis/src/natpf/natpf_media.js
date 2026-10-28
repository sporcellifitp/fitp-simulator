// Foto reali del tutorial (public/media/, generate con Higgsfield il 28/10/2026, vedi public/media/LEGGIMI.txt): presa
// di lato, presa vista dallo schermo, presa sbagliata, posizione di partenza. I gesti dei colpi si mostrano con
// l'animazione 3D (natpf_gesture_demo.js), verificata con il rilevatore vero: le clip video generate sono state tolte
// il 28/10 su richiesta dell'utente (oggetto in mano simile a un telecomando, pose non credibili). Per i mancini le foto
// si specchiano.
const BASE = './media/';

export const PHOTOS = Object.freeze({
  grip: { src: BASE + 'presa-lato.webp', alt: 'Telefono in piedi nel pugno, la cima un poco in avanti' },
  edge: { src: BASE + 'presa-schermo.webp', alt: 'Visto dallo schermo: del telefono si vede solo il bordo' },
  wrong: { src: BASE + 'presa-sbagliata.webp', alt: 'Telefono tenuto piatto, con il display in alto: così no' },
  ready: { src: BASE + 'posizione.webp', alt: 'Giocatore di spalle davanti al televisore, telefono nel pugno all’altezza del fianco' },
});

// passo della lezione → foto (con l'eventuale esempio sbagliato accanto)
export const LESSON_PHOTOS = Object.freeze({
  grip: { main: 'grip', no: 'wrong' },
  hand: { main: 'edge' },
  ready: { main: 'ready' },
});

export const lessonPhotos = id => {
  const L = LESSON_PHOTOS[id];
  return L ? { main: PHOTOS[L.main], no: L.no ? PHOTOS[L.no] : null } : null;
};

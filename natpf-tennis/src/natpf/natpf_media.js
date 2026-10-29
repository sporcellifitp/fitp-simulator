// Foto reali del tutorial (public/media/, generate con Higgsfield, vedi public/media/LEGGIMI.txt): impugnatura e posizione
// di partenza. Presa di riferimento dal 29/10 (foto dell'utente): base del telefono nel palmo, cima in avanti, schermo in
// alto; le foto della presa di prima (in piedi nel pugno, bordo verso lo schermo, «Così no» con lo schermo in alto) sono
// state tolte. Il passo «Orientamento e mano» mostra l'animazione 3D. I gesti dei colpi si mostrano con l'animazione 3D
// (natpf_gesture_demo.js), verificata con il rilevatore vero: le clip video generate sono state tolte il 28/10 su
// richiesta dell'utente. Per i mancini le foto si specchiano.
const BASE = './media/';

export const PHOTOS = Object.freeze({
  grip: { src: BASE + 'presa-palmo.webp', alt: 'La base del telefono nel palmo, la cima in avanti e un poco in alto, lo schermo verso l’alto' },
  ready: { src: BASE + 'posizione.webp', alt: 'Giocatore di spalle davanti al televisore, telefono in mano davanti al fianco' },
});

// passo della lezione → foto (con l'eventuale esempio sbagliato accanto); senza foto, l'animazione 3D
export const LESSON_PHOTOS = Object.freeze({
  grip: { main: 'grip' },
  ready: { main: 'ready' },
});

export const lessonPhotos = id => {
  const L = LESSON_PHOTOS[id];
  return L ? { main: PHOTOS[L.main], no: L.no ? PHOTOS[L.no] : null } : null;
};

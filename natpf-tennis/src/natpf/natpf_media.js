// Foto reali del tutorial (public/media/, generate con Higgsfield, vedi public/media/LEGGIMI.txt): impugnatura e posizione
// di partenza. Presa di riferimento dal 29/10 sera (scelta dell'utente): impugnatura a martello, il pugno sulla base, il
// telefono in avanti con il bordo stretto in alto e il display di lato. Tolte le foto delle prese di prima (in piedi nel
// pugno, bordo verso lo schermo, «Così no», base nel palmo). Il passo «Orientamento e mano» mostra l'animazione 3D. I gesti dei colpi si mostrano con l'animazione 3D
// (natpf_gesture_demo.js), verificata con il rilevatore vero: le clip video generate sono state tolte il 28/10 su
// richiesta dell'utente. Per i mancini le foto si specchiano.
const BASE = './media/';

export const PHOTOS = Object.freeze({
  grip: { src: BASE + 'presa-martello.webp', alt: 'Impugnatura a martello: il pugno sulla base del telefono, che prosegue in avanti con il display di lato' },
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

// Foto reali del tutorial (public/media/, generate con Higgsfield, vedi public/media/LEGGIMI.txt): impugnatura e posizione
// di partenza. Presa insegnata dal 04/11 (scelta dell'utente): presa nel palmo, dalla sua foto (rollback: impugnatura a
// martello, GRIP_STYLE in site/js/tennis/grip-art.js). Tolte le foto delle prese di prima (in piedi nel
// pugno, bordo verso lo schermo, «Così no», base nel palmo). Il passo «Orientamento e mano» mostra l'animazione 3D. I gesti dei colpi si mostrano con l'animazione 3D
// (natpf_gesture_demo.js), verificata con il rilevatore vero: le clip video generate sono state tolte il 28/10 su
// richiesta dell'utente. Per i mancini le foto si specchiano.
import { GRIP } from '@natpf/tennis/grip-art.js';
const BASE = './media/';

export const PHOTOS = Object.freeze({
  // presa insegnata (site/js/tennis/grip-art.js, GRIP_STYLE): dal 04/11 la presa nel palmo della foto dell'utente
  grip: { src: BASE + GRIP.photo.file, alt: GRIP.photo.alt },
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

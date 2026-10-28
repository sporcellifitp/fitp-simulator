// Foto e video reali del tutorial (public/media/, generati con Higgsfield il 28/10/2026, vedi public/media/LEGGIMI.txt).
// Ogni clip è stata controllata fotogramma per fotogramma contro le regole del rilevatore (docs/PROJECT_MEMORY.md §Gesti):
// asse, verso e telefono sempre in piedi nel pugno. I gesti senza una clip verificata restano con l'animazione 3D
// (natpf_gesture_demo.js), che è la fonte di riserva e quella per incrociato/lungolinea, dove conta l'orientamento del
// display all'impatto e un video non lo mostra. Le persone nelle clip giocano con la destra: per i mancini si specchia.
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

// clip verificate: dritto (da destra verso sinistra, finisce sopra la spalla sinistra), rovescio (telefono al fianco
// sinistro, poi fuori verso destra), servizio (lancio, telefono in alto, colpo in avanti e in basso), pallonetto (dal
// basso verso l'alto, la mano sale davvero), tagliato (dall'alto verso il basso, deciso), schiacciata (braccio in alto,
// poi giù). La palla corta è lo stesso gesto del tagliato ma lento: stessa clip a metà velocità.
const CLIP = (name, rate = 1) => Object.freeze({ src: `${BASE}colpi/${name}.mp4`, poster: `${BASE}colpi/${name}.webp`, rate });
export const CLIPS = Object.freeze({
  forehand: CLIP('dritto'),
  backhand: CLIP('rovescio'),
  serve: CLIP('servizio'),
  lob: CLIP('pallonetto'),
  slice: CLIP('tagliato'),
  drop: CLIP('tagliato', .5),
  smash: CLIP('schiacciata'),
});

export const clipFor = id => CLIPS[id] || null;
export const lessonPhotos = id => {
  const L = LESSON_PHOTOS[id];
  return L ? { main: PHOTOS[L.main], no: L.no ? PHOTOS[L.no] : null } : null;
};
// etichetta della velocità mostrata nella scheda («×0,5»)
export const rateLabel = r => '×' + String(r).replace('.', ',');

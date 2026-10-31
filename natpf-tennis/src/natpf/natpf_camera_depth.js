// Telecamera di gioco quando chi gioca arretra oltre il fondo campo (diagnostica del 30/10, 20261030-142438, C16).
// La camera del motore base (dietro il fondo campo, alta 7,8 m, 45°, sguardo a 1,8 m dalla rete) segue solo x: con chi
// gioca oltre z ≈ 14 m i piedi e il punto d'impatto uscivano dal basso dell'immagine (contatti a z ≥ 13,5 m: 8 su 25 e
// 4 su 12 nelle due sessioni). Decisione dell'utente del 31/10: oltre ~12,5 m la camera arretra un poco e lo sguardo
// scende verso chi gioca, in modo morbido: lo spostamento cresce da zero con derivata zero (nessuno scatto quando si
// passa la soglia) e poi in proporzione alla profondità; sopra la soglia la camera resta quella di sempre.
// Vale per la camera del P1, per quella del P2 (dall'altra metà) e per le due metà dello split screen.
export const DEEP_CAM = Object.freeze({
  from: 12.5,     // m dalla rete: da qui la camera comincia a seguire chi gioca in profondità
  knee: .8,       // m: tratto in cui lo spostamento cresce in modo dolce (parabola), poi lineare
  max: 4,         // m oltre `from`: poco oltre, la camera non arretra più (chi gioca non va così indietro)
  back: .6,       // m di camera all'indietro per metro di profondità
  look: 1.4,      // m di punto guardato verso chi gioca per metro di profondità (lo sguardo scende)
});
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// depth: distanza di chi gioca dalla rete nella propria metà (m, positiva dietro di sé). Spostamenti lungo il campo
// verso chi gioca: back per la camera, look per il punto guardato (da moltiplicare per il lato, +1 P1, −1 P2)
// (tratto dolce anche alla fine: oltre max la camera si ferma senza scatti)
const soft = (d, k) => (d <= 0 ? 0 : d < k ? d*d/(2*k) : d - k/2);
export function deepCamShift(depth, C = DEEP_CAM){
  const d = finite(depth) - C.from, s = soft(d, C.knee) - soft(d - C.max, C.knee);
  return { back: C.back*s, look: C.look*s };
}

// profondità di chi gioca nella propria metà: side +1 per chi sta a z > 0 (P1), −1 per il P2
export const actorDepth = (actor, side = 1) => finite(actor?.pos?.z)*side;

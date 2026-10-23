// Webcam in partita: pausa quando la webcam non può più giocare per chi gioca e ripresa controllata (richiesta del
// 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md §5). Stessa macchina a stati del telefono (natpf_phone_watch.js: pausa, conto
// alla rovescia, punto rigiocato se la pausa è arrivata nello scambio), motivi e testi della webcam. Senza DOM.
//
// Prima: con la mano persa a lungo il gioco andava avanti (punti persi senza poter colpire) e il flusso ottico di
// riserva poteva fare colpi da qualunque movimento. Ora (motion_controls.js) dopo 0,7 s senza mano non ci sono colpi, e
// la partita si ferma con le istruzioni: nello scambio e nel lancio dopo lostRallyMs (poco oltre il momento in cui non si
// può più colpire: la pausa arriva prima che il punto sia perso, e il punto si rigioca), nelle altre fasi dopo lostMs.
// Riprende quando la mano si vede di nuovo con continuità (vista negli ultimi backMs per 0,7 s) e dopo il conto alla
// rovescia. La soglia comprende già la tolleranza: nessuna attesa in più (graceMs 0).
import { createPhoneWatch } from './natpf_phone_watch.js';

export const WEBCAM_WATCH = Object.freeze({ lostMs: 1500, lostRallyMs: 800, backMs: 300, frameGapMs: 1000 });

// salute della webcam: { ok, why } con why 'webcam spenta' | 'webcam ferma' | 'mano persa'. paused: si è già in pausa
// (per riprendere la mano deve vedersi adesso); rally: scambio o lancio in corso (c'è un punto in gioco)
export function webcamHealth({ active = false, model = false, handAgeMs = 0, frameAgeMs = null } = {}, { paused = false, rally = false } = {}){
  if (!active) return { ok: false, why: 'webcam spenta' };
  if (Number.isFinite(frameAgeMs) && frameAgeMs > WEBCAM_WATCH.frameGapMs) return { ok: false, why: 'webcam ferma' };
  // senza il modello delle mani (solo movimento) la mano non si giudica
  const limit = paused ? WEBCAM_WATCH.backMs : rally ? WEBCAM_WATCH.lostRallyMs : WEBCAM_WATCH.lostMs;
  if (model && handAgeMs > limit) return { ok: false, why: 'mano persa' };
  return { ok: true, why: null };
}

export const createWebcamWatch = (opts = {}) => createPhoneWatch({ graceMs: 0, ...opts });

export function webcamHoldText(why){
  return {
    'mano persa': 'Non vedo la mano che impugna: rimettiti nell’inquadratura, a 1,5–2 metri dalla webcam, con la mano che colpisce ben visibile e la luce davanti. Si riprende da solo.',
    'webcam ferma': 'La webcam non manda più immagini: controlla che nessun altro programma la stia usando. Si riprende da solo quando torna.',
    'webcam spenta': 'La webcam è spenta: riaccendila dal pannello della racchetta (Gioca → Racchetta → Webcam).',
  }[why] || 'Webcam in pausa.';
}

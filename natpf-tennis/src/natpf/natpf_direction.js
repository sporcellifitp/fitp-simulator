// B36 · Direzione dei colpi (docs/b36/piano-direzionalita.md). Tappa B36.0 «Misurare prima»: il gioco NON cambia, esiste
// solo la regola di oggi («classica»: natpf_stroke_outcome.strokeOutcome). Qui stanno soltanto i nomi che il registro dello
// stand (registro/registro_registratore.js) e i banchi (scripts/audit/rally-balance.mjs, b19/due-umani*.mjs,
// direzione-telefono.mjs) usano già, così le tappe dopo (dalla B36.1, la regola «nuova») li riempiono senza cambiare il
// formato del registro né ricaricare il Worker:
//   - modello della direzione di una partita: engine.natpfDirModel ('classica' | 'nuova'), da leggere a inizio partita.
//     Oggi nessuno lo scrive: vale sempre 'classica';
//   - colpo giocato con la regola nuova: lo dirà l'esito del colpo (out.rule === 'nuova'). Oggi l'esito non ha `rule`:
//     nessun colpo usa la regola nuova (i banchi stampano 0 e dalla B36.1 un test fallisce se con «Nuova» restano 0).
export const DIR_MODELS = Object.freeze(['classica', 'nuova']);
export const DIR_DEFAULT = 'classica';
export const dirModelOf = engine => (DIR_MODELS.includes(engine?.natpfDirModel) ? engine.natpfDirModel : DIR_DEFAULT);
export const usedNewRule = out => out?.rule === 'nuova';

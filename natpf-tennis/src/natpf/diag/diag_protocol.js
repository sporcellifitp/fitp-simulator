// Prova guidata della modalità diagnostica: il lanciapalle dell'allenamento chiede colpi precisi (lato, tipo,
// direzione) e ogni palla lanciata finisce nel registro come «atteso». Così le metriche hanno un riferimento: il colpo
// richiesto. Resta un riferimento da verificare nel video (chi gioca può aver fatto un altro gesto): le metriche lo
// dicono. Nessuna soglia personale viene imparata qui (learn: false), la prova non cambia il gioco.
// colpo: 'normale' = dritto o rovescio piatto/arrotato; direzione: 'incrociato' | 'lungolinea' (vedi diag_metrics).
const H = (phone, webcam = phone, mouse = phone) => ({ phone, webcam, mouse });
export const DIAG_PROTOCOLS = Object.freeze({
  colpi: Object.freeze({
    id: 'colpi', label: 'Prova dei colpi (circa 5 minuti)',
    drills: [
      { id: 'diag-fh', label: 'Dritti', need: 10, feed: 'forehand', expect: { lato: 'forehand', colpo: 'normale' }, hint: H('Dieci dritti normali, come in partita') },
      { id: 'diag-bh', label: 'Rovesci', need: 10, feed: 'backhand', expect: { lato: 'backhand', colpo: 'normale' }, hint: H('Dieci rovesci normali, come in partita') },
      { id: 'diag-lob', label: 'Pallonetti', need: 6, feed: 'forehand', expect: { colpo: 'lob' }, hint: H('Sei pallonetti: dal basso verso l’alto, palla alta') },
      { id: 'diag-fh-cross', label: 'Dritti incrociati', need: 8, feed: 'forehand', expect: { lato: 'forehand', colpo: 'normale', direzione: 'incrociato' }, hint: H('Dritto in diagonale, verso l’altro lato del campo') },
      { id: 'diag-fh-line', label: 'Dritti lungolinea', need: 8, feed: 'forehand', expect: { lato: 'forehand', colpo: 'normale', direzione: 'lungolinea' }, hint: H('Dritto lungo la riga, dalla tua stessa parte') },
      { id: 'diag-bh-cross', label: 'Rovesci incrociati', need: 6, feed: 'backhand', expect: { lato: 'backhand', colpo: 'normale', direzione: 'incrociato' }, hint: H('Rovescio in diagonale') },
      { id: 'diag-bh-line', label: 'Rovesci lungolinea', need: 6, feed: 'backhand', expect: { lato: 'backhand', colpo: 'normale', direzione: 'lungolinea' }, hint: H('Rovescio lungo la riga') },
      { id: 'diag-mix', label: 'Misti', need: 10, feed: 'random', expect: { colpo: 'normale' }, hint: H('Dritto o rovescio: decide la palla') },
      // racchetta virtuale (22/10): colpi che prima non c'erano nella prova, in fondo per non cambiare la prima parte
      { id: 'diag-slice', label: 'Rovesci tagliati', need: 6, feed: 'backhand', expect: { lato: 'backhand', colpo: 'slice' }, hint: H('Sei rovesci tagliati: la racchetta scende dall’alto verso il basso') },
      { id: 'diag-drop', label: 'Palle corte', need: 5, feed: 'forehand', phoneOnly: true, expect: { colpo: 'drop' }, hint: H('Cinque palle corte: colpo lento e morbido, dall’alto verso il basso') },
    ],
  }),
});
// esercizi pronti per l'allenamento (diag: ogni palla conta, niente soglie personali); phoneOnly solo con il telefono
// (la palla corta la riconosce solo il telefono)
export function protocolDrills(id = 'colpi', { controller = null } = {}){
  const p = DIAG_PROTOCOLS[id]; if (!p) throw new Error('prova sconosciuta: ' + id);
  return p.drills.filter(d => !d.phoneOnly || !controller || controller === 'phone').map(d => ({ ...d, diag: true, learn: false, cue: d.feed === 'random' ? null : d.feed }));
}
// richiesta di una palla: il lato è quello verso cui va la palla (anche nei misti)
export function expectedFor(drill, side){
  const e = drill?.expect || {};
  return { prova: drill?.id || null, lato: e.lato || side || null, colpo: e.colpo || null, direzione: e.direzione || null, finestraMs: 4000 };
}

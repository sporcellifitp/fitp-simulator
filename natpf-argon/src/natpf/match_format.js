// Formato della partita. L'MVP NATPF è solo singolare 1v1 (contro la CPU o tra due giocatori).
// Argon nasce in doppio: il codice dei compagni resta nel motore, dietro `isDoubles`, per l'Opzione B.
// Per riattivare il 2v2 (solo su richiesta) basta DOUBLES_ENABLED = true e un pulsante nel menu: il motore
// mostra di nuovo i compagni e ne usa volée e posizionamento, senza riprogettare nulla.
export const DOUBLES_ENABLED = false;

export const MATCH_FORMATS = Object.freeze({
  singles: Object.freeze({ id: 'singles', teamSize: 1, label: '1v1' }),
  doubles: Object.freeze({ id: 'doubles', teamSize: 2, label: '2v2' }),
});

export function resolveMatchFormat(requested, { doublesEnabled = DOUBLES_ENABLED } = {}){
  const id = String(requested || '').toLowerCase();
  return id === 'doubles' && doublesEnabled ? MATCH_FORMATS.doubles : MATCH_FORMATS.singles;
}

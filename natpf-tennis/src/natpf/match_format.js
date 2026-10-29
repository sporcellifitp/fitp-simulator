// Formato della partita: singolare 1v1 o doppio 2v2, contro la CPU o con un amico su un altro computer.
// Il motore base nasce in doppio: con il 2v2 rimette in campo i compagni (guidati dalla CPU) e ne usa volée e
// posizionamento. Si sceglie nella pagina «Partita» del menu (engine.setMatchFormat) o con ?format=doubles.
export const DOUBLES_ENABLED = true;
export const FORMAT_KEY = 'natpf-tennis.format';

export const MATCH_FORMATS = Object.freeze({
  singles: Object.freeze({ id: 'singles', teamSize: 1, label: '1v1' }),
  doubles: Object.freeze({ id: 'doubles', teamSize: 2, label: '2v2' }),
});

export function resolveMatchFormat(requested, { doublesEnabled = DOUBLES_ENABLED } = {}){
  const id = String(requested || '').toLowerCase();
  return id === 'doubles' && doublesEnabled ? MATCH_FORMATS.doubles : MATCH_FORMATS.singles;
}

// Chi batte per primo (richiesta del 29/10 sera): si sceglie nella pagina «Partita» del menu. 'player' chi gioca qui
// (Player 1 sullo stesso schermo), 'opponent' l'avversario (CPU, amico o Player 2), 'random' sorteggio a ogni partita.
export const SERVE_KEY = 'natpf-tennis.serve';
export const SERVE_CHOICES = Object.freeze(['player', 'opponent', 'random']);
export const serveChoice = v => (SERVE_CHOICES.includes(v) ? v : 'player');
export function firstServer(choice, rnd = Math.random){
  const c = serveChoice(choice);
  return c === 'random' ? (rnd() < .5 ? 'player' : 'opponent') : c;
}

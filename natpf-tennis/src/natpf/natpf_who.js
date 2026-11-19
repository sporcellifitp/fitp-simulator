// B18.2 · tappa 2, gruppo 3 · «Chi gioca: Bambino · Ragazzo · Adulto» (idea dell'utente del 12/11: il gioco non può
// riconoscere un bambino, quindi lo chiede). Nella pagina «Partita» contro la CPU le tre tessere prendono il posto della
// scelta del livello:
//   Bambino → livello Bambini · Ragazzo → Casual (la «CPU facile» di sempre) · Adulto → livello Evento (si regola da solo).
// Tutti e cinque i livelli si scelgono anche per nome in «Altre impostazioni» → «Livello della CPU»: Bambini · Facile ·
// Evento · Esperta · Leggenda. Pro («Esperta») e Leggenda si raggiungono solo da lì.
// Valore di base: Adulto. Se l'indirizzo della pagina chiede un livello (?mode=pro, ?difficulty=leggenda, anche i due
// nuovi: ?mode=bambini, ?mode=evento) il valore di base è quello: è la scelta di chi ha preparato lo stand.
// «Nuovo giocatore» e il chiosco che riparte riportano la scelta al valore di base (natpf_lobby.resetWho).
// Nello stesso schermo e nella sfida tra due computer non cambia niente: lì le tessere non ci sono.
// Funzioni pure (le provano i test); le usa natpf_lobby.js.

export const WHO = Object.freeze(['bambino', 'ragazzo', 'adulto']);
export const WHO_LEVEL = Object.freeze({ bambino: 'bambini', ragazzo: 'casual', adulto: 'evento' });
export const WHO_DEFAULT = 'adulto';
// livelli contro la CPU, nell'ordine di difficoltà
export const CPU_LEVELS = Object.freeze(['bambini', 'casual', 'evento', 'pro', 'leggenda']);
// nome del livello nella riga «Livelli per esperti» e nelle scritte (B72: «Esperto», al maschile come «avversario»;
// prima «Esperta», come «la CPU»)
export const LEVEL_NAME = Object.freeze({ bambini: 'Bambini', casual: 'Facile', evento: 'Evento', pro: 'Esperto', leggenda: 'Leggenda' });

// B72 (richiesta dell'utente del 19/11: «cambiare CPU con Avversario (in singolo): molti non sanno cosa significa CPU»):
// nei testi che si vedono il giocatore guidato dal gioco non si chiama più «CPU». In singolo è «Avversario», nel doppio i
// due avversari sono «Avversari» e quello in coppia con chi gioca è il «compagno» («Tu + compagno»). I nomi stanno qui,
// in un punto solo, così la traduzione (lingua per giocatore) si aggancia facilmente. Chiavi interne, valori e attributi
// (mode 'cpu', data-fiera-mode="cpu", classe cpu-tag, 'CPU DROP SHOT', campi del registro) restano come sono.
export const OPPONENT_NAME = 'Avversario';
export const OPPONENTS_NAME = 'Avversari';
export const PARTNER_NAME = 'compagno';
// con l'articolo (per le frasi): «Punto dell'avversario», «Vince l'avversario», «L'avversario non ci arriva»; nel doppio
// «Punto degli avversari», «Gli avversari non ci arrivano» (many: il verbo va al plurale)
export const OPPONENT_REF = Object.freeze({ of: "dell'avversario", who: "l'avversario", Who: "L'avversario", many: false });
export const OPPONENTS_REF = Object.freeze({ of: 'degli avversari', who: 'gli avversari', Who: 'Gli avversari', many: true });
// squadra del doppio con il compagno guidato dal gioco: «Tu + compagno», «Marco + compagno»
export const withPartner = name => `${name} + ${PARTNER_NAME}`;
// avversario con il livello scelto per nome: «Avversario esperto», «Avversario Leggenda» (Leggenda è un nome, gli altri
// livelli si leggono come aggettivi)
export const opponentLevelName = level => `${OPPONENT_NAME} ${level === 'leggenda' ? LEVEL_NAME.leggenda : String(LEVEL_NAME[level] || '').toLowerCase()}`.trim();

export const isCpuLevel = level => CPU_LEVELS.includes(level);
export const whoOfLevel = level => WHO.find(w => WHO_LEVEL[w] === level) || null;
// livello chiesto dall'indirizzo (come hud_ui e game_engine: ?mode= o ?difficulty=), o null
export function urlLevel(search = ''){
  let v = '';
  try { const p = new URLSearchParams(search || ''); v = (p.get('mode') || p.get('difficulty') || '').toLowerCase(); } catch {}
  return isCpuLevel(v) ? v : null;
}
// valore di base della scelta: il livello dell'indirizzo, altrimenti Adulto
export const baseLevel = (search = '') => urlLevel(search) || WHO_LEVEL[WHO_DEFAULT];
// nome del livello da dire nel riassunto di «Altre impostazioni» quando non corrisponde a una tessera di «Chi gioca»
// (Esperto, Leggenda): «Avversario esperto», «Avversario Leggenda»; altrimenti null
export const levelSummary = difficulty => (isCpuLevel(difficulty) && !whoOfLevel(difficulty) ? opponentLevelName(difficulty) : null);
// riga sotto le tessere: dice che il livello non viene da «Chi gioca» ('' se viene da lì)
export function whoNote(difficulty){
  const name = levelSummary(difficulty);
  return name ? `Livello: ${name}, scelto in «Altre impostazioni». Tocca chi gioca per cambiarlo.` : '';
}

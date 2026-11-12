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
// nome del livello nella riga «Livello della CPU» e nelle scritte
export const LEVEL_NAME = Object.freeze({ bambini: 'Bambini', casual: 'Facile', evento: 'Evento', pro: 'Esperta', leggenda: 'Leggenda' });

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
// (Esperta, Leggenda); altrimenti null
export const levelSummary = difficulty => (isCpuLevel(difficulty) && !whoOfLevel(difficulty) ? `CPU ${LEVEL_NAME[difficulty]}` : null);
// riga sotto le tessere: dice che il livello non viene da «Chi gioca» ('' se viene da lì)
export function whoNote(difficulty){
  const name = levelSummary(difficulty);
  return name ? `Livello: ${name}, scelto in «Altre impostazioni». Tocca chi gioca per cambiarlo.` : '';
}

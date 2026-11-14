// Battuta a un solo giocatore (B47; richiesta dell'utente del 14/11: «ha più senso lasciare la battuta ad un solo
// giocatore piuttosto che alternata perché la gente non lo capisce»). Opzione del pannello dello stand «Battuta: Sempre
// lo stesso · Alternata», salvata, di base «Sempre lo stesso» (il programma si usa allo stand).
// Con «Sempre lo stesso» il servizio non passa mai all'altro, per tutta la partita e in tutti i formati (game classico,
// formato veloce di natpf_fair_format.js, campo aperto di natpf_duo_rules.js):
//   · contro la CPU batte sempre chi gioca (il visitatore), anche con «Chi serve: CPU» (fairServer, regola della B41);
//   · nello stesso schermo batte per tutta la partita chi batte il primo game («Chi serve», di base il sorteggio);
//   · nella sfida tra due computer resta alternata, come prima (decide l'host).
// Il lato del servizio (destra/sinistra) segue il punteggio come sempre; il punto decisivo del formato veloce resta.
// Con «Alternata» tutto come prima: un battitore per game, o ogni due punti con il formato veloce e il campo aperto.
// L'indirizzo la può forzare per quella pagina, senza salvarla (prove): ?battuta=fissa o ?battuta=alternata.
// Funzioni pure (test/natpf-battuta.test.mjs): le usano game_engine.startNewMatch e _awardPoint (con nextServe di
// natpf_fair_format.js), il pannello dello stand (natpf_kiosk.js) e il banco delle simulazioni
// (scripts/audit/headless-engine.mjs usa «Alternata», per restare confrontabile con i numeri di prima).

export const SERVE_RULE_KEY = 'natpf-tennis.battuta';
export const SERVE_RULES = Object.freeze(['fissa', 'alternata']);
export const SERVE_RULE_DEFAULT = 'fissa';
export const serveRuleOf = v => (v === 'alternata' ? 'alternata' : v === 'fissa' ? 'fissa' : SERVE_RULE_DEFAULT);
export const nextServeRule = r => (serveRuleOf(r) === 'fissa' ? 'alternata' : 'fissa');
const URL_FIXED = ['fissa', 'sempre', 'stesso', 'uno', 'fixed'], URL_ALT = ['alternata', 'alterna', 'classica', 'alt'];
// valore dell'indirizzo (?battuta=…), o null se non dice niente
export function serveRuleFromUrl(search = ''){
  let v = null; try { v = new URLSearchParams(search || '').get('battuta'); } catch {}
  v = String(v || '').trim().toLowerCase();
  return URL_FIXED.includes(v) ? 'fissa' : URL_ALT.includes(v) ? 'alternata' : null;
}
// regola di adesso: prima l'indirizzo, poi la scelta salvata, altrimenti il valore di base
export function readServeRule({ search = globalThis.location?.search || '', storage = globalThis.localStorage } = {}){
  const forced = serveRuleFromUrl(search);
  if (forced) return forced;
  try { return serveRuleOf(storage?.getItem?.(SERVE_RULE_KEY)); } catch { return SERVE_RULE_DEFAULT; }
}
export function writeServeRule(rule, { storage = globalThis.localStorage } = {}){
  const r = serveRuleOf(rule);
  try { storage?.setItem?.(SERVE_RULE_KEY, r); } catch {}
  return r;
}
export const serveRuleForcedByUrl = (search = globalThis.location?.search || '') => serveRuleFromUrl(search) !== null;
// scritta del pulsante del pannello e avviso dopo il clic
export const SERVE_RULE_LABEL = Object.freeze({ fissa: 'Sempre lo stesso', alternata: 'Alternata' });
export const serveRuleButton = (rule, forced = false) => `${SERVE_RULE_LABEL[serveRuleOf(rule)]}${forced ? ' (indirizzo)' : ''}`;
export function serveRuleToast(rule, forced = false){
  const r = serveRuleOf(rule);
  if (forced) return `Battuta salvata «${SERVE_RULE_LABEL[r]}», ma in questa pagina comanda l’indirizzo (?battuta=…)`;
  return r === 'fissa'
    ? 'Battuta sempre allo stesso giocatore: contro la CPU batte sempre chi gioca, nello stesso schermo chi batte il primo game. Vale dalla prossima partita; resta salvata'
    : 'Battuta alternata: il servizio passa all’altro a ogni game (ogni due punti con il formato veloce). Vale dalla prossima partita; resta salvata';
}

// B41 (decisione dell'utente del 13/11): in fiera contro la CPU batte SEMPRE il visitatore. normal è chi batterebbe con
// le regole di sempre; in due (stesso schermo, due computer) resta normal. (Prima in natpf_fiera.js, che la riesporta)
export function fairServer({ fair = false, mode = 'cpu', normal = 'player' } = {}){
  return fair && mode === 'cpu' ? 'player' : normal;
}

// Battuta della partita che comincia: { server, fixed }. first: chi batterebbe il primo game con «Chi serve»
// (match_format.firstServer: chi gioca, l'avversario o il sorteggio); mode: 'cpu' | 'split' | 'versus'. fixed: il servizio
// resta a server per tutta la partita (game_engine._awardPoint → natpf_fair_format.nextServe)
export function matchServe({ rule = SERVE_RULE_DEFAULT, mode = 'cpu', first = 'player' } = {}){
  const f = first === 'opponent' ? 'opponent' : 'player';
  if (serveRuleOf(rule) !== 'fissa' || mode === 'versus') return { server: f, fixed: false };
  return { server: fairServer({ fair: true, mode: mode === 'split' ? 'split' : 'cpu', normal: f }), fixed: true };
}

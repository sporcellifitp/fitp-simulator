// B40 · i 12 trofei della card della partita (richiesta approvata dall'utente il 13/11, docs/coda/B40-fine-partita-v2.md;
// documento per l'utente docs/b40/fine-partita-v2.md). Funzioni pure: le provano i test e il banco delle soglie
// (scripts/audit/b40-trofei.mjs, partite simulate sul motore vero).
// Ogni trofeo ha tre livelli (1 bronzo, 2 argento, 3 oro) e le soglie stanno in UNA tabella sola (TROPHY_TIERS): sono
// provvisorie (giocatori simulati, non persone) e vanno riviste con i dati veri del registro dello stand e dopo il B48
// (servizio con le scelte: cambia ace e km/h, cioè Asso e Razzo). Ritoccarle è un cambio di una riga.
// Valori letti: sideSummary di natpf_match_stats.js (contatori veri della partita, B40.1) e il contesto della partita
// (livello, modo, computer del Player 2, prima partita, posto in classifica). Mai numeri negativi nei testi (regola del B35).
import { LEVEL_NAME } from './natpf_who.js';

export const TROPHY_IDS = Object.freeze(['cecchino', 'razzo', 'maratoneta', 'asso', 'vincente', 'super', 'zero', 'rimonta', 'serie', 'muro', 'prima', 're']);
export const TIER_NAME = Object.freeze(['', 'bronzo', 'argento', 'oro']);
// «Razzo di bronzo», «Razzo d'argento», «Razzo d'oro»
export const tierOf = t => (t === 1 ? 'di bronzo' : t === 2 ? 'd’argento' : t === 3 ? 'd’oro' : '');

// Soglie (bronzo, argento, oro), misurate sul gioco simulato (scripts/audit/b40-trofei.mjs, docs/b40/fine-partita-v2.md §3).
// 16/11/2026: Cecchino, Maratoneta, Asso, Vincente e Muro ritarati sul registro vero della fiera di Torino (13–16/11, 587
// partite, 753 lati: docs/b40/fine-partita-v2.md §3.1): con le soglie dei giocatori simulati i visitatori veri non li
// prendevano quasi mai (Cecchino 0,7 %, Muro 0,7 %). Obiettivo: bronzo verso il 10–12 %, argento verso il 3 %, oro sotto l'1 %.
// Razzo non si misura dal registro (i colpi non hanno i km/h); Super era già lì; In serie con le partite a un game ha senso
// solo il bronzo (4 di fila = il game a zero).
// scale: 'game' soglia × game giocati; 'sqrt' soglia × √game giocati (arrotondata); 'serie' soglia + 2 per ogni game in più
export const TROPHY_TIERS = Object.freeze({
  cecchino: Object.freeze({ tiers: [8, 12, 15], scale: 'game' }),    // colpi Perfetti (Torino: 10,2 · 2,8 · 0,9 %)
  razzo: Object.freeze({ tiers: [140, 155, 170] }),                   // km/h veri del colpo più forte finito in campo
  maratoneta: Object.freeze({ tiers: [23, 29, 37] }),                 // colpi dello scambio più lungo (Torino: 10,8 · 3,5 · 0,8 %)
  asso: Object.freeze({ tiers: [1, 2, 3], scale: 'sqrt' }),           // servizi vincenti: ace o servizio non rimandato in campo (Torino: 12,6 · 1,7 · 0,3 %)
  vincente: Object.freeze({ tiers: [3, 4, 5], scale: 'game' }),       // vincenti (palla non presa) (Torino: 14,9 · 3,3 · 0,4 %)
  super: Object.freeze({ tiers: [1, 2, 3] }),                         // colpi super riusciti
  serie: Object.freeze({ tiers: [4, 5, 7], scale: 'serie' }),         // punti vinti di fila
  muro: Object.freeze({ tiers: [18, 25, 33], scale: 'sqrt' }),        // colpi rimandati in campo di fila (Torino: 10,8 · 3,1 · 0,9 %)
});
// Game a zero: il livello parte dal livello della CPU (Bambini, Facile, Evento: bronzo; Esperta: argento; Leggenda: oro;
// stesso schermo e sfida tra due computer: bronzo) e sale di uno per ogni game a zero in più
export const LOVE_BASE = Object.freeze({ bambini: 1, casual: 1, evento: 1, pro: 2, leggenda: 3 });
// Re di oggi: posto nella classifica delle partite di oggi (1° oro, 2° argento, 3° bronzo), solo partita vinta, in
// classifica (con un nome o «Visitatore N», mai «Ospite») e con almeno RE_MIN partite in classifica oggi
export const RE_MIN = 5;
// ordine sulla card a parità di livello: dal più raro (misure del banco) al più facile; «Prima volta» sempre per ultima
export const RARITY = Object.freeze(['re', 'asso', 'super', 'rimonta', 'zero', 'razzo', 'cecchino', 'vincente', 'maratoneta', 'muro', 'serie', 'prima']);

const num = v => (Number.isFinite(+v) ? Math.max(0, +v) : 0);
const gamesOf = sum => Math.max(1, num(sum?.gamesPlayed) | 0);
export function scaledTiers(id, sum){
  const T = TROPHY_TIERS[id]; if (!T) return null;
  const g = gamesOf(sum);
  if (T.scale === 'game') return T.tiers.map(x => x*g);
  if (T.scale === 'sqrt') return T.tiers.map(x => Math.round(x*Math.sqrt(g)));
  if (T.scale === 'serie') return T.tiers.map(x => x + 2*(g - 1));
  return [...T.tiers];
}
const byTiers = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);
// valore di ogni trofeo «a soglie» dalla vista della partita
export function trophyValue(id, sum){
  if (!sum) return 0;
  switch (id){
    case 'cecchino': return num(sum.timing?.perfetto);
    case 'razzo': return num(sum.fastest);
    case 'maratoneta': return num(sum.longest);
    case 'asso': return num(sum.unreturned);
    case 'vincente': return num(sum.winners);
    case 'super': return num(sum.superOk);
    case 'serie': return num(sum.streak);
    case 'muro': return num(sum.wall);
    case 'zero': return num(sum.love);
  }
  return 0;
}
// computer del Player 2 della sfida tra due computer: come finiscono i punti non si sa (niente Asso, Vincente, Muro)
const GUEST_OFF = new Set(['asso', 'vincente', 'muro']);
// livello (0 niente, 1 bronzo, 2 argento, 3 oro) di un trofeo. ctx: { level, mode, guest, first, rank }
export function trophyTier(id, sum, ctx = {}){
  if (!sum) return 0;
  if (ctx.guest && GUEST_OFF.has(id)) return 0;
  if (TROPHY_TIERS[id]) return byTiers(trophyValue(id, sum), scaledTiers(id, sum));
  if (id === 'zero'){
    const n = num(sum.love) | 0; if (!n) return 0;
    const base = ctx.mode === 'cpu' && LOVE_BASE[ctx.level] ? LOVE_BASE[ctx.level] : 1;
    return Math.min(3, base + n - 1);
  }
  if (id === 'rimonta'){
    if (!sum.won) return 0;
    const mp = num(sum.mpSaved) | 0;
    return mp >= 3 ? 3 : mp >= 2 ? 2 : mp >= 1 || num(sum.comeback) >= 2 || num(sum.gameComeback) >= 1 ? 1 : 0;
  }
  if (id === 'prima') return ctx.first ? 1 : 0;
  if (id === 're'){
    const r = ctx.rank;
    if (!sum.won || ctx.mode !== 'cpu' || !r || r.guest || !(r.rank >= 1 && r.rank <= 3) || !((r.total | 0) >= RE_MIN)) return 0;
    return 4 - r.rank;
  }
  return 0;
}

// nome, icona (natpf_end_card: SVG a tratto nel codice) e testo del valore
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const TROPHIES = Object.freeze({
  cecchino: { name: 'Cecchino', icon: 'target', text: s => plural(num(s.timing?.perfetto), 'colpo Perfetto', 'colpi Perfetti') },
  razzo: { name: 'Razzo', icon: 'rocket', text: s => `${num(s.fastest)} km/h` },
  maratoneta: { name: 'Maratoneta', icon: 'rally', text: s => `scambio di ${num(s.longest)} colpi` },
  asso: { name: 'Asso', icon: 'ace', text: s => plural(num(s.unreturned), 'servizio vincente', 'servizi vincenti') },
  vincente: { name: 'Vincente', icon: 'star', text: s => plural(num(s.winners), 'vincente', 'vincenti') },
  super: { name: 'Super', icon: 'spark', text: s => plural(num(s.superOk), 'colpo super', 'colpi super') },
  zero: { name: 'Game a zero', icon: 'zero', text: s => (num(s.love) === 1 ? 'un game a zero' : `${num(s.love)} game a zero`) },
  rimonta: { name: 'Rimonta', icon: 'up', text: s => (num(s.mpSaved) >= 1 ? plural(num(s.mpSaved), 'palla match annullata', 'palle match annullate')
    : num(s.gameComeback) >= 1 ? 'vinta da un game sotto' : `da ${num(s.comeback)} punti sotto`) },
  serie: { name: 'In serie', icon: 'flame', text: s => `${num(s.streak)} punti di fila` },
  muro: { name: 'Muro', icon: 'wall', text: s => `${num(s.wall)} colpi di fila in campo` },
  prima: { name: 'Prima volta', icon: 'sprout', text: () => 'prima partita' },
  re: { name: 'Re di oggi', icon: 'crown', text: (s, ctx) => `${ctx?.rank?.rank | 0}° nella classifica di oggi` },
});

// Tutti i trofei vinti in una partita, già senza i doppioni, dal più alto (livello, poi rarità).
// Doppioni: «In serie» non si conta quando «Game a zero» o «Rimonta» lo contengono con un livello uguale o più alto (in un
// game: 4-0 sono 4 punti di fila; da 0-40 si vince solo con 5 di fila)
export function trophiesOf(sum, ctx = {}){
  if (!sum) return [];
  const tier = Object.fromEntries(TROPHY_IDS.map(id => [id, trophyTier(id, sum, ctx)]));
  if (tier.serie && ((tier.zero && tier.serie <= tier.zero) || (tier.rimonta && tier.serie <= tier.rimonta))) tier.serie = 0;
  return TROPHY_IDS.filter(id => tier[id] > 0).map(id => ({ id, tier: tier[id], name: TROPHIES[id].name, icon: TROPHIES[id].icon, medal: TIER_NAME[tier[id]], text: TROPHIES[id].text(sum, ctx) }))
    .sort(byCard);
}
const byCard = (a, b) => (a.id === 'prima') - (b.id === 'prima') || b.tier - a.tier || RARITY.indexOf(a.id) - RARITY.indexOf(b.id);
// I trofei da mostrare sulla card (al più n): i più alti; «Prima volta» si vede sempre (decisione dell'utente del 15/11):
// con già n trofei prende il posto dell'ultimo (di solito un bronzo)
export function cardTrophies(list = [], n = 3){
  const all = [...list].sort(byCard), first = all.find(t => t.id === 'prima'), rest = all.filter(t => t.id !== 'prima');
  if (!first) return rest.slice(0, n);
  return [...rest.slice(0, Math.max(0, n - 1)), first];
}

// «Prossimo trofeo»: il trofeo a soglie più vicino al livello dopo (distanza relativa (soglia − valore) / soglia, sotto il
// 50 %); a parità il più facile (ordine di NEAR). Testo sempre in positivo: «Razzo d'argento a 155 km/h · 12 km/h in
// più». Se niente è vicino un consiglio gentile per il Cecchino di bronzo. null se non c'è niente da proporre
export const NEAR = Object.freeze(['cecchino', 'razzo', 'maratoneta', 'muro', 'vincente', 'serie', 'asso', 'super']);
const UNIT = { cecchino: ['colpo Perfetto', 'colpi Perfetti'], razzo: ['km/h', 'km/h'], maratoneta: ['colpo nello scambio', 'colpi nello scambio'], muro: ['colpo di fila in campo', 'colpi di fila in campo'],
  vincente: ['vincente', 'vincenti'], serie: ['punto di fila', 'punti di fila'], asso: ['servizio vincente', 'servizi vincenti'], super: ['colpo super', 'colpi super'] };
const AT = { razzo: v => `a ${v} km/h`, maratoneta: v => `con uno scambio di ${v} colpi` };
export const NEXT_TIP = 'colpisci quando l’anello diventa verde';
export function nextTrophy(sum, ctx = {}){
  if (!sum) return null;
  let best = null;
  for (const id of NEAR){
    if (ctx.guest && GUEST_OFF.has(id)) continue;
    const t = trophyTier(id, sum, ctx); if (t >= 3) continue;
    const goal = scaledTiers(id, sum)[t], v = trophyValue(id, sum), missing = Math.ceil(goal - v);
    if (!(goal > 0) || missing <= 0) continue;
    const d = missing/goal;
    if (d >= 0.5) continue;
    if (!best || d < best.d - 1e-9) best = { id, tier: t + 1, goal, missing, d };
  }
  if (!best){
    const t = trophyTier('cecchino', sum, ctx);
    if (t >= 3) return null;
    const text = `Prossimo trofeo: ${TROPHIES.cecchino.name} ${tierOf(t + 1)} · ${NEXT_TIP}`;
    return { id: 'cecchino', tier: t + 1, goal: scaledTiers('cecchino', sum)[t], missing: 0, text, short: text };
  }
  const name = `${TROPHIES[best.id].name} ${tierOf(best.tier)}`, u = UNIT[best.id];
  const at = AT[best.id] ? ` ${AT[best.id](best.goal)}` : '';
  const more = `${best.missing} ${best.missing === 1 ? u[0] : u[1]} in più`;
  // (short: senza la soglia, per la card stretta dello stesso schermo)
  return { id: best.id, tier: best.tier, goal: best.goal, missing: best.missing, text: `Prossimo trofeo: ${name}${at} · ${more}`, short: `Prossimo trofeo: ${name} · ${more}` };
}

// Cornice della card (decisioni dell'utente del 15/11): Bambini azzurra, Facile argento, Evento giallo-verde, Esperta oro,
// Leggenda arcobaleno; stesso schermo dalla fascia di ciascuno (Bambino azzurra, Ragazzo argento, Adulto giallo-verde);
// sfida tra due computer giallo-verde
export const FRAME_OF_LEVEL = Object.freeze({ bambini: 'bambini', casual: 'facile', evento: 'evento', pro: 'pro', leggenda: 'leggenda' });
export const FRAME_OF_BAND = Object.freeze({ bambino: 'bambini', ragazzo: 'facile', adulto: 'evento' });
export function frameOf({ mode = 'cpu', level = null, band = null } = {}){
  if (mode === 'split') return FRAME_OF_BAND[band] || 'evento';
  if (mode === 'cpu') return FRAME_OF_LEVEL[level] || 'evento';
  return 'evento';
}
export const levelLabel = level => (LEVEL_NAME[level] ? `Livello ${LEVEL_NAME[level]}` : '');

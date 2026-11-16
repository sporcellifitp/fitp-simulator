// B40.4 · card della partita nella fine partita v2 (richiesta approvata dall'utente il 13/11, docs/coda/B40-fine-partita-v2.md;
// documento per l'utente docs/b40/fine-partita-v2.md). Card da collezione per chi ha giocato: personaggio scelto per la
// partita (ritratto dal modello 3D, natpf_ritratti.js; prima e come ripiego il ritratto SVG di natpf_portrait.js), cornice
// del livello, nastro «MVP della partita» / «Bella sfida», fino a tre trofei con le medaglie (natpf_trofei.js), record di
// oggi, prossimo trofeo. Nello stesso schermo due card una contro l'altra, con la corona su chi vince: lì la card prende il
// posto della scheda del giocatore del B35 (nome, nastro, due riquadri piccoli restano dentro la card).
// Funzioni pure (modello e HTML), come natpf_match_stats.endScreen: le provano i test. I tre riquadri del B35, il titolo
// (B41.5) e i pulsanti non cambiano. Testi solo italiani e positivi; mai il nome di un altro visitatore.
import { trophiesOf, cardTrophies, nextTrophy, frameOf } from './natpf_trofei.js';
import { natpfPortraitSVG } from './natpf_portrait.js';
import { LEVEL_NAME } from './natpf_who.js';
import { BAND_LABEL, bandOf } from './natpf_duo_rules.js';
import { endScreen } from './natpf_match_stats.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const other = s => (s === 'player' ? 'opponent' : 'player');
// colore pieno della finestra del ritratto per ogni cornice: è anche il colore di fondo dei fotogrammi 3D (il canvas del
// gioco non ha la trasparenza), quindi la finestra e il ritratto hanno lo stesso fondo
export const ART_BG = Object.freeze({ bambini: '#0d4a74', facile: '#3a4659', evento: '#24521c', pro: '#5c440f', leggenda: '#3a1f6e' });
export const BADGE_WON = 'MVP della partita', BADGE_LOST = 'Bella sfida';

// riga del record di oggi per un lato: «Record di oggi! 128 km/h» (questa partita l'ha fatto o pareggiato) o il record da
// battere. Nello stesso schermo il colpo più forte è di chi l'ha fatto; lo scambio più lungo è dei due. Lo scambio conta
// da RALLY_RECORD_MIN colpi (come lo «scambio lungo» delle frasi del B33): pareggiare uno scambio di 3 colpi non è un vanto
export const RALLY_RECORD_MIN = 8;
export function recordLine(record, side, { split = false } = {}){
  if (!record) return null;
  const k = record.kmh || {}, r = record.scambio || {}, rally = (r.value | 0) >= RALLY_RECORD_MIN;
  const kMine = !!k.mine && (!split || k.side === side);
  if (kMine && k.value > 0) return { mine: true, text: `Record di oggi! ${k.value} km/h` };
  if (r.mine && rally) return { mine: true, text: `Record di oggi! Scambio di ${r.value} colpi` };
  if (k.value > 0) return { mine: false, text: `Record di oggi: ${k.value} km/h` };
  if (rally) return { mine: false, text: `Record di oggi: scambio di ${r.value} colpi` };
  return null;
}

// Modello delle card (funzione pura). view: natpf_match_stats.viewOf (con first e record del B40.3); base:
// natpf_point_call.matchEndView; looks: { player, opponent } aspetto dei due lati (natpf_personaggi.castLooks); bands:
// fasce dello stesso schermo { p1, p2 }. null senza numeri della partita
export function cardModel(view, base = {}, { looks = null, bands = null } = {}){
  if (!view || !view.cols?.length) return null;
  const split = view.mode === 'split', S = endScreen(base, view);
  const L = looks || { player: 'p1', opponent: split || view.mode === 'versus' ? 'p2' : 'cpu' };
  const cards = view.cols.map((c, i) => {
    const side = c.side, sum = c.sum, won = !!sum.won;
    const ctx = { mode: view.mode, level: view.level, guest: !!view.guest, first: !!view.first?.[side], rank: view.mode === 'cpu' && !view.doubles ? view.rank : null };
    const all = trophiesOf(sum, ctx), shown = cardTrophies(all, 3);
    const game = all.filter(t => t.id !== 'prima');
    // «Prossimo trofeo»: a chi perde e a chi vince senza trofei della partita (decisione dell'utente del 15/11)
    const next = !won || !game.length ? nextTrophy(sum, ctx) : null;
    const band = split ? bandOf(bands?.[side === 'player' ? 'p1' : 'p2']) : null;
    const frame = frameOf({ mode: view.mode, level: view.level, band });
    const name = split ? c.name : String(view.nick || '').trim() || String(base.rows?.[0]?.name || '').trim() || 'Tu';
    const sub = split ? BAND_LABEL[band] : view.mode === 'cpu' && LEVEL_NAME[view.level] ? `Livello ${LEVEL_NAME[view.level]}` : view.mode === 'versus' ? 'Sfida a due' : '';
    return { side, name, sub, frame, art: ART_BG[frame] || ART_BG.evento, won, badge: won ? BADGE_WON : BADGE_LOST, crown: split && won,
      look: L[side] || 'p1', trophies: shown, record: recordLine(view.record, side, { split }), next: next ? (split ? next.short : next.text) : null,
      tiles: split ? S?.players?.[i]?.tiles || [] : null };
  });
  return { mode: view.mode, split, cards };
}

// icone delle medaglie (SVG a tratto nel codice, come i riquadri del B35: niente file)
export const TROPHY_ICON = Object.freeze({
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  rocket: '<path d="M12 3c3 2.5 4.5 6 4 10l-4 3-4-3c-.5-4 1-7.5 4-10z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M8 13l-3 3 3 1M16 13l3 3-3 1M10.5 18.5 12 21l1.5-2.5"/>',
  rally: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/>',
  ace: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/>',
  zero: '<ellipse cx="12" cy="12" rx="5.5" ry="8"/>',
  up: '<path d="M4 18l6-6 4 4 6-8"/><path d="M14 8h6v6"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2C5.5 10 10 8 9.5 3c3.5 2 7.5 6 7.5 11 0 1-.2 2-.6 2.8"/><path d="M12 21c-1.8 0-3-1.3-3-3 0-2.2 2-3 2-5 1.8 1 4 3 4 5 0 1.7-1.2 3-3 3z"/>',
  wall: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
});
const svg = (icon, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TROPHY_ICON[icon] || ''}</svg>`;
const MEDAL = ['', 'bronzo', 'argento', 'oro'];
const medalTitle = t => `${t.name} ${t.tier === 1 ? 'di bronzo' : t.tier === 2 ? 'd’argento' : 'd’oro'}: ${t.text}`;
const tileHtml = t => `<div class="end-tile" data-stat="${esc(t.id)}" data-value="${t.value}" data-tone="${esc(t.tone)}"><b class="end-num">${t.value}</b><span class="end-lab">${esc(t.label)}</span></div>`;

// HTML di una card. art: il contenuto della finestra (di base il ritratto SVG; natpf_ritratti ci mette il canvas dei
// fotogrammi 3D). Nello stesso schermo è anche la scheda del giocatore del B35 (.end-player con .end-pname, .end-chip e i
// due riquadri piccoli)
export function cardHtml(c, { split = false } = {}){
  const medals = c.trophies.map(t => `<li class="trophy" data-trophy="${t.id}" data-tier="${t.tier}" title="${esc(medalTitle(t))}"><span class="medal" data-medal="${MEDAL[t.tier]}">${svg(t.icon)}</span>`
    + `<span class="trophy-txt"><b>${esc(t.name)}</b><em>${esc(t.text)}</em></span></li>`).join('');
  const head = split
    ? `<header class="card-head"><h3 class="card-name end-pname" title="${esc(c.name)}">${esc(c.name)}</h3></header>`
    : `<header class="card-head"><h3 class="card-name" title="${esc(c.name)}">${esc(c.name)}</h3>${c.sub ? `<p class="card-sub">${esc(c.sub)}</p>` : ''}</header>`;
  return `<article class="end-card${split ? ' end-player' : ''}${c.won ? ' won' : ''}" data-side="${c.side}" data-frame="${c.frame}" data-won="${c.won ? 1 : 0}" data-look="${esc(c.look)}" style="--art:${c.art}">`
    + `<div class="card-art" data-portrait="${c.side}">`
    + `<div class="card-svg" aria-hidden="true">${natpfPortraitSVG(c.look, { className: 'card-portrait-svg' })}</div>`
    + `<span class="card-badge${split ? ' end-chip' : ''}">${esc(c.badge)}</span>`
    + (split && c.sub ? `<span class="card-sub card-band">${esc(c.sub)}</span>` : '')
    + `</div>${c.crown ? `<span class="card-crown" title="Vince">${svg('crown')}</span>` : ''}<div class="card-info">${head}`
    + (split && c.tiles?.length ? `<div class="end-tiles" data-n="${c.tiles.length}">${c.tiles.map(tileHtml).join('')}</div>` : '')
    + (medals ? `<ul class="card-trophies" data-n="${c.trophies.length}" aria-label="Trofei">${medals}</ul>` : '')
    + (c.record ? `<p class="card-record" data-mine="${c.record.mine ? 1 : 0}">${esc(c.record.text)}</p>` : '')
    + (c.next ? `<p class="card-next">${esc(c.next)}</p>` : '')
    + `</div></article>`;
}
// HTML del contenitore delle card (#victory-cards): una card, o due una contro l'altra nello stesso schermo
// B57 (foto dell'utente del 16/11 allo stand: «a fine schermata vorrei mettere in evidenza e sopra solo chi ha vinto; sotto
// chi ha perso, non in evidenza ma comunque visibile»): nello stesso schermo la card di chi vince va per prima (sopra, o a
// sinistra), quella di chi perde dopo, attenuata (natpf-hud.css, .end-player[data-won="0"]). A pari (nessun vincitore)
// l'ordine dei giocatori
export const splitOrder = cards => [...cards].sort((a, b) => (b.won ? 1 : 0) - (a.won ? 1 : 0));
export function cardsHtml(model){
  if (!model?.cards?.length) return '';
  const cards = (model.split ? splitOrder(model.cards) : model.cards).map(c => cardHtml(c, { split: model.split }));
  return model.split && cards.length === 2 ? `${cards[0]}<span class="end-vs" aria-hidden="true">VS</span>${cards[1]}` : cards.join('');
}

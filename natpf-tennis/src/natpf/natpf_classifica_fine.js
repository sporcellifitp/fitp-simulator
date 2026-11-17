// B65 · Classifica di oggi a fine partita (FIERA; richiesta dell'utente del 17/11/2026: «a fine partita in fiera vorrei che
// mettessi anche una live scoreboard (tipo una card o una modale) che mostra la top 5 di oggi con annesso punteggio e poi
// scompare. Ha senso far vedere a fine partita anche il posizionamento del giocatore vincente rispetto agli altri (es. Top 5
// e poi sotto il player che ha giocato con sua posizione tipo 200). Classifica giornaliera»). Documento docs/b65/classifica-fine.md.
// Decisioni dell'utente (domande a scelta del 17/11): nello stesso schermo entra in classifica SOLO CHI VINCE, con il
// punteggio di sempre (% di punti vinti × 1,4, il valore del livello Evento: natpf_events.addMatch con split); la classifica
// compare DOPO LA CARD (CLASSIFICA_FINE.delayMs dopo la schermata finale), resta CLASSIFICA_FINE.showMs e poi sparisce; un
// clic o un tasto la chiude prima.
// Cosa mostra: «Classifica di oggi» con le prime 5 partite del giorno (posizione, nome, livello o «stesso schermo», vinta o
// persa con i game, punteggio); la riga di chi ha appena giocato evidenziata. Se è oltre il 5° posto, sotto i «…» la sua
// riga con la posizione (per esempio 200°). Senza nome (Ospite, Player 1 / Player 2 di base) «fuori classifica». Sotto,
// quante partite ci sono oggi.
// Dove: programma Windows (fiera) e server di sviluppo; mai nella sfida tra due computer e nel doppio (che non vanno in
// classifica). Spenta a mano con localStorage natpf-tennis.classificaFine = '0' (le prove nel browser la spengono:
// tools/e2e/th.mjs). Solo questo computer (la classifica è sul PC: natpf_events), niente registro dello stand.
import { matchList } from './natpf_events.js';
import { LEVEL_NAME } from './natpf_who.js';

export const CLASSIFICA_FINE = Object.freeze({ key: 'natpf-tennis.classificaFine', delayMs: 5000, showMs: 8000, top: 5,
  kicker: 'Classifica di oggi', title: 'Partite del giorno' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function dayBoardOn({ desktop = globalThis.natpfDesktop, dev = !!import.meta.env?.DEV, storage = globalThis.localStorage } = {}){
  let off = false; try { off = storage?.getItem(CLASSIFICA_FINE.key) === '0'; } catch {}
  return !off && (!!desktop || !!dev);
}

// Una riga della classifica (funzione pura)
export const boardRow = (e, pos, me = false) => ({ pos, nick: String(e?.nick || ''), score: e?.score | 0, me: !!me,
  detail: `${e?.split ? 'stesso schermo' : LEVEL_NAME[e?.level] || ''} · ${e?.win ? 'vinta' : 'persa'} ${e?.games?.[0] | 0}-${e?.games?.[1] | 0}` });

// Che cosa mostrare (funzione pura). list: le partite di oggi in ordine (natpf_events.matchList); rank: posizione di chi ha
// appena giocato (1…, 0 = non in classifica: senza nome o oltre le partite tenute); guest: senza nome; who: nome da dire
// quando è fuori classifica (nello stesso schermo chi ha vinto)
export function dayBoardView({ list = [], rank = 0, guest = false, who = '', n = CLASSIFICA_FINE.top } = {}){
  const top = list.slice(0, n).map((e, i) => boardRow(e, i + 1, i + 1 === rank));
  const me = rank > n && list[rank - 1] ? boardRow(list[rank - 1], rank, true) : null;
  const out = rank > 0 ? null : guest ? `${who ? `${who}: ` : ''}senza nome, fuori classifica` : null;
  return { top, me, gap: !!me && rank > n + 1, out, total: list.length };
}
export function dayBoardHtml(view){
  const row = r => `<li class="db-row${r.me ? ' me' : ''}" data-pos="${r.pos}"><b class="db-pos">${r.pos}°</b><span class="db-name">${esc(r.nick)}<small>${esc(r.detail)}</small></span><em class="db-score">${r.score}</em></li>`;
  const list = view.top.length ? view.top.map(row).join('') : '<li class="db-empty">Ancora nessuna partita oggi</li>';
  return `<p class="db-kicker">${CLASSIFICA_FINE.kicker}</p><h2 class="db-title">${CLASSIFICA_FINE.title}</h2>`
    + `<ol class="db-list">${list}${view.me ? `${view.gap ? '<li class="db-gap" aria-hidden="true">⋯</li>' : ''}${row(view.me)}` : ''}</ol>`
    + (view.out ? `<p class="db-out">${esc(view.out)}</p>` : '')
    + `<p class="db-foot">${view.total} ${view.total === 1 ? 'partita' : 'partite'} oggi · tocca per chiudere</p>`;
}

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export class NatpfFineClassifica {
  constructor(engine, ui, { now = () => performance.now() } = {}){
    this.engine = engine; this.ui = ui; this.now = now;
    this.state = 'off'; this.at = 0; this.last = null; this.shown = 0;
    if (typeof window === 'undefined') return;
    window.addEventListener('natpf:victory', () => this.arm());
    const close = e => { if (this.state !== 'on') return; e.stopImmediatePropagation?.(); try { e.preventDefault?.(); } catch {} this.hide('tocco'); };
    window.addEventListener('pointerdown', close, { capture: true });
    window.addEventListener('keydown', close, { capture: true });
    // conto dei secondi indipendente dal motore (a schermata finale aperta il motore può non avanzare: pausa, arena ferma)
    const h = setInterval(() => this.tick(), 200); h?.unref?.();
  }
  // una partita da far vedere: contro la CPU o stesso schermo, non in doppio né tra due computer
  _wanted(){
    const ui = this.ui, E = this.engine, m = E.natpfStats?.m;
    if (!dayBoardOn() || !m?.over || m.doubles || E.playerRole === 'p2' || ui.lobby?.mode === 'friend' || !['cpu', 'split'].includes(m.mode)) return null;
    return m;
  }
  // schermata finale appena aperta (evento natpf:victory di hud_ui): la classifica arriva dopo la card
  arm(){
    const m = this._wanted(); if (!m || m === this.last) return false;
    this.last = m; this.state = 'armed'; this.at = this.now() + CLASSIFICA_FINE.delayMs;
    return true;
  }
  // a ogni fotogramma (natpf_ui.tick)
  tick(){
    if (this.state === 'off') return;
    const vm = $('victory-modal'), open = !!vm && !vm.classList.contains('hidden') && this.engine.phase === 'MATCH_OVER';
    if (!open){ this.hide('schermata chiusa'); return; }
    if (this.state === 'armed' && this.now() >= this.at) this.show();
    else if (this.state === 'on' && this.now() >= this.at) this.hide('tempo');
  }
  view(){
    const R = this.ui.stats?.rank || null, ev = this.ui.events;
    const list = matchList(ev?.board);
    return dayBoardView({ list, rank: R?.rank | 0, guest: !!R?.guest || !R, who: R?.who || '' });
  }
  show(){
    const d = typeof document !== 'undefined' ? document : null; if (!d) return false;
    let el = $('natpf-day-board');
    if (!el){ el = d.createElement('div'); el.id = 'natpf-day-board'; el.className = 'natpf-dayboard hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<div class="db-card"></div>'; d.body.appendChild(el); }
    const v = this.view();
    el.querySelector('.db-card').innerHTML = dayBoardHtml(v);
    el.classList.remove('hidden');
    this.state = 'on'; this.at = this.now() + CLASSIFICA_FINE.showMs; this.shown++;
    this.ui.diag?.recorder?.log?.('fine.classifica', { posto: this.ui.stats?.rank?.rank | 0, partite: v.total });
    return true;
  }
  hide(){
    if (this.state === 'off') return false;
    this.state = 'off'; $('natpf-day-board')?.classList.add('hidden');
    return true;
  }
}

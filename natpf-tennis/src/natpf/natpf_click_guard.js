// B39.2 · Guardia del doppio clic (stand con il solo mouse, docs/b39/stand-solo-mouse.md; controllo del 13/11, n. 10).
// Con il mouse un doppio clic, o un clic arrivato «in ritardo» subito dopo un cambio di schermata, sceglieva qualcosa anche
// nella pagina dopo: «Alla partita ›» e «Gioca ›» stanno nello stesso punto (la partita partiva senza scegliere livello e
// personaggi), «Gioca» finiva in «Stesso schermo» o «Sfida un amico», «Allenamento» accendeva la webcam, «‹ Indietro»
// saltava una pagina, «Avanti ›» della guida saltava una scheda, ogni voce a giro del pannello faceva due passi.
// Una sola regola, in cattura sulla finestra (prima di ogni altro gestore), solo per i clic veri del mouse sui pulsanti:
//   • il secondo clic di un doppio clic (detail > 1) non conta;
//   • un clic che arriva meno di GUARD.ms dopo un cambio di schermata (pagina del menu, foglio aperto o chiuso) non conta:
//     era diretto alla schermata di prima.
// Mai per i clic fatti dal codice (el.click(): isTrusted falso), per i tasti (Invio: detail 0), per la calibrazione dello
// schermo (− e + si cliccano in fretta apposta) e per i campi di testo e i cursori.
// Nelle prove automatiche (navigator.webdriver) la seconda regola vale solo con ?guardia=1 nell'indirizzo, come lo schermo
// intero automatico (natpf_screen.autoFullscreen): le prove cliccano subito dopo aver cambiato pagina dal codice.
export const GUARD = Object.freeze({ ms: 450 });
export const GUARDED = 'button, [role="button"], .lobby-tile, .menu-item, a[href]';
export const EXEMPT = '#natpf-calibra, input, textarea, select, [data-allow-dbl]';
// Regola pura. → false (il clic passa), 'doppio' o 'tardi' (il clic non conta)
export function clickVerdict({ trusted = true, detail = 1, now = 0, changedAt = -Infinity, guarded = true, exempt = false, ms = GUARD.ms, late = true } = {}){
  if (!trusted || !guarded || exempt) return false;
  if (detail > 1) return 'doppio';
  if (late && detail >= 1 && now - changedAt < ms) return 'tardi';
  return false;
}
// la regola del clic «in ritardo» vale? (sempre, tranne nelle prove automatiche senza ?guardia=1)
export const lateRule = ({ webdriver = false, search = '' } = {}) => !webdriver || new URLSearchParams(search).get('guardia') === '1';

export class ClickGuard {
  // now: orologio (ms); onDrop(verdict, target): per le prove e il registro
  constructor({ win = globalThis, doc = globalThis.document, now = () => globalThis.performance?.now?.() ?? Date.now(), onDrop = null } = {}){
    Object.assign(this, { win, doc, now, onDrop });
    this.changedAt = -Infinity; this.dropped = [];
    this.late = lateRule({ webdriver: !!globalThis.navigator?.webdriver, search: globalThis.location?.search || '' });
    win?.addEventListener?.('click', e => this.check(e), true);
    // fogli aperti o chiusi (pausa, pannello dello stand, guida, telefono, fine partita…): un cambio di schermata
    const MO = globalThis.MutationObserver;
    if (MO && doc?.body){
      const sheet = '.natpf-sheet-backdrop, .nt-modal-backdrop, .natpf-onboarding';
      this.mo = new MO(records => {
        for (const r of records){
          const t = r.target;
          if (!t?.matches?.(sheet)) continue;
          const was = /(^|\s)hidden(\s|$)/.test(r.oldValue || ''), is = t.classList.contains('hidden');
          if (was !== is){ this.mark(); break; }
        }
      });
      this.mo.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
  }
  // cambio di schermata adesso (la lobby lo segna a ogni pagina nuova)
  mark(){ this.changedAt = this.now(); }
  check(e){
    const t = e?.target, el = t?.closest ? t : t?.parentElement;
    const v = clickVerdict({ trusted: e?.isTrusted === true, detail: e?.detail | 0, now: this.now(), changedAt: this.changedAt,
      guarded: !!el?.closest?.(GUARDED), exempt: !!el?.closest?.(EXEMPT), late: this.late });
    if (!v) return false;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    const what = el?.closest?.(GUARDED);
    this.dropped.push({ v, at: Math.round(this.now()), what: what ? (what.id || what.dataset?.staff || what.dataset?.menu || what.dataset?.mode || what.textContent || '').trim().slice(0, 40) : '' });
    if (this.dropped.length > 30) this.dropped.shift();
    try { this.onDrop?.(v, what); } catch {}
    return v;
  }
}

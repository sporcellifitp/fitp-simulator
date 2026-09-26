// Gettoni: si guadagnano giocando, si spendono in negozi, chioschi e noleggio della golf car.
// Nessun acquisto con denaro vero (il pubblico può includere minori).
import { $, show } from '../core/util.js';
import { hud } from '../ui/hud.js';
import { WELCOME_COINS } from '../content/shop.js';

export function createEconomy(W){
  const st = W.progress.st;
  if (st.coins == null){ st.coins = WELCOME_COINS; W.progress.save(); }
  const paint = () => { $('#coins b').textContent = st.coins; };
  const api = {
    get coins(){ return st.coins; },
    earn(n, why = ''){
      n = Math.round(n); if (n <= 0) return;
      st.coins += n; W.progress.save(); paint();
      // niente messaggio a schermo: il contatore dei gettoni fa un salto e mostra «+n» accanto
      const el = $('#coins'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      const f = document.createElement('em'); f.className = 'plus'; f.textContent = '+' + n; el.appendChild(f); setTimeout(() => f.remove(), 1400);
    },
    spend(n, what = ''){
      if (st.coins < n){ hud.toast(`Servono ${n} gettoni${what ? ' per ' + what : ''}: ne hai ${st.coins}. Giocando ne guadagni altri.`); return false; }
      st.coins -= n; W.progress.save(); paint(); return true;
    },
    paint,
  };
  paint();
  // quanto si guadagna
  const cap = (v, m) => Math.max(0, Math.min(m, Math.floor(v)));
  W.bus.on('game:end', e => {
    const lvl = e.G.opts && e.G.opts.level;
    if (e.id === 'serve') api.earn(cap(e.score/2, 20) + 2, 'sfida al servizio');
    if (e.id === 'vetro') api.earn(cap(e.score/3, 20) + 2, 'il vetro');
    if (e.id === 'raccattapalle') api.earn(cap(e.score/12, 20) + 2, 'raccattapalle');
    if (e.id === 'online') api.earn(e.won ? 35 : 15, e.won ? 'vittoria tra amici' : 'partita tra amici');
    if (e.id === 'tennis' || e.id === 'padel') api.earn(e.won ? (lvl === 'esperto' ? 45 : lvl === 'facile' ? 20 : 30) : 8, e.won ? 'vittoria' : 'partita giocata');
  });
  W.bus.on('badge', () => setTimeout(() => api.earn(10, 'nuova medaglia'), 900));
  W.bus.on('quest', q => { if (q.state === 'done') setTimeout(() => api.earn(q.id === 'medaglie' ? 40 : 20, 'missione completata'), 1800); });
  W.bus.on('poi:first', () => api.earn(3, 'luogo scoperto'));
  return api;
}

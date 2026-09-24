// Progressi del giocatore: medaglie dell'album, missioni, luoghi visitati, oggetti. Salvati nell'archivio (oggi il browser).
import { store } from '../core/store.js';
import { $, show, esc } from '../core/util.js';
import { hud } from '../ui/hud.js';

export const BADGES = [
  { id: 'esploratore', title: 'Esploratore del Foro', desc: 'Visita tutti i luoghi principali' },
  { id: 'vittoria-tennis', title: 'Prima vittoria a tennis', desc: 'Vinci una partita sul Centrale' },
  { id: 'vittoria-padel', title: 'Prima vittoria a padel', desc: 'Vinci una partita di padel in doppio' },
  { id: 'esperto', title: 'Livello esperto', desc: 'Vinci una partita al livello Esperto' },
  { id: 'ace', title: 'Servizio da Centrale', desc: 'Fai almeno 5 ace nella sfida al servizio' },
  { id: 'vetro', title: 'Mano da Major', desc: 'Fai almeno 5 perfetti nella sfida del vetro' },
  { id: 'raccattapalle', title: 'Raccattapalle d\'oro', desc: 'Raccogli tutte le palline in tempo' },
  { id: 'medaglie', title: 'Custode dei Marmi', desc: 'Trova le sei medaglie tra le statue' },
  { id: 'granita', title: 'Consegna speciale', desc: 'Porta la granita a Luca il raccattapalle' },
  { id: 'tifoso', title: 'Tifoso del Foro', desc: 'Lascia un messaggio sulla bacheca dei tifosi' },
  { id: 'sfida', title: 'Sfidante', desc: 'Condividi una sfida con un amico' },
  { id: 'look', title: 'Nuovo look', desc: 'Personalizza il tuo giocatore' },
];

export function createProgress(W){
  const st = store.get('progress', null) || { badges: {}, quests: {}, visited: {}, inv: {}, stats: {} };
  const save = () => store.set('progress', st);
  const api = {
    st,
    has: id => !!st.badges[id],
    badge(id){
      if (st.badges[id]) return false;
      const b = BADGES.find(x => x.id === id); if (!b) return false;
      st.badges[id] = Date.now(); save();
      hud.toast(`Nuova medaglia nell'album: ${b.title}`, 'gold'); W.bus.emit('badge', id);
      return true;
    },
    quest(id){ return (st.quests[id] || {}).state || 'none'; },
    questData(id){ return (st.quests[id] || {}).data || {}; },
    setQuest(id, state, data){ st.quests[id] = { state, data: data ?? (st.quests[id] || {}).data ?? {} }; save(); W.bus.emit('quest', { id, state }); },
    item: k => st.inv[k] || 0,
    give(k, n = 1){ st.inv[k] = Math.max(0, (st.inv[k] || 0) + n); save(); },
    stat(k, n = 1){ st.stats[k] = (st.stats[k] || 0) + n; save(); return st.stats[k]; },
    openAlbum(){
      const got = BADGES.filter(b => st.badges[b.id]).length;
      const html = `<p>${got} medaglie su ${BADGES.length}. Le medaglie restano salvate in questo browser.</p><div class="album">` +
        BADGES.map(b => `<div class="${st.badges[b.id] ? 'got' : ''}"><b>${esc(b.title)}</b><small>${esc(b.desc)}</small></div>`).join('') + '</div>';
      W.setMode('menu');
      hud.panel({ tag: 'Album', title: 'Le tue medaglie', html, buttons: [{ label: 'Chiudi', primary: true }], onClose: () => W.setMode('explore') });
    },
  };
  // luoghi visitati → medaglia dell'esploratore
  const MAIN = ['centrale', 'pietr', 'arena', 'marmi', 'st', 'fontana', 'viale', 'padel', 'esterni', 'ponte'];
  W.bus.on('poi:visit', id => {
    if (st.visited[id]) return;
    st.visited[id] = 1; save();
    const avail = MAIN.filter(k => W.pois.POIS.some(p => p.id === k));
    const n = avail.filter(k => st.visited[k]).length;
    if (n < avail.length) hud.toast(`Luogo scoperto: ${n} di ${avail.length}`);
    else api.badge('esploratore');
  });
  W.bus.on('game:end', e => {
    if (e.id === 'serve' && e.stat2 >= 5) api.badge('ace');
    if (e.id === 'vetro' && e.stat2 >= 5) api.badge('vetro');
    if (e.id === 'tennis' && e.won){ api.badge('vittoria-tennis'); if (e.G.opts.level === 'esperto') api.badge('esperto'); }
    if (e.id === 'padel' && e.won){ api.badge('vittoria-padel'); if (e.G.opts.level === 'esperto') api.badge('esperto'); }
  });
  return api;
}

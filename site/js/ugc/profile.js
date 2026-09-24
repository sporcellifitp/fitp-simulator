// Il giocatore personalizzato: nome generato da parole scelte (niente testo libero, pubblico anche di minori), colori, numero.
import { $, show, esc } from '../core/util.js';
import { store } from '../core/store.js';
import { hud } from '../ui/hud.js';
import { SKINS } from '../entities/avatar.js';
import { encodeChallenge, decodeChallenge } from './challenge.js';

const NOUNS = ['Falco', 'Lupo', 'Delfino', 'Puma', 'Ghepardo', 'Volpe', 'Aquila', 'Lince', 'Tigre', 'Orso', 'Cometa', 'Fulmine', 'Razzo', 'Vento'];
const ADJ = ['Rapido', 'Mancino', 'Solido', 'Instancabile', 'Preciso', 'Elegante', 'Coraggioso', 'Tenace', 'Scattante', 'Leggero', 'Furbo', 'Calmo'];
const COLORS = [0x1f4fa3, 0xffffff, 0xd8342c, 0xf3c623, 0x2b7bd6, 0x2f8f57, 0x0b2a5b, 0xf08a3c, 0x7a3fa0, 0x1d2430, 0xe9e2d0, 0xe36aa0];
const hex = c => '#' + c.toString(16).padStart(6, '0');
const pick = a => a[Math.floor(Math.random()*a.length)];

export function createUgc(W){
  const DEF = { nick: `${pick(NOUNS)} ${pick(ADJ)}`, number: 1 + Math.floor(Math.random()*99), look: { shirt: 0x1f4fa3, shorts: 0xffffff, cap: 0xffffff, skin: 0xe0b48f, hasCap: true } };
  let prof = store.get('profile', null);
  if (!prof){ prof = DEF; store.set('profile', prof); }
  const apply = () => { W.hero.setLook(prof.look); $('#brandNick').textContent = `${prof.nick} · n. ${prof.number}`; };

  /* ---------- editor del giocatore ---------- */
  function openProfile(){
    let draft = JSON.parse(JSON.stringify(prof));
    const sw = (key, list) => `<div class="sw" data-k="${key}">` + list.map(c => `<button style="background:${hex(c)}" data-c="${c}" class="${draft.look[key] === c ? 'on' : ''}" aria-label="colore"></button>`).join('') + '</div>';
    const html = () => `
      <p class="nick"><b>${esc(draft.nick)}</b> · numero ${draft.number}</p>
      <div class="row"><button class="secondary small" data-act="nick">Altro nome</button><button class="secondary small" data-act="num">Altro numero</button></div>
      <label>Maglia</label>${sw('shirt', COLORS)}
      <label>Pantaloncini</label>${sw('shorts', COLORS)}
      <label>Cappellino</label>${sw('cap', COLORS)}
      <div class="row"><button class="secondary small" data-act="cap">${draft.look.hasCap ? 'Senza cappellino' : 'Con cappellino'}</button></div>
      <label>Carnagione</label>${sw('skin', SKINS)}`;
    W.setMode('menu');
    const box = hud.panel({ tag: 'Il tuo giocatore', title: 'Personalizza', html: html(), buttons: [
      { label: 'Salva', primary: true, onClick: () => { prof = draft; store.set('profile', prof); apply(); W.progress.badge('look'); hud.toast('Giocatore aggiornato'); } },
      { label: 'Annulla' },
    ], onClose: () => { apply(); W.setMode('explore'); } });
    const body = box.querySelector('.body');
    const wire = () => {
      body.innerHTML = html();
      body.querySelectorAll('.sw button').forEach(b => b.addEventListener('click', () => { draft.look[b.parentNode.dataset.k] = +b.dataset.c; W.hero.setLook(draft.look); wire(); }));
      body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.act === 'nick') draft.nick = `${pick(NOUNS)} ${pick(ADJ)}`;
        if (b.dataset.act === 'num') draft.number = 1 + Math.floor(Math.random()*99);
        if (b.dataset.act === 'cap') draft.look.hasCap = !draft.look.hasCap;
        W.hero.setLook(draft.look); wire();
      }));
    };
    wire();
  }

  /* ---------- sfide condivisibili ---------- */
  const challenge = {
    pending: null,
    readFromUrl(){
      const m = /[#&]sfida=([^&]+)/.exec(location.hash); if (!m) return null;
      this.pending = decodeChallenge(decodeURIComponent(m[1])); return this.pending;
    },
    share(def, G){
      const code = encodeChallenge({ game: def.id, seed: G.seed, score: G.score, nick: prof.nick });
      if (!code) return;
      const url = location.origin + location.pathname + location.search + '#sfida=' + encodeURIComponent(code);
      const box = $('#shareBox'); box.querySelector('input').value = url; show(box, true);
      const done = () => { hud.toast('Link copiato: mandalo a chi vuoi sfidare'); W.progress.badge('sfida'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => W.progress.badge('sfida'));
      else W.progress.badge('sfida');
    },
  };

  return {
    profile: { get: () => prof, open: openProfile, apply },
    challenge,
  };
}

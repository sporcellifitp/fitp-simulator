// Il giocatore personalizzato: nome composto da parole scelte (niente testo libero, pubblico anche di minori), colori, numero.
// Si crea entrando nel gioco (ugc/characters.js); qui si cambiano carnagione e capelli, i vestiti nel guardaroba.
import { $, show, esc } from '../core/util.js';
import { store, characters } from '../core/store.js';
import { mountPreview } from '../ui/preview.js';
import { creatorOptions } from './characters.js';
import { hud } from '../ui/hud.js';
import { SKINS } from '../entities/avatar.js';
import { encodeChallenge, decodeChallenge } from './challenge.js';

export const NOUNS = ['Falco', 'Lupo', 'Delfino', 'Puma', 'Ghepardo', 'Volpe', 'Aquila', 'Lince', 'Tigre', 'Orso', 'Cometa', 'Fulmine', 'Razzo', 'Vento'];
export const ADJ = ['Rapido', 'Mancino', 'Solido', 'Instancabile', 'Preciso', 'Elegante', 'Coraggioso', 'Tenace', 'Scattante', 'Leggero', 'Furbo', 'Calmo'];
const hex = c => '#' + c.toString(16).padStart(6, '0');
const pick = a => a[Math.floor(Math.random()*a.length)];

export function createUgc(W){
  const DEF = { nick: `${pick(NOUNS)} ${pick(ADJ)}`, number: 1 + Math.floor(Math.random()*99), look: { shirt: 0x1f4fa3, shorts: 0xffffff, cap: 0xffffff, skin: 0xe0b48f, hasCap: true, shoes: 0xf7f7f7, racket: 0x1f4fa3 } };
  let prof = store.get('profile', null);
  if (!prof){ prof = DEF; store.set('profile', prof); }
  const apply = () => { W.hero.setLook(prof.look); $('#brandNick').textContent = `${prof.nick} · n. ${prof.number}`; };

  /* ---------- editor del giocatore: carnagione e capelli, con il personaggio in 3D accanto; i vestiti nel guardaroba ---------- */
  function openProfile(){
    const draft = JSON.parse(JSON.stringify(prof));
    W.setMode('menu');
    let pv = null;
    const box = hud.panel({ tag: 'Il tuo giocatore', title: 'Personalizza', html: '<div class="creator"><div class="pv"></div><div class="opts"></div></div>', buttons: [
      { label: 'Salva', primary: true, onClick: () => save(draft) },
      { label: 'Apri il guardaroba', onClick: () => { save(draft, true); setTimeout(() => W.shop.openWardrobe({ ownedOnly: true, title: 'Il tuo guardaroba' }), 0); } },
      { label: 'Cambia personaggio', onClick: () => setTimeout(() => W.who.open(), 0) },
      { label: 'Annulla' },
    ], onClose: () => { if (pv) pv.unmount(); box.querySelector('.panel').classList.remove('wide'); apply(); if (W.mode === 'menu') W.setMode('explore'); } });
    box.querySelector('.panel').classList.add('wide');
    pv = mountPreview(box.querySelector('.creator .pv'), { ...draft.look });
    creatorOptions(box.querySelector('.creator .opts'), draft, { onChange: d => { pv.setLook(d.look); W.hero.setLook(d.look); } });
    box.querySelector('.creator .opts').insertAdjacentHTML('beforeend', '<p class="fine left">Maglie, cappellini, occhiali e racchette: nel tuo guardaroba, o al Negozio del giocatore nel Fan Village.</p>');
  }
  function save(p, silent = false){
    prof = p; store.set('profile', prof); apply();
    const c = characters.current(); if (c) characters.update({ id: c.id, look: prof.look });
    if (!silent){ W.progress.badge('look'); hud.toast('Giocatore aggiornato'); }
    W.bus.emit('look', prof.look);
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
    profile: { get: () => prof, open: openProfile, apply, save },
    challenge,
  };
}

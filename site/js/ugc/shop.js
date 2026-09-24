// Negozi del Fan Village: il negozio del giocatore (guardaroba dell'avatar), lo Store del torneo (spille da collezione)
// e il punto ristoro (energia per correre più veloci). Si paga in gettoni.
import { esc } from '../core/util.js';
import { hud } from '../ui/hud.js';
import { CATS, WARDROBE, FREE, PINS, FOOD } from '../content/shop.js';

const hex = c => '#' + (c ?? 0xcccccc).toString(16).padStart(6, '0');

export function createShop(W){
  const PR = W.progress, st = PR.st;
  for (const id of FREE) st.owned[id] = 1;
  PR.save();
  const owns = id => !!st.owned[id];
  const profile = () => W.ugc.profile.get();
  const wearing = item => Object.entries(item.look).every(([k, v]) => (profile().look[k] ?? null) === v);
  function equip(item){
    const p = profile(); Object.assign(p.look, item.look); W.ugc.profile.save(p);
  }
  function coinsLine(){ return `<p class="coinsline">Hai <b>${W.economy.coins}</b> gettoni. Li guadagni giocando partite, sfide e missioni.</p>`; }

  /* ---------- negozio del giocatore ---------- */
  function openWardrobe({ ownedOnly = false, title = 'Negozio del giocatore' } = {}){
    let cat = CATS[0].id;
    const html = () => coinsLine() +
      `<div class="tabs">${CATS.map(c => `<button data-cat="${c.id}" class="${c.id === cat ? 'on' : ''}">${esc(c.label)}</button>`).join('')}</div>
       <div class="items">${WARDROBE.filter(i => i.cat === cat && (!ownedOnly || owns(i.id))).map(i => `
        <button data-id="${i.id}" class="item ${wearing(i) ? 'wear' : ''}">
          <i style="background:${hex(i.color)}"></i><b>${esc(i.name)}</b>
          <small>${wearing(i) ? 'Indossato' : owns(i.id) ? 'Tuo: tocca per indossarlo' : i.price + ' gettoni'}</small>
        </button>`).join('')}</div>`;
    W.setMode('menu');
    const box = hud.panel({ tag: 'Fan Village', title, html: html(), buttons: [{ label: 'Chiudi', primary: true }], onClose: () => W.setMode('explore') });
    const body = box.querySelector('.body');
    const wire = () => {
      body.innerHTML = html();
      body.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; wire(); }));
      body.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
        const item = WARDROBE.find(i => i.id === b.dataset.id);
        if (!owns(item.id)){
          if (!W.economy.spend(item.price, item.name)) return;
          st.owned[item.id] = 1; PR.save(); PR.badge('shopping'); hud.toast(`Comprato: ${item.name}`);
        }
        equip(item); wire();
      }));
    };
    wire();
  }

  /* ---------- store del torneo ---------- */
  function openStore(){
    const html = () => coinsLine() + `<p>Spille da collezione: finiscono nel tuo album. Prendile tutte per la medaglia del collezionista.</p>
      <div class="items">${PINS.map(p => `<button data-id="${p.id}" class="item ${st.pins[p.id] ? 'wear' : ''}"><i class="pin" style="background:${hex(p.color)}"></i><b>${esc(p.name)}</b><small>${st.pins[p.id] ? 'Nella tua collezione' : p.price + ' gettoni'}</small></button>`).join('')}</div>`;
    W.setMode('menu');
    const box = hud.panel({ tag: 'Fan Village', title: 'Store del torneo', html: html(), buttons: [{ label: 'Chiudi', primary: true }], onClose: () => W.setMode('explore') });
    const body = box.querySelector('.body');
    const wire = () => {
      body.innerHTML = html();
      body.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
        const pin = PINS.find(p => p.id === b.dataset.id); if (st.pins[pin.id]) return;
        if (!W.economy.spend(pin.price, pin.name)) return;
        st.pins[pin.id] = 1; PR.save(); hud.toast(`${pin.name}: nella collezione`);
        if (PINS.every(p => st.pins[p.id])) PR.badge('collezionista');
        wire();
      }));
    };
    wire();
  }

  /* ---------- punto ristoro ---------- */
  function openFood(){
    W.setMode('menu');
    hud.panel({ tag: 'Punto ristoro', title: 'Qualcosa di fresco?', html: coinsLine() + '<p>Rinfrescarsi dà energia: per un po\' corri più veloce.</p>',
      buttons: FOOD.map(f => ({ label: `${f.name} · ${f.price} gettoni`, onClick: () => {
        if (!W.economy.spend(f.price, f.name)) return;
        W.player.boost(f.boost); hud.toast(`${f.name}: energia per ${f.boost} secondi`);
      } })).concat([{ label: 'No, grazie', primary: true }]), onClose: () => W.setMode('explore') });
  }

  return {
    openWardrobe, openStore, openFood,
    pinsHtml(){
      const n = PINS.filter(p => st.pins[p.id]).length;
      return `<h3 class="albumh">Spille · ${n} di ${PINS.length}</h3><div class="pins">${PINS.map(p => `<span class="${st.pins[p.id] ? 'got' : ''}" title="${esc(p.name)}"><i style="background:${hex(p.color)}"></i>${esc(p.name.replace('Spilla ', ''))}</span>`).join('')}</div>`;
    },
  };
}

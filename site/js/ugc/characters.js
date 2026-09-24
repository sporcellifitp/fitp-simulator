// Entrare con un personaggio: chi è già registrato scrive il nome del suo personaggio, chi è nuovo lo crea,
// vedendolo in 3D accanto alle scelte (ui/preview.js). Nome composto da parole scelte (niente testo libero:
// il nome si vede dagli altri giocatori e il pubblico può includere minori). I personaggi restano nel browser
// (core/store.js): è un profilo locale, non un account. L'accesso vero sarà con myFITP.
import { $, show, esc } from '../core/util.js';
import { characters, charKey } from '../core/store.js';
import { SKINS, DEFAULT_LOOK } from '../entities/avatar.js';
import { WARDROBE, CATS } from '../content/shop.js';
import { NOUNS, ADJ } from './profile.js';
import { mountPreview } from '../ui/preview.js';

const hex = c => '#' + (c ?? 0xcccccc).toString(16).padStart(6, '0');
export const HAIR = [0x3a2a1c, 0x1d1d1f, 0x6b3b1c, 0xc9a45c, 0xa23b2a, 0xd8d8d8];
const pick = a => a[Math.floor(Math.random()*a.length)];

// pannello delle scelte: nome (se si può cambiare), carnagione, capelli e, alla registrazione, i capi di base
export function creatorOptions(box, draft, { name = false, clothes = false, nameBox = null, onChange = () => {} } = {}){
  const free = cat => WARDROBE.filter(i => i.cat === cat && i.price === 0);
  const wearing = i => Object.entries(i.look).every(([k, v]) => (draft.look[k] ?? DEFAULT_LOOK[k] ?? null) === v);
  const sw = (label, key, list) => `<label>${label}</label><div class="sw" data-k="${key}">${list.map(c => `<button style="background:${hex(c)}" data-c="${c}" class="${draft.look[key] === c ? 'on' : ''}" aria-label="${label}"></button>`).join('')}</div>`;
  const render = () => {
    const nameHtml = name ? `
      <label>Nome del personaggio</label>
      <div class="namepick"><select data-n="noun">${NOUNS.map(n => `<option ${draft.nick.split(' ')[0] === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <select data-n="adj">${ADJ.map(a => `<option ${draft.nick.split(' ')[1] === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        <span class="num"><button data-num="-1" aria-label="numero precedente">−</button><b>${draft.number}</b><button data-num="1" aria-label="numero successivo">+</button></span></div>
      <p class="fine left">Ti chiamerai <b>${esc(draft.nick)} ${draft.number}</b>: ricordatelo, serve per rientrare.</p>` : `<p class="nick"><b>${esc(draft.nick)}</b> · numero ${draft.number}</p>`;
    // il nome può stare in una riga a tutta larghezza sopra l'anteprima (sul telefono la colonna è stretta)
    if (nameBox) nameBox.innerHTML = nameHtml;
    const root = nameBox || box;
    box.innerHTML = (nameBox ? '' : nameHtml) +
      sw('Carnagione', 'skin', SKINS) +
      (draft.look.hasCap ? '' : sw('Capelli', 'hair', HAIR)) +
      (clothes ? CATS.filter(c => free(c.id).length > 1).map(c => `<label>${c.label}</label><div class="items mini" data-cat="${c.id}">${free(c.id).map(i => `<button data-id="${i.id}" class="${wearing(i) ? 'on' : ''}" title="${esc(i.name)}"><i style="background:${hex(i.color)}"></i>${esc(i.name.replace(/^(Maglia|Pantaloncini|Scarpe|Racchetta|Cappellino) /, ''))}</button>`).join('')}</div>`).join('') : '');
    box.querySelectorAll('.sw button').forEach(b => b.addEventListener('click', () => { draft.look[b.parentNode.dataset.k] = +b.dataset.c; changed(); }));
    box.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => { Object.assign(draft.look, WARDROBE.find(i => i.id === b.dataset.id).look); changed(); }));
    root.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { const [n, a] = [root.querySelector('[data-n="noun"]').value, root.querySelector('[data-n="adj"]').value]; draft.nick = `${n} ${a}`; changed(); }));
    root.querySelectorAll('[data-num]').forEach(b => b.addEventListener('click', () => { draft.number = ((draft.number - 1 + +b.dataset.num + 99) % 99) + 1; changed(); }));
  };
  const changed = () => { const top = box.scrollTop; render(); box.scrollTop = top; onChange(draft); };
  render();
  return { render };
}

export function createCharacters(W, { onEnter }){
  const el = $('#who');
  let preview = null;
  const step = s => { el.querySelectorAll('.step').forEach(x => show(x, x.dataset.step === s)); if (s !== 'new' && preview){ preview.unmount(); preview = null; } };
  const close = () => { show(el, false); document.body.classList.remove('who-open'); if (preview){ preview.unmount(); preview = null; } };
  const enter = () => { close(); onEnter(); };
  // cambiare personaggio: la pagina si ricarica con i suoi dati e si entra da soli
  const switchTo = c => { characters.use(c); $('#whoBusy').textContent = `Carico ${c.nick} ${c.number}…`; step('busy'); setTimeout(() => location.reload(), 150); };

  function open(){
    const list = characters.list();
    $('#whoList').innerHTML = list.map(c => `<option value="${esc(c.nick)} ${c.number}">`).join('');
    const mine = $('#whoMine');
    mine.innerHTML = list.length ? `<small>Su questo dispositivo:</small> ${list.map(c => `<button data-fill="${esc(c.nick)} ${c.number}">${esc(c.nick)} ${c.number}</button>`).join('')}` : '';
    mine.querySelectorAll('[data-fill]').forEach(b => b.addEventListener('click', () => { $('#whoName').value = b.dataset.fill; login(); }));
    show('#whoErr', false); $('#whoName').value = '';
    show(el, true); step('ask'); document.body.classList.add('who-open');
  }
  function login(){
    const name = $('#whoName').value.trim(), c = name && characters.find(name);
    if (!c){
      $('#whoErr').innerHTML = name ? `Non trovo «${esc(name)}» su questo dispositivo. I personaggi restano nel browser in cui li hai creati: prova da lì, oppure <button class="link" data-go="new">creane uno nuovo</button>.` : 'Scrivi il nome del tuo personaggio, per esempio «Falco Rapido 21».';
      show('#whoErr', true); $('#whoErr').querySelector('[data-go]') && $('#whoErr').querySelector('[data-go]').addEventListener('click', () => startNew());
      return;
    }
    if (c.key === characters.active){ W.ugc.profile.save({ ...W.ugc.profile.get(), nick: c.nick, number: c.number }, true); enter(); }
    else switchTo(c);
  }
  function startNew(){
    step('new');
    const draft = { nick: `${pick(NOUNS)} ${pick(ADJ)}`, number: 1 + Math.floor(Math.random()*99), look: { ...DEFAULT_LOOK, shirt: 0x1f4fa3, shorts: 0xffffff, hasCap: true, cap: 0xffffff, stripe: null, headband: null, glasses: false, wrist: null } };
    // numero libero: se il nome esiste già su questo dispositivo, si prova il successivo
    while (characters.list().some(c => c.id === charKey(draft.nick, draft.number))) draft.number = draft.number % 99 + 1;
    preview = mountPreview(el.querySelector('.creator .pv'), draft.look);
    const chk = () => { const taken = characters.list().some(c => c.id === charKey(draft.nick, draft.number)); show('#whoTaken', taken); $('#whoCreate').disabled = taken; };
    creatorOptions(el.querySelector('.creator .opts'), draft, { name: true, clothes: true, nameBox: el.querySelector('.namebox'), onChange: d => { preview.setLook(d.look); chk(); } });
    chk();
    $('#whoCreate').onclick = () => {
      const r = characters.register(draft.nick, draft.number, draft.look);
      if (r.error){ chk(); return; }
      if (r.needsReload) switchTo(r.char);
      else { W.ugc.profile.save({ nick: draft.nick, number: draft.number, look: draft.look }, true); W.shop && W.shop.grantFree && W.shop.grantFree(draft.look); enter(); }
    };
  }
  el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const g = b.dataset.go; if (g === 'new') startNew(); else { step(g); if (g === 'login') setTimeout(() => $('#whoName').focus(), 50); } }));
  $('#whoEnter').addEventListener('click', login);
  $('#whoName').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#whoClose').addEventListener('click', close);
  return { open, current: () => characters.current(), list: () => characters.list() };
}

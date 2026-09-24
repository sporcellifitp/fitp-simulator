// Archivio dei dati del giocatore. Oggi è il browser (localStorage); l'interfaccia è pensata per passare a un server
// (profilo myFITP, UGC moderati) cambiando solo questo modulo.
//
// Personaggi: sullo stesso dispositivo se ne possono avere più di uno. L'elenco sta in «fiw.characters», quello
// attivo in «fiw.active». Ogni personaggio ha i suoi dati (gettoni, medaglie, guardaroba…) sotto un prefisso proprio;
// il primo usa il prefisso storico «fiw.», così chi giocava prima della v0.6 non perde nulla.
const ROOT = 'fiw.';
const raw = {
  get(k){ try { return localStorage.getItem(ROOT + k); } catch (e){ return null; } },
  set(k, v){ try { localStorage.setItem(ROOT + k, v); } catch (e){} },
  del(k){ try { localStorage.removeItem(ROOT + k); } catch (e){} },
};
const jget = (k, def) => { const v = raw.get(k); if (v == null) return def; try { return JSON.parse(v); } catch (e){ return def; } };
const ACTIVE = raw.get('active') || '';
const PREFIX = ACTIVE ? 'c.' + ACTIVE + '.' : '';
function safeGet(k){ return raw.get(PREFIX + k); }
function safeSet(k, v){ raw.set(PREFIX + k, v); }

export const store = {
  get(k, def = null){ const v = safeGet(k); if (v == null) return def; try { return JSON.parse(v); } catch (e){ return def; } },
  set(k, v){ safeSet(k, JSON.stringify(v)); },
  // record numerici dei minigiochi (compatibili con le chiavi della v0.3)
  best(k){ const v = safeGet(k.replace(ROOT, '')); return parseInt(v || '0', 10) || 0; },
  setBest(k, n){ safeSet(k.replace(ROOT, ''), String(n)); },
};

// nome del personaggio → chiave: «Falco Rapido 21» → «falco-rapido-21»
export const charKey = (nick, number) => (nick + ' ' + number).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const characters = {
  active: ACTIVE,
  list(){ return jget('characters', []); },
  // si può scrivere il nome con o senza numero («Falco Rapido 21» o «falco rapido», se è l'unico)
  find(name){
    const k = charKey(name, '').replace(/-$/, ''), list = this.list();
    const exact = list.find(c => c.id === k); if (exact) return exact;
    const byNick = list.filter(c => charKey(c.nick, '').replace(/-$/, '') === k);
    return byNick.length === 1 ? byNick[0] : null;
  },
  // registra un personaggio: il primo prende i dati già presenti nel browser, gli altri partono da zero
  register(nick, number, look){
    const list = this.list(), id = charKey(nick, number);
    if (list.some(c => c.id === id)) return { error: 'exists' };
    const first = !list.length;
    const c = { id, key: first ? '' : id, nick, number, look, created: Date.now() };
    list.push(c); raw.set('characters', JSON.stringify(list));
    if (c.key) raw.set('c.' + c.key + '.profile', JSON.stringify({ nick, number, look }));   // il nuovo personaggio parte con il suo aspetto
    return { char: c, needsReload: c.key !== ACTIVE };
  },
  update(c){ const list = this.list(), i = list.findIndex(x => x.id === c.id); if (i >= 0){ list[i] = { ...list[i], ...c }; raw.set('characters', JSON.stringify(list)); } },
  // cambiare personaggio vuol dire ricaricare la pagina con il suo prefisso
  use(c){ raw.set('active', c.key); raw.set('autoenter', '1'); },
  takeAutoEnter(){ const v = raw.get('autoenter'); if (v) raw.del('autoenter'); return !!v; },
  current(){ return this.list().find(c => c.key === ACTIVE) || null; },
};

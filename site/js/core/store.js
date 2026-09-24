// Archivio dei dati del giocatore. Oggi è il browser (localStorage); l'interfaccia è pensata per passare a un server
// (profilo myFITP, UGC moderati) cambiando solo questo modulo.
const PREFIX = 'fiw.';
function safeGet(k){ try { return localStorage.getItem(PREFIX + k); } catch (e){ return null; } }
function safeSet(k, v){ try { localStorage.setItem(PREFIX + k, v); } catch (e){} }

export const store = {
  get(k, def = null){ const v = safeGet(k); if (v == null) return def; try { return JSON.parse(v); } catch (e){ return def; } },
  set(k, v){ safeSet(k, JSON.stringify(v)); },
  // record numerici dei minigiochi (compatibili con le chiavi della v0.3)
  best(k){ const v = safeGet(k.replace(PREFIX, '')); return parseInt(v || '0', 10) || 0; },
  setBest(k, n){ safeSet(k.replace(PREFIX, ''), String(n)); },
};

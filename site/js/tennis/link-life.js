// B45.1 «telefono che non si scollega» (14/11, docs/b45/b45-1-collegamento.md): regole del collegamento telefono–computer
// che prima stavano dentro link.js (computer) e racchetta.js (telefono), qui come funzioni pure provate dai test.
//
// Controllo di vita. Prima: 5 s senza messaggi del canale affidabile su uno dei due lati e il collegamento si chiudeva; il
// lato rimasto fermo (pagina bloccata) lo dichiarava appena ripartito, prima di leggere i messaggi in coda. In laboratorio
// (docs/b45/telefono-che-si-scollega.md §3) un buco della Wi-Fi di 5 s faceva sempre cadere il telefono, e il browser da
// solo non aveva visto niente. Ora: ogni messaggio vale come segno di vita (anche i sensori e il canale veloce, dove il
// computer manda anche il suo battito), la caduta si dichiara dopo LIFE.silentMs (10 s) di silenzio vero, e un controllo
// arrivato in ritardo di oltre LIFE.lateMs (il lato stesso era fermo) per quel giro non giudica: prima si legge la coda.
export const LIFE = Object.freeze({ tickMs: 1000, silentMs: 10000, lateMs: 2500 });
// now, lastSeen: ms (stesso orologio); prevTick: istante del controllo di prima (null al primo). → { drop, late, silence }
export function lifeCheck({ now = 0, lastSeen = 0, prevTick = null, silentMs = LIFE.silentMs, lateMs = LIFE.lateMs, tickMs = LIFE.tickMs } = {}){
  const late = Number.isFinite(prevTick) ? Math.max(0, now - prevTick - tickMs) : 0, silence = Math.max(0, now - lastSeen);
  return { drop: late <= lateMs && silence > silentMs, late, silence };
}

// Tentativi del telefono dopo una caduta: attesa che cresce di RETRY.stepMs fino a RETRY.maxMs. Senza fine in LAN (programma
// Windows: niente server esterni da non tempestare; un buco lungo della Wi-Fi, un router riavviato o un canale con il radar
// che tace per un minuto non diventano più una caduta per sempre) e per il telefono dello stand; via internet RETRY.tries
// tentativi e poi «Riprova». Prima la racchetta col QR smetteva dopo 10 anche in LAN, dicendo ancora «Riprovo da solo».
// tries: tentativi già fatti dopo l'ultima caduta. → { again, waitMs }
export const RETRY = Object.freeze({ stepMs: 1000, maxMs: 6000, tries: 10 });
export function retryPlan({ tries = 0, stand = false, lan = false } = {}){
  const again = !!stand || !!lan || tries < RETRY.tries;
  return { again, waitMs: again ? Math.min(RETRY.maxMs, RETRY.stepMs*(Math.max(0, tries) + 1)) : null };
}
// testo del telefono dopo una caduta (why: il motivo del tentativo non riuscito, netWhy): vero in tutti e due i casi
export const lostText = (why, again) => `${why ? `${why} ` : ''}${again ? 'Riprovo da solo tra poco.' : 'Tocca «Riprova».'}`;

// Rete tornata o cambiata sul telefono (evento 'online', o cambio del TIPO di navigator.connection: Chrome su Android; le
// stime rtt/downlink/effectiveType cambiano di continuo e non contano): si riprova subito? Solo in attesa del prossimo
// tentativo ('lost') e con la pagina in vista. Mai da collegato ('on': decide il controllo di vita) e mai a tentativo in
// corso ('connecting': ha il suo tempo, LINK_TIMES.phoneMs, e a canale aperto ci sono il benvenuto e la prova della chiave
// del telefono dello stand, che un tentativo nuovo troncherebbe; revisione dell'analisi B45)
export function kickNow({ linkState = 'off', hidden = false } = {}){
  return !hidden && linkState === 'lost';
}
// tipo di rete cambiato davvero (prima e dopo noti: un browser che non lo dà non fa mai ripartire niente)
export const netTypeChanged = (prev, next) => typeof prev === 'string' && typeof next === 'string' && !!next && prev !== next;

// Racconto della caduta del telefono, per il computer: perché (w), quando (at, orologio del telefono), tentativi dopo,
// rete. Si dice una volta sola, nel primo messaggio «dev» dopo il benvenuto (cd: { w, ms, prove, fallite, tipo?, rete? },
// con l'età in ms al posto dell'ora: niente orologi da allineare); i computer di prima ignorano il campo. store: memoria
// della scheda (sessionStorage della pagina: il racconto resta anche se la pagina del telefono si ricarica)
// Parole del telefono: silenzio (il suo controllo di vita), chiuso (canale chiuso dall'altra parte o errore), nascosta
// (pagina nascosta poco prima), pagina (pagina chiusa o ricaricata), ricollega («Ricollega»), rete (rete cambiata).
export const STORY_WORDS = Object.freeze(['silenzio', 'chiuso', 'nascosta', 'pagina', 'ricollega', 'rete']);
// ultimo cambio di rete o di visibilità entro questo tempo dalla caduta: è quello il motivo
export const STORY_RECENT_MS = 15000;
// (pagina nascosta prima della rete: con lo schermo spento Android può staccare anche la Wi-Fi, ed è lo schermo il motivo)
export function storyWord(cause, { now = 0, hidden = false, hiddenAt = null, visibleAt = null, netAt = null } = {}){
  if (cause === 'pagina' || cause === 'ricollega') return cause;
  if (hidden || (Number.isFinite(visibleAt) && Number.isFinite(hiddenAt) && now - visibleAt <= STORY_RECENT_MS)) return 'nascosta';
  if (Number.isFinite(netAt) && now - netAt <= STORY_RECENT_MS) return 'rete';
  return STORY_WORDS.includes(cause) ? cause : 'chiuso';
}
export function createDropStory({ store = null, now = () => Date.now(), key = 'cad' } = {}){
  let s = null;
  try { const v = store?.get?.(key); if (v && STORY_WORDS.includes(v.w) && Number.isFinite(v.at)) s = v; } catch {}
  const save = () => { try { store?.set?.(key, s); } catch {} };
  return {
    get last(){ return s; },
    // caduta di un collegamento che andava (non un tentativo non riuscito)
    drop(w, extra = {}){ s = { w: STORY_WORDS.includes(w) ? w : 'chiuso', at: now(), prove: 0, fallite: 0, told: false, ...extra }; save(); },
    // un tentativo dopo la caduta (ok: arrivato al benvenuto)
    attempt(ok){ if (!s || s.told) return; s.prove++; if (!ok) s.fallite++; save(); },
    // per il «dev» dopo il benvenuto: il racconto una volta sola (poi null)
    tell(){
      if (!s || s.told) return null;
      s.told = true; save();
      return { w: s.w, ms: Math.max(0, Math.round(now() - s.at)), prove: s.prove, fallite: s.fallite, ...(typeof s.tipo === 'string' && s.tipo ? { tipo: s.tipo.slice(0, 12) } : {}), ...(s.rete ? { rete: 1 } : {}) };
    },
  };
}
// lettura del racconto sul computer (campo cd del messaggio «dev»): solo parole e numeri previsti
export function readStory(cd){
  if (!cd || typeof cd !== 'object' || !STORY_WORDS.includes(cd.w)) return null;
  const n = v => (Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return { w: cd.w, ms: n(cd.ms), prove: Math.min(n(cd.prove), 9999), fallite: Math.min(n(cd.fallite), 9999), ...(typeof cd.tipo === 'string' && /^[a-z-]{1,12}$/.test(cd.tipo) ? { tipo: cd.tipo } : {}), ...(cd.rete === 1 ? { rete: 1 } : {}) };
}
// Parola del telefono nel messaggio breve «cl» mandato prima di chiudere il canale (quando può): il computer la usa per il
// motivo della caduta che vede subito dopo
export const CLOSE_WORDS = Object.freeze(['silenzio', 'ricollega', 'pagina', 'scollega']);
// Motivo di una chiusura del canale vista dal computer (evento «drop» di link.js), dal più sicuro: «Ricollega» chiesto dal
// gioco da poco (causa computer), la parola breve del telefono («cl») appena arrivata, la pagina del telefono nascosta nel
// suo ultimo segnale; poi il silenzio: se il computer non sentiva il telefono da almeno CLOSE_RECENT_MS.silent, il canale
// l'ha chiuso il controllo di vita del telefono (la sua parola «cl» si è persa con la rete) o il browser che ha dato la
// strada per persa (failed: causa computer). Altrimenti «chiuso» dal telefono. silentMs: da quanto il computer non sentiva
// il telefono. → { motivo, causa } con i motivi di natpf_cadute.js
export const CLOSE_RECENT_MS = Object.freeze({ said: 5000, relink: 15000, silent: LIFE.silentMs/2 });
const SAID = Object.freeze({ ricollega: 'ricollega', pagina: 'telefono: pagina chiusa', silenzio: 'silenzio', scollega: 'telefono: scollegato' });
export function closeMotivo({ said = null, saidAgeMs = Infinity, relinkAgeMs = Infinity, hidden = false, failed = false, silentMs = 0 } = {}){
  if (relinkAgeMs <= CLOSE_RECENT_MS.relink) return { motivo: 'ricollega', causa: 'computer' };
  if (SAID[said] && saidAgeMs <= CLOSE_RECENT_MS.said) return { motivo: SAID[said], causa: 'telefono' };
  if (hidden) return { motivo: 'telefono: pagina nascosta', causa: 'telefono' };
  if (Number.isFinite(silentMs) && silentMs >= CLOSE_RECENT_MS.silent) return { motivo: 'silenzio', causa: failed ? 'computer' : 'telefono' };
  return { motivo: 'chiuso', causa: failed ? 'computer' : 'telefono' };
}
// Telefono che si muove (per il chiosco: chi prende in mano il telefono è qualcuno allo stand): velocità di rotazione oltre
// MOVE.dps gradi al secondo su un asse. Un telefono sul tavolo sta sotto 1, in una mano ferma qualche grado al secondo
export const MOVE = Object.freeze({ dps: 25 });
export const moving = rot => Array.isArray(rot) && rot.some(v => Number.isFinite(v) && Math.abs(v) > MOVE.dps);

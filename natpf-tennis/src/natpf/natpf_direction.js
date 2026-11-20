// B36 · Direzione dei colpi (docs/b36/piano-direzionalita.md).
// Tappa B36.0 «Misurare prima» (docs/b36/misure-b36-0.md): i nomi che il registro dello stand
// (registro/registro_registratore.js) e i banchi (scripts/audit/rally-balance.mjs, b19/due-umani*.mjs,
// direzione-telefono.mjs) usano per la direzione, così le tappe dopo li riempiono senza cambiare il formato del registro né
// ricaricare il Worker:
//   - modello della direzione di una partita: engine.natpfDirModel ('classica' | 'nuova'), letto a inizio partita
//     (game_engine.natpfReadDir: dirModelFor; dalla revisione del B73 anche all'inizio di minigiochi, riscaldamento e
//     scambi di prova) e scritto nel registro in ogni riga «partita» e «minigioco» (campo dir);
//   - colpo giocato con la regola nuova: lo dice l'esito del colpo (out.rule === 'nuova'; campo nr della riga «colpo»).
//
// Tappa B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md, richiesta dell'utente del 20/11: «vai avanti»).
// Interruttore dello staff «Direzione dei colpi: Classica · Nuova» nel pannello dello stand, accanto a «Mira del telefono».
// «Classica» è il valore di base e il gioco di sempre, identico. «Nuova» è IN LAVORAZIONE, NON DA PROVARE (il piano la apre
// alle persone al traguardo A, dopo le tappe B36.3–B36.5). Con «Nuova», solo per i colpi dei telefoni con la forma del
// colpo (intenzione dal telefono, non ricostruita: webcam, mouse, tastiera e telefoni vecchi restano con la regola di oggi)
// e non per la schiacciata (il piano la lascia com'è):
//   • la cima comanda: la mira è il piatto (natpf_stroke_intent.faceAimFromDev, la curva di oggi: piena alla mira piena
//     dello staff, 17/20/23°, poi in calo tra 45° e 60°) meno c · 0,3 · tempo (DIRECTION.timeWeight; c = +1 dritto del
//     destro e rovescio del mancino, −1 l'altro lato). Oggi il tempo pesa quanto il piatto (1);
//   • niente spinta naturale verso l'incrociato (DIRECTION.natural 0; oggi 0,1);
//   • punto neutro al centro del campo (DIRECTION.follow 0; oggi segue la palla al 40%);
//   • il ritmo esce dalla direzione: il tempo è quello vero con il solo ritardo abituale del B35a tolto (lag), non più
//     rispetto al proprio tempo abituale (rRest);
//   • scarto della cima che manca (aimDev nullo: centro non ancora imparato, gesto verticale, telefono senza direzione):
//     piatto 0 con la regola nuova, mai il ritorno alla regola di oggi;
//   • bordi, aria, profondità, voto, finestra d'impatto, scambio caldo: come oggi;
//   • colpo super: quando scatta e cosa fa (profondità, altezza sul nastro, effetto, velocità) come oggi; la direzione è
//     quella del colpo da cui nasce, cioè la regola nuova (piano §5.2, chiarito nella revisione del B73).
// Dove si cambia: pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows, 3 s sul marchio NATPF del menu, ❚❚ tenuto
// 3 s in campo) → «Direzione dei colpi». Resta salvata (localStorage, chiave natpf-tennis.direzione: 'classica' | 'nuova';
// senza chiave «Classica»); il chiosco e «Nuovo giocatore» non la toccano (è dello stand, non di chi gioca). Vale dalla
// prossima partita o attività: il motore la legge (game_engine.natpfReadDir) a inizio partita e all'inizio di minigiochi,
// riscaldamento e allenamento, scambi di prova (non con «Ricalibra» a partita in corso: la partita tiene la sua regola);
// nella sfida tra due computer la manda al P2 con lo snapshot (campo dir), che la usa per la previsione locale del proprio
// colpo. engine.natpfDirRule a mano (test e banchi) comanda.
export const DIR_MODELS = Object.freeze(['classica', 'nuova']);
export const DIR_DEFAULT = 'classica';
export const dirModelOf = engine => (DIR_MODELS.includes(engine?.natpfDirModel) ? engine.natpfDirModel : DIR_DEFAULT);
export const usedNewRule = out => out?.rule === 'nuova';
// Giocatori simulati dei banchi (B36.0): lo scarto della cima in gradi (natpf.aimDev) che dà un piatto f, l'inversa di
// natpf_stroke_intent.faceAimFromDev (zona morta INTENT.faceDead, mira piena a `full` gradi). Senza il tetto: f oltre ±1
// (il piatto che il gioco di oggi taglia a ±1) è uno scarto oltre la mira piena, come una persona che gira di più
export const FACE_DEAD = 3;
export const devOfFace = (f, full = 17) => (Number.isFinite(f) && f ? Math.sign(f)*(FACE_DEAD + Math.abs(f)*(full - FACE_DEAD)) : 0);

// B36.1: valori della regola nuova (docs/b36/piano-direzionalita.md §4.2 e §8, B36.1). timeWeight: peso del tempo nella mira
// (oggi OUTCOME.timingAim 1); natural: spinta verso l'incrociato con il tempo neutro (oggi OUTCOME.natural 0,1); follow:
// quanto il punto neutro segue la palla (oggi OUTCOME.follow 0,4)
export const DIRECTION = Object.freeze({ timeWeight: .3, natural: 0, follow: 0 });
// la regola nuova vale per questo colpo? Modello «nuova», intenzione dal telefono con la forma del colpo (non ricostruita:
// natpf_stroke_outcome.eventIntent mette derived) e colpo che non sia la schiacciata
export const newRuleFor = (model, intent, shot = intent?.shot) =>
  model === 'nuova' && !!intent && typeof intent === 'object' && !intent.derived && String(shot || '').toUpperCase() !== 'SMASH';

// opzione dello staff, salvata su questo computer
export const DIR_KEY = 'natpf-tennis.direzione';
export const dirModelFrom = v => (DIR_MODELS.includes(v) ? v : DIR_DEFAULT);
export function readDirModel({ storage = globalThis.localStorage } = {}){
  try { return dirModelFrom(storage?.getItem(DIR_KEY)); } catch { return DIR_DEFAULT; }
}
export function writeDirModel(model, { storage = globalThis.localStorage } = {}){
  const v = dirModelFrom(model);
  try { storage?.setItem(DIR_KEY, v); } catch {}
  return v;
}
export const nextDirModel = model => (dirModelFrom(model) === 'nuova' ? 'classica' : 'nuova');
// modello della partita che comincia: `forced` a mano (engine.natpfDirRule: test e banchi) comanda sulla scelta salvata
export const dirModelFor = ({ forced = null, storage = globalThis.localStorage } = {}) => (DIR_MODELS.includes(forced) ? forced : readDirModel({ storage }));

// pannello dello stand: scritta del pulsante e avviso dopo il clic (funzioni pure). Fino al traguardo A la regola nuova dice
// che è in lavorazione e non da provare (piano §8)
export const DIR_WIP = 'in lavorazione, non da provare';
export const dirButton = model => (dirModelFrom(model) === 'nuova' ? 'Nuova · in lavorazione' : 'Classica');
export const dirToast = model => `${dirModelFrom(model) === 'nuova'
  ? `Direzione dei colpi: Nuova (${DIR_WIP}): con il telefono la cima decide la direzione, il momento del colpo la ritocca`
  : 'Direzione dei colpi: Classica, come sempre'}. Vale dalla prossima partita o minigioco; resta salvata`;

// Zona del rimbalzo per chi colpisce (banchi e prove; la parola sullo schermo arriva con la B36.6): x nel riferimento di chi
// colpisce (m, + a destra), contact +1 dritto del destro e rovescio del mancino, −1 l'altro lato. Lungolinea oltre `line` m
// dal centro dalla parte del colpo, incrociato oltre `line` m dall'altra parte, centro in mezzo (come il banco
// scripts/audit/direzione-telefono.mjs, LINE)
export const ZONE_LINE = 1.25;
export const zoneOf = (x, contact = 1, line = ZONE_LINE) => {
  const v = (contact >= 0 ? 1 : -1)*(Number.isFinite(x) ? x : 0);
  return v >= line ? 'lungolinea' : v <= -line ? 'incrociato' : 'centro';
};

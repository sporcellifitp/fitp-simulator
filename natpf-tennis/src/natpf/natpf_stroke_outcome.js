// Telefono come racchetta: dall'intenzione e dall'esecuzione all'esito del colpo di chi gioca, senza caso
// (docs/NATPF_RACCHETTA_VIRTUALE.md §3 e §6). Lo usa il motore all'istante dell'impatto, quando sa dov'è la palla.
//
//   • intenzione (natpf_stroke_intent.js): tipo di colpo, forza, profondità voluta, salita, mira del piatto;
//   • tempo: dentro la finestra comoda (± timingSpan del livello) è una scelta, come nei giochi con il controller di
//     movimento: in anticipo la palla va incrociata, in ritardo lungolinea. Oltre la finestra è un errore di esecuzione:
//     la palla continua ad andare verso l'esterno (fino alla fine della finestra d'impatto, dove esce), più corta, più
//     alta e più lenta;
//   • campo aperto: la mira si misura attorno a un punto neutro che segue la posizione della palla all'impatto, e va da
//     una riga laterale all'altra; la profondità va dalla riga del servizio (e prima) alla riga di fondo. Tutto è
//     continuo: niente bersagli, zone, gradini o tetti che mettono molte palle nello stesso punto;
//   • allungo e preparazione tolgono qualità come prima (reachQuality, prepQuality di natpf_skill.js).
// Assistenza: con un gesto ragionevole (tempo dentro la finestra e qualità sufficiente) la palla resta in campo, avvicinata
// alle righe senza superarle e senza cambiare l'ordine delle direzioni; sfuma oltre la finestra e sotto la qualità del
// livello. Escono solo i colpi estremi. Stessi ingressi, stesso esito.
import { ARC, flightForClear, swingGrade, timingUnits } from './natpf_skill.js';
import { netOff } from './natpf_net_play.js'; // B31: regole del gioco a rete (spente solo nelle prove di confronto)

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const lerp = (a, b, u) => a + (b - a)*clamp(u);

export const OUTCOME = Object.freeze({
  natural: .1,        // un colpo neutro va un poco incrociato (il colpo più sicuro); la spinta sparisce verso i bordi della
                      // finestra (23/10: prima valeva anche in ritardo e il lungolinea pieno chiedeva anche il piatto).
                      // 29/10: era .15; richiesta «angolazione più sensibile, vanno quasi tutti nella stessa direzione»
  timingAim: 1,       // tempo dentro la finestra → mira: ai bordi (±1 unità) incrociato e lungolinea pieni (era .72)
  // piatto girato rispetto al proprio colpo abituale: fino a .6 della mira piena (circa 2,2 m). Era .32 (1,2 m):
  // chi colpisce «a tempo» (t ≈ 0, come fa chiunque guardi la palla) mandava ogni palla nello stesso punto, perché il
  // tempo è il controllo principale ma un umano lo varia poco senza volerlo; il piatto, che si gira apposta, è il
  // controllo che si sceglie. Il tempo resta più forte: al bordo della finestra il piatto non lo scavalca (27/10)
  // 29/10 pomeriggio (segnalazione «la palla finisce quasi sempre al centro, indipendentemente dal movimento»): 1. Il
  // tempo, il controllo principale, a chi gioca resta quasi uguale (colpi trattenuti fino all'arrivo della palla e
  // ritmo personale al centro: nella partita 131307 mediana 0,2 unità), e il piatto, che cambia con il movimento, era
  // tenuto al 60%: le palle cadevano tra −2,5 e +3 m. Ora il piatto da solo arriva alle righe; tempo e piatto si sommano
  faceAim: 1,
  // palla fuori di lato: quanto fuori, al massimo (m oltre la riga laterale del singolare, sideLine). Oltre la finestra
  // tempo e piatto nello stesso verso si sommano senza limite (diagnostica 20261030-142317 n. 76: troppo presto, piatto
  // −1, mira −1,89, palla a x −8,5, fuori di 4 m). Fino a outKnee nulla cambia (oltre la riga del doppio, 1,37 m, la palla
  // resta fuori anche nel doppio), poi la distanza si avvicina a outMax senza superarlo. Dentro o fuori non cambia mai:
  // limitare la mira (proposta della diagnostica, ±1,3) toglieva errori ai colpi fuori tempo e nel banco Pro contro «medio»
  // il giocatore passava dall'84% al 91% dei game (40 semi), fuori dal criterio 70–85%
  sideLine: 4.115, outKnee: 1.4, outMax: 1.9,
  xMax: 3.65,         // m: mira piena, 0,45 m dentro la riga laterale del singolare
  follow: .4,         // il punto neutro segue di tanto la posizione laterale della palla all'impatto (0: sempre il centro)
  pushOut: 1.4,       // m di lato per unità di tempo oltre la finestra (per livello in ASSIST: con il lungolinea e
                      // l'incrociato pieni al bordo della finestra la palla esce nell'ultima parte della finestra d'impatto)
  // profondità del rimbalzo (m dalla rete) per tipo, da profondità voluta 0 a 1: dalla riga del servizio (e prima)
  // alla riga di fondo; il proprio colpo tipico (profondità voluta circa 0,5) cade attorno a 8,7 m. Prima un colpo
  // normale andava da 7,4 a 10,9 m (2,5 m con i gesti tipici: metà campo e centro irraggiungibili)
  // 27/10: il banco (audit:variety, profilo medio/umano) dava p50 8,0 m e p90 9,25 m: la zona di fondo (oltre 9,5 m)
  // non si raggiungeva quasi mai. La profondità voluta non è lineare: il colpo tipico (voluta .5) cade a 9,4 m, un colpo
  // morbido resta corto e uno pieno arriva alla riga (depthCurve). TOPSPIN 6,2–11,5, FLAT 6,4–11,7
  depth: Object.freeze({ TOPSPIN: [6.2, 11.5], FLAT: [6.4, 11.7], SLICE: [5.4, 10.8], DROP: [1.8, 4.6], LOB: [8.6, 11.4], SMASH: [5.6, 10.8] }),
  depthCurve: .7,     // esponente della profondità voluta (1 = lineare; sotto 1 il colpo medio cade più in fondo)
  depthKnee: 10.8, maxDepth: 11.6,   // m: con l'assistenza la palla si avvicina alla riga di fondo (11,89) senza superarla
  sideKnee: 3.1, sideEdge: 4,        // m: con l'assistenza la palla si avvicina alla riga laterale (4,115) senza superarla
  minDepth: 3, dropMin: 1.6,         // m: un colpo (una palla corta) non cade più vicino alla rete di così
  assistFade: .25,    // unità di tempo oltre la finestra in cui l'assistenza sparisce (prima di colpo, alla finestra)
  assistQSpan: .1,    // qualità attorno alla soglia del livello in cui l'assistenza sparisce (prima di colpo)
  shortPerQ: 1.8,     // m più corta per la qualità che manca (era 2,4: con la qualità tipica .85 toglieva 0,36 m a ogni colpo)
  shortPerExcess: .8, // m più corta per unità di tempo oltre la finestra
  heavyRise: .45, heavyGain: 4,   // top spin con la testa che sale molto e forte: va lunga (può uscire)
  // incrociato stretto: dalla parte dell'incrociato, oltre wideFrom di lato, la palla cade più corta, verso wideDepth in
  // proporzione (widePull): la differenza di profondità voluta resta. Il lungolinea non è un angolo: resta profondo
  // (23/10: con il lungolinea pieno al bordo della finestra anche lui cadeva a 6,5–7 m, e le palle si ammucchiavano lì)
  wideFrom: 3.2, wideSpan: .8, wideDepth: 6, widePull: .6,
  hitZ: 11.5,         // m dalla rete del punto d'impatto se non si sa (fondo campo)
  // B15 (08/11): altezza sulla rete e top spin dalla forza. La velocità della palla nel motore la decide l'altezza a cui
  // deve passare sopra il nastro (non il volo base, che vincola solo i colpi morbidi): con l'altezza lineare nella forza
  // (TOPSPIN 1,3…2,05 m) e il top spin che scendeva con la forza (15 + 8·salita + 6·morbidezza) un gesto 1,2× del proprio
  // colpo dava 102 km/h e il top spin forte restava sotto il piatto (banco colpi.mjs: 0,6× 82 km/h, 1× 94, 1,2× 102,
  // 1,4× piatto 119, 1,6× 123). Ora il colpo morbido galleggia di più (fino a topClearSoft m) e quello forte passa basso
  // prima (curva clearCurve: morbidezza^1,5) con più top spin (fino a +topSpinPower a forza piena, 26 a 0,86 come il
  // colpo super): 0,6× 77 km/h, 1× 94, 1,2× 108, 1,4× 119, 1,6× 123 (×1,6 tra 0,6× e 1,6×, era ×1,5)
  topClearSoft: 2.5, clearCurve: 1.5, topSpinPower: 8,
  floatPerQ: .35,     // m più alta sulla rete per la qualità che manca (palla «galleggiante» per l'avversario)
  // schiacciata: velocità lungo il campo (m/s) e volo minimo. Segnalazione del 29/10: «dovrebbe essere un colpo molto
  // più forte»; con 0,42 s andava a 28–29 m/s (191–200 km/h sul tabellone), poco più di un piatto (26 m/s, 179 km/h)
  // 29/10 pomeriggio: 46 m/s (circa 166 km/h, era 40): con la palla presa più in alto i piatti pieni arrivano a 31 m/s
  // di media e la schiacciata a 40 non era più nettamente più forte
  // pallonetto: volo da forza 0 a forza 1 per un colpo da fondo a fondo (lobRef m), più corto da più vicino. 29/10
  // pomeriggio: con [2,2, 1,75] il pallonetto passava 2,8 m sopra il nastro e saliva a circa 4 m: l'altro giocatore lo
  // schiacciava da metà campo. Ora il difensivo sale a 6–7 m, quello forte (d'attacco) a 4,5–5 m
  // B15 (08/11): smashSpeed 48 (era 46): con il colpo forte più teso (clearCurve, tetto del volo base) il piatto pieno
  // del test va a 31 m/s (era 30) e la schiacciata deve restare almeno 1,4 volte più veloce (richiesta del 29/10)
  lobFlight: [2.6, 1.95], lobRef: 22, lobScale: [.85, 1.1], smashFlight: .26, smashSpeed: 48,
  volleyShort: 1,     // m: la volée spinge meno
  // B31 (punto 22 del rapporto B16): la volée (palla al volo entro volleyHoldZ dalla rete) ha il bordo morbido laterale
  // della zona di rete a tutti i livelli (prima solo a Leggenda): è un colpo bloccato, la direzione viene dal piatto e
  // dal tempo dentro la finestra, e la palla veloce non la spinge oltre la riga. Prima a Casual e Pro le volée uscivano
  // di lato da 2 a 40 volte più spesso dei colpi da fondo (banco scripts/audit/rete.mjs, colonne v.lato% e f.lato%)
  // volleySpan: la finestra del tempo della volée è volleySpan volte quella del colpo da fondo (la palla veloce a rete la
  // stringeva: con lo stesso anticipo in secondi la volée finiva oltre la finestra e veniva spinta fuori di lato)
  volleyHoldZ: 7, volleySpan: 1.6,
  netLowY: .42, netExcess: .45,   // palla presa sotto 0,42 m molto fuori tempo: in rete
  weakDepth: 6.8, weakFloat: .9,  // a rete, colpo fallito con il tempo perfetto: al massimo a 6,8 m dalla rete, 0,9 m più alto
  assistQ: .6,        // sotto questa qualità l'assistenza non tiene la palla dentro
  // Colpo d'attacco sopra la rete (chiusura) e schiacciata (29/10 pomeriggio: «vicino alla rete il colpo finisce in rete,
  // non riesco a rispondere con un colpo potente o angolato»). Ogni colpo doveva passare almeno 34 cm sopra il nastro e
  // salire di nuovo verso il fondo: da vicino alla rete la palla presa sopra il nastro tornava una parabola lenta, e la
  // schiacciata da 1,5–2 m arrivava a 95–105 km/h invece di 144. Ora, da entro attackZ dalla rete con la palla sopra
  // attackY e un gesto deciso (o la schiacciata), la palla passa bassa sopra il nastro (attackGap, più alta se il gesto è
  // morbido) e veloce (attackSpeed lungo il campo, dalla forza), con l'angolo stretto possibile (attackWideDepth). Con la
  // palla sotto il nastro resta una volée che deve salire, come nella realtà
  attackZ: 6.4, attackY: .9, attackPower: .45, attackGap: [.08, .3], attackSpeed: [20, 34], attackWideDepth: 4.2, smashGap: .1,
  // B17.4 (08/11 sera, «maggiore libertà nei colpi sotto rete»; docs/b17/rete.md). Nelle due diagnostiche dell'08/11 i tre
  // colpi giocati a rete su una palla corta (gesti da 760–1340 °/s: piatto, top spin, pallonetto) avevano qualità di situazione
  // 0,57–0,62 («in allungo»), sotto failQ 0,63 di Leggenda, e diventavano tutti la stessa palla «debole» (6,8 m, +0,9 m sulla
  // rete, 24–37 km/h). Ora a rete (chi colpisce entro 5 m, palla corta o palla entro attackZ) la qualità di situazione fino a
  // netQSpan sotto failQ non fa fallire il colpo: è un colpo «controllato», con forza → velocità e profondità, tipo → arco,
  // direzione piena, e la qualità che manca aggiunge dispersione (direzione fino a netSpread.x m, altezza sulla rete fino a
  // netSpread.clear m, deterministica dal seme del colpo: stessi ingressi, stesso esito). Più sotto (palla raggiunta
  // all'ultimo) resta debole (palla corta, tempo nella finestra) o fallito come prima
  // netQMin: sotto questa qualità la palla è raggiunta all'ultimo a qualunque livello (il colpo controllato vale quindi a
  // Leggenda, failQ .63; a Pro, 1v1 e Casual failQ è già sotto netQMin); netControlExcess: oltre tante unità fuori dalla finestra
  // della direzione il colpo è «molto fuori tempo» e fallisce come prima
  netQSpan: .25, netQMin: .45, netControlExcess: .5, netSpread: Object.freeze({ x: 1.2, clear: .35 }),
  attackQPower: .3,   // la chiusura sopra la rete chiede meno qualità a un gesto forte: attackQ − attackQPower a forza piena (solo nella zona di rete)
  // palla corta letta dalla forma (taglio verticale morbido) giocata a rete: resta una palla corta solo se la forma è chiara
  // (confidenza ≥ conf) e il gesto è davvero lento (forza ≤ power); altrimenti è una volée controllata, tagliata, con la
  // profondità da volleyDepth[0] a volleyDepth[1] m dalla forza e il volo del tagliato (niente minimo di 1,32 s del motore)
  dropNet: Object.freeze({ conf: .6, power: .25 }), volleyDepth: [3, 7],
  // B18.2 passo 3 (D8 del rapporto B16): la palla corta può sbagliare. Dal 22/10 non falliva mai (riusciva il 92–100% delle
  // volte) e la qualità che mancava la accorciava soltanto, cioè la migliorava: giocare solo palle corte era la tattica che
  // vinceva di più (bambino a Casual dal 45 al 72% dei punti, amatore a Pro dal 55 al 75%; scripts/audit/palla-corta.mjs).
  // Ora ha un suo «controllo del tocco» (dropControl, 0…1), senza caso: la situazione di chi colpisce (corsa, allungo,
  // palla veloce, preparazione) e la pressione degli scambi lunghi, come gli altri colpi, per
  //   • il tempo: anche dentro la finestra un tocco chiede precisione (fino a −timing al bordo, al quadrato) e oltre la
  //     finestra cala come per gli altri colpi (timingQualityOf);
  //   • la distanza dalla rete: da dentro il campo (fino a farFrom m) niente, poi fino a −far da farTo m (dietro la riga
  //     di fondo): da lontano la palla corta è difficile;
  //   • la forza: un gesto più forte di strongFrom non è un tocco (fino a −strong a strongFrom + strongSpan).
  // Sopra «clean» la palla corta è quella di sempre. Sotto, via via più lunga (fino a +long m) e più alta (+float m): una
  // palla lenta a metà campo che l'avversario raggiunge comoda (da longAt la scritta dice «Troppo lunga»). Sotto «fail»
  // è sbagliata: in rete se il motivo è il ritardo, la distanza o una palla presa bassa (sotto lowY… 1 m per la
  // situazione, come gli altri colpi), altrimenti lunga al massimo. La qualità che manca non la accorcia più.
  drop: Object.freeze({ farFrom: 11.5, farTo: 15, far: .5, timing: .45, strongFrom: .3, strongSpan: .25, strong: .35, clean: .78, fail: .42, long: 4, float: .55, longAt: .5 }),
});
// Controllo del tocco della palla corta (B18.2 passo 3): { c: 0…1, lack: 0 pulita … 1 al massimo, why: il motivo che pesa
// di più ('tempo', 'lontano', 'forte', 'situazione', 'pressione'; null se pulita), fail, net }. t: tempo in unità della
// finestra della direzione (+ anticipo); z: distanza dalla rete del punto d'impatto; y: altezza della palla
// clean, fail: soglie del livello (ASSIST.dropClean, dropFail; altrimenti quelle di OUTCOME.drop)
export function dropControl({ t = 0, z = OUTCOME.hitZ, power = .2, quality = 1, pressure = 1, y = 1, clean = OUTCOME.drop.clean, fail: failAt = OUTCOME.drop.fail } = {}){
  const K = { ...OUTCOME.drop, clean: finite(clean, OUTCOME.drop.clean), fail: finite(failAt, OUTCOME.drop.fail) }, far = clamp((finite(z, OUTCOME.hitZ) - K.farFrom)/(K.farTo - K.farFrom)), strong = clamp((finite(power, .2) - K.strongFrom)/K.strongSpan);
  const sit = clamp(finite(quality, 1)), pr = clamp(finite(pressure, 1)), tq = timingQualityOf(t)*(1 - K.timing*Math.min(1, Math.abs(finite(t)))**2);
  const c = clamp(sit*pr*tq*(1 - K.far*far)*(1 - K.strong*strong)), lack = clamp((K.clean - c)/(K.clean - K.fail));
  const why = lack > 0 ? [['tempo', 1 - tq], ['lontano', K.far*far], ['forte', K.strong*strong], ['situazione', 1 - sit], ['pressione', 1 - pr]].reduce((a, k) => (k[1] > a[1] ? k : a))[0] : null;
  const fail = c < K.fail, net = fail && (why === 'lontano' || (why === 'tempo' && finite(t) < 0) || ((why === 'situazione' || why === 'pressione') && finite(y, 1) < 1));
  return { c: +c.toFixed(3), lack: +lack.toFixed(3), why, fail, net };
}

// Seme deterministico del colpo (B17.4): dagli ingressi del gesto e della palla a due numeri in [−1, 1], per la dispersione
// dei colpi controllati a rete. Stessi ingressi, stesso esito; ingressi vicini, esiti diversi (come la mano che trema)
export function strokeSeed(...vals){
  let h = 2166136261;
  for (const v of vals){ h ^= (Math.round(finite(v)*1000) | 0); h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return h >>> 0;
}
export function seedUnit(h, k = 0){
  let x = (h ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x ^= x >>> 16;
  return ((x >>> 0)/4294967295)*2 - 1;
}

// Motivo, in parole, della palla corta in rete o troppo lunga (per la scritta dell'esito e la diagnostica). situation: il
// motivo della situazione già scelto dal motore («in corsa», «in allungo», «palla veloce», «senza preparazione»…)
export const DROP_CAUSE = Object.freeze({ lontano: 'da troppo lontano', forte: 'gesto troppo forte', pressione: 'scambio lungo' });
export function dropCause(out = {}, situation = null){
  const w = out.dropWhy;
  if (!w) return null;
  if (w === 'tempo') return finite(out.t) < 0 ? (finite(out.excess) > 0 ? 'troppo tardi' : 'in ritardo') : (finite(out.excess) > 0 ? 'troppo presto' : 'in anticipo');
  return DROP_CAUSE[w] || situation || 'colpo difficile';
}

// Tempo misurato sulla strada della palla, non solo in secondi: su una palla lenta (palla corta, rimbalzo alto, colpo
// morbido) lo stesso anticipo in secondi è molto più vicino al punto d'impatto. La finestra della direzione e quella
// si allarga di vRef/|vz| (fino a max) sotto vRef m/s lungo il campo. 29/10 pomeriggio: sulle palle corte raggiunte
// vicino alla rete i colpi arrivavano 0,2–0,5 s prima, «molto in anticipo»: fuori o in rete. vRef e max tarati con il
// banco (Pro contro «medio» resta all'81,6% dei game come prima; con 18 e 2,2 saliva all'86,5%)
export const SLOW = Object.freeze({ vRef: 15, max: 1.8 });
export const slowFactor = vz => (vz == null || !Number.isFinite(Number(vz)) ? 1 : clamp(SLOW.vRef/Math.max(1, Math.abs(Number(vz))), 1, SLOW.max));

// Assistenza per livello: mira piena (xMax, m dal centro), qualità sotto la quale la palla non è più tenuta in campo
// (assistQ) e sotto la quale il colpo fallisce (failQ: in rete se la palla è bassa, lunga se è alta), finestra della
// direzione (span, s; altrimenti timingSpan del livello). Richiesta del 23/10: il livello cambia la precisione chiesta
// (finestra del tempo, qualità sotto cui la palla non è tenuta dentro o fallisce), non dove si può mandare la palla:
// stessa mira piena e stesso peso del tempo a tutti i livelli. Prima a Leggenda 3,1 m e 0,58 (lungolinea al 43%).
// pushOut: m di lato per unità di tempo oltre la finestra della direzione (quanto presto un colpo troppo in anticipo o
// in ritardo esce di lato: a Casual nell'ultima parte della finestra d'impatto, a Leggenda prima)
// attackQ: qualità sotto la quale non c'è la chiusura sopra la rete (OUTCOME.attackZ…): come il resto, il livello cambia la
// precisione chiesta (29/10 pomeriggio)
export const ASSIST = Object.freeze({
  // dropClean, dropFail (B18.2 passo 3): controllo del tocco sotto cui la palla corta viene lunga e sotto cui è sbagliata
  // (dropControl); senza, i valori di OUTCOME.drop (.78 e .42). A Casual più larghi, come il resto dell'assistenza
  casual: Object.freeze({ xMax: 3.65, assistQ: .5, failQ: .2, pushOut: .8, attackQ: .45, dropClean: .62, dropFail: .3 }),
  '1v1': Object.freeze({ xMax: 3.65, assistQ: .6, failQ: .34, pushOut: .9, attackQ: .6 }),
  pro: Object.freeze({ xMax: 3.65, assistQ: .62, failQ: .3, pushOut: .9, attackQ: .65 }),
  // B18.2 passo 3 (D2 del rapporto B16): a Leggenda il colpo di chi gioca falliva con una regola sua, failQ .63 e
  // pressione degli scambi lunghi dal 10° colpo (pressureFrom 10) invece che dal 16° come agli altri livelli. Contro
  // «tennista» un punto su quattro finiva con un colpo fallito «scambio lungo» con il voto PERFETTO: chi gioca non poteva
  // capirlo. Ora la regola è quella degli altri livelli: stessa pressione (RALLY_PRESSURE, dal 16° colpo) e la soglia del
  // colpo fallito di Pro (failQ .3: fallisce solo il colpo preso davvero male, in corsa e in allungo, o molto fuori tempo).
  // La difficoltà sta in margini che si vedono e si possono dire:
  //   • span .115: la finestra del momento giusto è più stretta (Esperto e Pro .15): un errore di tempo che a Pro è
  //     ancora «Perfetto» a Leggenda è «Anticipo» o «Ritardo» e sposta di più la palla;
  //   • spanPress 3: negli scambi lunghi (dal 16° colpo, come la pressione di tutti) la finestra si stringe ancora, come
  //     la pressione alla terza (al 30° colpo × 0,49, dal 46° × 0,17): il colpo esce di lato con il voto e la scritta
  //     «in anticipo» o «in ritardo», non più un «Perfetto» che va in rete;
  //   • pushOut 1.35: oltre la finestra la palla va fuori prima (Pro .9);
  //   • come prima: palla tenuta in campo solo sopra assistQ .8, chiusura sopra la rete da attackQ .82.
  // Il resto della forza viene dalla CPU (natpf_legend.LEGEND: pressureFrom, closeFrom, powerErr). netHold: il bordo
  // morbido laterale nella zona di rete (B17.4) resta a Leggenda anche se failQ ora è sotto netQMin.
  // Misure e criteri: docs/b18/t2-3-leggenda-e-palla-corta.md
  leggenda: Object.freeze({ xMax: 3.65, assistQ: .8, failQ: .3, pushOut: 1.35, attackQ: .82, netHold: true, span: .115, spanPress: 3 }),
});
// level.assist (solo prove e banchi): valori che sostituiscono quelli del livello, es. la regola di Leggenda di prima
// { ...ASSIST.leggenda, failQ: .63, pressureFrom: 10 }
export const assistOf = level => level?.assist || ASSIST[level?.name] || (level?.cpuLegend ? ASSIST.leggenda : level?.assistWindow <= .16 ? ASSIST.pro : level?.assistWindow >= .3 ? ASSIST.casual : ASSIST['1v1']);
// finestra della direzione (s) del livello
export const directionSpan = level => assistOf(level).span || level?.timingSpan || .16;

// Ritmo di chi gioca: il suo tempo abituale (unità della finestra della direzione, + anticipo), mediana degli ultimi
// colpi, un poco ridotta e limitata. La direzione si misura attorno a questo: con il tempo solito la palla va al centro,
// prima del solito incrociata, dopo il solito lungolinea. Il voto (anticipo, perfetto, ritardo) resta sul tempo vero.
// Diagnostica del 28/10 sera: chi gioca colpiva quasi sempre in anticipo (mediana +0,51 unità): 9 incrociati, 3 al centro
// e un solo lungolinea su 13, e il lungolinea voluto non usciva mai
// B35a (collaudo del 13/11: «dritto incrociato → lungolinea» e «molti colpi uscivano»): il RITARDO ABITUALE. Il tempo è
// in unità della finestra e la finestra in ritardo (lateSpanOf: la palla passa il corpo) è circa metà di quella in
// anticipo: con il tetto di ±0,6 unità il ritmo prendeva fino a circa 90 ms di anticipo ma solo 45 ms di ritardo, e i
// colpi oltre 1,3 unità in ritardo non contavano. Chi colpisce SEMPRE un poco tardi (schermo in ritardo non misurato:
// televisore, programma Windows) mandava tutto lungolinea e, oltre la finestra, fuori di lato dalla parte del lungolinea
// (banco scripts/audit/direzione-telefono.mjs --fuori, tempo −1,2 finestre: 25% fuori o in rete con il gesto buono).
// Un ritardo dello schermo sposta TUTTI i colpi, anche quelli voluti incrociati o al centro; chi va lungolinea apposta
// colpendo tardi ha anche colpi in tempo o in anticipo. Per questo il ritardo abituale si misura in SECONDI (le unità
// cambiano con la palla e, a Leggenda, si stringono negli scambi lunghi) e solo se anche i colpi più in anticipo sono in
// ritardo: sugli ultimi lagKeep colpi (fino a insideLate unità in ritardo, cioè tutta la finestra d'impatto; da lagMin
// colpi, con meno il caso di chi sbaglia molto il tempo sembra un ritardo) il 90° percentile (lagQ: il colpo più in
// anticipo dopo il primo) deve essere oltre lagFrom secondi in ritardo, per intero da lagFrom + lagRamp. Il ritardo è la
// mediana × gain (al massimo lagMax): sposta la finestra per la direzione, la spinta oltre la finestra e l'assistenza
// (strokeOutcome, rhythmLag), e la direzione si misura attorno al ritmo vero (mediana con i colpi in ritardo). Il voto
// (anticipo, perfetto, ritardo) e la qualità del tempo restano sul tempo vero. Senza ritardo abituale tutto resta com'era,
// colpo per colpo (i profili simulati dei banchi non lo attivano mai: scripts/audit/direzione-telefono.mjs --fuori).
export const RHYTHM = Object.freeze({ keep: 8, min: 4, gain: .8, max: .6, inside: 1.3, insideLate: 2.2, lateMax: 2.2, lagQ: .9, lagKeep: 10, lagMin: 8, lagFrom: .045, lagRamp: .03, lagMax: .1 });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y), k = (s.length - 1)*q, i = Math.floor(k); return s[i] + (s[Math.min(s.length - 1, i + 1)] - s[i])*(k - i); };
export function createRhythm(){
  const h = [], hl = [], hs = [];
  const push = (a, v, n = RHYTHM.keep) => { a.push(v); if (a.length > n) a.shift(); };
  const lagOf = () => { if (hs.length < RHYTHM.lagMin) return 0; const q = -quantile(hs, RHYTHM.lagQ); return q > RHYTHM.lagFrom ? Math.min(RHYTHM.lagMax, clamp((q - RHYTHM.lagFrom)/RHYTHM.lagRamp)*Math.max(0, -quantile(hs, .5))*RHYTHM.gain) : 0; };
  return {
    // t: tempo in unità della finestra (+ anticipo), secs: lo stesso in secondi (senza, il ritardo abituale non si misura)
    add(t, secs = NaN){
      if (!Number.isFinite(t)) return;
      if (Math.abs(t) <= RHYTHM.inside) push(h, t);
      if (t <= RHYTHM.inside && t >= -RHYTHM.insideLate){ push(hl, t); if (Number.isFinite(secs)) push(hs, secs, RHYTHM.lagKeep); }
    },
    // ritmo per la direzione (unità): come sempre; con un ritardo abituale, la mediana con i colpi in ritardo (fino a −lateMax)
    get value(){
      if (lagOf() > 0) return clamp(quantile(hl, .5)*RHYTHM.gain, -RHYTHM.lateMax, RHYTHM.max);
      if (h.length < RHYTHM.min) return 0;
      const s = [...h].sort((a, b) => a - b), m = s.length >> 1, med = s.length % 2 ? s[m] : (s[m - 1] + s[m])/2;
      return clamp(med*RHYTHM.gain, -RHYTHM.max, RHYTHM.max);
    },
    // ritardo abituale (s, ≥ 0): 0 se i colpi più in anticipo (90° percentile) sono entro lagFrom secondi
    get lag(){ return lagOf(); },
    get count(){ return h.length; },
    reset(){ h.length = 0; hl.length = 0; hs.length = 0; },
  };
}

// Pressione degli scambi lunghi: dal colpo «from» dello scambio la qualità di tutti e due cala di «step» a colpo (al
// massimo di «max»). Senza, un giocatore molto regolare e la CPU Leggenda arrivavano a scambi senza fine (nel banco
// 6–8 punti su 50 oltre i 60 colpi): ora uno dei due prima o poi lascia una palla corta e alta, o sbaglia.
export const RALLY_PRESSURE = Object.freeze({ from: 16, step: .015, max: .45 });
export const rallyPressure = (strokes, from = RALLY_PRESSURE.from) => 1 - Math.min(RALLY_PRESSURE.max, Math.max(0, finite(strokes) - from)*RALLY_PRESSURE.step);

// Qualità del tempo: piena dentro la finestra, scende oltre (fino a metà)
export const timingQualityOf = t => 1 - .5*clamp(Math.abs(finite(t)) - 1, 0, 1);

// Limiti dolci: uguale fino a knee, poi verso edge senza raggiungerlo. Sempre crescenti: niente gradini e niente
// palle tutte nello stesso punto (prima l'assistenza era un taglio netto alla mira piena e a 11,3 m)
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
const softFloor = (v, floor, knee) => (v >= knee ? v : knee - (knee - floor)*Math.tanh((knee - v)/(knee - floor)));
// Punto neutro (mira 0) nel riferimento di chi colpisce: segue la posizione laterale della palla all'impatto
export const neutralX = (hitX, xMax = OUTCOME.xMax) => clamp(finite(hitX), -xMax, xMax)*OUTCOME.follow;
// Caduta laterale dalla mira: −1 e +1 sono le due righe (xMax), 0 il punto neutro; oltre ±1 si continua in linea
export const landingFromAim = (aim, x0, xMax = OUTCOME.xMax) => x0 + aim*(aim >= 0 ? xMax - x0 : xMax + x0);
// Mira che porta la palla in x (inversa di landingFromAim; per chi vuole mirare un punto, come i banchi di prova)
export const aimForLanding = (x, x0, xMax = OUTCOME.xMax) => (x - x0)/Math.max(.1, x >= x0 ? xMax - x0 : xMax + x0);

// intent: { shot, power, depth, rise, face } (minuscolo o maiuscolo); timing: s di anticipo all'impatto (negativo = in
// ritardo); lateSpan: s di ritardo che valgono il lungolinea pieno (lateSpanOf: con le palle veloci è più breve, perché
// la palla passa il corpo prima); contact: +1 colpo di dritto del destro (o di rovescio del mancino), −1 l'altro lato:
// dice da che parte va la palla in anticipo; hitX: posizione laterale della palla all'impatto (m, riferimento di chi
// colpisce, + a destra); quality: la situazione di chi colpisce, allungo × corsa × preparazione × palla veloce (0…1);
// pressure: pressione degli scambi lunghi (rallyPressure, 0…1); rhythm: tempo abituale di chi gioca (createRhythm, unità):
// la direzione si misura attorno a questo; rhythmLag: ritardo abituale (createRhythm().lag, B35a); contactY: altezza della palla all'impatto; volley: presa
// al volo; net: chi colpisce è a rete (entro 5 m dalla rete, anche dopo il rimbalzo); level: parametri del livello.
// Restituisce, nel riferimento di chi colpisce (x a destra, depth in avanti dalla rete): { x, depth, clear, topspin,
// flight (solo pallonetto e schiacciata), netFault, failed, weak, pressured, grade, cursor, t, excess, q, aim, x0,
// assist, assisted }.
// touch (B18.2 passo 3): la situazione che conta per la palla corta (come quality ma senza la preparazione: un tocco non
// chiede di portare indietro il braccio); senza, vale quality.
export function strokeOutcome({ intent = {}, timing = 0, lateSpan = null, ballVz = null, contact = 1, hitX = 0, hitZ = null, quality = 1, touch = quality, pressure = 1, rhythm = 0, rhythmLag = 0, contactY = 1, volley = false, net = false, shortBall = false, level = {} } = {}){
  const O = OUTCOME;
  let shot = String(intent.shot || 'topspin').toUpperCase();
  const power = clamp(finite(intent.power, .5)), want = clamp(finite(intent.depth, power)), rise = clamp(finite(intent.rise), -1, 1);
  // a rete (B17.4): chi colpisce entro 5 m, palla corta raggiunta, o palla entro la zona della chiusura
  const zKnown = hitZ != null && Number.isFinite(Number(hitZ)), zc = Math.abs(finite(hitZ, O.hitZ)), nearNet = !!net || !!shortBall || (zKnown && zc <= O.attackZ);
  // palla corta per forma a rete: palla corta solo con la forma chiara e il gesto lento, altrimenti volée controllata (tagliata)
  const netVolley = shot === 'DROP' && nearNet && Number.isFinite(intent.conf) && !(finite(intent.conf) >= O.dropNet.conf && power <= O.dropNet.power);
  if (netVolley) shot = 'SLICE';
  // spanPress (B18.2 passo 3, solo Leggenda): negli scambi lunghi la finestra del tempo si stringe con la pressione
  // (× pressione^spanPress, mai sotto 0,2^spanPress): il colpo esce di lato «in anticipo» o «in ritardo», con il voto che lo dice
  const volleyNet = !!volley && zKnown && zc <= O.volleyHoldZ && !netOff();     // B31: volée vicino alla rete (finestra più larga, bordo morbido)
  const AS = assistOf(level), span = directionSpan(level)*slowFactor(ballVz)*(AS.spanPress ? clamp(finite(pressure, 1), .2, 1)**AS.spanPress : 1)*(volleyNet ? O.volleySpan : 1), late = Number.isFinite(lateSpan) ? clamp(lateSpan*(volleyNet ? O.volleySpan : 1), .04, span) : span;
  // tempo in unità della finestra della direzione (+ anticipo). Oltre ±1 la palla continua ad andare verso l'esterno
  // fino alla fine della finestra d'impatto (prima si fermava a 1,6 unità: nell'ultimo 40% della finestra tutte le
  // palle uguali). ±4 è oltre ogni finestra d'impatto, solo per sicurezza
  // B35a: ritmo in ritardo (RHYTHM): «lag» secondi di ritardo abituale (al massimo lagMax) spostano la finestra per la
  // direzione, la spinta oltre la finestra e l'assistenza (te); il voto e la qualità del tempo restano su t, il tempo vero.
  const unitsOf = s => clamp(s >= 0 ? s/span : s/late, -4, 4);
  const c = finite(contact, 1) >= 0 ? 1 : -1, t = unitsOf(finite(timing)), inside = clamp(t, -1, 1);
  // rhythmLag: ritardo abituale (createRhythm().lag, s, al massimo lagMax); il resto del ritmo (rRest) conta per la
  // direzione come sempre. Senza ritardo abituale (0) tutto resta com'era
  const lag = clamp(finite(rhythmLag), 0, RHYTHM.lagMax);
  const te = lag > 0 ? unitsOf(finite(timing) + lag) : t, excess = Math.max(0, Math.abs(te) - 1);
  const rRest = clamp(clamp(finite(rhythm), -RHYTHM.lateMax, RHYTHM.max) + lag/late, -RHYTHM.max, RHYTHM.max);
  const qs = clamp(timingQualityOf(t)*clamp(finite(quality, 1)), .2, 1), q = clamp(qs*clamp(finite(pressure, 1)), .2, 1);
  // qualità sotto failQ: fallito (in corsa, in allungo, palla veloce, sotto pressione); a rete, per la sola situazione e fino a
  // netQSpan sotto, colpo controllato con dispersione (B17.4) invece della palla debole uguale per tutti i gesti
  const fq = finite(AS.failQ, 0), belowFq = q < fq && shot !== 'DROP', pressured = belowFq && qs >= fq;
  // palla corta (B18.2 passo 3): il suo controllo del tocco; sbagliata in rete (DC.net) o lunga (più sotto)
  const DC = shot === 'DROP' ? dropControl({ t, z: zc, power, quality: touch, pressure, y: contactY, clean: AS.dropClean, fail: AS.dropFail }) : null;
  const controlled = belowFq && !pressured && nearNet && q >= Math.max(O.netQMin, fq - O.netQSpan) && excess <= O.netControlExcess, failed = (belowFq && !controlled) || !!DC?.net;
  const spread = controlled ? clamp((fq - q)/O.netQSpan) : 0, seed = controlled ? strokeSeed(timing, power, intent.face, rise, hitX, contactY, zc) : 0;
  // assistenza: piena dentro la finestra e sopra la qualità del livello, sfuma oltre (prima un gradino)
  const assist = clamp(1 - excess/O.assistFade)*clamp((q - AS.assistQ)/O.assistQSpan + .5), xMax = AS.xMax, k = xMax/O.xMax;
  // B17.4 (revisione): nella zona di rete (nearNet) il bordo morbido laterale (sideKnee/sideEdge) vale anche senza assistenza,
  // pieno con il tempo nella finestra e sfumato oltre come l'assistenza (assistFade): la dispersione (netSpread.x) e la mira
  // piena con il piatto girato non mandano la palla oltre la riga laterale (wqdk·121: piatto −1 e anticipo +0,78, x −4,99 → dentro).
  // Seconda revisione: vale in tutta la zona di rete, non solo nel colpo controllato: con il bordo legato a «controlled» lo
  // stesso gesto fatto da una situazione migliore (q 0,64…0,88 a Leggenda: sopra failQ ma sotto assistQ, assistenza 0) usciva
  // di lato (x −5,96) mentre da una situazione peggiore (q 0,61, controllato) restava dentro (x −4,00): peggio si era messi,
  // più sicura era la palla. Solo ai livelli che hanno il colpo controllato (failQ > netQMin: Leggenda), dove nasce l'inversione;
  // a Pro, 1v1 e Casual (failQ sotto netQMin: niente colpo controllato, esito monotono con la situazione) e fuori dalla zona di
  // rete resta la regola del B15 (sotto assistQ la palla può uscire di lato): con il bordo a rete a tutti i livelli il banco
  // audit:legend «pro contro medio» passava da 83,5 a 85,3 % di game del giocatore, oltre il criterio (70–85 %)
  const netHold = (nearNet && (fq > O.netQMin || !!AS.netHold)) || volleyNet;
  const sideHold = netHold ? Math.max(assist, clamp(1 - excess/O.assistFade)) : assist;
  // direzione: mira dal tempo (ai bordi della finestra le due righe; la spinta naturale verso l'incrociato solo vicino al
  // tempo neutro) e dal piatto attorno al punto neutro, poi la spinta oltre la finestra
  // tempo rispetto al proprio ritmo (B35a: la parte del ritmo in ritardo che è diventata un ritardo è già tolta in te)
  const aimT = clamp(te - rRest, -1, 1);
  const aim = -c*O.natural*(1 - Math.abs(aimT)) - c*aimT*finite(AS.timingAim, O.timingAim) + clamp(finite(intent.face), -1, 1)*finite(intent.faceWeight, O.faceAim);
  const x0 = neutralX(hitX, xMax), raw = landingFromAim(aim, x0, xMax) - c*Math.sign(te)*excess*finite(AS.pushOut, O.pushOut) + (controlled ? seedUnit(seed, 0)*O.netSpread.x*spread : 0);
  const xa = raw + (Math.sign(raw)*softEdge(Math.abs(raw), O.sideKnee*k, O.sideEdge*k) - raw)*sideHold;
  const x = Math.abs(xa) <= O.sideLine ? xa : Math.sign(xa)*(O.sideLine + softEdge(Math.abs(xa) - O.sideLine, O.outKnee, O.outMax));
  // profondità: voluta (forza e ampiezza dello swing), meno per la qualità che manca e il tempo oltre la finestra
  const D = netVolley ? O.volleyDepth : O.depth[shot] || O.depth.TOPSPIN;
  // profondità voluta con la curva (DROP e LOB restano lineari: la palla corta vuole restare corta; la volée controllata
  // segue la forza, lineare)
  const wantD = netVolley ? power : shot === 'DROP' || shot === 'LOB' ? want : Math.pow(want, O.depthCurve);
  let depth = lerp(D[0], D[1], wantD) - (DC ? -DC.lack*O.drop.long : (1 - q)*O.shortPerQ + excess*O.shortPerExcess) - (volley ? O.volleyShort*(1 - power) : 0);
  // in diagonale la palla fa la stessa strada: la profondità voluta è la lunghezza del colpo dritto, e un colpo che va
  // di lato cade più vicino alla rete di quanto va di lato (prima la profondità era la stessa per ogni direzione: gli
  // incrociati e i lungolinea cadevano tutti alla stessa distanza, gli angoli non si vedevano)
  const along = zc + depth, side = x - clamp(finite(hitX), -6, 6);
  if (shot !== 'DROP' && shot !== 'LOB' && along > Math.abs(side)) depth = Math.sqrt(along*along - side*side) - zc;
  if (shot === 'TOPSPIN') depth += clamp(rise - O.heavyRise, 0, .4)*O.heavyGain*power;
  const yc = finite(contactY, 1);
  const attack = shot === 'SMASH' || (shot !== 'DROP' && shot !== 'LOB' && zc <= O.attackZ && yc >= O.attackY && power >= O.attackPower);
  if (shot !== 'DROP' && shot !== 'LOB' && -c*x > 0) depth -= Math.max(0, depth - (attack ? O.attackWideDepth : O.wideDepth))*O.widePull*clamp((Math.abs(x) - O.wideFrom)/O.wideSpan);
  depth += (softEdge(depth, O.depthKnee, O.maxDepth) - depth)*assist;
  depth = shot === 'DROP' ? softFloor(depth, O.dropMin, O.dropMin + .6) : softFloor(depth, O.minDepth, O.minDepth + .6);
  // altezza sulla rete ed effetto
  const A = ARC[shot === 'DROP' ? 'SLICE' : shot === 'SMASH' ? 'FLAT' : shot === 'LOB' ? 'MOON' : shot] || ARC.TOPSPIN, soft = 1 - power;
  const high = clamp((finite(contactY, 1) - 1.5)/.5)*.18;
  // morbidezza con la curva (B15): il colpo tipico (forza 0,5) passa come prima, quello forte più basso, quello morbido più alto
  const softC = shot === 'LOB' ? soft : Math.pow(soft, O.clearCurve), clearSoft = shot === 'TOPSPIN' ? O.topClearSoft : A.clear[1];
  const clear = Math.max(ARC.netY + .02, A.clear[0] + (clearSoft - A.clear[0])*softC + (1 - q)*O.floatPerQ - high + (shot === 'TOPSPIN' ? .6*clamp(rise - .15, 0, .6) : 0) + (controlled ? seedUnit(seed, 1)*O.netSpread.clear*spread : 0) + (DC ? DC.lack*O.drop.float : 0));
  const topspin = shot === 'TOPSPIN' ? 15 + 8*clamp(rise) + 6*soft + O.topSpinPower*clamp((power - .5)/.5) : shot === 'FLAT' ? 12 : shot === 'SLICE' ? -6.5 : shot === 'DROP' ? -3 : shot === 'LOB' ? 5 : 9;
  let flight = shot === 'LOB' ? lerp(O.lobFlight[0], O.lobFlight[1], power)*clamp((zc + depth)/O.lobRef, O.lobScale[0], O.lobScale[1]) : shot === 'SMASH' ? Math.max(O.smashFlight, depth/26) : null;
  // colpo fallito: tempo molto sbagliato su una palla bassissima, o qualità sotto failQ (in corsa, in allungo, palla
  // veloce, sotto pressione): in rete se la palla è sotto il metro, altrimenti lunga oltre la riga di fondo. Deterministico.
  // A rete (entro 5 m dalla rete, al volo o dopo il rimbalzo) con il tempo perfetto la situazione non manda più la palla in
  // rete né lunga: passa, corta e alta, una palla facile da attaccare (weak). Segnalazione del 23/10, sera: a rete colpi
  // con il tempo perfetto finivano in rete. A Leggenda (failQ .63) la palla corta della CPU (un colpo su tre contro
  // «amatore») ripresa di corsa arrivava a qualità .55–.62: nel banco, contro «amatore», 245 colpi a rete su 1200 punti
  // finivano in rete con il tempo perfetto, 215 per la situazione. Resta l'errore degli scambi lunghi (pressured: senza la
  // pressione la qualità sarebbe sopra failQ), il modo in cui finiscono gli scambi senza fine: contro «preciso» tutti i
  // colpi falliti con il tempo perfetto sono di questo tipo (dal 15° colpo); senza, la CPU Leggenda vinceva il 43% dei game
  // contro di lui (criterio ≥ 60%)
  // (B31: il voto della volée resta quello della finestra di sempre, come il segnale del momento giusto: la finestra più
  // larga vale solo per la direzione)
  const vk = volleyNet ? O.volleySpan : 1, g = swingGrade(t*vk*(level?.timingSpan || span/vk), level);
  // Palla corta raggiunta nella finestra utile: corsa e pressione producono una risposta debole, non errore obbligato.
  // (B17.4: solo oltre netQSpan sotto failQ, cioè raggiunta all'ultimo; prima ogni colpo a rete sotto failQ era così)
  const weak = failed && !DC && ((shortBall && excess === 0) || (!pressured && (!!volley || !!net) && g.grade === 'PERFECT'));
  const netFault = (finite(contactY, 1) < O.netLowY && excess > O.netExcess) || (failed && !weak && finite(contactY, 1) < 1) || !!DC?.net;
  if (failed && !weak && !netFault) depth = Math.max(depth, 12.6 + (fq - q)*4);
  let lift = clear;
  if (weak){ depth = Math.min(depth, O.weakDepth); lift = clear + O.weakFloat; }
  // chiusura sopra la rete e schiacciata riuscite: bassa sul nastro e veloce (la schiacciata ha la sua velocità nel
  // motore, OUTCOME.smashSpeed); il volo è quello che passa il nastro a quell'altezza, mai più corto
  // B17.4: la chiusura chiede meno qualità a un gesto forte (da attackPower a forza piena: attackQ − attackQPower), con il rischio
  // della dispersione laterale del colpo controllato (netSpread.x) e dell'assistenza che non c'è sulla profondità; la dispersione
  // sull'altezza (netSpread.clear) non si applica alla chiusura, perché `lift` qui sotto sovrascrive `clear` (nastro + attackGap).
  // Revisione: solo nella zona di rete (nearNet, la stessa regola del colpo controllato); fuori resta attackQ del livello (a Pro
  // .65, non .35 a forza piena)
  const attackQ = finite(AS.attackQ, 0) - (nearNet ? O.attackQPower*clamp((power - O.attackPower)/(1 - O.attackPower)) : 0);
  const attacked = attack && !failed && !weak && !netFault && (shot === 'SMASH' || q >= attackQ);
  if (attacked){
    lift = ARC.netY - .34 + (shot === 'SMASH' ? O.smashGap : lerp(O.attackGap[1], O.attackGap[0], power));
    if (shot !== 'SMASH') flight = flightForClear({ fromY: yc, fromZ: zc, toZ: -depth, flight: (zc + depth)/lerp(O.attackSpeed[0], O.attackSpeed[1], power), topspin, clear: lift });
  }
  return { x: +x.toFixed(3), depth: +depth.toFixed(3), clear: +lift.toFixed(3), topspin: +topspin.toFixed(2), flight: flight == null ? null : +flight.toFixed(3),
    netFault, failed, weak, pressured, attack: attacked, grade: g.grade, cursor: g.cursor, t: +t.toFixed(3), excess: +excess.toFixed(3), q: +q.toFixed(3),
    lag: +lag.toFixed(3),    // B35a: ritardo abituale (s) tolto dal ritmo in ritardo (0 se non c'è)
    aim: +aim.toFixed(3), x0: +x0.toFixed(3), assist: +assist.toFixed(3), assisted: assist >= .5, shot,
    // B17.4: colpo controllato a rete (qualità di situazione sotto failQ, dispersione «spread» 0…1) e volée controllata al posto
    // della palla corta per forma
    controlled, spread: +spread.toFixed(3), netVolley,
    // B18.2 passo 3: palla corta, controllo del tocco (dropQ), quanto è venuta lunga (dropLack 0…1), il motivo (dropWhy) e
    // se è «troppo lunga» (dropLong: non in rete, da OUTCOME.drop.longAt); null e false per gli altri colpi
    dropQ: DC ? DC.c : null, dropLack: DC ? DC.lack : 0, dropWhy: DC ? DC.why : null, dropLong: !!DC && !DC.net && DC.lack >= O.drop.longAt };
}

// Colpo super potente (richiesta del 29/10: «se rilevi una forte accelerazione o un forte gesto del braccio, un colpo
// quasi fortissimo che l'avversario non sempre prende; contestualizzato al colpo, alla naturalezza del movimento e al
// momento dello scambio: non un rovescio innaturale; magari sulle palle molto alte o sulle palle lente in ricezione»).
// Tutte le condizioni insieme, senza caso:
//   • gesto fortissimo: forza dell'intenzione (picco del gesto, anche rispetto al proprio colpo tipico) da `power`; nei
//     registri del 29/10 (146 colpi) mediana 0,54, il 10% più forte oltre 0,86;
//   • colpo naturale: dritto, colpo piatto o schiacciata (non pallonetto, palla corta, tagliato), tipo letto con
//     sicurezza, e dalla parte giusta del corpo (un dritto su una palla dalla parte del rovescio, o il contrario, oltre
//     `sideWrong` m, è innaturale);
//   • esecuzione: a tempo (entro `timing` unità della finestra, mai oltre) e da fermo (qualità di corsa, allungo e palla
//     veloce da `quality`), colpo riuscito;
//   • palla giusta: alta all'impatto (da `highY` m: nei registri il 10% più alto) o lenta in arrivo (sotto `slowVz` m/s
//     lungo il campo: il 25% più lento) o corta, e la schiacciata.
// Effetto (motore, _natpfRacketShot): tempo di volo diviso per `speedUp` (la schiacciata per `smashUp`), in fondo (da
// `minDepth`), carico (`topspin`) e basso sulla rete (`netGap` m sopra il nastro al centro invece dei 34 cm di ogni altro
// colpo: con quella regola da 1 m d'altezza una palla profonda non poteva andare oltre il 15% più forte), e
// l'avversario lo legge in ritardo (`react` s in più alla CPU, errore di lettura × `misread`, qualità del colpo della
// Leggenda × `legendQ`, `reach` della velocità di corsa a chi gioca con il telefono): ci arriva solo a volte.
export const SUPER = Object.freeze({ power: .86, conf: .5, sideWrong: .35, timing: .6, quality: .8, highY: 1.25, slowVz: 12.5,
  speedUp: 1.4, smashUp: 1.2, minDepth: 10.2, netGap: .16, topspin: 26, react: .16, misread: 1.5, legendQ: .55, reach: .8 });
// Forza del gesto sulla scala delle soglie (colpo super, barra della potenza in natpf_power_hud.js, schiacciata dal gesto in
// smashAt, colpo potente del motore): dal telefono con la forma è typePower, la forza con la pendenza relativa di prima
// (INTENT.classGain, natpf_stroke_intent.strokeIntent), su cui sono tarati SUPER.power (il 10% più forte dei registri del
// 29/10), SMASH_FROM.power, il colpo potente (0,7) e le soglie dei tipi di colpo; l'esito usa power, più sensibile al gesto
// dal B15 (INTENT.relGain). Dagli altri controlli (webcam, mouse, CPU: niente typePower) power; d se manca anche quella.
// Solo un numero vale come typePower (null, registrazioni vecchie: si usa power)
export const superStrength = (intent = {}, d = 0) => (Number.isFinite(intent?.typePower) ? clamp(intent.typePower) : clamp(finite(intent?.power, d)));
// { on, why[], ball } — ball: 'alta' | 'lenta' | 'corta' | 'schiacciata'
// strong (B25, solo tra due persone nello stesso schermo): true/false se il gesto è fortissimo rispetto al proprio colpo
// abituale (natpf_duo_rules.relStrong) e decide lui al posto della soglia uguale per tutti; null: la soglia di sempre
export function superShot({ intent = {}, out = null, contact = 1, ballSide = 0, contactY = 1, ballVz = 15, shortBall = false, strong = null } = {}){
  const no = why => ({ on: false, why: [why], ball: null });
  if (!out || out.failed || out.weak || out.netFault) return no('colpo non riuscito');
  const shot = String(out.shot || '').toUpperCase();
  if (!['TOPSPIN', 'FLAT', 'SMASH'].includes(shot)) return no(`colpo ${shot.toLowerCase()}`);
  if (typeof strong === 'boolean' ? !strong : superStrength(intent) < SUPER.power) return no('gesto non abbastanza forte');
  if (Number.isFinite(intent.conf) && intent.conf < SUPER.conf) return no('gesto poco chiaro');
  if (shot !== 'SMASH' && finite(ballSide)*(finite(contact, 1) >= 0 ? 1 : -1) < -SUPER.sideWrong) return no('colpo innaturale (palla dall\'altra parte)');
  if (finite(out.excess) > 0 || Math.abs(finite(out.t)) > SUPER.timing) return no('fuori tempo');
  if (finite(out.q, 1) < SUPER.quality) return no('in corsa o in allungo');
  const ball = shot === 'SMASH' ? 'schiacciata' : finite(contactY, 1) >= SUPER.highY ? 'alta' : Math.abs(finite(ballVz, 15)) <= SUPER.slowVz ? 'lenta' : shortBall ? 'corta' : null;
  if (!ball) return no('palla né alta, né lenta, né corta');
  return { on: true, why: ['gesto fortissimo', `palla ${ball}`], ball };
}

// Ritardo (s) che vale il lungolinea pieno: il tempo che la palla impiega a passare lateBehind metri dietro il punto
// d'impatto, al massimo la finestra del livello. vz: velocità della palla lungo il campo (m/s).
export const lateSpanOf = (vz, level = {}) => clamp(IMPACT.lateBehind/Math.max(1, Math.abs(finite(vz, 15))), .05, directionSpan(level));

// Tempo di volo per arrivare alla profondità con l'altezza voluta sulla rete (come shotArc, senza caso)
export function outcomeFlight(out, { fromY = 1, fromZ = 11, toZ = -9, flight = .8 } = {}){
  if (Number.isFinite(out?.flight)) return out.flight;
  return flightForClear({ fromY, fromZ, toZ, flight, topspin: out.topspin, clear: out.clear });
}

// Finestra d'impatto per livello (s): uno swing arrivato fino a «early» prima che la palla raggiunga il punto
// d'impatto resta in attesa ed è giocato all'arrivo con il suo tempo vero; oltre è un colpo a vuoto. Dopo il punto
// d'impatto si colpisce ancora per «late» secondi. Arcade a tutti i livelli: i livelli cambiano quanto costa il tempo
// sbagliato (timingSpan), non se si prende la palla. Prima a Esperto e Leggenda l'attesa era di 0,16 s: colpi a vuoto
// con la palla ancora a 3–10 m (sessione del 22/10).
// In ritardo il lungolinea pieno vale lateSpanOf (la palla passa lateBehind metri dietro il punto d'impatto); si colpisce
// ancora fino a lateExtra volte quel tempo (spinta oltre la finestra, la palla può uscire di lato), poi è a vuoto.
export const IMPACT = Object.freeze({
  casual: Object.freeze({ early: .5, lateExtra: 2 }),
  pro: Object.freeze({ early: .42, lateExtra: 1.8 }),
  leggenda: Object.freeze({ early: .4, lateExtra: 1.5 }),
  '1v1': Object.freeze({ early: .45, lateExtra: 1.8 }),
  contactAhead: .35,  // m: punto d'impatto davanti a chi colpisce (la palla poco davanti al corpo)
  lateBehind: 1.4,    // m dietro il punto d'impatto: lungolinea pieno
  lateExtra: 1.5,     // oltre questo multiplo del ritardo pieno la palla è passata (per livello: più tollerante a Casual)
  reach: 2.4,         // m: portata laterale della racchetta (il movimento automatico porta la palla a ~0,7 m)
});
export const impactWindow = difficulty => IMPACT[String(difficulty || 'casual').toLowerCase()] || IMPACT.casual;

// Intenzione da qualunque colpo arrivato al motore: dal telefono con la forma (natpf.intent), altrimenti ricostruita
// dai campi di sempre (tipo di colpo, forza, mira): telefoni non aggiornati, webcam, controlli di prova.
const RISE_OF = Object.freeze({ lob: .8, topspin: .3, flat: 0, slice: -.4, drop: -.4, smash: -.3 });
export function eventIntent(e = {}){
  const n = e.natpf || {};
  if (n.intent && typeof n.intent === 'object') return n.intent;
  const raw = String(n.shot || (e.natpfDrop ? 'drop' : e.shotType) || 'topspin').toLowerCase();
  const shot = ['topspin', 'flat', 'slice', 'drop', 'lob', 'smash'].includes(raw) ? raw : raw === 'power' ? 'flat' : 'topspin';
  // forza dalla velocità del gesto che arriva al motore (come prima); natpf.power solo se manca
  const power = Number.isFinite(Number(e.speed)) ? clamp((Number(e.speed) - .8)/.85) : Number.isFinite(n.power) ? clamp(n.power) : .5;
  const face = Number.isFinite(n.wrist) ? clamp(n.wrist, -1, 1) : clamp(finite(e.dirX), -1, 1);
  // la mira di questi controlli (dirX) è già una scelta di direzione: pesa più del piatto del telefono
  return { shot, power, depth: power, rise: RISE_OF[shot], face, faceWeight: .7, derived: true };
}
// Schiacciata all'impatto: sopra 2,3 m (always) solo da sopra la testa; da SMASH_FROM.gesture (all'altezza della spalla) se il
// gesto è una schiacciata o scende deciso rispetto al proprio colpo normale. 29/10 pomeriggio: i due gesti di
// schiacciata della partita (riconosciuti come tali) arrivavano su palle a 1,55–1,70 m, sotto la soglia di prima (1,75 m),
// e diventavano un colpo piatto con il movimento del dritto o del rovescio: «non sono riuscito a fare uno smash»
// serveReturn (risposta al servizio, decisione dell'utente del 31/10): sotto «always» schiacciata solo dal gesto della
// schiacciata. La risposta si prende fino a 1,72 m (natpf_impact.PLAN.returnTop) e un tagliato che scende deciso diventava
// una schiacciata vincente a 338 km/h (diagnostica 20261030-142438 n. 143); negli altri colpi la regola del 29/10 resta
export const SMASH_FROM = Object.freeze({ gesture: 1.5, always: 2.3, rise: -.15, power: .3 });
export function smashAt(e = {}, ballY = 1, { serveReturn = false } = {}){
  const y = finite(ballY, 1), it = eventIntent(e);
  if (y >= SMASH_FROM.always) return true;
  if (y < SMASH_FROM.gesture) return false;
  const rel = finite(it.rise) - finite(it.riseRef);
  const gesture = e.side === 'overhead' || it.shot === 'smash' || String(e.shotType || '').toLowerCase() === 'smash';
  // forza sulla scala di SMASH_FROM.power (superStrength: typePower dal telefono, B15), non quella dell'esito: come prima da
  // 0,64 volte il colpo tipico (780 °/s; con la forza dell'esito sarebbe da 0,71)
  return gesture || (!serveReturn && rel <= SMASH_FROM.rise && superStrength(it, .5) >= SMASH_FROM.power);
}
// Gesto della schiacciata (solo per il nome del colpo e la voce, non per l'esito). Dal telefono: il colpo riconosciuto
// (classifyPhoneShot / strokeIntent: palla alta + mano che scende). Dalla webcam e dagli altri controlli: «smash» da sopra
// la testa, non un colpo veloce di lato (webcam_argon_track e motion_controls chiamano «smash» anche ogni swing forte).
const SMASH_DOWN = .5;
export function smashGesture(e = {}){
  if (e.side === 'overhead') return true;
  const n = e.natpf || {};
  if ((n.intent && typeof n.intent === 'object') || n.shot) return eventIntent(e).shot === 'smash';
  if (String(e.shotType || '').toLowerCase() !== 'smash') return false;
  // dall'alto in basso almeno quanto la regola della webcam (webcam_strokes: −D.u ≥ 0,5·|D.x|): una schiacciata che
  // scende in diagonale resta una schiacciata (prima serviva dirY ≥ |dirX|: «Dritto incrociato» senza voce)
  return !((e.side === 'forehand' || e.side === 'backhand') && finite(e.dirY) < SMASH_DOWN * Math.abs(finite(e.dirX)));
}
// Schiacciata da chiamare per nome (scritta del colpo e voce «Smash», segnalazione del 06/11: «la voce dice "smash" ma
// non è realmente quel colpo»): il motore la gioca da sopra la testa (smash: smashAt, o la regola di sempre del doppio,
// palla sopra 1,78 m o colpo forte sopra 1,5 m) E chi gioca ha fatto il gesto della schiacciata (smashGesture). Un
// dritto, una volée, un colpo forte o un tagliato che scende deciso all'altezza della spalla (regola del 29/10 di
// smashAt: il motore lo gioca da sopra la testa, ma il gesto non è una schiacciata) restano col loro nome e senza voce.
export function smashCalled(e = {}, { smash = false } = {}){
  return !!smash && smashGesture(e);
}

// Servizio dal gesto (prima era sempre «POWER SERVE» con la posizione a caso: sessione del 22/10). Il lancio parte con il
// primo gesto; il colpo è il gesto dopo, giocato quando arriva. Il tempo rispetto al punto più alto del lancio (tau, s,
// + prima) decide la qualità; forza, effetto e angolo vengono dal gesto. Il servizio resta nel quadrato come prima
// (assistenza: i falli di servizio non ci sono), ma un servizio sporco è più lento e più centrale.
export const SERVE = Object.freeze({
  ignoreBefore: .42,     // s prima del punto più alto: il gesto fa ancora parte del lancio, non è il colpo
  perfect: .18,          // s attorno al punto più alto: qualità piena
  span: .4,              // s oltre perfect in cui la qualità scende fino a 1 − drop
  drop: .55,
  boxCenter: 2.05, boxHalf: 1.6, margin: .28,   // m: centro e metà larghezza del quadrato, distanza minima dalle righe
  planeAim: 1.5, faceAim: .8,                   // m di lato per il verso dello swing e per il piatto
  depth: [4.3, 6.0],                            // m dalla rete, da forza 0 a forza 1 (riga del servizio a 6,4)
  // B18 (D12): s di volo da forza 0 a 1, uguale per i tre tipi: un gesto più forte non dà mai una palla più lenta. Prima
  // il kick volava [1.12, .84] e il tagliato [.98, .64]: con la presa nel palmo il servizio del tutorial a 1,2× diventava
  // un kick più lento del 20% (la salita cresce con la velocità). Il tipo cambia l'effetto (rimbalzo alto del kick,
  // curva del tagliato), non la velocità. La curva è quella del tagliato di prima: il servizio di chi imita il tutorial
  // (prima sempre tagliato) ha la stessa velocità di prima; il piatto forte, raro (presa a martello da 1,5×), vola 0,69 s
  // invece di 0,62
  flight: Object.freeze({ flat: [.98, .64], slice: [.98, .64], kick: [.98, .64] }),
  // servizi senza la forma del telefono (intenzione ricostruita: webcam, mouse, prove; eventIntent derived): il tipo viene
  // dal colpo scelto (top spin → kick) e non cambia con la forza, quindi il volo resta quello di prima per tipo. Con la
  // curva unica il «kick» di questi servizi diventava più veloce del 15–25% e Pro più facile nel banco (audit:legend)
  legacyFlight: Object.freeze({ flat: [.92, .56], slice: [.98, .64], kick: [1.12, .84] }),
  spin: Object.freeze({ flat: 14, slice: 9, kick: 24 }),
  // B18 (D12, D13 del rapporto B16): il tipo si giudica rispetto al servizio abituale di chi gioca (habit: salita, |piano|
  // e forza dei propri servizi piatti, imparati dai servizi della partita con createServeRef; prima di impararli quelli del
  // servizio insegnato nel tutorial, presa nel palmo a 1×). Kick: la testa sale almeno kickRel più del proprio servizio;
  // tagliato: lo swing è almeno sliceRel più orizzontale. Prima le soglie erano assolute (salita 0,12, |piano| 0,4) e il
  // servizio insegnato (|piano| 0,50–0,60) era sempre un tagliato. «Gran servizio»: a tempo (q ≥ 0,9) e almeno greatRel
  // più forte del proprio servizio (prima ritmo ≥ 0,62 per tutti: 25 servizi su 296 nella partita simulata)
  habit: Object.freeze({ rise: -.08, plane: .55, power: .5 }),
  kickRel: .3, sliceRel: .25, greatRel: .1, learn: .3, strongPace: .62,
  // revisione del B18: i primi learnFree servizi della partita si imparano qualunque tipo escano (chi serve sempre con la
  // testa che sale, o molto di lato, altrimenti non veniva mai imparato e restava giudicato sul servizio insegnato); prima
  // di averne imparato uno «Gran servizio» vuole almeno greatCold (la presa a racchetta a 1× ha forza 0,62: il primo
  // servizio di ogni partita era «Gran servizio»); la soglia non supera greatMax (chi serve sempre al massimo lo ottiene)
  learnFree: 3, greatCold: .75, greatMax: .9,
});
// Riferimento del proprio servizio (SERVE.habit): media dei propri servizi, letti dal telefono con la forma (non le
// intenzioni ricostruite di webcam, mouse e CPU): i primi SERVE.learnFree di qualunque tipo, poi solo quelli piatti
// rispetto al riferimento. Un servizio voluto diverso (kick, tagliato) dopo i primi non lo sposta
export function createServeRef(){
  let v = { ...SERVE.habit, n: 0 };
  return {
    get value(){ return v; },
    learn(intent, out = null){
      if (!intent || intent.derived || (out && out.kind !== 'flat' && v.n >= SERVE.learnFree)) return;
      const r = Number(intent.rise), p = Math.abs(Number(intent.plane)), w = Number(intent.power);
      if (![r, p, w].every(Number.isFinite)) return;
      const a = SERVE.learn;
      v = { rise: v.rise + a*(r - v.rise), plane: v.plane + a*(p - v.plane), power: v.power + a*(w - v.power), n: v.n + 1 };
    },
    reset(){ v = { ...SERVE.habit, n: 0 }; },
  };
}
// riferimento del servizio di un personaggio nel motore (si azzera a ogni partita nuova: game_engine.startNewMatch)
export function serveRefOf(engine, actor){
  const M = engine.natpfServeRef || (engine.natpfServeRef = new Map());
  let r = M.get(actor); if (!r) M.set(actor, r = createServeRef());
  return r;
}
// boxSign: −1/+1 lato del campo del quadrato (segno della x del suo centro); tau: s prima del punto più alto
// ref: servizio abituale di chi batte ({ rise, plane, power }, createServeRef().value); senza, SERVE.habit
export function serveOutcome({ intent = {}, tau = 0, boxSign = -1, ref = null } = {}){
  const S = SERVE, q = 1 - S.drop*clamp((Math.abs(finite(tau)) - S.perfect)/S.span);
  const power = clamp(finite(intent.power, .6)), pace = power*(.55 + .45*q);
  const rise = finite(intent.rise), plane = finite(intent.plane), H = ref || S.habit;
  const kind = rise - finite(H.rise, S.habit.rise) >= S.kickRel ? 'kick' : Math.abs(plane) - finite(H.plane, S.habit.plane) >= S.sliceRel ? 'slice' : 'flat';
  // angolo: verso orizzontale dello swing (+ da destra a sinistra → palla a sinistra) e piatto; un servizio sporco va più
  // verso il centro del quadrato
  const xc = Math.sign(boxSign || -1)*S.boxCenter, dx = (-plane*S.planeAim + clamp(finite(intent.face), -1, 1)*S.faceAim)*q;
  const lo = Math.min(0, xc*2) + S.margin, hi = Math.max(0, xc*2) - S.margin;
  const x = clamp(xc + dx, Math.min(lo, hi), Math.max(lo, hi));
  const depth = lerp(S.depth[0], S.depth[1], pace);
  // «Gran servizio»: greatRel sopra il proprio servizio; con il riferimento ancora da imparare (n = 0) almeno greatCold
  const cold = ref && Number(ref.n) === 0, greatAt = Math.min(S.greatMax, Math.max(finite(H.power, S.habit.power) + S.greatRel, cold ? S.greatCold : 0));
  const F = (intent.derived ? S.legacyFlight : S.flight)[kind], flight = lerp(F[0], F[1], pace);
  return { x: +x.toFixed(3), depth: +depth.toFixed(3), flight: +flight.toFixed(3), topspin: S.spin[kind], sidespin: kind === 'slice' ? -Math.sign(plane)*6 : 0,
    // strong: servizio potente per il motore (palla «potente»: risposta della CPU, ball.isPowerShot), con la regola di prima
    // (a tempo e ritmo ≥ 0,62): la scritta «Gran servizio» (grade) è sulla propria forza, l'effetto sulla CPU resta quello
    kind, q: +q.toFixed(3), pace: +pace.toFixed(3), strong: q >= .9 && pace >= S.strongPace, grade: q >= .9 && power >= greatAt ? 'POWER SERVE!' : q < .7 ? (tau > 0 ? 'EARLY SERVE' : 'LATE SERVE') : 'GOOD SERVE' };
}

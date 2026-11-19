// Registri dello stand FINTI, per provare lo strumento di riassunto (riassunto.mjs) senza aspettare lo stand vero.
//   node natpf-tennis/scripts/registro/finto.mjs --out=cartella [--giorni=3] [--partite=300] [--seme=1] [--forma=spazio|scarico|coda|righe]
// Forme (le stesse che lo strumento di riassunto deve leggere):
//   scarico (di base)  un file per giorno, registro-AAAA-MM-GG.jsonl.gz: quello che dà il Worker con la chiave (i
//                      blocchi compressi uno dopo l'altro, ognuno con in testa la riga {"k":"blocco",…})
//   spazio             l'albero dello spazio Cloudflare: registro/<giorno>/<postazione>/<parte>.jsonl.gz
//   coda               uno zip come «Scarica la coda» del pannello dello stand (blocchi in chiaro, senza la riga del blocco)
//   righe              un file .jsonl per giorno, in chiaro
// Le righe hanno gli stessi campi di quelle vere (src/natpf/natpf/registro/registro_registratore.js) e passano tutte
// dalla pulizia del gioco (registro_formato.pulisci): se un campo non è previsto qui si vede subito (test). I numeri
// sono inventati ma verosimili e RIPETIBILI (stesso seme = stesse righe): `verita` dice quante partite, punti e colpi
// ci sono, così i test confrontano il riassunto con la verità.
// B36.0 (direzione: true, di base): anche i campi della direzione dei colpi (piatto, scarto della cima, tempo in finestre,
// rimbalzo vero, fuori, modello della direzione) e qualche partita a Precision, da un generatore a parte (le altre righe
// restano quelle di prima). Il modello è inventato: serve a provare lo strumento, non dice niente delle persone.
// B66 (b66: true, di base): anche le misure di sensori, calibrazione, collegamento, rete e blocco del telefono (righe
// «colpo» e «partita.fine»), da un altro generatore a parte. Anche questo inventato: serve a provare il riassunto.
// B71 (revisione): con le misure la versione del gioco è una dopo la 2026-11-18.3 (VERSIONE_B71, formato 4): «cf» delle
// righe «colpo» è sulla scala del gioco e il riassunto la conta solo per quelle versioni (riassunto.cfDelGioco).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { pulisci, testoRiga, idBlocco } from '../../src/natpf/registro/registro_formato.js';
import { zipBlob } from '../../src/natpf/diag/diag_zip.js';
import { faceAimFromDev } from '../../src/natpf/natpf_stroke_intent.js';
import { PRECISION_ZONES } from '../../src/natpf/natpf_arcade.js';

// numeri a caso ripetibili (mulberry32)
export function casuale(seme = 1){
  let a = seme >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
const r = (v, d = 2) => +(+v).toFixed(d);
const GESTI = ['dritto', 'rovescio', 'topspin', 'tagliato', 'pallonetto', 'volée', 'schiacciata', 'piatto'];
// B71: i voti veri del registro (il voto del motore in minuscolo, registro_registratore.voto) con il loro errore di tempo in
// ms (+ anticipo): prima erano voti italiani inventati e il riassunto, che cercava 'perfetto', non vedeva l'errore
const VOTI = [['perfect', -35, 60], ['early', 60, 170], ['very early', 170, 450], ['late', -120, -35], ['very late', -220, -120]];
const VOTI_SERVIZIO = ['good serve', 'power serve!', 'early serve', 'late serve', 'good serve'];
const FASCE = ['bambino', 'ragazzo', 'adulto'];
const LIVELLO = { bambino: 'bambini', ragazzo: 'casual', adulto: 'evento' };
const SCARTI = ['troppo debole', 'telefono: gesto scartato', 'doppio', 'fuori tempo'];
export const VERSIONE_B71 = '2026-11-19.1';

// Un giorno di stand: { righe: [testo…], verita }. ora0: ora di apertura (locale), fuso: minuti dal tempo universale
export function giornoFinto({ giorno = '2026-11-14', partite = 300, seme = 1, g = null, ora0 = 9, ore = 10, fuso = 60, direzione = true, b66 = direzione } = {}){
  const rnd = casuale(seme*7919 + Number(giorno.replace(/-/g, '')) % 100000), scegli = list => list[Math.floor(rnd()*list.length)], tra = (a, b) => a + rnd()*(b - a), prob = p => rnd() < p;
  // B36.0: generatore a parte per la direzione (le righe di prima restano le stesse)
  const rd = casuale(seme*104729 + Number(giorno.replace(/-/g, '')) % 100003 + 17), gd = () => { let u = 0, v = 0; while (!u) u = rd(); while (!v) v = rd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  // B66: generatore a parte per le misure del telefono (le righe di prima restano le stesse)
  const rb = casuale(seme*15485863 + Number(giorno.replace(/-/g, '')) % 99991 + 29), gb = () => { let u = 0, v = 0; while (!u) u = rb(); while (!v) v = rb(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  // un telefono della partita: frequenza, segnale (app), ritardo tipico; i colpi e la fine della partita ne prendono le misure
  const telB66 = () => { const app = rb() < .6, hz = rb() < .15 ? 30 + rb()*20 : 58 + rb()*5, rssi = app ? Math.round(-50 - rb()*35) : null; return { app, hz, rssi, base: 25 + rb()*30 + (rssi != null && rssi < -75 ? 60 : 0), arr: [], ris: [], colpi: 0, gb: 0, tip: 450 + rb()*300, cen: null }; };
  // (lato: parte del corpo del colpo; pl: la palla, quasi sempre dalla stessa parte)
  const colpoB66 = (T, lato = null) => {
    if (!T) return {};
    T.colpi++; const a = Math.round(T.base + Math.exp(gb()*.6)*12), ri = a + Math.round(4 + rb()*14); T.arr.push(a); T.ris.push(ri);
    const buco = rb() < (T.hz < 50 ? .08 : .015); if (buco) T.gb++;
    if (T.cen == null && rb() < .3) T.cen = T.colpi - 1;
    return { cf: r(lim(.5 + gb()*.2, 0, 1)), mg: r(lim(1.6 + gb()*.4, 1, 4)), ...(buco ? { gb: Math.round(40 + rb()*120) } : {}), rit: [a, ri], ...(lato === 1 || lato === -1 ? { pl: rb() < .93 ? lato : -lato } : {}) };
  };
  const pct = (v, q) => { const o = [...v].sort((x, y) => x - y); return o.length ? o[Math.min(o.length - 1, Math.ceil(q*o.length) - 1)] : null; };
  const fineB66 = (T, durS) => {
    const n = Math.round(T.hz*durS), b = T.hz < 50 ? 2 + Math.floor(rb()*8) : Math.floor(rb()*3), persi = rb() < .05 ? 1 : 0;
    return {
      tq: { hz: [r(T.hz, 1), r(T.hz*(.75 + rb()*.2), 1)], n, ...(b ? { b, bm: Math.round(40 + rb()*300) } : {}), ...(T.gb ? { bg: T.gb } : {}), iv: 16, ...(rb() < .1 ? { sat: [Math.floor(rb()*3), Math.floor(rb()*5)] } : {}) },
      lat: { ...(T.arr.length ? { arr: [pct(T.arr, .5), pct(T.arr, .9), pct(T.arr, .99)], ris: [pct(T.ris, .5), pct(T.ris, .9), pct(T.ris, .99)], jit: Math.round(5 + rb()*25) } : {}), n: T.colpi, ...(persi ? { persi } : {}), vie: [Math.round(T.colpi*.9), T.colpi - Math.round(T.colpi*.9)] },
      ...(T.app ? { wifi: { rssi: [T.rssi, T.rssi - Math.round(rb()*10)], bd: rb() < .7 ? 5 : 2.4, mbps: [Math.round(150 + rb()*400), Math.round(50 + rb()*100)], bt: [Math.round(60 + rb()*40), 0], ch: rb() < .3 ? 1 : 0, tc: r(28 + rb()*12, 1), fx: rb() < .9 ? 1 : .5 } } : {}),
      ...(T.app ? { blocco: { durS: Math.round(durS*.9), ...(rb() < .4 ? { tb: 1 + Math.floor(rb()*6) } : {}), ...(rb() < .05 ? { ss: 1 } : {}), ...(rb() < .1 ? { us: 1, sc: 1 } : {}) } } : {}),
      cal: { tip: [Math.round(T.tip), Math.round(T.tip*(.9 + rb()*.3))], tipN: Math.min(T.colpi, 2 + Math.floor(rb()*2)), ...(T.cen != null ? { cen: T.cen } : {}), ...(T.colpi >= 4 ? { dvi: [r(gb()*12, 1), r(gb()*6, 1)] } : {}), ...(rb() < .08 ? { seg: 1 } : {}), ...(rb() < .03 ? { ric: 1 } : {}), ref: [600, 600], tipo: rb() < .7 ? 'calibrato' : 'semplice', soglia: [70, 120] },
    };
  };
  // un colpo del telefono: persona (sd del giro, quota di colpi mirati, errore del seme), quanti colpi ha già fatto, verso
  // voluto (−1 sinistra, 0, +1 destra; null: a caso). Restituisce i campi della riga nel riferimento di chi colpisce
  const dirColpo = (pers, k, voluto = null) => {
    const lato = rd() < .6 ? 1 : -1, w = voluto ?? (rd() < pers.mira ? (rd() < .5 ? -1 : 1) : 0);
    const dv = k < 3 && rd() < .4 ? null : pers.seme + w*(10 + rd()*15) + gd()*pers.sd, pf = dv == null ? 0 : faceAimFromDev(dv, 17);
    const tu = lim(.3 + gd()*.45, -2.5, 2.5), at = lim(tu, -1, 1), aim = -lato*.1*(1 - Math.abs(at)) - lato*at + pf;
    const xr = lim(aim*3.65*.86 + gd()*.25, -6.5, 6.5);
    return { lato, pf, dv, tu, d: aim, xr, xt: xr/.86, fu: Math.abs(xr) > 4.335 };
  };
  const persona = () => ({ sd: 8 + rd()*12, mira: rd()*.6, seme: gd()*6 });
  const post = g || Array.from({ length: 8 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rnd()*32) % 32]).join('');
  const inizio = Date.parse(`${giorno}T${String(ora0).padStart(2, '0')}:00:00Z`) - fuso*60000, passo = ore*3600000/Math.max(1, partite);
  const righe = [], V = { giorno, postazione: post, partite: 0, finite: 0, abbandonate: 0, punti: 0, colpi: 0, perModo: {}, perChi: {}, aiuto: { partite: 0, vinteDalGiovane: 0 }, errori: 0, cadute: 0, tutorial: 0, calibrazioni: 0, visite: 0, superRiusciti: 0 };
  let t = 0;
  const riga = (k, d) => { const row = pulisci({ k, t: Math.round(t), ...d }); const s = row && testoRiga(row); if (!s) throw new Error(`riga finta non valida: ${k} ${JSON.stringify(d)}`); righe.push(s); };
  const ora = () => new Date(inizio + t).toISOString();
  const tel = () => ({ strada: prob(.8) ? 'lan' : prob(.7) ? 'relay' : 'internet', rtt: r(tra(8, 90), 0), so: prob(.7) ? `Android ${11 + Math.floor(rnd()*5)}` : `iPhone iOS ${16 + Math.floor(rnd()*3)}`, browser: prob(.7) ? `Chrome ${120 + Math.floor(rnd()*12)}` : 'Safari 17' });
  riga('avvio', { v: b66 ? 4 : direzione ? 2 : 1, ora: ora(), fuso, g: post, versione: b66 ? VERSIONE_B71 : '2026-11-12.4', dove: 'programma', motivo: 'avvio', schermo: [1920, 1080], area: [1024, 1024], dpr: 1, cpu: 8, gpu: true, gpuTipo: 'NVIDIA GeForce RTX 3060', pagina: 'navigate', chiosco: true, prima: prob(.2) ? 'improvvisa' : 'pulita' });
  for (let n = 1; n <= partite; n++){
    t = (n - 1)*passo + tra(0, passo*.2);
    const t0 = t;
    // prima della partita: a volte tutorial e calibrazione (visitatore nuovo), a volte una visita che finisce senza giocare
    if (prob(.5)){
      const finito = prob(.8);
      riga('tutorial', { chi: 'g', serie: 'short', schede: 6, viste: finito ? 6 : 1 + Math.floor(rnd()*4), tutte: finito, durS: r(tra(15, 70), 1), chiusura: finito ? 'finito' : prob(.5) ? 'saltato' : 'chiosco' }); V.tutorial++;
      const prove = 4 + Math.floor(rnd()*5), fallite = Math.floor(rnd()*Math.min(4, prove)), fin = prob(.9);
      riga('calibrazione', { chi: 'g', finita: fin, durS: r(tra(20, 80), 1), prove, fallite, passi: { dritto: [Math.ceil(prove/2), Math.ceil(fallite/2)], rovescio: [Math.floor(prove/2), Math.floor(fallite/2)] }, ...(fallite ? { perche: { 'troppo debole': fallite } } : {}), ...(prob(.1) ? { ripartenze: 1 } : {}) }); V.calibrazioni++;
      t += 60000;
    }
    // B28: calibrazione giocando (scambi di prova) prima della partita, di base per chi ha il telefono
    if (prob(.6)){
      const palle = 4 + Math.floor(rnd()*6), salta = prob(.25), dr = Math.ceil(palle*.4), rv = Math.floor(palle*.3);
      riga('calibrazione', { chi: 'g', tipo: 'giocando', finita: true, ...(salta ? { saltato: true } : {}), durS: r(tra(15, 45), 1), prove: palle, colpi: dr + rv, passi: { dritto: [dr, 0], rovescio: [rv, 0] }, livello: scegli(['pieno', 'parziale', 'nessuno']) });
      riga('colpo', { amb: 'prova', gesto: 'forehand', ms: Math.round(tra(-90, 90)), voto: 'perfect', f: .5 });
      V.prove = (V.prove || 0) + 1; t += 30000;
    }
    if (prob(.06)){ riga('visita', { durS: r(tra(10, 90), 0), partite: 0, posti: { menu: 12, calibrazione: 20 }, abbandono: scegli(['menu', 'tutorial', 'calibrazione']), come: prob(.6) ? 'chiosco' : 'menu' }); V.visite++; }
    if (prob(.03)){ riga('tel', { chi: 'g', stato: 'collegato', ...tel() }); }
    const split = prob(.35), evento = !split && prob(.5), chi = split ? null : evento ? 'adulto' : scegli(['bambino', 'ragazzo']);
    const fasce = split ? [scegli(FASCE), scegli(FASCE)] : null, ord = f => FASCE.indexOf(f);
    const aiuto = split && fasce[0] !== fasce[1] ? (ord(fasce[0]) < ord(fasce[1]) ? 'g' : 'a') : null, campoAperto = split && prob(.3);
    const modo = split ? 'stesso-schermo' : 'cpu';
    let ek = evento ? r(tra(.4, .6), 3) : null;
    const tb66 = b66 ? { g: telB66(), ...(split ? { a: telB66() } : {}) } : {};
    // B66: versione dell'app e, a volte, della pagina del telefono rimasta indietro
    const telV = T => (T ? { ...(T.app ? { app: '1.0.4' } : {}), ...(rb() < .05 ? { pv: '2026-11-17.4' } : {}) } : {});
    riga('partita', { n, ora: ora(), g: post, versione: b66 ? VERSIONE_B71 : '2026-11-12.4', modo, ...(split ? {} : { chi, livello: LIVELLO[chi] }), formato: 'quick', game: 2, fiera: split, batte: 'g', personaggi: prob(.5) ? 'sempre' : 'lobdrop', ctrl: 'telefono', mano: prob(.9) ? 'right' : 'left', ...(split ? { mano2: 'right' } : {}),
      segnale: true, nomeInserito: prob(.4), ...(split ? { nomeInserito2: prob(.4) } : {}), stand: { chiosco: true, fiera: 'split', mira: 'alta', caldo: true, ...(split ? { lancioAuto: prob(.5), campoAperto } : {}) },
      ...(split ? { fasce, aiuto } : {}), ...(evento ? { ek } : {}), ...(b66 ? { displayLagMs: 0 } : {}), tel: { ...tel(), ...telV(tb66.g) }, ...(split ? { tel2: { ...tel(), ...telV(tb66.a) } } : {}), ...(direzione ? { dir: 'classica' } : {}) });
    const pers = { g: persona(), a: persona() }, fatti = { g: 0, a: 0 };
    V.partite++; V.perModo[modo] = (V.perModo[modo] || 0) + 1; if (chi) V.perChi[chi] = (V.perChi[chi] || 0) + 1;
    // forza di chi gioca: i bambini vincono meno punti contro la CPU; nello stesso schermo il più giovane ne vince il 40%
    const pVince = split ? (aiuto === 'g' ? .4 : aiuto === 'a' ? .6 : .5) : chi === 'bambino' ? .42 : chi === 'ragazzo' ? .5 : .55;
    const abbandona = prob(.12), puntiMax = abbandona ? 1 + Math.floor(rnd()*6) : 99;
    let pg = 0, og = 0, pp = 0, op = 0, punti = 0, vinti = 0, colpi = 0, colpi2 = 0, batte = 'g', scarti = {}, lanciTot = 0, vuotiTot = 0, cadute = 0, errori = 0;
    while (pg < 2 && og < 2 && punti < puntiMax){
      const p = punti + 1, nColpi = 1 + Math.floor(-Math.log(1 - rnd())*2.6), vince = prob(pVince) ? 'g' : 'a';
      const lanciVuoti = prob(.15) ? 1 : 0, lanci = 1 + lanciVuoti;
      t += tra(3000, 9000);
      if (batte === 'g' || split) riga('servizio', { ...(batte === 'a' ? { chi: 'a' } : {}), tipo: scegli(['flat', 'kick', 'slice']), q: r(tra(.3, 1)), ms: r(tra(-120, 120), 0), kmh: Math.round(tra(70, 170)), voto: scegli(VOTI_SERVIZIO) });
      const inizioScambio = t;
      for (let c = 2; c <= nColpi; c++){
        t += tra(900, 1800);
        const diG = (c % 2 === 0) === (batte === 'a');                      // chi risponde al servizio colpisce i colpi pari
        if (!diG && !split) continue;                                        // i colpi della CPU non sono nel registro
        const [voto, da, a] = scegli(VOTI), ms = tra(da, a), forza = tra(.2, 1);
        const ultimo = c === nColpi, sbaglia = ultimo && vince !== (diG ? 'g' : 'a') && prob(.6);
        // (le estrazioni nell'ordine di prima: gesto, mira, errore, caduta)
        const gesto = scegli(GESTI), dd = r(tra(-1, 1)), ee = sbaglia ? (prob(.5) ? 'rete' : 'fuori') : null, xx = r(tra(-4, 4), 1), zz = r(tra(-11.5, -2), 1);
        // B36.0: con la direzione, mira, caduta e rimbalzo vengono dal modello del telefono (nel riferimento del campo: il
        // Player 2 colpisce verso +z e la sua destra è −x)
        const chiK = diG ? 'g' : 'a', D = direzione ? dirColpo(pers[chiK], fatti[chiK]++) : null, sx = diG ? 1 : -1;
        const dirCampi = D ? { d: r(D.d), x: r(sx*D.xt, 1), lato: D.lato, pf: r(D.pf), ...(D.dv != null ? { dv: r(D.dv, 1) } : {}), tu: r(D.tu), ...(sbaglia && rd() < .5 ? {} : { rx: r(sx*D.xr), rz: r(sx*Math.abs(zz)*-.98), ...(D.fu ? { fu: 1 } : {}) }) } : {};
        riga('colpo', { n, ...(diG ? {} : { chi: 'a' }), gesto, ms: r(ms, 0), voto, f: r(forza), d: dd, ...(ee ? { e: ee } : {}), x: xx, z: zz,
          ...(forza >= .8 ? (prob(.25) ? { sup: c >= 20 ? 'calda' : 'alta' } : { supNo: scegli(['palla bassa', 'fuori tempo', 'troppo lontano']) }) : {}), ...(prob(.08) ? { volee: true } : {}), ...dirCampi, ...colpoB66(tb66[chiK], dirCampi.lato) });
        if (diG) colpi++; else colpi2++; V.colpi++;
        if (righe[righe.length - 1].includes('"sup":')) V.superRiusciti++;
      }
      // (B71: i colpi a vuoto «tardi» hanno l'errore di tempo, negativo; «presto» oltre la finestra d'impatto)
      if (prob(.05)){ const tardi = !prob(.5); riga('vuoto', { perche: tardi ? 'tardi' : 'presto', ms: r(tardi ? -tra(150, 300) : tra(450, 750), 0), f: r(tra(5, 20), 0) }); }
      if (prob(.08)){ const k = scegli(SCARTI); scarti[k] = (scarti[k] || 0) + 1; }
      t += tra(500, 1500);
      const fine = nColpi <= 1 ? (vince === batte ? 'ace' : prob(.5) ? 'servizio.rete' : 'servizio.fuori') : scegli(['rete', 'fuori', 'vincente', 'vincente', 'passata', 'a vuoto']);
      if (vince === 'g'){ pp++; vinti++; } else op++;
      if (pp >= 4 && pp - op >= 1){ pg++; pp = 0; op = 0; batte = batte === 'g' ? 'a' : 'g'; } else if (op >= 4 && op - pp >= 1){ og++; pp = 0; op = 0; batte = batte === 'g' ? 'a' : 'g'; }
      if (evento) ek = r(Math.min(1, Math.max(0, ek + (vince === 'g' ? .02 : -.02))), 3);
      riga('punto', { n, p, batte, vince, fine, ultimo: nColpi % 2 ? batte : (batte === 'g' ? 'a' : 'g'), colpi: nColpi, durS: r((t - inizioScambio)/1000, 1), attesaS: r(tra(2, 9), 1), pt: [pp, op, pg, og], lanci, ...(lanciVuoti ? { lanciVuoti } : {}), ...(evento ? { ek } : {}) });
      punti++; V.punti++; lanciTot += lanci; vuotiTot += lanciVuoti;
      if (prob(.004)){ riga('tel', { chi: 'g', stato: 'caduto', inPartita: true }); t += 4000; riga('tel', { chi: 'g', stato: 'ricollegato', dopoS: 4, ...tel(), inPartita: true }); cadute++; V.cadute++; }
      if (prob(.002)){ riga('errore', { n, tipo: 'errore', msg: scegli(["Cannot read properties of undefined (reading 'x')", 'ResizeObserver loop limit exceeded']), file: 'index-abc123.js', riga: 1200 + Math.floor(rnd()*3), col: 15, volte: 1 }); errori++; V.errori++; }
    }
    const finita = pg >= 2 || og >= 2;
    riga('partita.fine', { n, esito: finita ? 'finita' : 'abbandonata', ...(finita ? {} : { dove: 'a metà partita', come: prob(.5) ? 'chiosco' : 'menu' }), vince: finita ? (pg > og ? 'g' : 'a') : null, game: [pg, og], punti, puntiVinti: vinti, colpi, ...(colpi2 ? { colpi2 } : {}),
      durS: r((t - t0)/1000, 0), lanci: lanciTot, ...(vuotiTot ? { lanciVuoti: vuotiTot } : {}), ...(evento ? { ek } : {}), fps: { medi: r(tra(55, 60), 1), peggiori: r(tra(28, 58), 1), maxMs: r(tra(20, 90), 0), lunghi: Math.floor(rnd()*4), n: Math.round((t - t0)/16.7) },
      tel: { ...(cadute ? { cadute, riprese: cadute } : {}), rtt: r(tra(10, 60), 0), rttMax: r(tra(60, 200), 0) }, ...(errori ? { errori } : {}), ...(Object.keys(scarti).length ? { scartati: scarti } : {}), costoMs: r(tra(.5, 4), 1),
      ...(b66 ? (() => { const o = {}; for (const [k, T] of Object.entries(tb66)){ const f = fineB66(T, (t - t0)/1000); if (f.wifi) f.wifi.bt[1] = Math.max(0, f.wifi.bt[0] - Math.round((t - t0)/1000/400)); for (const [g2, v] of Object.entries(f)) (o[g2] || (o[g2] = {}))[k] = v; } const ps = rb() < .1 ? { pause: { [rb() < .7 ? 'segnale debole' : 'pagina nascosta']: [1, r(1 + rb()*6, 1)] } } : {}; return { ...o, ...ps }; })() : {}) });
    if (finita){ V.finite++; if (aiuto){ V.aiuto.partite++; if ((pg > og ? 'g' : 'a') === aiuto) V.aiuto.vinteDalGiovane++; } } else V.abbandonate++;
    if (prob(.5)){ riga('visita', { durS: r((t - t0)/1000 + 30, 0), partite: 1, posti: { menu: 8, partita: Math.round((t - t0)/1000) }, come: prob(.5) ? 'chiosco' : 'menu' }); V.visite++; }
    // B36.0: ogni tanto, dopo la partita, una partita a Precision (10 palle, una per zona)
    if (direzione && rd() < .05){
      const pers = persona(), giraLaCima = rd() < .5; let punti = 0;
      for (const [zp, z] of PRECISION_ZONES.entries()){
        t += 4000 + rd()*3000;
        const c = dirColpo(pers, 5, giraLaCima && Math.abs(z.x) >= 2 ? Math.sign(z.x) : null), rz = -(8 + rd()*3), dentro = !c.fu && Math.abs(rz) < 12;
        const pts = dentro ? Math.max(0, Math.round(100*(1 - Math.hypot(c.xr - z.x, rz - z.z)/(2*z.r)))) : 0; punti += pts;
        riga('colpo', { amb: 'minigioco', gesto: 'topspin', ms: r(c.tu*90, 0), voto: Math.abs(c.tu) <= .35 ? 'perfect' : c.tu > 0 ? 'early' : 'late', f: r(.4 + rd()*.4), d: r(c.d), x: r(c.xt, 1), z: r(rz, 1), lato: c.lato,
          pf: r(c.pf), ...(c.dv != null ? { dv: r(c.dv, 1) } : {}), tu: r(c.tu), rx: r(c.xr), rz: r(rz*.98), ...(c.fu ? { fu: 1 } : {}), zp });
      }
      riga('minigioco', { gioco: 'precision', finito: true, punti, durS: r(40 + rd()*30, 1), dir: 'classica' });
      V.precision = (V.precision || 0) + 1; t += 5000;
    }
  }
  t += 5000; riga('chiusura', { motivo: 'chiusura' });
  return { righe, verita: V };
}
// le righe di un giorno divise in blocchi come fa il gioco (uno ogni tante righe): [{ id, giorno, postazione, parte, testo }]
export function inBlocchi(giorno, postazione, righe, { perBlocco = 60, seme = 1 } = {}){
  const rnd = casuale(seme), out = [];
  for (let i = 0, seq = 1; i < righe.length; i += perBlocco, seq++){
    const id = idBlocco(giorno, postazione, seq, rnd), parte = id.split('_')[2];
    out.push({ id, giorno, postazione, parte, testo: righe.slice(i, i + perBlocco).join('\n') + '\n' });
  }
  return out;
}
const testa = b => JSON.stringify({ k: 'blocco', giorno: b.giorno, postazione: b.postazione, parte: b.parte }) + '\n';
// blocco come lo salva il Worker: gzip, con in testa la riga del blocco
export const bloccoSalvato = b => zlib.gzipSync(testa(b) + b.testo);

// Scrive i registri finti in `out` nella forma chiesta. Risponde con la verità di ogni giorno e i byte scritti
export async function scriviFinto({ out, giorni = 3, partite = 300, seme = 1, forma = 'scarico', primo = '2026-11-14' } = {}){
  if (!out) throw new Error('manca --out=cartella');
  fs.mkdirSync(out, { recursive: true });
  const verita = [], coda = []; let byte = 0, chiaro = 0;
  for (let i = 0; i < giorni; i++){
    const giorno = new Date(Date.parse(`${primo}T12:00:00Z`) + i*86400000).toISOString().slice(0, 10);
    const { righe, verita: V } = giornoFinto({ giorno, partite, seme: seme + i }), blocchi = inBlocchi(giorno, V.postazione, righe, { seme: seme + i });
    verita.push(V); chiaro += righe.reduce((a, l) => a + l.length + 1, 0);
    if (forma === 'righe'){ const f = path.join(out, `registro-${giorno}.jsonl`); fs.writeFileSync(f, righe.join('\n') + '\n'); byte += fs.statSync(f).size; }
    else if (forma === 'scarico'){ const f = path.join(out, `registro-${giorno}.jsonl.gz`); fs.writeFileSync(f, Buffer.concat(blocchi.map(bloccoSalvato))); byte += fs.statSync(f).size; }
    else if (forma === 'spazio') for (const b of blocchi){ const f = path.join(out, 'registro', giorno, b.postazione, `${b.parte}.jsonl.gz`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, bloccoSalvato(b)); byte += fs.statSync(f).size; }
    else if (forma === 'coda') for (const b of blocchi) coda.push({ name: `registro/${giorno}/${b.postazione}/${b.parte}.jsonl`, data: b.testo });
    else throw new Error(`forma non prevista: ${forma} (scarico, spazio, coda, righe)`);
  }
  if (forma === 'coda'){ const f = path.join(out, 'natpf-registro-coda.zip'); fs.writeFileSync(f, Buffer.from(await zipBlob(coda, { date: new Date(Date.parse(`${primo}T12:00:00Z`)) }).arrayBuffer())); byte += fs.statSync(f).size; }
  return { verita, byte, chiaro };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const opts = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([\w-]+)=(.*)$/.exec(a); if (!m){ console.error(`argomento non valido: ${a} (si usa --nome=valore)`); process.exit(1); } return [m[1], m[2]]; }));
  try {
    const res = await scriviFinto({ out: opts.out, giorni: +opts.giorni || 3, partite: +opts.partite || 300, seme: +opts.seme || 1, forma: opts.forma || 'scarico', ...(opts.primo ? { primo: opts.primo } : {}) });
    const tot = res.verita.reduce((a, v) => a + v.partite, 0);
    console.log(`Registri finti in ${path.resolve(opts.out)}: ${res.verita.length} giorni, ${tot} partite, ${res.byte} byte su disco (${(res.byte/1024/tot).toFixed(2)} kB a partita; in chiaro ${(res.chiaro/1024/tot).toFixed(2)} kB).`);
  } catch (e){ console.error(`Errore: ${e.message}`); process.exit(1); }
}

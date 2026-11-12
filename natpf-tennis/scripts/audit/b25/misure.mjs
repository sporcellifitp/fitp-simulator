// B25 · Stesso schermo tra due persone: misure con il banco dei due umani dell'audit B19 (../b19/due-umani.mjs: motore vero
// senza grafica, due persone simulate nello stesso schermo). Non cambia nessun file del gioco: opzioni, fasce e valori di
// prova si impostano solo in memoria (engine.natpfOpenCourt, natpfSplitBands, natpfHelpVariant, natpfSuperRel, natpfNoPrep,
// natpf_duo_rules.openTuning / helpTuning / superTuning).
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b25/misure.mjs <gruppo> [--partite=1] [--semi=7001,7103,7207] [--formato=fiera|classico] [--game=1]
// Gruppi: pari · super · preparazione · campo · battitore · campo-prove · aiuto · aiuto-altro · aiuto-prove · tutti (pari, super,
// preparazione, campo, aiuto, aiuto-altro di fila: circa un'ora; meglio un gruppo per volta, ognuno nel suo processo)
// «prima» = regole di f08243a (colpo super con la soglia uguale per tutti, preparazione che conta), rimesse a mano.
import { many, sum, pc, qt } from '../b19/due-umani.mjs';
import * as ND from '../../../src/natpf/natpf_duo_rules.js';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const G = process.argv[2] || 'tutti', K = +(arg('partite') || 1);
const SEEDS = (arg('semi') || '7001,7103,7207').split(',').map(Number);
const fair = (arg('formato') || 'fiera') !== 'classico';
// game da vincere (1 di base; 2 = al meglio di 3): vale per i gruppi che usano duo()
const GW = Math.max(1, +(arg('game') || 1));
const M = n => Math.max(4, Math.round(n*K));
const say = s => console.log(s);
// profilo «ragazzo» (10–14 anni, ipotesi): tra il bambino e l'adulto medio del banco
const RAGAZZO = { name: 'ragazzo', prep: .3, intent: .25, tSd: .115, wSd: .38, peak: 560, pSd: 120, spec: .02 };
const P = n => (n === 'ragazzo' ? RAGAZZO : n);
const nameOf = p => (typeof p === 'string' ? p : p.name);
const prima = e => { e.natpfSuperRel = false; e.natpfNoPrep = false; };
const both = (...f) => e => { for (const g of f) g?.(e); };
const setObj = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v || {}); };

// due lati: a gioca da P1 e poi da P2; tw(lato di a) → modifica del motore solo in memoria. Ritorna le due serie e i conti
function duo(a, b, o = {}, tw = null){
  const m = M(o.matches || 60);
  const r1 = many({ a: P(a), b: P(b), fair, gamesToWin: GW, ...o, matches: m, tweak: tw ? tw('p1') : o.tweak }, SEEDS), r2 = many({ a: P(b), b: P(a), fair, gamesToWin: GW, ...o, matches: m, tweak: tw ? tw('p2') : o.tweak }, SEEDS);
  const Mt = [...r1.matches.map(x => ({ ...x, a: x.win === 'p1' })), ...r2.matches.map(x => ({ ...x, a: x.win === 'p2' }))];
  const Pt = [...r1.pts.map(x => ({ ...x, a: x.win === 'p1' })), ...r2.pts.map(x => ({ ...x, a: x.win === 'p2' }))];
  const Gm = [...r1.games, ...r2.games], Sh = [...r1.shots.map(s => ({ ...s, a: s.k === 'p1' })), ...r2.shots.map(s => ({ ...s, a: s.k === 'p2' }))];
  const st = Pt.map(p => p.n), sec = Mt.map(x => x.sec), kinds = {};
  for (const p of Pt) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  return { r1, r2, Mt, Pt, Gm, Sh, n: Mt.length, winA: pc(Mt.filter(x => x.a).length, Mt.length), fromP1: pc(r1.matches.filter(x => x.win === 'p1').length, r1.matches.length), fromP2: pc(r2.matches.filter(x => x.win === 'p2').length, r2.matches.length),
    ptsA: pc(Pt.filter(x => x.a).length, Pt.length), ptsPerGame: +(Pt.length/Math.max(1, Gm.length)).toFixed(1), love: pc(Gm.filter(g => g.love).length, Gm.length),
    colpi: +(st.reduce((x, y) => x + y, 0)/Math.max(1, st.length)).toFixed(1), c50: qt(st, .5), c90: qt(st, .9), le2: pc(st.filter(x => x <= 2).length, st.length),
    s50: Math.round(qt(sec, .5) || 0), s90: Math.round(qt(sec, .9) || 0), sMax: Math.round(Math.max(0, ...sec)),
    kinds: Object.fromEntries(Object.entries(kinds).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, pc(v, Pt.length)])) };
}
const line = (name, d) => say(`${name.padEnd(58)} | ${d.n} part.: vince il primo ${d.winA}% (da P1 ${d.fromP1}%, da P2 ${d.fromP2}%) · punti ${d.ptsA}% · punti a game ${d.ptsPerGame}, game a zero ${d.love}% · colpi a punto ${d.colpi} (metà entro ${d.c50}, 9 su 10 entro ${d.c90}, entro 2 colpi ${d.le2}%) · partita: metà entro ${d.s50} s, 9 su 10 entro ${d.s90} s, la più lunga ${d.sMax} s`);
const kindsLine = k => Object.entries(k).map(([a, v]) => `${a} ${v}%`).join(' · ');
// colpi super di una serie: quanti, ogni quanti colpi, a partita per giocatore, quanti chiudono il punto
function supers(r){
  const sh = r.shots, su = sh.filter(s => s.sup), nM = Math.max(1, r.matches.length);
  // chiude il punto: è l'ultimo colpo del punto e il punto è di chi l'ha tirato
  const closed = su.filter(s => { const p = r.pts[s.pt]; return p && p.n === s.n && p.win === s.k; }).length;
  const why = {}; for (const s of sh) if (!s.sup && s.supWhy) why[s.supWhy] = (why[s.supWhy] || 0) + 1;
  return { n: su.length, shots: sh.length, pct: pc(su.length, sh.length), perMatchPlayer: +(su.length/nM/2).toFixed(2), closed, why };
}
// «many» numera i punti da capo per ogni seme: qui una serie per seme, poi si sommano i conti
function superRows(opts){
  const tot = { n: 0, shots: 0, closed: 0, matches: 0, withSup: 0, why: {} };
  for (const seed of SEEDS){
    const r = many(opts, [seed]), s = supers(r);
    tot.n += s.n; tot.shots += s.shots; tot.closed += s.closed; tot.matches += r.matches.length;
    // partite con almeno un super: i punti di ogni partita
    let from = 0; for (const m of r.matches){ const to = from + m.pts; if (r.shots.some(x => x.sup && x.pt >= from && x.pt < to)) tot.withSup++; from = to; }
    for (const [k, v] of Object.entries(s.why)) tot.why[k] = (tot.why[k] || 0) + v;
  }
  return tot;
}
const supLine = (name, t) => say(`${name.padEnd(46)} | ${t.shots} colpi, ${t.matches} partite · super ${t.n} (${pc(t.n, t.shots)}% dei colpi; ${(t.n/Math.max(1, t.matches)/2).toFixed(2)} a partita per giocatore; partite con almeno un super ${pc(t.withSup, t.matches)}%) · chiudono il punto ${t.closed} (${pc(t.closed, t.n) ?? '-'}%)`);

// profilo con una tattica o un valore cambiato; il colpo abituale si impara giocando, come sul telefono (liveTyp)
const prof = (a, mod = {}, name = null) => ({ ...(typeof P(a) === 'string' ? { base: a } : P(a)), liveTyp: true, ...mod, name: name || nameOf(P(a)) + Object.entries(mod).map(([k, v]) => '+' + (k === 'tac' ? v : k)).join('') });
// campo aperto acceso (o spento a mano) e valori di prova
const open = (on, tune = null) => e => { e.natpfOpenCourt = !!on; setObj(ND.openTuning, tune); };
const winners = d => (d.kinds['vincente vero'] || 0);
const forced = d => (d.kinds['fallito per regola'] || 0);
const sideRow = (name, r) => { const s = sum(r); say(`${name.padEnd(58)} | ${s.matches} part., ${s.pts} punti · punti del P1 ${s.p1Pts}% · partite del P1 ${s.p1Match}% · chi batte vince ${s.srvPt}% dei punti`); };
// fasce dei due giocatori (il primo è il più giovane) e variante dell'aiuto, dal lato giusto
const bands = (young, old, variant, tune = null) => side => e => { e.natpfSplitBands = side === 'p1' ? { p1: young, p2: old } : { p1: old, p2: young }; e.natpfHelpVariant = variant; setObj(ND.helpTuning, tune ? { [`${young}:${old}`]: tune } : null); };

const groups = {
  // tra pari con le regole di oggi (opzioni spente, fasce uguali) e con quelle di prima: i due lati e le durate
  pari(){
    say(`== Tra pari, 1 game ${fair ? 'in fiera' : 'classico'}, opzioni spente e fasce uguali: prima (f08243a) e oggi (super relativo, preparazione che non conta) ==`);
    for (const a of ['bambino', 'ragazzo', 'medio', 'amatore']) for (const [lab, tw] of [['prima', prima], ['oggi', null]]){
      const d = duo(a, a, { matches: 100, tweak: tw });
      line(`${a} contro ${a} · ${lab}`, d); say(`      come finiscono i punti: ${kindsLine(d.kinds)}`);
    }
  },
  // parte 3: colpo super sulla forza relativa. Gioco normale, «ogni tanto fortissimo» (chi lo cerca: un colpo su cinque) e
  // «sempre fortissimo»; prima e oggi. Il colpo abituale si impara giocando, come sul telefono
  super(){
    say(`== Colpo super tra due persone uguali, 1 game ${fair ? 'in fiera' : 'classico'}: prima (soglia uguale per tutti) e oggi (da ${ND.SUPER_REL.ratio} volte il proprio colpo abituale) ==`);
    for (const a of ['bambino', 'ragazzo', 'medio', 'amatore', 'tennista']){
      const m = M(a === 'tennista' ? 20 : 80);
      for (const [lab, tw] of [['prima', prima], ['oggi', null]]){
        supLine(`${a} · gioco normale · ${lab}`, superRows({ a: prof(a), b: prof(a), fair, matches: m, tweak: tw }));
        supLine(`${a} · ogni tanto fortissimo (1 su 5) · ${lab}`, superRows({ a: prof(a, { strongP: .2 }), b: prof(a, { strongP: .2 }), fair, matches: m, tweak: tw }));
        supLine(`${a} · sempre fortissimo · ${lab}`, superRows({ a: prof(a, { tac: 'forte' }), b: prof(a, { tac: 'forte' }), fair, matches: m, tweak: tw }));
      }
    }
    say('-- oggi: perché il super non parte (motivo del primo «no», % dei colpi) --');
    for (const a of ['bambino', 'medio', 'tennista']) for (const [lab, mod] of [['gioco normale', {}], ['ogni tanto fortissimo', { strongP: .2 }]]){
      const t = superRows({ a: prof(a, mod), b: prof(a, mod), fair, matches: M(a === 'tennista' ? 20 : 80) });
      say(`${(a + ' · ' + lab).padEnd(34)} ${Object.entries(t.why).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${pc(v, t.shots)}%`).join(' · ')}`);
    }
    say('-- soglia: quante volte il proprio colpo abituale (oggi) --');
    for (const ratio of [1.2, 1.3, 1.4, 1.5]){
      setObj(ND.superTuning, { ratio });
      for (const a of ['bambino', 'medio', 'amatore']){
        supLine(`da ${ratio} volte · ${a} · gioco normale`, superRows({ a: prof(a), b: prof(a), fair, matches: M(80) }));
        supLine(`da ${ratio} volte · ${a} · ogni tanto fortissimo`, superRows({ a: prof(a, { strongP: .2 }), b: prof(a, { strongP: .2 }), fair, matches: M(80) }));
      }
    }
    setObj(ND.superTuning, null);
    say('-- il super cambia chi vince? stesso profilo, uno cerca il colpo fortissimo e l\'altro gioca normale (media dei due lati) --');
    for (const a of ['bambino', 'medio', 'amatore']) for (const [lab, tw] of [['prima', prima], ['oggi', null]]){
      line(`${a} ogni tanto fortissimo contro ${a} · ${lab}`, duo(prof(a, { strongP: .2 }), prof(a), { matches: 100, tweak: tw }));
      line(`${a} sempre fortissimo contro ${a} · ${lab}`, duo(prof(a, { tac: 'forte' }), prof(a), { matches: 100, tweak: tw }));
    }
  },
  // parte 4: la preparazione non conta più
  preparazione(){
    say(`== Preparazione: stesso profilo, uno porta sempre indietro il braccio (prep 1) e l'altro mai (prep 0); 1 game ${fair ? 'in fiera' : 'classico'} ==`);
    for (const a of ['medio', 'amatore']) for (const [lab, tw] of [['prima', prima], ['oggi', null]])
      line(`${a} con la preparazione contro ${a} senza · ${lab}`, duo({ base: a, prep: 1, name: a + '+prep' }, { base: a, prep: 0, name: a + '-prep' }, { matches: 150, tweak: tw }));
  },
  // parte 2: campo aperto, spento e acceso. Vincenti, come finiscono i punti, durate, i due lati, tattiche
  campo(){
    const O = ND.OPEN_COURT;
    say(`== Campo aperto (corsa × ${O.speed}, rientro × ${O.recover}, partenza +${O.react} s, finestra in allungo −${O.tight*100}%, allungo ${O.stretchCost}, portata ${O.reach} m), 1 game ${fair ? 'in fiera' : 'classico'}: spento e acceso ==`);
    for (const a of ['bambino', 'ragazzo', 'medio', 'amatore', 'tennista']) for (const on of [false, true]){
      const d = duo(a, a, { matches: a === 'tennista' ? 15 : 100, tweak: open(on) });
      line(`${a} contro ${a} · ${on ? 'acceso' : 'spento'}`, d);
      say(`      vincenti veri ${winners(d)}% · errori provocati dall'allungo ${forced(d)}% · come finiscono i punti: ${kindsLine(d.kinds)}`);
    }
    say('-- i due lati con il campo aperto acceso (stesso profilo; 5 semi) --');
    for (const a of ['medio', 'amatore']) sideRow(`${a} contro ${a} · acceso`, many({ a, b: a, fair, matches: M(240), tweak: open(true) }, [7001, 7103, 7207, 7309, 7411]));
    say('-- tattiche: il primo cambia tattica, il secondo no (media dei due lati) --');
    for (const base of ['medio', 'amatore']) for (const on of [false, true]){
      const lab = on ? 'acceso' : 'spento', centro = { base, tac: 'centro', name: base + '+centro' };
      line(`${base} che piazza (polso, 0,55–0,85) contro ${base} al centro · ${lab}`, duo({ base, tac: 'mira', aimBy: 'polso', aimLo: .55, aimHi: .85, name: base + '+piazza' }, centro, { matches: 100, tweak: open(on) }));
      line(`${base} che mira le righe (polso) contro ${base} al centro · ${lab}`, duo({ base, tac: 'mira', aimBy: 'polso', name: base + '+mira-polso' }, centro, { matches: 100, tweak: open(on) }));
      line(`${base} che mira le righe (tempo) contro ${base} al centro · ${lab}`, duo({ base, tac: 'mira', name: base + '+mira' }, centro, { matches: 100, tweak: open(on) }));
      line(`${base} al centro contro ${base} normale · ${lab}`, duo(centro, base, { matches: 100, tweak: open(on) }));
      line(`${base} sempre fortissimo contro ${base} normale · ${lab}`, duo(prof(base, { tac: 'forte' }), prof(base), { matches: 100, tweak: open(on) }));
      line(`${base} solo palle corte contro ${base} normale · ${lab}`, duo({ base, tac: 'corte', name: base + '+corte' }, base, { matches: 60, tweak: open(on) }));
    }
    setObj(ND.openTuning, null);
  },
  // revisione, parte 2: con il campo aperto chi batte è sfavorito (la risposta al servizio è a corsa piena, il primo in
  // allungo è chi ha battuto). «un battitore per game» = com'era prima della revisione (OPEN_COURT.altServe spento a mano);
  // «servizio ogni due punti» = in gioco. Tra pari, formato classico (1 game e al meglio di 3) e in fiera
  battitore(){
    say('== Campo aperto e servizio: quanto vale battere, e battere per primo (stesso profilo dai due lati) ==');
    const row = (name, o, tw) => { const r = many({ ...o, matches: M(o.matches) }, SEEDS), s = sum(r);
      say(`${name.padEnd(70)} | ${s.matches} part., ${s.pts} punti · chi batte vince ${s.srvPt}% dei punti · chi inizia il game lo vince ${s.srvGame}% · chi batte per primo vince ${s.firstWins}% delle partite · punti del P1 ${s.p1Pts}%, partite del P1 ${s.p1Match}%`); };
    for (const a of ['bambino', 'medio', 'amatore']){
      row(`${a} · classico 1 game · campo aperto spento`, { a, b: a, fair: false, matches: 400, tweak: open(false) });
      row(`${a} · classico 1 game · acceso, un battitore per game (prima)`, { a, b: a, fair: false, matches: 400, tweak: open(true, { altServe: false }) });
      row(`${a} · classico 1 game · acceso, servizio ogni due punti (in gioco)`, { a, b: a, fair: false, matches: 400, tweak: open(true) });
      row(`${a} · classico al meglio di 3 · acceso, un battitore per game (prima)`, { a, b: a, fair: false, gamesToWin: 2, matches: 200, tweak: open(true, { altServe: false }) });
      row(`${a} · classico al meglio di 3 · acceso, servizio ogni due punti`, { a, b: a, fair: false, gamesToWin: 2, matches: 200, tweak: open(true) });
      row(`${a} · in fiera 1 game · campo aperto spento`, { a, b: a, fair: true, matches: 400, tweak: open(false) });
      row(`${a} · in fiera 1 game · acceso`, { a, b: a, fair: true, matches: 400, tweak: open(true) });
    }
    setObj(ND.openTuning, null);
  },
  // parte 2, prove: altri valori del campo aperto (solo in memoria) → --prove=speed:react:stretchCost:reach,…
  'campo-prove'(){
    const list = (arg('prove') || '.6:.1:.6:1.7,.5:.1:.6:1.7,.45:.1:.6:1.7,.4:.1:.6:1.7,.36:.1:.6:1.7').split(',').map(x => x.split(':').map(Number));
    const base = arg('profilo') || 'medio', centro = { base, tac: 'centro', name: base + '+centro' };
    say(`== Campo aperto, prove (profilo ${base}): corsa × speed, partenza + react, allungo, portata ==`);
    for (const [speed, react, stretchCost, reach] of list){
      const tune = { speed, react, stretchCost, reach }, tw = open(true, tune), tag = `×${speed} +${react}s all.${stretchCost} port.${reach}`;
      const d = duo(base, base, { matches: 80, tweak: tw });
      line(`${tag} · pari`, d); say(`      vincenti veri ${winners(d)}% · errori provocati ${forced(d)}% · ${kindsLine(d.kinds)}`);
      line(`${tag} · piazza contro centro`, duo({ base, tac: 'mira', aimBy: 'polso', aimLo: .55, aimHi: .85, name: base + '+piazza' }, centro, { matches: 80, tweak: tw }));
      line(`${tag} · mira le righe (polso) contro centro`, duo({ base, tac: 'mira', aimBy: 'polso', name: base + '+mira-polso' }, centro, { matches: 80, tweak: tw }));
    }
    setObj(ND.openTuning, null);
  },
  // parte 5: aiuto al più giovane. Varianti 0 (nessuno), A (tempo), B (punti), C (leggera) per coppia di fasce
  aiuto(){
    say(`== Aiuto al più giovane, 1 game ${fair ? 'in fiera' : 'classico'}: vince il più giovane (media dei due lati). In gioco: variante ${ND.HELP_DEFAULT} ==`);
    const row = (lab, young, old, pa, pb, variant, tune = null) => { const d = duo(pa, pb, { matches: 150 }, bands(young, old, variant, tune)); line(lab, d); return d; };
    for (const [young, old, pa, pb] of [['bambino', 'adulto', 'bambino', 'medio'], ['bambino', 'adulto', 'bambino', 'amatore'], ['ragazzo', 'adulto', 'ragazzo', 'medio'], ['ragazzo', 'adulto', 'ragazzo', 'amatore'], ['bambino', 'ragazzo', 'bambino', 'ragazzo']]){
      const pair = `${young}:${old}`;
      for (const v of ['0', 'A', 'B', 'C']){ const h = ND.HELP[v][pair]; row(`${pa} (${young}) contro ${pb} (${old}) · ${v === '0' ? 'nessun aiuto' : 'variante ' + v + ' ' + JSON.stringify(h)}`, young, old, pa, pb, v); }
    }
    setObj(ND.helpTuning, null);
  },
  // parte 5, il resto: l'aiuto con il campo aperto acceso, i soli punti di vantaggio, l'adulto segnato «Bambino»
  'aiuto-altro'(){
    const row = (lab, young, old, pa, pb, variant, tune = null) => { const d = duo(pa, pb, { matches: 150 }, bands(young, old, variant, tune)); line(lab, d); return d; };
    say(`== Aiuto al più giovane, 1 game ${fair ? 'in fiera' : 'classico'}: il resto ==`);
    say('-- con il campo aperto acceso (opzione dello staff): vince il più giovane, senza aiuto e con le tre varianti --');
    for (const [young, old, pa, pb] of [['bambino', 'adulto', 'bambino', 'medio'], ['ragazzo', 'adulto', 'ragazzo', 'medio'], ['bambino', 'ragazzo', 'bambino', 'ragazzo']]) for (const v of ['0', 'A', 'B', 'C'])
      line(`${pa} contro ${pb} · campo aperto · ${v === '0' ? 'nessun aiuto' : 'variante ' + v}`, duo(pa, pb, { matches: 150 }, side => both(bands(young, old, v)(side), open(true))));
    setObj(ND.openTuning, null);
    say('-- bambino contro adulto medio: solo i punti di vantaggio --');
    for (const head of [1, 2, 3]) row(`bambino contro medio · parte da ${['', '15', '30', '40'][head]}-0`, 'bambino', 'adulto', 'bambino', 'medio', 'B', { head });
    say('-- due adulti medi, uno segnato «Bambino» per sbaglio o per furbizia: quanto pesa l\'aiuto --');
    for (const v of ['A', 'B', 'C']) row(`medio (segnato bambino) contro medio (adulto) · variante ${v}`, 'bambino', 'adulto', 'medio', 'medio', v);
    setObj(ND.helpTuning, null); setObj(ND.openTuning, null);
  },
  // parte 5, prove: altri valori per una coppia → --coppia=bambino:adulto --profili=bambino:medio --prove='{"span":2}|{"head":1,"span":1.5}'
  'aiuto-prove'(){
    const [young, old] = (arg('coppia') || 'bambino:adulto').split(':'), [pa, pb] = (arg('profili') || 'bambino:medio').split(':');
    const list = (arg('prove') || '{"span":1.5}|{"span":2}|{"span":3}|{"late":0.06}|{"late":0.12}|{"early":1.5}|{"span":2,"late":0.09}').split('|').map(x => JSON.parse(x));
    say(`== Aiuto, prove: ${pa} (${young}) contro ${pb} (${old}) ==`);
    for (const tune of list){ const d = duo(pa, pb, { matches: 120 }, bands(young, old, 'A', tune)); line(JSON.stringify(tune), d); say(`      ${kindsLine(d.kinds)}`); }
    setObj(ND.helpTuning, null);
  },
};

const t0 = Date.now();
if (G === 'tutti') for (const k of ['pari', 'super', 'preparazione', 'campo', 'aiuto', 'aiuto-altro']){ groups[k](); say(''); }
else if (groups[G]) groups[G]();
else { say(`Gruppo sconosciuto: ${G}. Gruppi: ${Object.keys(groups).join(' · ')} · tutti`); process.exitCode = 1; }
say(`(semi ${SEEDS.join(', ')} · --partite=${K} · formato ${fair ? 'in fiera' : 'classico'}${GW > 1 ? `, ${GW} game per vincere` : ''} · ${Math.round((Date.now() - t0)/1000)} s)`);

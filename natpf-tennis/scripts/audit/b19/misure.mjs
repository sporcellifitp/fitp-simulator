// Audit B19 (1v1 tra utenti): le misure principali del rapporto docs/b19/audit-1v1-utenti.md, rifatte con il banco dei
// due umani (due-umani.mjs: motore vero senza grafica, due persone simulate, stesso schermo).
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b19/misure.mjs <gruppo> [--partite=1] [--semi=7001,7103,7207]
// Gruppi: pari · debole · risposta · battitore · tattiche · tempo · rimbalzo · durate · tutti
// --partite moltiplica il numero di partite di ogni riga (0.25 per una prova veloce, 2–4 per numeri più fermi).
import { play, sum, many, PROF, pc, qt, NI } from './due-umani.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const G = process.argv[2] || 'tutti', K = +(arg('partite') || 1);
const SEEDS = (arg('semi') || '7001,7103,7207').split(',').map(Number);
const M = n => Math.max(4, Math.round(n*K));
const say = s => console.log(s);
// «anticipo delle persone vere»: il gesto parte prima del momento giusto (diagnostiche del 23–29/10: circa +0,06 s)
const ant = (base, mod = {}) => ({ base, bias: +(0.78*PROF[base].tSd).toFixed(3), name: base + '~ant' + (mod.tac ? '+' + mod.tac : ''), ...mod });
const row = (name, s) => say(`${name.padEnd(34)} | ${s.matches} part. · P1 vince ${s.p1Match}% · punti del P1 ${s.p1Pts}% (${s.pts}) · punti a game ${s.ptsPerGame}, ai vantaggi ${s.deuce}%, a zero ${s.love}% · colpi a punto media ${s.colpi.media}, 9 su 10 sotto ${s.colpi.p90}, massimo ${s.colpi.max}, entro 2 colpi ${s.colpi.le2}% · durata p50 ${s.sec.p50} s, p90 ${s.sec.p90} s, massimo ${s.sec.max} s · chi batte: ${s.srvPt}% dei punti, ${s.srvGame}% dei game`);
// a = il primo (di solito il più debole); media dei due lati. tw(lato del primo) → modifica del motore solo in memoria
const duo = (name, a, b, o = {}, tw = null) => {
  const m = M(o.matches || 60);
  const r1 = many({ a, b, ...o, matches: m, tweak: tw ? tw('p1') : o.tweak }, SEEDS), r2 = many({ a: b, b: a, ...o, matches: m, tweak: tw ? tw('p2') : o.tweak }, SEEDS);
  const n = r1.matches.length + r2.matches.length, w = r1.matches.filter(x => x.win === 'p1').length + r2.matches.filter(x => x.win === 'p2').length;
  const GG = [...r1.games, ...r2.games], P = [...r1.pts, ...r2.pts], st = P.map(p => p.n);
  const wp = r1.pts.filter(p => p.win === 'p1').length + r2.pts.filter(p => p.win === 'p2').length;
  const fr = P.filter(p => p.kind === 'fallito per regola').length;
  say(`${name.padEnd(52)} | ${n} part.: vince il primo ${pc(w, n)}% (da P1 ${pc(r1.matches.filter(x => x.win === 'p1').length, r1.matches.length)}%, da P2 ${pc(r2.matches.filter(x => x.win === 'p2').length, r2.matches.length)}%) · punti ${pc(wp, P.length)}% · game a zero ${pc(GG.filter(x => x.love).length, GG.length)}%, ai vantaggi ${pc(GG.filter(x => x.deuce).length, GG.length)}% · colpi a punto ${(st.reduce((x, y) => x + y, 0)/st.length).toFixed(1)} · finiti con il colpo fallito per regola ${pc(fr, P.length)}%`);
  return { r1, r2 };
};
const kindsLine = s => Object.entries(s.kinds).map(([k, v]) => `${k} ${v}%`).join(' · ');

const groups = {
  // EQ-9, ST-2, EQ-3: tra pari. I due lati, come finiscono i punti, vincenti veri.
  pari(){
    say('== Tra pari, 1 game classico, stesso schermo (batte per primo a turno) ==');
    for (const a of ['bambino', 'medio', 'amatore', 'tennista', ant('medio')]){
      const s = sum(many({ a, b: a, matches: M(a === 'tennista' ? 20 : 150) }, SEEDS));
      row(typeof a === 'string' ? a : a.name, s); say(`      come finiscono i punti: ${kindsLine(s)}`);
    }
  },
  // EQ-1, V-EQ-2: livelli diversi, vantaggio di punti, aiuto per giocatore (prototipo: regola scelta per chi deve colpire).
  debole(){
    say('== Livelli diversi, 1 game classico, media dei due lati ==');
    for (const [a, b] of [['bambino', 'medio'], ['bambino', 'amatore'], ['medio', 'amatore'], ['medio', 'tennista'], ['amatore', 'tennista']]) duo(`${a} contro ${b}`, a, b, { matches: 80 });
    duo('bambino~ant contro medio~ant', ant('bambino'), ant('medio'), { matches: 80 });
    say('-- solo il tempo: stesso profilo, cambia l\'errore di tempo --');
    duo('medio ±0,075 s contro medio ±0,09 s', { base: 'medio', tSd: .075, name: 'm075' }, 'medio', { matches: 120 });
    duo('medio ±0,06 s contro medio ±0,09 s', { base: 'medio', tSd: .06, name: 'm06' }, 'medio', { matches: 120 });
    say('-- vantaggio di punti a ogni game per il più debole --');
    const head = h => side => e => { const sp = e._setupPointServe.bind(e); e._setupPointServe = (...x) => { if (e.score.playerPoints + e.score.opponentPoints === 0){ if (side === 'p1') e.score.playerPoints = h; else e.score.opponentPoints = h; } return sp(...x); }; };
    for (const h of [0, 1, 2, 3]) duo(`bambino contro medio, il bambino parte da ${['0', '15', '30', '40'][h]}-0`, 'bambino', 'medio', { matches: 60 }, head(h));
    say('-- prototipo «aiuto per giocatore»: le regole di un livello per chi deve colpire (solo in memoria) --');
    const rules = (dWeak, dStrong) => side => e => Object.defineProperty(e.matchConfig, 'difficulty', { configurable: true, get: () => { const mustHit = e.ball.lastHitter === 'player' ? 'p2' : 'p1'; return mustHit === side ? dWeak : dStrong; }, set(){} });
    for (const [a, b] of [['bambino', 'medio'], ['medio', 'amatore'], ['amatore', 'tennista']]){
      duo(`${a} (Casual) contro ${b} (Leggenda)`, a, b, { matches: 60 }, rules('casual', 'leggenda'));
      duo(`${a} (1v1) contro ${b} (Leggenda)`, a, b, { matches: 60 }, rules('1v1', 'leggenda'));
    }
  },
  // ST-1 / EQ-2: la risposta al servizio del Player 2 diventa una schiacciata.
  risposta(){
    say('== Risposta al servizio: quante diventano «SMASH», per lato ==');
    for (const [lab, a, m] of [['medio (gioco normale)', 'medio', 200], ['tennista (gioco normale)', 'tennista', 20], ['medio, soli tagliati', { base: 'medio', tac: 'tagli' }, 160], ['amatore, soli tagliati', { base: 'amatore', tac: 'tagli' }, 160]]){
      const r = many({ a, b: a, matches: M(m) }, SEEDS), s = sum(r);
      say(`${lab}: ${s.pts} punti, P1 ${s.p1Pts}% dei punti e ${s.p1Match}% delle partite`);
      for (const k of ['p1', 'p2']){
        const ret = r.shots.filter(x => x.k === k && x.n === 2), sm = ret.filter(x => x.shot === 'SMASH');
        const rp = r.pts.filter(p => p.srv !== k), lost2 = rp.filter(p => p.n === 2 && p.win !== k && p.hitter === k);
        say(`   ${k.toUpperCase()} in risposta: ${ret.length} risposte, giocate come schiacciata ${sm.length} (${pc(sm.length, ret.length)}%), partite da ${qt(sm.map(x => x.z), .5) ?? '-'} m dalla rete · punti in risposta vinti ${pc(rp.filter(p => p.win === k).length, rp.length)}%, persi subito ${pc(lost2.length, rp.length)}% (in rete ${lost2.filter(p => p.why === 'Net').length})`);
      }
    }
    say('-- nello scambio (dal terzo colpo): un tagliato diventa schiacciata? --');
    { const r = many({ a: { base: 'medio', tac: 'tagli' }, b: { base: 'medio', tac: 'tagli' }, matches: M(100) }, SEEDS);
      for (const k of ['p1', 'p2']){ const sh = r.shots.filter(x => x.k === k && x.n > 2); say(`   ${k.toUpperCase()}: ${sh.length} tagliati nello scambio, giocati come schiacciata ${sh.filter(x => x.shot === 'SMASH').length}`); } }
  },
  // MV-2, ST-9, EQ-5: chi batte. Formato di base (batte sempre il P1) e formato in fiera.
  battitore(){
    say('== Chi batte, formato di base (1 game, batte sempre la stessa persona): prima batte sempre il P1, poi sempre il P2 ==');
    for (const a of ['bambino', 'impreciso', 'medio', 'amatore', 'tennista', 'umano']) for (const first of ['player', 'opponent']){
      const r = many({ a, b: a, matches: M(a === 'tennista' ? 20 : 150), first }, SEEDS), s = sum(r), srv = first === 'player' ? 'p1' : 'p2', rcv = srv === 'p1' ? 'p2' : 'p1';
      const pos = k => { const sh = r.shots.filter(x => x.k === k && x.n >= 5); return `colpisce a ${qt(sh.map(x => x.z), .5)} m dalla rete con la palla a ${qt(sh.map(x => x.y), .5)} m`; };
      say(`${a.padEnd(10)} batte ${srv.toUpperCase()} | ${s.matches} part. · chi batte vince ${pc(r.matches.filter(x => x.win === srv).length, s.matches)}% delle partite e ${s.srvPt}% dei punti (${s.pts}) · colpi a punto ${s.colpi.media}, entro 2 colpi ${s.colpi.le2}% · dal 5° colpo: chi ha battuto ${pos(srv)}; chi ha risposto ${pos(rcv)}`);
    }
    say('== Formato in fiera (servizio A, B B, A A, B B; punto decisivo sul 40-40): vince chi batte per primo? ==');
    for (const a of ['bambino', 'medio', 'amatore', 'umano']){
      const r = many({ a, b: a, matches: M(150), fair: true, first: 'player' }, SEEDS), s = sum(r);
      const dec = r.pts.filter(p => p.sc[0] === 3 && p.sc[1] === 3);
      say(`${a.padEnd(10)} | ${s.matches} part. · chi batte per primo vince ${s.p1Match}% · chi batte vince ${s.srvPt}% dei punti · punto decisivo in ${pc(dec.length, s.matches)}% delle partite, lo batte chi NON ha iniziato ${pc(dec.filter(p => p.srv === 'p2').length, dec.length)}% delle volte, lo vince chi lo batte ${pc(dec.filter(p => p.srv === p.win).length, dec.length)}%`);
    }
  },
  // EQ-3: tattiche. Il primo cambia tattica, il secondo gioca normale.
  tattiche(){
    say('== Tattiche (profilo medio e amatore), 1 game, media dei due lati ==');
    for (const base of ['medio', 'amatore']){
      for (const [tac, lab] of [['centro', 'non mira mai'], ['mira', 'mira sempre'], ['forte', 'tira sempre fortissimo'], ['corte', 'fa solo palle corte'], ['pallonetti', 'fa solo pallonetti'], ['tagli', 'fa solo tagliati']]) duo(`${base} che ${lab} contro ${base} normale`, { base, tac }, base, { matches: 50 });
      duo(`${base} che mira sempre contro ${base} che non mira mai`, { base, tac: 'mira' }, { base, tac: 'centro' }, { matches: 50 });
    }
    say('-- corsa più lenta per tutti e due: vincenti veri --');
    const speeds = v => e => { const f = e._applyDifficultyTuning.bind(e); const set = () => { e.player.maxSpeed = v; e.opponent.maxSpeed = v; }; e._applyDifficultyTuning = (...x) => { const r = f(...x); set(); return r; }; set(); };
    for (const base of ['medio', 'tennista']) for (const v of [9.8, 7.5, 4.7, 3.5]){ const s = sum(many({ a: base, b: base, matches: M(base === 'tennista' ? 20 : 100), tweak: speeds(v) }, SEEDS)); say(`${base} contro ${base}, corsa ${v} m/s: vincenti veri ${s.kinds['vincente vero'] || 0}% dei ${s.pts} punti · colpi a punto ${s.colpi.media}`); }
  },
  // V-EQ-2: un ritardo o un anticipo fisso sul gesto.
  tempo(){
    say('== Stesso profilo (medio), cambia solo un ritardo o un anticipo fisso del gesto ==');
    for (const ms of [-70, -40, 40, 70]) duo(`medio con ${Math.abs(ms)} ms di ${ms < 0 ? 'ritardo' : 'anticipo'} contro medio`, { base: 'medio', bias: ms/1000, name: 'm' + ms }, 'medio', { matches: 100 });
  },
  // MV-1: quanto dopo il rimbalzo cade il momento giusto del colpo (contatto previsto dal motore).
  rimbalzo(){
    say('== Dal rimbalzo al momento giusto del colpo (secondi) e altezza della palla al contatto ==');
    for (const a of ['bambino', 'amatore', 'tennista']){
      const rows = { risposta: [], scambio: [] }, yy = { risposta: [], scambio: [] };
      const tweak = e => { const step = e.step.bind(e); let prev = 0;
        e.step = dt => { step(dt); const b = e.ball;
          if (e.phase === 'RALLY' && b.inPlay){ const rec = b.lastHitter === 'player' ? e.opponent : e.player;
            if (b.bounceCountOnCurrentSide === 1 && prev === 0){ const ttc = NI.timeToContact(e, rec); if (ttc != null){ const k = b.rallyStrokeCount <= 1 ? 'risposta' : 'scambio'; rows[k].push(ttc); yy[k].push(NI.planOf(e, rec)?.contact?.y ?? NaN); } }
            prev = b.bounceCountOnCurrentSide; } else prev = 0; }; };
      many({ a, b: a, matches: M(a === 'tennista' ? 15 : 60), fair: true, tweak }, SEEDS);
      for (const k of ['risposta', 'scambio']){ const t = rows[k], y = yy[k].filter(Number.isFinite);
        say(`${a.padEnd(9)} ${k === 'risposta' ? 'risposta al servizio' : 'scambio             '}: ${t.length} palle · p10 ${qt(t, .1)?.toFixed(2)} · p50 ${qt(t, .5)?.toFixed(2)} · p90 ${qt(t, .9)?.toFixed(2)} s · entro 0,2 s dal rimbalzo ${pc(t.filter(x => x <= .2).length, t.length)}% · contatto a ${qt(y, .5)?.toFixed(2)} m (p50)`); }
    }
  },
  // EQ-4, ST-3: durate per formato.
  durate(){
    say('== Durata della partita tra pari (tempo di gioco simulato: i robot lanciano il servizio dopo 0,6 s) ==');
    for (const a of ['bambino', 'medio', 'amatore', 'tennista']){
      const m = a === 'tennista' ? 20 : 100;
      row(`${a}: 1 game classico`, sum(many({ a, b: a, matches: M(m) }, SEEDS)));
      row(`${a}: 1 game, formato in fiera`, sum(many({ a, b: a, matches: M(m), fair: true }, SEEDS)));
      row(`${a}: al meglio di 3 classico`, sum(many({ a, b: a, matches: M(a === 'tennista' ? 5 : 40), gamesToWin: 2 }, SEEDS)));
    }
    row('medio~ant: 1 game classico', sum(many({ a: ant('medio'), b: ant('medio'), matches: M(100) }, SEEDS)));
    { const r = many({ a: 'tennista', b: 'tennista', matches: M(20) }, SEEDS); say(`tennista contro tennista: ${r.pts.length} punti, interrotti dal banco a 150 colpi ${pc(r.pts.filter(p => p.why === 'Cap').length, r.pts.length)}%`); }
  },
};
const t0 = Date.now();
if (G === 'tutti') for (const k of ['pari', 'debole', 'risposta', 'battitore', 'tattiche', 'tempo', 'rimbalzo', 'durate']){ groups[k](); say(''); }
else if (groups[G]) groups[G]();
else { say(`Gruppo sconosciuto: ${G}. Gruppi: ${Object.keys(groups).join(' · ')} · tutti`); process.exitCode = 1; }
say(`(semi ${SEEDS.join(', ')} · --partite=${K} · ${Math.round((Date.now() - t0)/1000)} s)`);

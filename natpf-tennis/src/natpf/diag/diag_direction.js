// Direzione dei colpi del telefono in una sessione registrata (B35a, collaudo del 13/11: «volevo incrociare e usciva
// lungolinea», «molti colpi uscivano»). Senza DOM: lo usano scripts/diag/diag.mjs (comando «direzione») e i test.
//
// Da dove viene la direzione (natpf_stroke_outcome.strokeOutcome): il PIATTO (dove punta il telefono al momento del
// colpo, rispetto al proprio colpo abituale: evento «racchetta», campo piatto −1…+1, + a destra di chi gioca) e il TEMPO
// (campo tempo, unità della finestra: + anticipo, l'incrociato; − ritardo, il lungolinea; oltre ±1 la palla va fuori).
// Qui, per ogni colpo che ha un «voluto»:
//   • la prova guidata della diagnostica (evento «atteso» con la direzione: dritti e rovesci incrociati e lungolinea);
//   • oppure i blocchi tra i segni (Maiusc+M, evento «marca») nell'ordine dato (blocchi: 'di,dl,ri,rl' = dritto
//     incrociato, dritto lungolinea, rovescio incrociato, rovescio lungolinea; '-' salta un blocco).
// Uscite: matrice voluto → ottenuto (incrociato, centro, lungolinea, fuori, rete) e, per ogni voluto, quanto il piatto e il
// tempo vanno nel verso giusto, i colpi oltre la finestra, il ritardo mediano, i fuori con la causa. In più il segno dei
// sensori (profilo degli scambi di prova girato) e il ritardo dello schermo salvato.
const finite = v => Number.isFinite(Number(v)) && v !== null;
const med = a => { const s = a.filter(finite).map(Number).sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m])/2) : null; };
const pct = (a, b) => (b ? Math.round(100*a/b) : null);
const r2 = v => (finite(v) ? +Number(v).toFixed(2) : null);
export const DIR_LINE = 1.25;   // m dal centro: come il banco scripts/audit/direzione-telefono.mjs (e trainingDirection)
const SIDE_LINE = 4.115, BASE_LINE = 11.885;
export const BLOCK_CODES = Object.freeze({ di: { lato: 'forehand', direzione: 'incrociato' }, dl: { lato: 'forehand', direzione: 'lungolinea' },
  ri: { lato: 'backhand', direzione: 'incrociato' }, rl: { lato: 'backhand', direzione: 'lungolinea' }, dc: { lato: 'forehand', direzione: 'centro' }, rc: { lato: 'backhand', direzione: 'centro' } });

// ottenuto da un esito della racchetta (riferimento di chi colpisce: x a destra, z verso la rete dell'altro, lato = contatto)
export function gotOf(k){
  if (!k) return 'perso';
  if (k.rete) return 'rete';
  const x = Number(k.x), z = Math.abs(Number(k.z)), c = Number(k.lato) || 0;
  if (k.fallito || (finite(x) && Math.abs(x) > SIDE_LINE) || (finite(z) && z > BASE_LINE)) return 'fuori';
  if (!finite(x) || !c) return '?';
  const v = x*c;
  return v >= DIR_LINE ? 'lungolinea' : v <= -DIR_LINE ? 'incrociato' : 'centro';
}
// causa di un fuori: di lato, lunga, rete; con il tempo oltre la finestra e l'aiuto che teneva in campo
const outCause = k => (k.rete ? 'rete' : k.fallito ? 'fallito' : Math.abs(Number(k.x)) > SIDE_LINE ? 'di lato' : 'lunga');

export function directionReport(events = [], { meta = {}, blocks = null } = {}){
  const E = [...events].sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const tel = new Map(); for (const e of E) if (e.k === 'tel.colpo' && Number.isInteger(e.n)) tel.set(e.n, e);
  const prof = E.filter(e => e.k === 'tel.profilo').map(e => e.profilo).filter(Boolean).at(-1) || null;
  const codes = blocks ? String(blocks).split(',').map(s => s.trim().toLowerCase()) : null;
  const rows = [];
  let atteso = null, block = 0;
  for (const e of E){
    if (e.k === 'atteso'){ atteso = e; continue; }
    if (e.k === 'marca'){ block++; continue; }
    if (e.k !== 'racchetta' || (e.chi && e.chi !== 'player')) continue;
    let want = null;
    if (atteso && atteso.direzione && e.t - atteso.t <= (atteso.finestraMs || 6000)) want = { lato: atteso.lato || null, direzione: atteso.direzione };
    else if (codes && codes[block] && BLOCK_CODES[codes[block]]) want = BLOCK_CODES[codes[block]];
    if (!want) continue;
    const g = Number.isInteger(e.n) ? tel.get(e.n) : null, c = Number(e.lato) || 0;
    // verso dell'incrociato per chi colpisce: x di segno opposto al contatto. Piatto e tempo «verso l'incrociato» (+)
    const faceX = finite(e.piatto) && c ? -c*Number(e.piatto) : null, timeX = finite(e.tempo) ? Number(e.tempo) : null;
    rows.push({ t: e.t, n: e.n ?? null, voluto: want.direzione, latoVoluto: want.lato, lato: g?.lato || null, ottenuto: gotOf(e), x: r2(e.x), piatto: r2(e.piatto), piattoX: r2(faceX),
      tempo: r2(e.tempo), tempoMs: r2(e.tempoMs), oltre: r2(e.oltre), mira: r2(e.mira), scarto: r2(g?.scarto), aiuto: r2(e.aiuto), qualita: r2(e.qualita), voto: e.voto || null,
      causa: gotOf(e) === 'fuori' || gotOf(e) === 'rete' ? outCause(e) : null });
  }
  const DIRS = ['incrociato', 'centro', 'lungolinea'], GOT = ['incrociato', 'centro', 'lungolinea', 'fuori', 'rete'];
  const per = {};
  for (const d of DIRS){
    const rs = rows.filter(r => r.voluto === d); if (!rs.length) continue;
    const sgn = d === 'incrociato' ? 1 : d === 'lungolinea' ? -1 : 0;
    const face = rs.filter(r => finite(r.piattoX)), time = rs.filter(r => finite(r.tempo));
    per[d] = { n: rs.length, ottenuto: Object.fromEntries(GOT.map(k => [k, pct(rs.filter(r => r.ottenuto === k).length, rs.length)])),
      giusti: pct(rs.filter(r => r.ottenuto === d).length, rs.length),
      // quanto piatto e tempo vanno nel verso voluto (per il centro: vicini allo zero)
      piattoGiusto: face.length ? pct(face.filter(r => (sgn ? sgn*r.piattoX > .15 : Math.abs(r.piattoX) <= .3)).length, face.length) : null,
      piattoMediano: r2(med(face.map(r => r.piattoX))),
      tempoGiusto: time.length ? pct(time.filter(r => (sgn ? sgn*r.tempo > .15 : Math.abs(r.tempo) <= .3)).length, time.length) : null,
      tempoMediano: r2(med(time.map(r => r.tempo))),
      oltre: pct(rs.filter(r => r.oltre > 0).length, rs.length), cause: rs.filter(r => r.causa).reduce((m, r) => (m[r.causa] = (m[r.causa] || 0) + 1, m), {}) };
  }
  const all = rows.filter(r => finite(r.tempo)), lateBeyond = all.filter(r => r.tempo < -1).length, earlyBeyond = all.filter(r => r.tempo > 1).length;
  const out = { colpi: rows.length, perVoluto: per, righe: rows,
    tempoMediano: r2(med(all.map(r => r.tempo))), tempoMsMediano: r2(med(rows.map(r => r.tempoMs))), oltreTardi: pct(lateBeyond, all.length), oltrePresto: pct(earlyBeyond, all.length),
    fuori: pct(rows.filter(r => r.ottenuto === 'fuori' || r.ottenuto === 'rete').length, rows.length),
    segnoGirato: prof?.trialSign === -1, ritardoSchermoMs: meta?.gioco?.ritardoSchermoMs ?? null, difficolta: meta?.gioco?.difficolta ?? null, mira: meta?.gioco?.mira ?? null };
  out.diagnosi = directionNotes(out);
  return out;
}

// frasi semplici per chi ha registrato la sessione
export function directionNotes(R){
  const notes = [], P = R.perVoluto;
  if (!R.colpi) return ['Nessun colpo con un «voluto»: usa la prova guidata della diagnostica, o i segni Maiusc+M tra un blocco e l’altro con --blocchi.'];
  for (const d of ['incrociato', 'lungolinea']){
    const p = P[d]; if (!p) continue;
    if (p.piattoGiusto != null && p.piattoGiusto < 50) notes.push(`${d}: il telefono era girato verso ${d === 'incrociato' ? 'l’incrociato' : 'il lungolinea'} solo nel ${p.piattoGiusto} % dei colpi (piatto mediano ${p.piattoMediano}): la direzione la decide soprattutto dove punta il telefono al momento del colpo, la cima verso il centro per incrociare, verso l’esterno per il lungolinea.`);
    if (p.tempoGiusto != null && p.tempoGiusto < 30 && p.piattoGiusto >= 50) notes.push(`${d}: il piatto era giusto ma il tempo andava dall’altra parte (mediano ${p.tempoMediano}): ${d === 'incrociato' ? 'colpisci un attimo prima' : 'colpisci un attimo dopo'}.`);
  }
  if (R.segnoGirato) notes.push('Sensori del telefono con il segno al contrario (scambi di prova): dalla correzione B35a anche la direzione del piatto si gira; con una versione precedente incrociato e lungolinea erano scambiati.');
  if (R.oltreTardi != null && R.oltreTardi >= 20) notes.push(`${R.oltreTardi} % dei colpi oltre la finestra in ritardo (tempo mediano ${R.tempoMediano}, ${R.tempoMsMediano} ms): la palla va lungolinea e poi fuori di lato. Se succede a ogni sessione, misura il ritardo dello schermo (pannello della diagnostica, «Ritardo dello schermo», ora ${R.ritardoSchermoMs ?? 0} ms).`);
  if (R.oltrePresto != null && R.oltrePresto >= 20) notes.push(`${R.oltrePresto} % dei colpi oltre la finestra in anticipo: la palla va incrociata e poi fuori di lato. Aspetta la palla un attimo di più.`);
  if (R.fuori != null && R.fuori >= 15){
    const c = {}; for (const p of Object.values(P)) for (const [k, v] of Object.entries(p.cause)) c[k] = (c[k] || 0) + v;
    notes.push(`${R.fuori} % dei colpi fuori o in rete (${Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', ')})${R.difficolta === 'leggenda' ? ': a Leggenda la palla non è tenuta in campo quando si colpisce in corsa o in allungo, e il piatto girato del tutto più il tempo nello stesso verso la porta oltre la riga' : ''}.`);
  }
  if (!notes.length) notes.push('Piatto e tempo vanno nel verso voluto e i colpi restano in campo: la direzione segue il gesto.');
  return notes;
}

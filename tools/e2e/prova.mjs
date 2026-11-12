// B28 (giro 2) · Aiuti per le prove nel browser con la calibrazione di base («Giocando»): niente gesti di calibrazione, il
// telefono è pronto da solo con il profilo semplice e ogni «Gioca» comincia con gli scambi di prova.
// Le prove natpf-* scritte prima del B28 mettono da sole CAL=gesti; con CAL=base (niente scritto nell'archivio della
// pagina: l'opzione vera di base) o CAL=play usano questi aiuti al posto dei gesti di calibrazione.
export const GESTI = (process.env.CAL || 'gesti') === 'gesti';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// telefono pronto senza gesti: appena i sensori sono attivi il computer chiede il profilo semplice
export const phoneReadyNoGestures = (game, { p2 = false, ms = 15000 } = {}) =>
  game.waitForFunction(two => { const P = two ? __natpfTennis.natpfPhone2 : __natpfTennis.natpfPhone; return !!P?.ready && !!P.profile?.simple; }, p2, { timeout: ms, polling: 100 }).then(() => true, () => false);
// stato degli scambi di prova letto dal gioco (una chiamata): fase, palla in arrivo, tempo all'impatto, lato per chi gioca
export const trialState = game => game.evaluate(async () => {
  const E = __natpfTennis, T = E.natpfUi.trial, m = window.__pr ||= await import('/src/natpf/natpf_phone_racket.js').catch(() => null);
  const out = { active: T.active, phase: T.S?.phase || null, receiver: T.S?.receiver || null, seq: E.natpfMatchSeq || 0, enginePhase: E.phase };
  for (const id of ['p1', 'p2']){
    const P = id === 'p2' ? E.natpfPlanP2 : E.natpfPlan, mine = id === 'p2' ? 'opponent' : 'player', ph = id === 'p2' ? E.natpfPhone2 : E.natpfPhone;
    // (senza il modulo, nella build: il lato dal piano del colpo, come ballSideNow)
    const want = m ? m.ballSideNow(E, id, ph?.trial?.at ?? null) : (P ? Math.sign(P.side*Math.sign((id === 'p2' ? E.opponent : E.player).pos.z || 1)) || 1 : 1);
    out[id] = { left: P && E.ball.inPlay && E.ball.lastHitter !== mine ? +(P.at + P.t - E.elapsedTime).toFixed(3) : null, at: P ? P.at : null, want };
  }
  return out;
});
// Gioca gli scambi di prova con i telefoni simulati. phones: { p1: pagina del telefono, p2: … }; hit(id, n): il giocatore
// colpisce la sua palla numero n? swing(pagina, verso): il gesto (di base __up.swing della pagina del telefono).
// Restituisce { seconds, hits, ended }
export async function playTrial(game, phones, { hit = () => true, max = 45000, swing = (ph, sign) => ph.evaluate(s => { const r = __up.swing(s); if (r?.then && __up.still) r.then(() => __up.still(250)); }, sign) } = {}){
  const t0 = Date.now(), seen = { p1: null, p2: null }, n = { p1: 0, p2: 0 }; let hits = 0;
  while (Date.now() - t0 < max){
    const s = await trialState(game);
    if (!s.active) return { seconds: (Date.now() - t0)/1000, hits, ended: true };
    for (const id of Object.keys(phones)){
      const st = s[id];
      if (s.phase !== 'ball' || s.receiver !== id || st.left == null || st.at === seen[id]) continue;
      if (st.left < .2){ seen[id] = st.at; n[id]++; if (hit(id, n[id])){ hits++; swing(phones[id], st.want || 1).catch(() => {}); } }
    }
    await sleep(25);
  }
  return { seconds: (Date.now() - t0)/1000, hits, ended: false };
}
// Dopo «Gioca» con la calibrazione di base: aspetta gli scambi di prova, li gioca (o li salta con «Salta ›» se skip) e
// aspetta la partita vera. Restituisce { trial: si sono fatti, seconds, hits, match: la partita è partita, levels }
export async function throughTrial(game, phones, { skip = false, wait = 8000, ...opts } = {}){
  const seq0 = await game.evaluate(() => __natpfTennis.natpfMatchSeq || 0);
  const on = await game.waitForFunction(s => __natpfTennis.natpfUi.trial.active || (__natpfTennis.natpfMatchSeq || 0) > s, seq0, { timeout: wait, polling: 50 }).then(() => game.evaluate(() => __natpfTennis.natpfUi.trial.active), () => false);
  let r = { seconds: 0, hits: 0, ended: true };
  if (on){
    if (skip){ await sleep(1200); await game.evaluate(() => document.getElementById('trial-skip')?.click()); await game.waitForFunction(() => !__natpfTennis.natpfUi.trial.active, null, { timeout: 8000, polling: 50 }).catch(() => {}); }
    else r = await playTrial(game, phones, opts);
  }
  const match = await game.waitForFunction(s => !__natpfTennis.natpfUi.trial.active && (__natpfTennis.natpfMatchSeq || 0) > s, seq0, { timeout: 10000, polling: 50 }).then(() => true, () => false);
  const levels = await game.evaluate(() => [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].map(P => (P?.profile ? (P.profile.trialLevel || (P.profile.simple ? 'semplice' : 'gesti')) : null)));
  return { trial: on, ...r, match, levels };
}
// Per le prove che entrano in campo senza passare dal menu: telefono pronto senza gesti e poi gli scambi di prova
// giocati dal telefono simulato (come dopo «Gioca»), così la prova continua sul profilo imparato, come allo stand.
// Restituisce { ready, trial: { seconds, hits, ended }, level }
export async function defaultPrep(game, phone, opts = {}){
  const ready = await phoneReadyNoGestures(game);
  await game.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.natpfUi.lobby.el.classList.add('hidden');
    E.autoPlayMode = false; E.userHasInteracted = true; window.__trialEnd = false;
    E.natpfUi.trial.start({ split: false, then: () => { window.__trialEnd = true; } });
  });
  const trial = await playTrial(game, { p1: phone }, opts);
  await game.waitForFunction(() => window.__trialEnd, null, { timeout: 5000 }).catch(() => {});
  const level = await game.evaluate(() => __natpfTennis.natpfPhone.profile?.trialLevel || (__natpfTennis.natpfPhone.profile?.simple ? 'semplice' : null));
  return { ready, trial, level };
}

const WT = process.cwd();
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const { NatpfTennisEngine } = await import(WT + '/src/game_engine.js');
const P = NatpfTennisEngine.prototype, origA = P._attemptPlayerRallyStrike;
let popPartner = 0, timerPartner = 0, ok = 0, both = 0;
P._attemptPlayerRallyStrike = function(ev, t){
  const lh = this.ball.lastHitter; const r = origA.call(this, ev, t);
  if (r && lh !== 'player' && this.ball.lastHitter === 'player'){ ok++; if (this.playerPartner.swingTimer === .36) timerPartner++; if (this.playerPartner.swingTimer === .36 && this.player.swingTimer === .36) both++; }
  return r;
};
let hooked = false;
simulate({ profile: 'umano', difficulty: 'casual', points: 40, seed: 101, onStep: e => { if (hooked) return; hooked = true; e.setMatchFormat('doubles'); const prev = e.hud; e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? (o = {}) => { if (o.partner) popPartner++; return prev.showTimingPopup(o); } : prev[k] }); } });
console.log({ ok, popPartner, timerPartner, both });

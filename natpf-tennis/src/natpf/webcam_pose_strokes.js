// Polso da Pose quando le dita sono troppo piccole o mosse per Hands. Coordinate osservate, niente dita inventate.
// La continuità del busto mantiene il soggetto; il moto del busto si sottrae per leggere il gesto del braccio.
const finite = Number.isFinite;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const POSE_INPUT = Object.freeze({ intervalMs: 80, handProbeMs: 500, freshMs: 280, acquireMs: 240, keepMs: 5000, maxAgeMs: 350 });

export function poseStrokePoint(lm, { hand = 'right', aspect = .75 } = {}){
  if (!Array.isArray(lm) || lm.length < 25) return null;
  const visible = p => p && finite(p.x) && finite(p.y) && (p.visibility ?? 0) >= .6 && (p.presence ?? 1) >= .6;
  const ls = lm[11], rs = lm[12], wrist = lm[hand === 'left' ? 15 : 16], elbow = lm[hand === 'left' ? 13 : 14];
  if (![ls, rs, wrist, elbow].every(visible)) return null;
  if ([ls, rs, wrist].some(p => p.x < .02 || p.x > .98 || p.y < .02 || p.y > .98)) return null;
  const width = Math.hypot(ls.x - rs.x, (ls.y - rs.y)*aspect);
  if (width < .05 || width > .8) return null;
  const torso = { x: (ls.x + rs.x)/2, y: (ls.y + rs.y)/2, width };
  const x = 1 - wrist.x, y = wrist.y, roll = clamp(Math.atan2(-(wrist.x - elbow.x), -(wrist.y - elbow.y)*aspect), -.9, .9);
  return { x, y, torso, scale: width*.2,
    pose: { x, y, roll, pitch: 0, facing: 0, size: width*.2, source: 'pose', confidence: .7*Math.min(...[ls, rs, wrist, elbow].map(p => p.visibility)) } };
}

export class PoseStrokeSource {
  constructor(){ this.reset(); }
  reset(){ this.track = null; this.pending = null; this.hand = null; }
  push(lm, { now, captureT = now, hand = 'right', aspect = .75, anchor = null } = {}){
    if (!finite(now) || !finite(captureT) || now - captureT > POSE_INPUT.maxAgeMs || captureT > now) return null;
    if (hand !== this.hand){ this.reset(); this.hand = hand; }
    const p = poseStrokePoint(lm, { hand, aspect });
    if (!p){ this.pending = null; return null; }
    // Se Hands conosce già il giocatore, Pose deve osservare proprio il suo polso, non un'altra persona.
    if (anchor && now - anchor.t < 700 && Math.hypot(p.x - anchor.x, (p.y - anchor.y)*aspect) > Math.max(.12, p.torso.width*.7)) return null;
    const near = (a, b, dt) => {
      const ratio = a.width/b.width;
      return ratio >= .65 && ratio <= 1.55 && Math.hypot(a.x - b.x, (a.y - b.y)*aspect) <= Math.max(.06, b.width*.45) + Math.min(.25, dt/1000)*.65;
    };
    if (this.track && now - this.track.t <= POSE_INPUT.keepMs){
      if (captureT <= this.track.captureT || !near(p.torso, this.track.body, now - this.track.t)) return null;
    } else {
      if (!this.pending || !near(p.torso, this.pending.body, 0)) this.pending = { body: p.torso, at: now, n: 0 };
      this.pending.n++;
      if (now - this.pending.at < POSE_INPUT.acquireMs || this.pending.n < 3) return null;
      this.track = { body: p.torso, home: p.torso, t: now, captureT: -Infinity };
      this.pending = null;
    }
    const home = this.track.home;
    // Camminare o piegare il busto non è uno swing. Si misura il polso rispetto al busto acquisito.
    const x = p.x + p.torso.x - home.x, y = p.y - p.torso.y + home.y;
    this.track = { body: p.torso, home, t: now, captureT };
    return { t: captureT, x, y, scale: p.scale, src: 'pose', pose: { ...p.pose, x, y } };
  }
}

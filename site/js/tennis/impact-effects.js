// Presentation-only effects. A confirmed hit is the sole camera trigger; neither
// proximity nor a missed swing can manufacture contact or a smash.
import { isSmashContact } from '../match/contact.js';
export const SHOT_COLORS = Object.freeze({ drive: 0x39cfff, topspin: 0x39cfff, slice: 0x56ee8b, lob: 0xbe91ff, drop: 0xffb6dd, smash: 0xffa52b, serve: 0x6fe8ff });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finitePoint = p => p && [p.x,p.y,p.z].every(Number.isFinite);
export function smashOpportunity(player, time, phase = 'live'){
  const p = player?.inc, eta = p && p.Tc-time;
  if (phase !== 'live' || player?.contactEligible === false || !p || ![p.x,p.z,p.y,eta].every(Number.isFinite) || !isSmashContact({y:p.y}) || eta < -.12 || eta > 1.8) return null;
  return { x:p.x, z:p.z, eta, ready: eta <= .24, radius:.62, color:0xff3d83 };
}
export function createImpactEffects(){
  let event = null, elapsed = 10, strength = 0, shot = 'drive';
  return {
    hit(e, point, local = false){
      if (e?.type !== 'hit' || !finitePoint(point)) return false;
      shot = Object.hasOwn(SHOT_COLORS,e.shot) ? e.shot : 'drive';
      if (local){ event = { point:{...point}, smash:shot==='smash' }; elapsed = 0; }
      return true;
    },
    tick(dt, active = true){
      if (!active){ event=null; elapsed=10; strength=0; }
      dt = Number.isFinite(dt) ? clamp(dt,0,.1) : 0;
      const previousElapsed=elapsed; elapsed += dt;
      const hold = event?.smash ? .1 : .055;
      const target = event && (elapsed < hold || previousElapsed===0) ? 1 : 0;
      // Fast attack; immediate, smooth widening as the outbound ball departs.
      strength += (target-strength)*(1-Math.exp(-dt*(target ? 48 : 14)));
      if (strength<.001 && target===0) strength=0;
      const zoom = strength*(event?.smash ? 10 : 5.5);
      const shake = event?.smash && elapsed<.23 ? .033*(1-elapsed/.23)*Math.sin(elapsed*137) : 0;
      return { zoom, focus:strength*(event?.smash ? .19 : .13), point:event?.point || null, shake, color:SHOT_COLORS[shot], shot, strength };
    },
    reset(){ event=null; elapsed=10; strength=0; shot='drive'; },
    get shot(){ return shot; },
  };
}

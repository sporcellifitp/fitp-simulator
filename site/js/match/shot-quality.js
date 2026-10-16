// Qualità dell'esecuzione, indipendente dal busto e dalla durata dello scambio.
// La corsa è assistita: l'equilibrio misura una difficoltà fisica, non una scelta manuale.
import { CONTACT, relativeContact } from './contact.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const finite = (x, fallback) => Number.isFinite(x) ? x : fallback;

// Il nuovo aim è locale: -1 sinistra, +1 destra. Il segno storico di dir era opposto.
export function gestureAim(sw = {}){
  return Number.isFinite(sw.aim) ? clamp(sw.aim, -1, 1) : -clamp(finite(sw.dir, 0), -1, 1)*.72;
}
export function executionQuality(player, ball, timingError = 0){
  const r = relativeContact(player, ball.p || ball);
  const timing = clamp(1 - Math.abs(finite(timingError, .28))/.25);
  const stretch = clamp((Math.abs(r.l) - CONTACT.side)/Math.max(.1, CONTACT.reach - CONTACT.side));
  const depthReach = clamp(Math.abs(r.s - CONTACT.forward)/1.2);
  const running = clamp(Math.hypot(finite(player.vx, 0), finite(player.vz, 0))/Math.max(1, finite(player.speed, 6)));
  // Un colpo in corsa resta possibile; l'allungo estremo pesa più della corsa automatica.
  const balance = clamp(1 - stretch*.6 - depthReach*.25 - running*.15);
  return { timing, balance, stretch, running, quality: timing*(.68 + .32*balance) };
}

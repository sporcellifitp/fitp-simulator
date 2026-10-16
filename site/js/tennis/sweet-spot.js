// Hit judgement and rendering use the same contact model. Legacy snapshots can
// still use timeToImpact as a fallback when they do not carry velocity.
import { CONTACT, evaluateContact } from '../match/contact.js';
export const SWEET_SPOT = Object.freeze({ perfectWindow: CONTACT.perfect, readyWindow: CONTACT.ready, idealDistanceMax: CONTACT.idealReach });
export const evaluateSweetSpot = args => evaluateContact(args);

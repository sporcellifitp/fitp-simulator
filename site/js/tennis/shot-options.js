export const SHOT_NAMES = Object.freeze({ drive: 'Piatto', slice: 'Slice', lob: 'Lob', drop: 'Palla corta', smash: 'Smash', serve: 'Servizio' });
export function shotFlags(shot, detected = {}){
  if (shot === 'auto') return { lob: !!detected.lob, slice: !!detected.slice, drop: !!detected.drop };
  return { lob: shot === 'lob', slice: shot === 'slice', drop: shot === 'drop' };
}

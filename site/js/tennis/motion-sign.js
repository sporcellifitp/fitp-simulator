// Segno dell'accelerazione dei sensori (devicemotion), uguale su tutti i telefoni. Tutto il riconoscimento (verso del
// colpo, alto della racchetta, posa «pronto», forma del colpo) è tarato su Chrome per Android, dove
// accelerationIncludingGravity con il telefono fermo punta verso l'alto (+9,8 sull'asse che guarda in su). Safari su
// iPhone la dà con il segno opposto (anche acceleration); il giroscopio (rotationRate) è uguale sui due.
// Diagnostica 20261029-191023: iPhone come Player 2, dritto e rovescio invertiti (gesto concorde con la palla 1 volta su
// 12, contro 7 su 8 e 14 su 16 dei P2 Android delle sessioni prima).
//
// Il segno parte dal sistema (iPhone/iPad: −1) e si conferma con i tocchi sullo schermo: chi tocca il telefono lo tiene
// quasi sempre in verticale davanti a sé, con la cima in alto, quindi l'asse y dell'accelerazione con la gravità è
// positivo con il segno giusto. Bastano SIGN.votes tocchi concordi per correggere un telefono che fa diversamente
// (un browser che cambiasse convenzione in futuro).
export const SIGN = Object.freeze({ votes: 4, agree: .8, minY: 5, g: [7.5, 12] });

// −1 per iPhone, iPad e iPod (anche l'iPad che si presenta come Mac, con il tocco), 1 per gli altri
export function platformAccSign(ua = '', touchPoints = 0){
  if (/iPhone|iPad|iPod/i.test(ua)) return -1;
  if (/Macintosh/i.test(ua) && touchPoints > 1) return -1;
  return 1;
}

export function createAccSign({ prior = 1 } = {}){
  let sign = prior >= 0 ? 1 : -1, up = 0, down = 0;
  return {
    get sign(){ return sign; },
    get votes(){ return { up, down }; },
    // accelerazione con la gravità grezza (come la dà il browser) all'istante di un tocco: true se il segno è cambiato
    vote(raw){
      if (!Array.isArray(raw) || raw.length < 3 || !raw.every(Number.isFinite)) return false;
      const g = Math.hypot(raw[0], raw[1], raw[2]);
      if (g < SIGN.g[0] || g > SIGN.g[1] || Math.abs(raw[1]) < SIGN.minY) return false;   // in movimento o telefono steso
      if (raw[1] > 0) up++; else down++;
      const n = up + down, want = up >= down ? 1 : -1;
      if (n >= SIGN.votes && Math.max(up, down)/n >= SIGN.agree && want !== sign){ sign = want; return true; }
      return false;
    },
  };
}

// campione con l'accelerazione nel verso di Android (il giroscopio non cambia)
export function normalizeSample(k, sign){
  if (sign !== -1 || !k) return k;
  const neg = v => v && v.map(x => -x);
  return { ...k, acc: neg(k.acc), accG: neg(k.accG) };
}

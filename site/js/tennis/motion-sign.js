// Segno dell'accelerazione dei sensori (devicemotion), uguale su tutti i telefoni. Tutto il riconoscimento (verso del
// colpo, alto della racchetta, posa «pronto», forma del colpo) è tarato su Chrome per Android, dove
// accelerationIncludingGravity con il telefono fermo punta verso l'alto (+9,8 sull'asse che guarda in su). Safari su
// iPhone la dà con il segno opposto (anche acceleration); il segno del giroscopio (rotationRate) è uguale sui due (l'ordine
// degli assi no: B74, più giù).
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

// B74 · ordine degli assi del giroscopio (docs/b74/verifica-assi.md, docs/b74/assi-giroscopio.md). Il codice del telefono
// (face-tracker.js, swing-detect.js, gesture-intent.js) e la racchetta a schermo del computer (racket-motion.js) leggono
// rotationRate nell'ordine del W3C: α attorno a z, β attorno a x, γ attorno a y. Chrome su Android lo manda con α attorno a
// x, β attorno a y, γ attorno a z (Chromium, device_motion_event_pump.cc) e l'app NATPF Racchetta 1.0.5 copia Chrome
// (sensori-nativi.js). La verifica del B74 sui campioni veri del 28–29/10 lo conferma: la gravità ruotata con il giroscopio
// sbaglia di 5,2° in media con l'ordine di Chrome e di 20,7° con quello del codice. Safari su iPhone: non verificato (nessun
// campione grezzo), il codice di oggi resta com'è.
// Correzione dietro l'interruttore dello staff «Assi del giroscopio: Come oggi · Corretti (prova)», SPENTO di base: con
// «Corretti» un telefono Android riordina la rotazione una volta sola, all'ingresso (normalizeSample), [x, y, z] di Chrome
// → [z, x, y], l'ordine che il codice si aspetta. Soglie, profili e gioco non cambiano; i campioni grezzi (prova
// app/browser, misure del registro, flusso diagnostico rs) restano nell'ordine del sensore.
export const ROT_ORDERS = Object.freeze(['w3c', 'chrome']);
// telefono Android (anche l'app NATPF Racchetta, che è un WebView di Android): dal nome del browser o, dove c'è, dalla
// piattaforma dichiarata (Chrome con «Sito desktop» toglie «Android» dal nome)
export const isAndroid = ({ ua = '', platform = '' } = {}) => /Android/i.test(String(ua || '')) || /^Android$/i.test(String(platform || ''));
// ordine della rotazione di questo telefono: 'chrome' (da riordinare) solo con l'interruttore acceso su Android
export const rotOrderFor = (on, device = {}) => (on && isAndroid(device) ? 'chrome' : 'w3c');
// rotazione nell'ordine del codice [α(z), β(x), γ(y)] da quella del sensore; rawRotation è l'inversa
export const codeRotation = (rot, order = 'w3c') => (order === 'chrome' && Array.isArray(rot) && rot.length >= 3 ? [rot[2], rot[0], rot[1]] : rot);
export const rawRotation = (rot, order = 'w3c') => (order === 'chrome' && Array.isArray(rot) && rot.length >= 3 ? [rot[1], rot[2], rot[0]] : rot);

// campione nel verso e nell'ordine del codice: accelerazione nel verso di Android (iPhone: segno girato) e, con l'ordine
// di Chrome (B74, interruttore acceso su Android), rotazione riordinata. Con il segno di Android e l'ordine 'w3c' (sempre,
// con l'interruttore spento) è lo stesso campione, come prima del B74. Il campione d'ingresso non si tocca
export function normalizeSample(k, sign, order = 'w3c'){
  const flip = sign === -1, turn = order === 'chrome' && Array.isArray(k?.rot);
  if (!k || (!flip && !turn)) return k;
  const neg = v => v && v.map(x => -x);
  return { ...k, ...(flip ? { acc: neg(k.acc), accG: neg(k.accG) } : {}), ...(turn ? { rot: codeRotation(k.rot, order) } : {}) };
}

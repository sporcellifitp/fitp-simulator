// Input di gioco esclusivamente da smartphone (NATPF Simulator).
// La pagina del desktop gestisce UI e connessione; questo modulo accetta soltanto gli eventi
// normalizzati dal collegamento del telefono. Movimento del giocatore sempre automatico.
const clamp = (v, lo, hi, fallback = 0) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;

export function createControls(_canvas, _options = {}){
  const q = [];
  let enabled = false, autoMove = true;

  return {
    get aim(){ return null; },
    set enabled(v){ enabled = !!v; if (!enabled) q.length = 0; },
    get enabled(){ return enabled; },
    set autoMove(v){ autoMove = !!v; },
    set useAim(_v){ /* Nessuna mira con puntatore in modalità smartphone-only. */ },

    // Il link converte già il tempo del picco nell'orologio del computer (secondi).
    phoneSwing(s){
      if (!enabled || !s || !Number.isFinite(s.at) || q.length >= 8) return;
      q.push({
        at: s.at,
        power: clamp(s.power, .2, 1, .6),
        lift: clamp(s.lift, -1, 1),
        lob: !!s.lob,
        drop: !!s.drop,
        slice: !!s.slice,
        dur: clamp(s.dur, 0, 700),
        dir: clamp(s.dir, -1, 1),
        aim: Number.isFinite(s.aim) ? clamp(s.aim,-1,1) : null,
        confidence: clamp(s.confidence,0,1,.7),
        src: 'phone',
      });
    },
    phoneToss(s){
      if (!enabled || !s || !Number.isFinite(s.at) || q.length >= 8) return;
      q.push({ at: s.at, power: .5, toss: true, src: 'phone' });
    },
    read(){
      const pending = q.splice(0, q.length);
      return {
        move: { x: 0, y: 0 },
        swings: pending.filter(s => !s.toss),
        tosses: pending.filter(s => s.toss),
        auto: autoMove,
      };
    },
  };
}

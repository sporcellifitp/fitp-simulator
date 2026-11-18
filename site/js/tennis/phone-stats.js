// B66 (richiesta dell'utente del 18/11: più dati nel registro dello stand su qualità dei sensori, telefono bloccato, rete
// del telefono): misure fatte sul telefono e mandate al computer a grandi linee, mai i campioni. Senza DOM: lo provano i
// test (tools/test/phone-stats.test.mjs); racchetta.js lo collega ai sensori, al blocco dei tocchi e al ponte dell'app.
//
// Sul computer le legge il registro dello stand (natpf-tennis/src/natpf/registro/registro_misure.js), che le somma per
// partita. Nessuna di queste misure cambia il gioco o il riconoscimento dei gesti.

// Campioni dei sensori. Buco: un intervallo tra due campioni oltre BUCO.volte il periodo tipico del telefono (e almeno
// BUCO.minMs). Saturazione: lo stesso valore grande ripetuto su un asse in due campioni di fila (il sensore è arrivato al
// suo massimo e «taglia»: accelerazione da SAT.acc m/s², rotazione da SAT.rot °/s).
export const BUCO = Object.freeze({ volte: 2, minMs: 25, anello: 64 });
export const SAT = Object.freeze({ acc: 15, rot: 300, uguale: .01 });

// t: istante del campione (ms, quello dell'evento); rot (°/s) e accG (m/s², con la gravità) come sampleFromMotion;
// interval: intervallo dichiarato dal browser (DeviceMotionEvent.interval: ms; Safari vecchio in secondi)
export function createSampleStats({ volte = BUCO.volte, minMs = BUCO.minMs, anello = BUCO.anello } = {}){
  let last = null, per = null, iv = null, prevRot = null, prevAcc = null;
  let n = 0, b = 0, bm = 0, sa = 0, sg = 0, from = null;
  const times = new Float64Array(anello); let head = 0, count = 0;
  const plateau = (cur, prev, min) => {
    if (!cur || !prev) return false;
    for (let i = 0; i < 3; i++){ const v = Math.abs(cur[i]); if (v >= min && Math.abs(v - Math.abs(prev[i])) <= SAT.uguale*Math.max(1, v)/100) return true; }
    return false;
  };
  const gapOf = dt => per != null && dt > Math.max(volte*per, minMs);
  return {
    get period(){ return per; },
    get interval(){ return iv; },
    feed(t, { rot = null, accG = null, interval = null } = {}){
      if (!Number.isFinite(t)) return;
      if (Number.isFinite(interval) && interval > 0) iv = interval < 1 ? interval*1000 : interval;
      if (from == null) from = t;
      if (last != null && t > last){
        const dt = t - last;
        if (gapOf(dt)){ b++; if (dt > bm) bm = dt; }
        // periodo tipico: media mobile degli intervalli normali (i buchi non la spostano)
        else per = per == null ? dt : per + (dt - per)*.05;
      }
      if (plateau(accG, prevAcc, SAT.acc)) sa++;
      if (plateau(rot, prevRot, SAT.rot)) sg++;
      prevAcc = accG; prevRot = rot;
      last = t; n++;
      times[head] = t; head = (head + 1) % anello; if (count < anello) count++;
    },
    // il buco più lungo tra i campioni con l'istante tra from e to (ms) se è un buco, se no null
    gapIn(a, z){
      let prev = null, max = 0;
      for (let i = 0; i < count; i++){
        const t = times[(head - count + i + anello) % anello];
        if (t < a){ prev = t; continue; }
        if (t > z) break;
        if (prev != null && t - prev > max) max = t - prev;
        prev = t;
      }
      return max && gapOf(max) ? Math.round(max) : null;
    },
    // misure dall'ultimo rapporto (e da capo): [campioni, ms coperti, buchi, buco più lungo ms, intervallo dichiarato ms,
    // campioni saturi dell'accelerazione, campioni saturi della rotazione]. null se non è arrivato niente
    report(now = last){
      if (!n) return null;
      const el = Math.max(0, Math.round((now ?? last) - (from ?? now)));
      const out = [n, el, b, Math.round(bm), iv == null ? null : Math.round(iv*10)/10, sa, sg];
      n = 0; b = 0; bm = 0; sa = 0; sg = 0; from = now ?? last;
      return out;
    },
  };
}

// Telefono bloccato (B51): tocchi fermati dal blocco, sblocchi dello staff sul telefono (due dita 3 s), pagina nascosta
// mentre era bloccato (schermo spento, altra app). Conti dall'apertura della pagina: il computer fa le differenze
export function createLockStats(){
  const c = { tb: 0, ss: 0, us: 0 };
  return {
    blocked(){ c.tb++; },
    staff(){ c.ss++; },
    hidden(locked){ if (locked) c.us++; },
    get counts(){ return [c.tb, c.ss, c.us]; },
  };
}

// Stato del telefono dall'app «NATPF Racchetta» (natpf-android, Bridge.stato: un JSON). Restano solo numeri, a grandi
// linee: [segnale Wi-Fi dBm, banda GHz (2,4 · 5 · 6), velocità del collegamento Mbps, batteria %, in carica 0/1,
// temperatura della batteria in decimi di °C, «Fissa app» attiva 0/1, schermi spenti dall'avvio dell'app]. Mai nome della
// rete, indirizzi o identificativi (l'app non li legge). null se l'app non c'è o il testo non va bene
const NUM = (v, a, b) => (typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b ? Math.round(v*10)/10 : null);
export function appStatus(text){
  if (typeof text !== 'string' || text.length > 400) return null;
  let j; try { j = JSON.parse(text); } catch { return null; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const banda = j.ghz === 2.4 || j.ghz === 5 || j.ghz === 6 ? j.ghz : null;
  const out = [NUM(j.rssi, -126, 0), banda, NUM(j.mbps, 0, 10000), NUM(j.batt, 0, 100), j.carica === 1 || j.carica === 0 ? j.carica : null,
    NUM(j.temp, -400, 1000), j.fissa === 1 || j.fissa === 0 ? j.fissa : null, NUM(j.spenti, 0, 1e6)];
  return out.some(v => v != null) ? out : null;
}
// lettura dal ponte dell'app (window.NATPFApp) al più ogni everyMs: il ponte va al sistema (Wi-Fi, batteria)
export function createAppReader(bridge, { everyMs = 5000 } = {}){
  let at = -Infinity, last = null;
  return {
    read(now){
      if (!bridge || typeof bridge.stato !== 'function') return null;
      if (now - at < everyMs) return last;
      at = now;
      try { last = appStatus(bridge.stato()); } catch { last = null; }
      return last;
    },
  };
}

// Analisi di una sessione una riga alla volta (nel worker, a fine registrazione e al download): in memoria restano
// solo gli eventi che servono alle metriche e al rapporto e, dei campioni del telefono, istante e numero. Prima si
// leggeva tutto il registro in una volta, anche sul thread del gioco per il rapporto.
import { computeMetrics, METRIC_KINDS } from './diag_metrics.js';
import { viewerFilter } from './diag_viewer.js';

export function createAnalysis({ viewer = false } = {}){
  const events = [], raw = [], view = viewer ? [] : null, keep = viewer ? viewerFilter() : null;
  let total = 0, first = null, last = null;
  return {
    event(e){
      if (!e || typeof e !== 'object') return;
      total++;
      if (Number.isFinite(e.t)){ if (first == null) first = e.t; last = e.t; }
      if (METRIC_KINDS.has(e.k)) events.push(e);
      if (view){ const v = keep(e); if (v) view.push(v); }
    },
    raw(s){ if (s && typeof s === 'object') raw.push({ k: s.k, q: s.q }); },
    result(meta = {}){
      const metrics = computeMetrics(events, { raw, meta, eventi: total, spanMs: first != null ? last - first : 0 });
      return { metrics, eventsJson: view ? JSON.stringify(view) : null };
    },
  };
}
// righe JSON da un testo che arriva a pezzi; una riga non valida (l'ultima, troncata da una chiusura improvvisa) si salta
export function lineSplitter(fn){
  let rest = '';
  const line = l => { if (!l) return; let o; try { o = JSON.parse(l); } catch { return; } fn(o); };
  return {
    push(chunk){ const parts = (rest + chunk).split('\n'); rest = parts.pop(); for (const l of parts) line(l); },
    end(){ line(rest); rest = ''; },
  };
}

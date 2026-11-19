import { ballY, estimateLag, lagPlan, proposeLag } from './natpf_lag_measure.js';
import { LAG_FAIR_NOTE } from './natpf_phone_racket.js';

const REF = 'natpf.displayLagRef';
const RECENT = 'natpf.displayLagTests';
const MAX_AGE = 12 * 60 * 60 * 1000;
function read(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const failure = {
  pochi: 'Fai un colpo secco a ogni rimbalzo. Sono arrivati troppo pochi colpi.',
  ritmo: 'Guarda la palla e colpisci solo quando la vedi toccare terra.',
  irregolari: 'I colpi sono troppo irregolari. Riprova con un gesto breve e secco.',
};

export class NatpfLagTest {
  constructor(diag){ this.diag = diag; }

  get phone(){ return [this.diag.engine.natpfPhone, this.diag.engine.natpfPhone2].find(phone => phone?.ready); }

  start({ seed = Date.now() } = {}){
    const phone = this.phone;
    if (!phone) return false;
    this.cancel();
    this.result = null;
    this.plan = lagPlan(seed);
    this.t0 = performance.now() + 3000;
    this.peaks = [];
    const layer = this.layer = document.createElement('section');
    layer.className = 'natpf-lagtest';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', 'Prova del ritardo dello schermo');
    layer.innerHTML = `<header>Un colpo secco quando la palla tocca terra. Se sparisce, aspetta.<button data-lag-action="close">Annulla</button></header>
      <canvas aria-hidden="true"></canvas><p aria-live="polite">Preparati</p><progress max="${this.plan.end}" value="0"></progress>`;
    layer.addEventListener('pointerdown', e => e.stopPropagation());
    layer.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); this.cancel(); });
    layer.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape'){ e.preventDefault(); this.cancel(); }
    });
    layer.addEventListener('click', e => {
      e.stopPropagation();
      const action = e.target.closest('[data-lag-action]')?.dataset.lagAction;
      if (action === 'close') this.cancel();
      if (action === 'again') this.start();
      if (action === 'reference'){
        write(REF, { ms: this.result.lagMs, at: Date.now() });
        this.diag.ui?.toast?.('Riferimento del monitor salvato');
        this.cancel();
      }
      if (action === 'save'){
        const recent = this.recent();
        write(RECENT, [...recent.slice(-2), { ms: this.result.lagMs, at: Date.now() }]);
        this.diag.saveLag(this.proposed);
        this.cancel();
      }
    });
    document.body.append(layer);
    layer.querySelector('button').focus();
    this.removeProbe = phone.probeSwings(({ at }) => {
      const peak = at - this.t0 / 1000;
      if (Number.isFinite(peak) && peak >= 0 && peak <= this.plan.end) this.peaks.push(peak);
    });
    const frame = now => {
      if (!phone.ready){
        this.cancel();
        this.diag.ui?.toast?.('Prova interrotta: telefono scollegato');
        return;
      }
      const t = (now - this.t0) / 1000;
      if (t >= this.plan.end){ this.finish(); return; }
      this.paint(t);
      this.frame = requestAnimationFrame(frame);
    };
    this.frame = requestAnimationFrame(frame);
    return true;
  }

  paint(t){
    const canvas = this.layer.querySelector('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'), floor = h * .78, r = h * .045;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#93a8bc';
    ctx.fillRect(w * .2, floor, w * .6, Math.max(2, h * .004));
    if (t < 0){
      ctx.fillStyle = '#eff6ff'; ctx.textAlign = 'center'; ctx.font = `bold ${Math.round(h * .22)}px system-ui`;
      ctx.fillText(Math.ceil(-t), w / 2, h / 2);
      return;
    }
    const y = ballY(this.plan, t);
    if (y != null){
      ctx.beginPath();
      ctx.ellipse(w / 2, floor - 2, r * (1.08 - y * .8), r * .15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8fc53';
      ctx.beginPath();
      ctx.arc(w / 2, floor - r - y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const status = this.layer.querySelector('p');
    const text = `Colpi ricevuti: ${this.peaks.length}`;
    if (status.textContent !== text) status.textContent = text;
    this.layer.querySelector('progress').value = t;
  }

  recent(){ return read(RECENT, []).filter(row => Date.now() - row.at <= MAX_AGE && Number.isFinite(row.ms)); }

  finish(){
    cancelAnimationFrame(this.frame);
    this.removeProbe?.();
    this.removeProbe = null;
    const result = this.result = estimateLag(this.plan, this.peaks);
    this.diag.recorder.log('stand.provaRitardo', result);
    const ref = read(REF, null);
    const hasRef = ref && Number.isFinite(ref.ms) && Date.now() - ref.at <= MAX_AGE;
    const recent = this.recent().map(row => row.ms);
    this.proposed = proposeLag({ lagMs: result.lagMs, refMs: hasRef ? ref.ms : 0, recent });
    const details = result.ok
      ? `<h2>Ritardo misurato: ${result.lagMs} ms</h2><p>${result.hits} colpi su 12 · regolarità ±${result.spreadMs} ms</p>
         <p>${hasRef ? `Riferimento del monitor: ${ref.ms} ms. Valore proposto: <b>${this.proposed} ms</b>.` : 'Il valore comprende il tempo di chi gioca. Per stimare il ledwall, fai prima una prova sul monitor e salvala come riferimento.'}</p>
         ${recent.length ? `<p>Ultime misure: ${recent.join(' · ')} ms</p>` : ''}
         ${recent.some(ms => Math.abs(ms - result.lagMs) > 40) ? '<p>Le prove differiscono di oltre 40 ms. Ripeti la prova.</p>' : ''}
         ${this.diag?.ui?.fiera?.on ? `<p data-lag-fiera>${LAG_FAIR_NOTE}</p>` : ''}
         <button data-lag-action="save">Salva ${this.proposed} ms</button><button data-lag-action="reference">Questa era sul monitor</button>`
      : `<h2>Ripeti la misura</h2><p>${failure[result.why]}</p>`;
    this.layer.innerHTML = `<div class="natpf-lagtest-result">${details}<button data-lag-action="again">Rifai la prova</button><button data-lag-action="close">Chiudi</button></div>`;
    this.layer.querySelector('button').focus();
  }

  cancel(){
    if (!this.layer) return;
    cancelAnimationFrame(this.frame);
    this.removeProbe?.();
    this.removeProbe = null;
    this.layer.remove();
    this.layer = null;
    this.diag.el?.querySelector('[data-diag="lagtest"]')?.focus();
  }
}

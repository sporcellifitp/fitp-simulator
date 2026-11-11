// Pagina e orologio finti per le prove dell'intro e dello sfondo del tutorial (B21): nodi con classi, attributi, eventi
// e figli; video che partono, sono rifiutati, danno errore o restano fermi; setTimeout che avanza solo con advance().
// Sostituisce setTimeout e clearTimeout globali: va importato solo da file di test dedicati.
let now = 0, tid = 0; export const timers = [];
globalThis.setTimeout = (fn, ms = 0) => { timers.push({ id: ++tid, at: now + ms, fn }); return tid; };
globalThis.clearTimeout = id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
export const advance = ms => { const end = now + ms; for (;;){ const t = timers.filter(x => x.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0]; if (!t) break; timers.splice(timers.indexOf(t), 1); now = Math.max(now, t.at); t.fn(); } now = end; };
export const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
export class Node {
  constructor(tag = 'div'){ this.tag = tag; this.cls = new Set(); this.attrs = {}; this.ls = {}; this.children = []; this.parentNode = null; this.style = { props: {}, setProperty(k, v){ this.props[k] = v; } };
    const self = this; this.classList = { add: (...c) => c.forEach(x => self.cls.add(x)), remove: (...c) => c.forEach(x => self.cls.delete(x)), contains: c => self.cls.has(c), toggle: (c, f) => { const on = f === undefined ? !self.cls.has(c) : !!f; on ? self.cls.add(c) : self.cls.delete(c); return on; } }; }
  addEventListener(t, fn){ (this.ls[t] ||= []).push(fn); } removeEventListener(t, fn){ this.ls[t] = (this.ls[t] || []).filter(f => f !== fn); }
  emit(t, e = {}){ for (const fn of [...(this.ls[t] || [])]) fn({ type: t, stopPropagation(){}, preventDefault(){}, stopImmediatePropagation(){}, ...e }); }
  setAttribute(k, v){ this.attrs[k] = String(v); } getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k){ delete this.attrs[k]; if (k === 'src') this.src = ''; }
  querySelector(sel){ return this.children.find(c => sel === '.' + [...c.cls][0]) || null; }
  insertBefore(n, ref){ n.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; i >= 0 ? this.children.splice(i, 0, n) : this.children.push(n); return n; }
  get firstChild(){ return this.children[0] || null; } get nextSibling(){ const s = this.parentNode?.children || [], i = s.indexOf(this); return s[i + 1] || null; }
  appendChild(n){ return this.insertBefore(n, null); }
  remove(){ if (this.parentNode){ this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; } }
  focus(){} get offsetWidth(){ return 1; }
}
// video finto: play() risponde come dice `behave` ('ok' parte, 'reject' rifiutato, 'error' errore di rete, 'hang' niente)
export class Video extends Node {
  constructor(behave = 'ok'){ super('video'); this.behave = behave; this.paused = true; this.readyState = 0; this.currentTime = 0; this.error = null; this.plays = 0; this.src = ''; }
  play(){ this.plays++;
    if (this.behave === 'reject') return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    if (this.behave === 'ok') setTimeout(() => { if (!this.src && this.tag === 'video' && this.isTrailer) return; this.readyState = 4; this.emit('playing'); }, 120);
    if (this.behave === 'error') setTimeout(() => { this.error = { code: 4 }; this.emit('error'); }, 80);
    return Promise.resolve(); }
  pause(){ this.paused = true; } load(){}
}
// orologio da capo (pagina nuova) e blocco della pagina (il tempo passa senza che giri nessun timer)
export const resetClock = () => { now = 0; timers.length = 0; };
export const block = ms => { now += ms; };

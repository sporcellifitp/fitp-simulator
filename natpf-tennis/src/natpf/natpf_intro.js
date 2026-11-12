// Intro all'avvio, come l'accensione di un gioco su console: un video, poi il titolo NATPF Simulator con la palla che lo
// attraversa e «Premi un tasto per iniziare»; i partner sono una riga piccola in basso. Un tasto, un clic o un tocco
// durante il video mostra subito il titolo; alla fine fa partire il menu (e sblocca l'audio del browser, che vuole un
// gesto). La seconda volta nella stessa sessione si vede solo il titolo sull'ultima inquadratura. ?intro=0 la salta
// (prove), e non c'è per il Player 2 che apre l'invito di una sfida.
// Video (B21, 11/11/2026): prima il TRAILER (10 s, fatto con fotogrammi veri del gioco, approvato dall'utente), con il
// ripiego sul video di prima (public/media/intro.mp4, l'arena che si accende, generato con Higgsfield, senza scritte né
// marchi), e se nemmeno quello parte l'ultima inquadratura come immagine (intro-fine.webp), come prima.
//   • Dove sta il trailer: nel programma Windows è dentro il programma (./media/<TRAILER.file>, copiato da
//     natpf-desktop/media da natpf-desktop/scripts/prepara.mjs: nessuna rete); sul web (Cloudflare) si scarica dal
//     bucket pubblico R2 degli aggiornamenti (TRAILER.base + TRAILER.file: nello zip Cloudflare non entra, pesa 2,26 MB
//     e il margine sotto i 25 MB è poco); lo carica il workflow .github/workflows/natpf-windows.yml in media/.
//     Il nome porta l'impronta sha256 del file: un trailer nuovo ha un nome nuovo (cache lunga, mai byte vecchi).
//     Chi apre il gioco dal server del programma da un altro computer (?lan=1, senza window.natpfDesktop) prova prima
//     il file dello stesso server e poi il bucket.
//   • Nel programma Windows (B26, dopo il collaudo dell'utente dell'11/11: «è partito il video di prima») il file è
//     locale: il trailer parte APPENA PUÒ PARTIRE (primo fotogramma pronto), senza la regola della rete lenta, e ha
//     TRAILER.waitLocalMs (8 s di pagina libera) per farlo: prima aveva 1,5 s e doveva anche risultare scaricato per
//     6 s su 10, e su un PC vero, con il gioco che si avvia e la scheda grafica occupata, poteva non bastare. Lì il
//     ripiego resta solo per un errore vero del file (manca, non si decodifica, riproduzione rifiutata). La cronaca
//     dell'intro (quale video è partito, quando e perché) finisce nel registro del programma (programma.log).
//   • Ripiego sul web: il trailer deve poter ARRIVARE IN FONDO SENZA FERMARSI, e saperlo entro TRAILER.waitMs (2,5 s di
//     pagina libera: il tempo in cui il gioco che si avvia tiene occupata la pagina non conta). Vale quando il browser stima
//     di sì (readyState 4, «canplaythrough») e in più il filmato è tutto scaricato, oppure ne sono arrivati almeno
//     TRAILER.leadS secondi (6 su 10) entro TRAILER.leadMaxMs (trailerCanFinish; revisione dell'11/11: prima bastava
//     l'evento «playing», che arriva con i primi 100 kB, e con una rete lenta il trailer andava a scatti per tutta
//     l'intro). Finché non si sa, il trailer resta fermo all'inizio e non si vede (sotto c'è il primo fotogramma del
//     video di prima). Se dà errore (404, rete assente, decodifica), se il browser rifiuta la riproduzione o se il
//     tempo scade, si toglie e parte il video di prima, esattamente come prima del B21. Se il trailer si ferma a metà
//     per più di TRAILER.stallMs (rete caduta) o dà errore a metà resta l'immagine finale con il titolo e «Premi un
//     tasto». ?trailer=0 nell'indirizzo lo salta (prove, e per chi non lo vuole).
//   • Tempi: il titolo entra sull'ultima inquadratura. Le animazioni dell'intro (natpf-ui.css) hanno i ritardi del video
//     di prima più --intro-shift, che per il trailer vale TRAILER.shiftMs; partono quando il video parte davvero.
const $ = id => document.getElementById(id);
const clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
export const INTRO_KEY = 'natpf-tennis.intro';
// durata dell'animazione completa (ms) e di quella breve (sessione già vista): allineate alle animazioni dell'intro in natpf-ui.css
export const INTRO_MS = { full: 7800, short: 1500 };
// quale video si è visto nella sessione ('trailer' | 'intro'): la seconda volta il titolo sta sulla sua ultima inquadratura
export const INTRO_VIDEO_KEY = 'natpf-tennis.intro.video';
export const TRAILER = Object.freeze({
  file: 'trailer-aad6b9311db4.mp4',                 // natpf-desktop/media/ (il nome porta i primi 12 caratteri dello sha256)
  sha256: 'aad6b9311db4507586e333476f48bfc1cbbed98559caf3d00c1488630a422a8d', bytes: 2258622,
  base: 'https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev',   // bucket pubblico R2 (natpf-desktop/aggiornamenti.json)
  dir: 'media/',                                    // cartella sul bucket e nel programma Windows
  still: './media/trailer-fine.webp',               // ultima inquadratura del trailer
  shiftMs: 2800,                                    // il titolo entra 2,8 s dopo rispetto al video di prima (a 8,5 s su 10)
  waitMs: 2500,                                     // tempo per partire, sul web; nel programma (file locale) waitLocalMs
  waitLocalMs: 8000,                                // programma Windows: il file è locale, si aspetta il primo fotogramma
  // il tempo per partire si conta a passi, e solo quelli arrivati puntuali: un passo in ritardo (oltre lateK volte il
  // passo) vuol dire pagina occupata dal gioco che si avvia, e quel tempo non conta. Limite assoluto: capK volte l'attesa
  tickMs: 250, lateK: 1.6, capK: 4,
  lateS: .25,                                       // trailer già oltre questo secondo quando l'intro parte: torna all'inizio
  // «arriva in fondo»: tutto scaricato (a meno di tailS), oppure almeno leadS secondi di filmato arrivati entro
  // leadMaxMs dalla creazione del video. Con 6 s su 10 già scaricati basta una rete da 125 kB/s per non fermarsi più
  // (il trailer chiede in media 226 kB/s, fino a 430 verso la fine), e chi li scarica in 7 s ne ha almeno 150: il
  // conto con il peso vero del file è in test/natpf-intro-trailer.test.mjs. In pratica, con i 2,5 s di attesa, il
  // trailer parte con una rete da circa 3–4 Mbit/s in su; sotto parte il video di prima
  tailS: 0.25, leadS: 6, leadMaxMs: 7000,
  stallMs: 2000,                                    // fermo a metà più di così: resta l'immagine finale
});
export const INTRO_STILL = './media/intro-fine.webp';

export function introMode({ search = '', seen = false } = {}){
  const q = new URLSearchParams(search);
  if (q.get('intro') === '0' || q.get('diag') === '1') return 'off';
  // Player 2 arrivato con il link di invito di una sfida: dritto nella stanza (prima l'intro con «Premi un tasto» copriva
  // il pannello della stanza)
  if ((q.get('role') || '').toLowerCase() === 'p2' && q.get('room')) return 'off';
  return seen ? 'short' : 'full';
}

// indirizzo del trailer: nel programma Windows il file locale, sul web il bucket R2
export function trailerUrl({ desktop = false } = {}){
  return desktop ? `./${TRAILER.dir}${TRAILER.file}` : `${TRAILER.base.replace(/\/+$/, '')}/${TRAILER.dir}${TRAILER.file}`;
}
// Video dell'intro completa, nell'ordine in cui si provano: prima il trailer (se non è escluso con ?trailer=0), poi il
// video di prima. Ogni voce: { id, src (null: quello già nella pagina), waitMs (0: nessun limite, come prima), shiftMs,
// sure (file locale del programma Windows: parte appena può partire, senza la regola della rete lenta) }
// Dal server del programma Windows aperto da un altro computer (?lan=1 senza window.natpfDesktop: il programma apre il
// gioco con /?lan=1) il trailer è servito dallo stesso server: prima quello, poi il bucket (se il file non c'è, 404
// subito e si passa al bucket)
export function introPlan({ search = '', desktop = false } = {}){
  const old = { id: 'intro', src: null, waitMs: 0, shiftMs: 0 }, q = new URLSearchParams(search);
  if (q.get('trailer') === '0') return [old];
  const local = { id: 'trailer', src: trailerUrl({ desktop: true }), waitMs: TRAILER.waitLocalMs, shiftMs: TRAILER.shiftMs, sure: true };
  const remote = { id: 'trailer', src: trailerUrl({ desktop: false }), waitMs: TRAILER.waitMs, shiftMs: TRAILER.shiftMs };
  if (desktop) return [local, old];
  // da un altro computer il file dello stesso server passa dalla rete (Wi-Fi): vale la regola del web
  return q.get('lan') === '1' ? [{ ...remote, src: local.src }, remote, old] : [remote, old];
}
// il video sta girando? (non in pausa, senza errori, con fotogrammi pronti o già avanzato). Per il trailer non basta
// per far partire l'intro: serve trailerCanFinish
export const trailerStarted = v => !!v && !v.error && !v.paused && (v.readyState >= 3 || v.currentTime > 0);
// fine del tratto già scaricato, in secondi di filmato (null: il browser non lo dice)
export function bufferedEnd(v){ try { const b = v?.buffered; return b ? (b.length ? b.end(b.length - 1) : 0) : null; } catch { return null; } }
// Il trailer arriverà in fondo senza fermarsi? Il browser deve stimare di sì (readyState 4, «canplaythrough»); in più,
// se dice quanto ha scaricato: tutto il filmato, oppure almeno TRAILER.leadS secondi arrivati entro TRAILER.leadMaxMs
// (elapsedMs: tempo dalla creazione del video, cioè da prima della richiesta). La stima del browser da sola non basta:
// misurato con Chromium, a 200 kB/s (il trailer ne chiede in media 226) dice di sì dopo 1,4 s e poi il trailer si
// ferma due volte verso la fine. Chromium dà il tratto scaricato in proporzione ai byte, altri browser in tempo di
// filmato: la regola regge in tutti e due i modi
export function trailerCanFinish(v, elapsedMs = 0){
  if (!v || v.error || !(v.readyState >= 4)) return false;
  const end = bufferedEnd(v), d = v.duration;
  if (end == null || !(d > 0) || !Number.isFinite(d)) return true;
  if (end >= d - TRAILER.tailS) return true;
  return end >= TRAILER.leadS && elapsedMs <= TRAILER.leadMaxMs;
}
// durata dell'animazione dell'intro con quel video (ms): quella di prima più lo spostamento del titolo
export const introDuration = (mode, shiftMs = 0) => (INTRO_MS[mode] || INTRO_MS.full) + (mode === 'full' ? Math.max(0, shiftMs || 0) : 0);
// immagine sotto il titolo nell'intro breve: l'ultima inquadratura del video visto nella sessione
export const introStill = seenVideo => (seenVideo === 'trailer' ? TRAILER.still : INTRO_STILL);
// stato di un video per la cronaca: readyState, networkState, secondi scaricati, secondo corrente, errore
const videoState = v => ({ rs: v?.readyState ?? null, net: v?.networkState ?? null, buf: bufferedEnd(v), t: v?.currentTime ?? null, err: v?.error ? `${v.error.code ?? ''} ${v.error.message || ''}`.trim() : null });

export class NatpfIntro {
  constructor({ onDone } = {}){
    this.el = $('natpf-intro'); this.onDone = onDone;
    let seen = false; try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch {}
    this.mode = introMode({ search: location.search, seen });
    this.ready = false; this.active = false; this.video = null; this.run = 0;
    if (!this.el) return;
    this._key = e => this._input(e);
    this.el.addEventListener('pointerdown', e => { e.stopPropagation(); this._input(e); });
    $('intro-skip')?.addEventListener('click', e => { e.stopPropagation(); this.finishAnimation(); });
    if (this.mode === 'off'){ this.el.classList.add('hidden'); queueMicrotask(() => this.onDone?.({ skipped: true })); return; }
    this.play(this.mode);
  }
  get visible(){ return !!this.el && !this.el.classList.contains('hidden'); }
  get desktop(){ return typeof window !== 'undefined' && !!window.natpfDesktop; }
  play(mode = 'full'){
    if (!this.el) return;
    this.active = true; this.ready = false; this.video = null; const run = ++this.run;
    this.trace = []; this._t0 = clock();
    this.el.classList.remove('hidden', 'leaving', 'is-ready', 'mode-full', 'mode-short', 'no-video', 'is-trailer');
    this._dropTrailer();
    window.addEventListener('keydown', this._key, true);
    clearTimeout(this._t); clearTimeout(this._w); clearTimeout(this._s);
    if (mode !== 'full'){
      // intro breve: solo il titolo sull'ultima inquadratura del video visto prima
      let seenVideo = null; try { seenVideo = sessionStorage.getItem(INTRO_VIDEO_KEY); } catch {}
      this._still(introStill(seenVideo)); $('intro-video')?.pause?.();
      return this._begin(mode, run, { fail: true });
    }
    this._still(INTRO_STILL);
    // «Rivedi l'intro»: il video di prima torna all'inizio (sotto il trailer che sta per partire non resta la sua fine)
    try { const old = $('intro-video'); if (old && old.currentTime > 0){ old.pause?.(); old.currentTime = 0; } } catch {}
    this._try(introPlan({ search: location.search, desktop: this.desktop }), 0, run);
  }
  // prova il video numero i del piano; se non parte, il successivo; finiti i video resta l'immagine finale
  _try(plan, i, run){
    if (run !== this.run || !this.active || this.ready) return;
    const step = plan[i];
    if (!step) return this._begin('full', run, { fail: true });
    const v = step.src ? this._trailerEl(step.src) : $('intro-video');
    if (!v) return this._try(plan, i + 1, run);
    let done = false;
    const next = why => { if (done) return; done = true; clearTimeout(this._w); off(); this._note(`trailer scartato: ${typeof why === 'string' ? why : 'errore del file'}`, videoState(v)); if (step.src) this._dropTrailer(); this._try(plan, i + 1, run); };
    // Il trailer può aver già girato mentre la pagina era occupata dall'avvio del gioco (il video va avanti da solo, e
    // finché l'intro non parte non si vede): se è già oltre TRAILER.lateS torna all'inizio, così si vede tutto e il
    // titolo entra sull'ultima inquadratura (misurato nel programma avviato su Linux: 1,5 s già passati)
    const go = () => { if (done) return; done = true; clearTimeout(this._w); off(); this._note('trailer partito', videoState(v)); try { if (v.currentTime > TRAILER.lateS) v.currentTime = 0; } catch {} this._begin('full', run, step); };
    let off = () => {};
    if (!step.src){
      // video di prima, come prima del B21: parte subito, senza limite di tempo; se la riproduzione è rifiutata o il
      // file manca resta l'immagine finale
      done = true; v.onerror = () => this._fail(run); this._note('video di prima', videoState(v));
      try { v.currentTime = 0; } catch {}
      const p = v.play?.(); if (p?.catch) p.catch(() => this._fail(run)); else if (!p) return this._begin('full', run, { fail: true });
      return this._begin('full', run, step);
    }
    // Trailer. play() subito: il browser dice subito se rifiuta la riproduzione e comincia a scaricare (anche dove
    // preload non basta). Nel programma Windows (step.sure: file locale) l'intro parte appena il trailer gira. Sul web
    // l'intro parte solo se il trailer può ARRIVARE IN FONDO senza fermarsi (trailerCanFinish).
    // Se il trailer comincia a girare prima di saperlo (rete lenta: bastano i primi 100 kB) si rimette fermo all'inizio
    // e riparte quando la condizione è vera; se il tempo scade (step.waitMs) si toglie e parte il video di prima.
    let held = false, cleared = false, left = Math.ceil(step.waitMs/TRAILER.tickMs); const t0 = clock();
    const ok = () => !!step.sure || trailerCanFinish(v, clock() - t0);
    const refused = e => { if (held && e?.name === 'AbortError') return; next(`riproduzione rifiutata (${e?.name || e?.message || '?'})`); };   // la pausa qui sopra non è un rifiuto
    const start = () => { try { const p = v.play?.(); if (p?.catch) p.catch(refused); else if (!p) next('riproduzione rifiutata'); } catch { next('riproduzione rifiutata'); } };
    this._note('trailer richiesto', { src: step.src, attesa: step.waitMs, locale: !!step.sure });
    const look = () => {
      if (done) return;
      if (held){ if (ok()){ held = false; cleared = true; left = Math.max(left, 3); start(); } return; }   // due passi per ripartire
      if (!trailerStarted(v)) return;
      if (cleared || ok()) return go();
      held = true; try { v.pause?.(); if (v.currentTime > 0) v.currentTime = 0; } catch {}
    };
    const failed = () => next('errore del file');
    off = () => { for (const t of ['playing', 'canplay', 'canplaythrough', 'progress']) v.removeEventListener?.(t, look); v.removeEventListener?.('error', failed); };
    for (const t of ['playing', 'canplay', 'canplaythrough', 'progress']) v.addEventListener(t, look);
    v.addEventListener('error', failed);
    // Tempo per partire, contato a passi brevi (TRAILER.tickMs), e solo quelli arrivati puntuali: all'avvio il gioco
    // tiene occupata la pagina anche per qualche secondo (il video non può nemmeno cominciare a caricarsi) e un passo
    // arrivato in ritardo non conta (prima del B26 un blocco contava come un passo: tanti blocchi medi di fila
    // consumavano l'attesa). Limite assoluto TRAILER.capK volte l'attesa: una pagina sempre occupata non aspetta per
    // sempre. A ogni passo si riguarda il video (un evento può essere ancora in coda)
    if (step.waitMs > 0){
      let last = t0, late = 0; const cap = t0 + step.waitMs*TRAILER.capK;
      const tick = () => {
        if (done) return; look(); if (done) return;
        const now = clock(); if (now - last > TRAILER.tickMs*TRAILER.lateK) late++; else left--; last = now;
        if (left <= 0 || now >= cap) return next(`tempo scaduto (${Math.round(now - t0)} ms, passi in ritardo ${late})`);
        this._w = setTimeout(tick, TRAILER.tickMs);
      };
      this._w = setTimeout(tick, TRAILER.tickMs);
    }
    start();
  }
  // il video è partito (o non c'è): partono le animazioni del titolo e il tempo dell'intro
  _begin(mode, run, { id = null, shiftMs = 0, fail = false } = {}){
    if (run !== this.run || !this.active || this.ready) return;
    this.video = fail ? null : id;
    this.el.style?.setProperty?.('--intro-shift', `${mode === 'full' && !fail ? shiftMs : 0}ms`);
    this.el.classList.remove('mode-full', 'mode-short');
    void this.el.offsetWidth;                                        // riparte l'animazione CSS
    this.el.classList.add(`mode-${mode}`);
    this.el.classList.toggle('no-video', !!fail);
    this.el.classList.toggle('is-trailer', id === 'trailer' && !fail);
    if (id === 'trailer' && !fail){
      this._still(TRAILER.still);
      // rete caduta a metà (il video resta fermo) o errore a metà (file tronco, decodifica) → immagine finale, titolo e
      // subito «Premi un tasto»
      const v = this._trailer, stall = () => { clearTimeout(this._s); this._s = setTimeout(() => { if (run === this.run && this.active && !this.ready && !v.ended){ this._note('trailer fermo a metà', videoState(v)); this._dropTrailer(); this._still(INTRO_STILL); this._fail(run); this.finishAnimation(); } }, TRAILER.stallMs); };
      v?.addEventListener?.('waiting', stall);
      v?.addEventListener?.('playing', () => clearTimeout(this._s)); v?.addEventListener?.('ended', () => clearTimeout(this._s));
      v?.addEventListener?.('error', () => { if (run === this.run && this.active){ clearTimeout(this._s); this._note('trailer: errore a metà', videoState(v)); this._dropTrailer(); this._still(INTRO_STILL); this._fail(run); this.finishAnimation(); } });
    }
    clearTimeout(this._t); this._t = setTimeout(() => this.finishAnimation(), introDuration(mode, fail ? 0 : shiftMs));
  }
  // video di prima non partito dopo l'avvio delle animazioni (riproduzione rifiutata): resta l'immagine finale
  _fail(run){ if (run === this.run && this.el){ this._note('immagine finale (nessun video)'); this.el.classList.add('no-video'); this.el.classList.remove('is-trailer'); this.video = null; } }
  // Cronaca dell'intro: [ms dall'inizio, cosa, dettagli]. Serve alle prove e, nel programma Windows, finisce nel registro
  // (natpf-desktop/src/main.mjs copia in programma.log le righe della console che cominciano con [natpf-intro]): se su
  // un PC parte ancora il video di prima, lì c'è scritto perché
  _note(what, info = null){
    const row = [Math.round(clock() - (this._t0 || 0)), what, info]; (this.trace ||= []).push(row);
    if (this.desktop) try { console.info(`[natpf-intro] ${row[0]} ms · ${what}${info ? ` · ${JSON.stringify(info)}` : ''}`); } catch {}
  }
  _still(src){ const img = this.el?.querySelector?.('.intro-still'); if (img && src && img.getAttribute?.('src') !== src) img.setAttribute?.('src', src); }
  // elemento video del trailer, creato solo quando serve (sopra il video di prima, sotto il velo)
  _trailerEl(src){
    const old = $('intro-video'); if (!old?.parentNode || typeof document.createElement !== 'function') return null;
    const v = document.createElement('video');
    v.className = 'intro-video intro-trailer'; v.id = 'intro-trailer';
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute?.('muted', ''); v.setAttribute?.('playsinline', ''); v.setAttribute?.('aria-hidden', 'true');
    v.src = src;
    old.parentNode.insertBefore?.(v, old.nextSibling ?? null);
    return (this._trailer = v);
  }
  _dropTrailer(){
    const v = this._trailer; if (!v) return; this._trailer = null; clearTimeout(this._s);
    try { v.pause?.(); v.removeAttribute?.('src'); v.load?.(); } catch {}
    v.remove?.();
  }
  // fine dell'animazione: resta «Premi un tasto per iniziare»
  finishAnimation(){
    if (!this.active || this.ready) return;
    clearTimeout(this._t); clearTimeout(this._w); this.ready = true;
    // saltata prima che un video partisse: niente video in attesa, titolo sull'immagine finale
    if (!this.el.classList.contains('mode-full') && !this.el.classList.contains('mode-short')){ this._dropTrailer(); this._still(INTRO_STILL); this.el.classList.add('mode-full', 'no-video'); this.video = null; }
    this.el.classList.add('is-ready');
    $('intro-start')?.focus({ preventScroll: true });
  }
  _input(e){
    if (!this.active) return;
    if (e.type === 'keydown'){ if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; e.preventDefault(); e.stopImmediatePropagation(); }
    if (!this.ready) return this.finishAnimation();
    this.start();
  }
  start(){
    this.active = false; window.removeEventListener('keydown', this._key, true);
    clearTimeout(this._w); clearTimeout(this._s);
    try { sessionStorage.setItem(INTRO_KEY, '1'); if (this.video) sessionStorage.setItem(INTRO_VIDEO_KEY, this.video); } catch {}
    this.el.classList.add('leaving');
    setTimeout(() => { this.el.classList.add('hidden'); this._dropTrailer(); }, 650);
    this.onDone?.({ skipped: false });
  }
}

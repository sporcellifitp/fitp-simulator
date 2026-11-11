// Sfondo sfocato del tutorial «Come si gioca» (B21, richiesta dell'utente dell'11/11/2026): dietro la scheda della
// modale dei gesti (natpf_tutorial.js) due clip di gioco già sfocate (public/media/tutorial-sfondo-1.mp4 e -2.mp4:
// 8 s l'una, 1280×720, senza audio, fatte con fotogrammi veri del gioco), una dopo l'altra, in ciclo, mute. Sono solo
// uno sfondo: i gesti li mostrano sempre l'animazione 3D e le foto dentro la scheda (regola del 28/10: niente video
// generati per mostrare i gesti). Sopra le clip un velo scuro (natpf-ui.css, .tut-bg-veil): la scheda ha il suo fondo
// pieno, testi e animazione non cambiano.
// Ripiego: se il video non parte (file mancante, riproduzione rifiutata, errore di decodifica) non si vede niente di
// nuovo: resta il velo sul campo, lo sfondo di prima. Con «riduci movimento» del sistema (prefers-reduced-motion) e con
// il risparmio dati del browser niente video. A modale chiusa i video sono fermi (pause): nessuna decodifica in partita.
// Nello stesso schermo (due modali, una per metà) NIENTE video (TUT_BG.half = false): misurato l'11/11 con
// tools/e2e/natpf-modale-gesti.mjs senza GPU, con un video per metà le due animazioni dei gesti scendono da 59,9 a 30,2
// fotogrammi al secondo; con una modale sola restano a 59,9 (docs/b21/video-e-scia.md). Lì resta lo sfondo di prima.
export const TUT_BG = Object.freeze({
  clips: Object.freeze(['./media/tutorial-sfondo-1.mp4', './media/tutorial-sfondo-2.mp4']),
  half: false,         // nelle due metà dello stesso schermo niente video (dimezzava i fotogrammi al secondo)
});

// si può mostrare il video di sfondo? half: modale di una metà dello stesso schermo
export function tutorialBgAllowed({ half = false, reducedMotion = false, saveData = false, clips = TUT_BG.clips.length, halfOk = TUT_BG.half } = {}){
  if (!clips || reducedMotion || saveData) return false;
  return !half || !!halfOk;
}
// clip dopo la numero i (in ciclo)
export const nextClip = (i, n = TUT_BG.clips.length) => (n > 0 ? ((i | 0) + 1) % n : 0);

const reduced = win => { try { return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; } };
const saving = win => { try { return !!win?.navigator?.connection?.saveData; } catch { return false; } };

export class TutorialBackdrop {
  // root: l'elemento della modale (.natpf-tutorial); lo sfondo è il suo primo figlio, sotto la scheda
  constructor(root, { half = false, doc = (typeof document !== 'undefined' ? document : null), win = (typeof window !== 'undefined' ? window : null), clips = TUT_BG.clips } = {}){
    this.root = root; this.half = half; this.doc = doc; this.win = win; this.clips = clips;
    this.box = null; this.videos = []; this.idx = -1; this.on = false; this.playing = false; this.run = 0;
  }
  get allowed(){ return !!this.root && !!this.doc?.createElement && tutorialBgAllowed({ half: this.half, reducedMotion: reduced(this.win), saveData: saving(this.win), clips: this.clips.length }); }
  _build(){
    if (this.box) return true;
    const d = this.doc, box = d.createElement('div');
    if (!box || typeof this.root.insertBefore !== 'function') return false;
    box.className = 'tut-bg'; box.setAttribute?.('aria-hidden', 'true');
    this.videos = this.clips.map((src, i) => {
      const v = d.createElement('video');
      v.className = 'tut-bg-video'; v.muted = true; v.playsInline = true; v.loop = false; v.preload = 'none'; v.disablePictureInPicture = true;
      v.setAttribute?.('muted', ''); v.setAttribute?.('playsinline', ''); v.setAttribute?.('tabindex', '-1');
      v.dataset && (v.dataset.clip = String(i)); v._src = src;
      // finita una clip parte l'altra; un errore spegne lo sfondo (resta quello di prima)
      v.addEventListener?.('ended', () => { if (this.on && this.idx === i) this._play(nextClip(i, this.videos.length)); });
      v.addEventListener?.('error', () => { if (this.on) this._fail(); });
      v.addEventListener?.('playing', () => { if (this.on && this.idx === i) this._shown(i); });
      box.appendChild?.(v);
      return v;
    });
    const veil = d.createElement('i'); veil.className = 'tut-bg-veil'; box.appendChild?.(veil);
    this.root.insertBefore(box, this.root.firstChild ?? null);
    this.box = box;
    return true;
  }
  // modale aperta: parte la clip dopo l'ultima vista (le due si alternano anche tra un'apertura e l'altra)
  start(){
    this.run++;
    if (!this.allowed || !this._build()){ this.stop(); return false; }
    this.on = true;
    this._play(nextClip(this.idx, this.videos.length));
    return true;
  }
  _play(i){
    const v = this.videos[i], run = this.run; if (!v || !this.on) return;
    this.idx = i;
    try {
      if (!v._set){ v._set = true; v.src = v._src; }
      try { v.currentTime = 0; } catch {}
      const p = v.play?.();
      if (p?.catch) p.catch(() => { if (run === this.run && this.on && this.idx === i) this._fail(); });
      else if (!p) this._fail();
    } catch { this._fail(); }
  }
  // la clip i si vede: l'altra sfuma, si ferma e si prepara (già scaricata quando tocca a lei)
  _shown(i){
    this.playing = true; this.root.classList?.add('has-bg');
    this.videos.forEach((v, k) => {
      v.classList?.toggle('on', k === i);
      if (k !== i){ try { v.pause?.(); if (!v._set){ v._set = true; v.preload = 'auto'; v.src = v._src; } } catch {} }
    });
  }
  _fail(){ this.stop(); this.failed = true; }
  // modale chiusa (o video non partito): video fermi, sfondo di prima
  stop(){
    this.run++; this.on = false; this.playing = false;
    this.root?.classList?.remove('has-bg');
    for (const v of this.videos){ try { v.pause?.(); } catch {} v.classList?.remove('on'); }
  }
}

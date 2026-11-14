// B44 · Servizio: un'animazione leggera al posto del riquadro di testo (docs/coda/B44-servizio-animato.md,
// docs/b44/servizio-animato.md). L'utente (13/11 notte): «Togli "Premi ↑ o W: lanci la palla", è orribile, magari metti una
// leggera animazione per indicare di salire su». Decisioni con le domande a scelta: al posto del riquadro «Alza il telefono:
// lanci la palla / Poi colpisci quando la palla è in alto» (e delle versioni per webcam e per tastiera) una PICCOLA ICONA DI
// TELEFONO CHE SALE CON LA PALLA SOPRA, in loop, accanto a chi batte, SENZA SCRITTE.
// L'icona (SVG nella pagina, animata con il CSS di natpf-servizio.css: niente file, niente oggetti 3D):
//   • in partita sta dentro la casella gialla «Al servizio» (B37.1) di chi batte, di lato (verso il centro della sua vista,
//     così non esce dallo schermo): la segue senza conti in più. Nello stesso schermo la casella c'è in tutte e due le metà;
//     l'icona solo in quella di chi batte. In prima persona la casella di chi gioca non c'è: l'icona in basso al centro;
//   • la stessa icona sta nella scheda «Servizio» del tutorial, nell'esercizio «Servizio» dell'Allenamento (in campo e nella
//     scheda «Guarda e ripeti») e nella guida «Come si gioca»: il tutorial e l'allenamento dicono la stessa cosa del gioco.
// Quando si vede lo decide natpf_serve_coach.js (serveCoachView: icon).
const SVG = '<svg class="sh-svg" viewBox="0 0 40 80" aria-hidden="true" focusable="false">'
  + '<g class="sh-ball"><circle cx="20" cy="38" r="6"/></g>'
  + '<g class="sh-phone"><rect class="sh-body" x="10" y="46" width="20" height="30" rx="5"/><rect class="sh-screen" x="13.5" y="50" width="13" height="19" rx="2"/><circle class="sh-dot" cx="20" cy="72.3" r="1.4"/></g>'
  + '</svg>';
// markup dell'icona; cls: classi in più (in-card: dentro una scheda, accanto al testo)
export const serveHintHtml = (cls = '') => `<i class="natpf-serve-hint${cls ? ` ${cls}` : ''}" aria-hidden="true">${SVG}</i>`;

// Da che parte della casella va l'icona: verso il centro della sua vista (x: il punto della casella in px dell'area; mid:
// il centro della vista). Funzione pura
export const hintSide = (x, mid) => (Number.isFinite(x) && Number.isFinite(mid) && x > mid ? 'left' : 'right');

export class NatpfServeHint {
  constructor(doc = typeof document !== 'undefined' ? document : null){
    this.doc = doc; this.on = null; this.fallback = null;
  }
  // l'icona dentro la casella (una sola volta per casella: quelle dello stesso schermo nascono dopo, natpf_split.js)
  _iconIn(tag){
    if (!tag) return null;
    let i = tag.querySelector?.(':scope > .natpf-serve-hint');
    if (!i && typeof tag.insertAdjacentHTML === 'function'){ tag.insertAdjacentHTML('beforeend', serveHintHtml('on-tag')); i = tag.querySelector?.(':scope > .natpf-serve-hint'); }
    return i || null;
  }
  _fallback(){
    if (this.fallback || !this.doc?.createElement || !this.doc.body) return this.fallback;
    const el = this.doc.createElement('div');
    el.id = 'natpf-serve-hint'; el.className = 'natpf-serve-hint-solo hidden';
    el.innerHTML = serveHintHtml();
    this.doc.body.appendChild(el);
    return (this.fallback = el);
  }
  // show: si vede? where: { split, server ('player' | 'opponent'), w (larghezza dell'area) }
  paint(show, { split = false, server = 'player', w = 0 } = {}){
    const d = this.doc; if (!d?.getElementById) return null;
    const main = d.getElementById('server-tag'), p1 = d.getElementById('server-tag-p1'), p2 = d.getElementById('server-tag-p2');
    const tags = [main, p1, p2].filter(Boolean);
    // casella di chi batte: nello stesso schermo quella della metà di chi batte
    const want = !show ? null : split ? (server === 'opponent' ? p2 : p1) : main;
    const visibleTag = want && !want.classList.contains('hidden') ? want : null;
    for (const t of tags){
      const on = t === visibleTag;
      if (on) this._iconIn(t);
      if (t.classList.contains('with-hint') !== on) t.classList.toggle('with-hint', on);
      if (on){
        const x = parseFloat(t.style?.left), mid = split ? (t === p2 ? w*0.75 : w*0.25) : w/2;
        const left = hintSide(x, mid) === 'left';
        if (t.classList.contains('hint-left') !== left) t.classList.toggle('hint-left', left);
      }
    }
    // in prima persona (casella di chi gioca nascosta) o senza casella: l'icona in basso al centro della vista
    const solo = !!show && !visibleTag && !split;
    const fb = solo ? this._fallback() : this.fallback;
    if (fb && fb.classList.contains('hidden') === solo) fb.classList.toggle('hidden', !solo);
    this.on = show ? (visibleTag ? (visibleTag.id || 'tag') : solo ? 'solo' : null) : null;
    return this.on;
  }
}

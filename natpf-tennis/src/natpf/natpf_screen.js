// Schermo (28/10): dove si disegna il gioco. Di solito tutta la finestra del browser; per un ledwall un'area con le sue
// proporzioni, perché il PC esce a 16:9 ma il ledwall no:
//   • «Ledwall 2×2» (cabinet quadrati) → area 1:1 al centro dello schermo del PC;
//   • «Ledwall 3×2» → area 3:2 al centro;
//   • ?area=x,y,larghezza,altezza nell'indirizzo → area esatta in pixel, per il processore LED che prende una zona
//     precisa dell'uscita del PC (di solito in alto a sinistra): vince sulla scelta del menu;
//   • ?schermo=intero|2x2|3x2 nell'indirizzo → come la scelta del menu, senza salvarla.
// Tutto il gioco (camera, interfaccia, menu) sta nell'area: il body diventa il riquadro dell'area (con transform, così
// anche gli elementi «position: fixed» restano dentro) e fuori resta nero. viewport() dà la misura da usare al posto di
// window.innerWidth/innerHeight (motore, HUD, minigiochi).
export const SCREEN_KEY = 'natpf-tennis.screen';
export const SCREENS = Object.freeze({
  full: { label: 'Schermo intero', ratio: null },
  '2x2': { label: 'Ledwall 2×2', ratio: 1 },
  '3x2': { label: 'Ledwall 3×2', ratio: 3/2 },
});
export const normalizeScreen = id => (Object.hasOwn(SCREENS, id) ? id : 'full');

// «x,y,w,h» in pixel interi (larghezza e altezza almeno 64): null se non è un'area valida
export function parseArea(text){
  const m = /^\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const [x, y, w, h] = m.slice(1).map(Number);
  return w >= 64 && h >= 64 ? { x, y, w, h } : null;
}
// Area in uso dentro una finestra winW × winH (pixel CSS, interi)
export function screenArea({ preset = 'full', area = null } = {}, winW = 1280, winH = 720){
  if (area){
    const x = Math.min(Math.max(0, area.x), winW - 64), y = Math.min(Math.max(0, area.y), winH - 64);
    return { x, y, w: Math.min(area.w, winW - x), h: Math.min(area.h, winH - y), full: false };
  }
  const ratio = SCREENS[normalizeScreen(preset)].ratio;
  if (!ratio) return { x: 0, y: 0, w: winW, h: winH, full: true };
  const w = Math.round(Math.min(winW, winH*ratio)), h = Math.round(w/ratio);
  return { x: Math.round((winW - w)/2), y: Math.round((winH - h)/2), w, h, full: false };
}
// scelta dall'indirizzo e dal browser: l'indirizzo vince (non si salva)
export function readScreen(search = '', saved = null){
  const q = new URLSearchParams(search);
  const area = parseArea(q.get('area'));
  const fromUrl = q.get('schermo');
  const preset = fromUrl != null ? normalizeScreen(fromUrl === 'intero' ? 'full' : fromUrl) : normalizeScreen(saved);
  return { preset, area, fromUrl: fromUrl != null || !!area };
}

let current = { preset: 'full', area: null };
const win = () => ({ w: globalThis.innerWidth || 1280, h: globalThis.innerHeight || 720 });
// misura dell'area in cui si disegna (finestra intera o area del ledwall)
export function viewport(){ const { w, h } = win(); return screenArea(current, w, h); }

export class NatpfScreen {
  constructor(engine){
    this.engine = engine;
    let saved = null; try { saved = localStorage.getItem(SCREEN_KEY); } catch {}
    const s = readScreen(globalThis.location?.search || '', saved);
    this.fromUrl = s.fromUrl;
    current = { preset: s.preset, area: s.area };
    globalThis.addEventListener?.('resize', () => this.apply());
    this.apply();
  }
  get preset(){ return current.preset; }
  get area(){ return current.area; }
  // scelta del menu (Opzioni → Schermo): si salva; un'area dall'indirizzo resta finché non si sceglie altro
  set(preset){
    current = { preset: normalizeScreen(preset), area: null };
    try { localStorage.setItem(SCREEN_KEY, current.preset); } catch {}
    this.apply();
  }
  apply(){
    const doc = globalThis.document?.documentElement, a = viewport();
    if (doc){
      doc.classList.toggle('natpf-area', !a.full);
      for (const [k, v] of Object.entries({ x: a.x, y: a.y, w: a.w, h: a.h })) doc.style?.setProperty?.(`--area-${k}`, `${v}px`);
      doc.dataset.screen = current.area ? 'area' : current.preset;
    }
    this.engine?._onResize?.();
  }
}

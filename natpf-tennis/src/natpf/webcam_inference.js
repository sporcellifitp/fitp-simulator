// Modelli della webcam fuori dal thread del gioco: una sola immagine in volo e scadenza dei lavori bloccati.
export const workerVisionAvailable = () => typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function';
export class WorkerVision {
  constructor({ kind, base, workerFactory = () => new Worker(new URL('./webcam_inference_worker.js', import.meta.url)), bitmap = (...args) => createImageBitmap(...args), timeoutMs = 3000 } = {}) {
    this.kind = kind; this.base = base; this.options = {}; this.pending = new Map(); this.seq = 0;
    this.bitmap = bitmap; this.timeoutMs = timeoutMs; this.inWorker = true; this.closed = false; this.busy = false;
    this.worker = workerFactory();
    this.worker.onmessage = ({ data: d }) => {
      const p = this.pending.get(d.id); if (!p) return;
      this.pending.delete(d.id); clearTimeout(p.timer);
      if (d.error) p.reject(new Error(d.error));
      else { this.lastInferMs = d.inferMs ?? this.lastInferMs; p.resolve(d); }
    };
    this.worker.onerror = event => { event.preventDefault?.(); this.close(new Error(event.message || 'Webcam worker non disponibile')); };
  }
  setOptions(options){ this.options = { ...this.options, ...options }; this.optionsChanged = true; }
  onResults(fn){ this.callback = fn; }
  async initialize(){
    await this.request('init', { kind: this.kind, base: this.base, options: this.options }, [], 20000);
    this.optionsChanged = false;
  }
  request(type, values, transfer = [], timeout = this.timeoutMs){
    if (this.closed) return Promise.reject(new Error('Webcam worker chiuso'));
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.close(new Error('Tempo limite del modello webcam')), timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.worker.postMessage({ type, id, ...values }, transfer); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  async send({ image }){
    if (this.busy || this.closed) throw new Error('Webcam worker occupato o chiuso');
    this.busy = true; let frame;
    try {
      const width = image.videoWidth || image.width || 640, height = image.videoHeight || image.height || 480;
      const scale = Math.min(1, 640/width);
      frame = await this.bitmap(image, { resizeWidth: Math.max(1, Math.round(width*scale)), resizeHeight: Math.max(1, Math.round(height*scale)), resizeQuality: 'low' });
      if (this.closed) return;
      const options = this.optionsChanged ? this.options : null; this.optionsChanged = false;
      const r = await this.request('frame', { image: frame, options }, [frame]);
      if (!this.closed) this.callback?.(r.result);
    } finally { frame?.close(); this.busy = false; }
  }
  close(error = new Error('Webcam spenta')){
    if (this.closed) return;
    this.closed = true; this.worker.terminate();
    for (const p of this.pending.values()){ clearTimeout(p.timer); p.reject(error); }
    this.pending.clear();
  }
}

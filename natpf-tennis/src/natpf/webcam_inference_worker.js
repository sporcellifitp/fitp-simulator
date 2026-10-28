// Worker classico: caricatore WASM e canvas separati per ciascun modello.
let model = null, result = null, outputImage = null;
self.onmessage = async ({ data: d }) => {
  try {
    if (d.type === 'init') {
      if (!['Hands', 'Pose'].includes(d.kind)) throw new Error('Modello non valido');
      importScripts(d.base + d.kind.toLowerCase() + '.js');
      model = new self[d.kind]({ locateFile: f => d.base + f });
      model.setOptions(d.options);
      model.onResults(r => {
        outputImage = r.image;
        result = d.kind === 'Hands'
          ? { multiHandLandmarks: r.multiHandLandmarks, multiHandedness: r.multiHandedness }
          : { poseLandmarks: r.poseLandmarks };
      });
      await model.initialize();
    } else if (d.type === 'frame') {
      if (!model) throw new Error('Modello non inizializzato');
      if (d.options) model.setOptions(d.options);
      result = null;
      const started = performance.now();
      await model.send({ image: d.image });
      self.postMessage({ id: d.id, result: result || {}, inferMs: performance.now() - started });
      return;
    } else throw new Error('Operazione non valida');
    self.postMessage({ id: d.id });
  } catch (error) {
    self.postMessage({ id: d.id, error: error.message || String(error) });
  } finally {
    d.image?.close();
    if (outputImage !== d.image) outputImage?.close?.();
    outputImage = null;
  }
};

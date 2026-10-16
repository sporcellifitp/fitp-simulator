// nella pagina del telefono: eventi devicemotion sintetici (fermo, colpo a campana)
window.__motion = {
  emit(rot, acc, tilt = 0){ const a = acc || { x: 0, y: 0, z: 0 }; window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: a, accelerationIncludingGravity: { x: a.x, y: a.y + 9.81*Math.sqrt(1 - Math.min(1, tilt*tilt)), z: a.z + 9.81*tilt }, interval: 10 })); },
  still(ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const t = performance.now(); this.emit([3*Math.sin(t), -3*Math.cos(t), 1]); if (t - t0 > ms){ clearInterval(id); r(); } }, 10); }); },
  swing({ axis = [0, 0, 1], peak = 1000, dur = 220, up = 0, tilt = 0 } = {}){
    return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => {
      const u = Math.min(1, (performance.now() - t0)/dur), m = peak*Math.sin(Math.PI*u)**2;
      this.emit(axis.map(v => v*m), { x: 8*Math.sin(Math.PI*u), y: up*6*Math.sin(Math.PI*u), z: 0 }, tilt);
      if (u >= 1){ clearInterval(id); r(); } }, 10); });
  },
};


// Fixed size wire packet. Raw sensor units: gyro deg/s, acceleration m/s², time ms.
export const SENSOR_BYTES = 52, SENSOR_HZ = 40;
const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
export function encodeSensor(sample, sequence){
  if (!Number.isFinite(sample?.t) || sample.t < 0 || !Number.isInteger(sequence)) return null;
  const fields = ['rot','acc','accG'];
  if (!fields.some(k => vector(sample[k])) || fields.some(k => sample[k] != null && (!vector(sample[k]) || sample[k].some(v=>Math.abs(v)>(k==='rot'?10000:2000))))) return null;
  const buffer = new ArrayBuffer(SENSOR_BYTES), d = new DataView(buffer);
  d.setUint8(0, 0x54); d.setUint8(1, 1); d.setUint8(2, fields.reduce((n,k,i) => n | (vector(sample[k]) ? 1 << i : 0), 0));
  d.setUint32(4, sequence >>> 0, true); d.setFloat64(8, sample.t, true);
  fields.forEach((k,i) => (sample[k] || [0,0,0]).forEach((v,j) => d.setFloat32(16+i*12+j*4,v,true)));
  return buffer;
}
export function decodeSensor(buffer){
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== SENSOR_BYTES) return null;
  const d = new DataView(buffer), flags = d.getUint8(2);
  if (d.getUint8(0)!==0x54 || d.getUint8(1)!==1 || !flags || flags>7) return null;
  const sample = {sequence:d.getUint32(4,true),t:d.getFloat64(8,true)};
  if (!Number.isFinite(sample.t) || sample.t < 0) return null;
  for (const [i,k] of ['rot','acc','accG'].entries()){
    const v = [0,1,2].map(j => d.getFloat32(16+i*12+j*4,true));
    if (!v.every(Number.isFinite) || v.some(n=>Math.abs(n)>(k==='rot'?10000:2000))) return null;
    sample[k] = flags & (1 << i) ? v : null;
  }
  return sample;
}

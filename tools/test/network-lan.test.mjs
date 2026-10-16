import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSensor, decodeSensor, SENSOR_BYTES } from '../../site/js/tennis/sensor-packet.js';
import { createRacketMotion } from '../../site/js/tennis/racket-motion.js';
const raw=(sequence,t,rot=[0,90,0])=>({sequence,t,rot,acc:[1,2,3],accG:[1,11.8,3]});
test('LAN sensor binary packet is 52 bytes and preserves timestamps, vectors and wraparound',()=>{
  const data=raw(0xffffffff,1897654.123),buffer=encodeSensor(data,data.sequence),decoded=decodeSensor(buffer);
  assert.equal(buffer.byteLength,52);assert.equal(SENSOR_BYTES,52);assert.equal(decoded.sequence,0xffffffff);assert.equal(decoded.t,data.t);assert.deepEqual(decoded.rot,data.rot);assert.deepEqual(decoded.acc,data.acc);
  assert.equal(decodeSensor(new ArrayBuffer(51)),null);assert.equal(encodeSensor({...data,rot:[NaN,0,0]},1),null);
  const corrupt=buffer.slice(0);new DataView(corrupt).setFloat32(16,Infinity,true);assert.equal(decodeSensor(corrupt),null);
});
test('LAN presentation drops stale/duplicate packets and counts loss across sequence wrap',()=>{
  const motion=createRacketMotion();assert.equal(motion.push(raw(0xfffffffe,0),10),true);assert.equal(motion.push(raw(0,50),60),true);
  assert.equal(motion.push(raw(0,50),61),false);assert.equal(motion.push(raw(0xffffffff,25),62),false);assert.equal(motion.push(raw(1,49),63),false);
  const shown=motion.sample(70);assert.equal(shown.received,2);assert.equal(shown.lost,1);assert.equal(shown.loss,1/3);
});
test('LAN motion averages four real gyro frames and holds bounded prediction after sensor loss',()=>{
  const motion=createRacketMotion();[0,0,0,400].forEach((w,i)=>motion.push(raw(i,i*25,[0,w,0]),i*25));
  assert.equal(motion.sample(100).angularVelocity[0],100);
  const before=motion.sample(160),stale=motion.sample(5000);assert.deepEqual(before.rotation,stale.rotation);assert.equal(stale.stale,true);assert.equal(stale.confidence,0);assert.deepEqual(stale.angularVelocity,[0,0,0]);
  assert.ok(Math.abs(Math.hypot(...stale.rotation)-1)<1e-10);motion.reset();assert.equal(motion.sample(5001),null);
});
test('LAN gyro integration ignores long gaps and quaternion remains finite',()=>{
  const motion=createRacketMotion();motion.push(raw(1,0),0);motion.push(raw(2,25),25);motion.push(raw(3,5000),5000);
  const sample=motion.sample(5025);assert.ok(sample.rotation.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...sample.rotation)-1)<1e-10);assert.ok(Math.abs(sample.rotation[1])<.1);
});
test('LAN quaternion maps alpha to renderer Z and compensates the calibrated gyro bias',()=>{
  const motion=createRacketMotion();motion.setBias([10,20,30]);motion.push(raw(1,0,[100,20,30]),0);motion.push(raw(2,25,[100,20,30]),25);
  const q=motion.sample(50).rotation;assert.equal(q[0],0);assert.equal(q[1],0);assert.ok(q[2]>0);
  motion.reset();motion.push(raw(1,100,[10,20,30]),100);motion.push(raw(2,125,[10,20,30]),125);assert.deepEqual(motion.sample(150).rotation,[0,0,0,1]);
  assert.equal(motion.setBias([NaN,0,0]),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalibration, PLAN, GESTURE_PLAN, CAL } from '../../site/js/tennis/calibration.js';

// Le prove rappresentano l'esito del rilevatore: la calibrazione deve conservarne le
// caratteristiche personali, non sostituirle con un tipo selezionato dall'interfaccia.
function setup(options = { gestural: true, range: 'compact' }){
  const handlers = {}, events = [];
  const det = { profile: {}, on(k, f){ (handlers[k] ||= []).push(f); }, setTraining(v){ this.training = v; }, setProfile(p){ this.profile = { noise: 3, bias: [0,0,0], gravity: [0,9.81,0], ...p }; }, setThresholds(p){ Object.assign(this.profile,p); }, still(){} };
  const emit = (k, e) => handlers[k]?.forEach(f => f(e));
  const cal = createCalibration(det); cal.on(e => events.push(e)); cal.start(options);
  emit('status', { s:'still-ok', gravity:[0,9.81,0] }); cal.skipGrip();
  let t = 1000;
  const shot = (dir, kind = 'drive', overrides = {}) => {
    const peak = kind === 'drop' ? 75 : kind === 'serve' ? 190 : dir > 0 ? 300 : 240;
    const features = { lift:kind === 'lob' ? .9 : kind === 'serve' ? .7 : 0, tilt:kind === 'drop' ? .7 : 0, twist:kind === 'slice' ? .8 : 0, speed:kind === 'drop' ? .25 : 1, duration:kind === 'drop' ? 420 : 230, travel:kind === 'drop' ? .3 : 1 };
    const sw = { dir, axis:kind === 'serve' ? [1,0,0] : [0,dir,0], peak, angle:kind === 'drop' ? 6 : 30, peakT:t, power:.7, dur:features.duration, lift:features.lift, features, ...overrides };
    cal.tick(t - 150); cal.tick(t - 150 + CAL.settle);   // mano ferma al centro prima del gesto
    emit('swing', sw); t += CAL.burst + 10; cal.tick(t); t += 200;
  };
  return {cal,det,events,shot};
}
function drives(run){ for (const dir of PLAN) run.shot(dir === 'L' ? 1 : -1); }
function allShots(run){ for (const g of GESTURE_PLAN) run.shot(g.want === 'R' ? -1 : g.want === 'L' ? 1 : 0, g.shot); }

test('personal gesture training learns every shot in both directions and accepts a vertical serve', () => {
  const run=setup(); drives(run);
  assert.equal(run.cal.state.step,'shots');
  assert.equal(run.events.filter(e => e.kind === 'step').at(-1).total,14);
  assert.equal(run.det.training,true);
  allShots(run);
  const {profile,result}=run.cal.state;
  assert.equal(result.pass,true); assert.equal(profile.version,3);
  assert.equal(profile.templates.length,14);
  assert.ok(profile.templates.filter(t=>t.shot==='drive').every(t=>t.features.speed===1 && t.features.travel===1));
  assert.deepEqual(profile.gravity,[0,9.81,0]); assert.equal(profile.refAngle,30);
  for (const shot of ['drive','slice','lob','drop']) assert.deepEqual([...new Set(profile.templates.filter(t=>t.shot===shot).map(t=>t.dir))].sort(),[-1,1]);
  assert.equal(profile.templates.filter(t=>t.shot==='serve' && t.dir===0).length,2);
  assert.ok(profile.minPeak<75,'la soglia del drive non deve eliminare la palla corta comoda');
  assert.deepEqual(result.gestureWarnings,[]);
  run.cal.tryFree();
  run.shot(0,'serve',{shot:'serve',aim:.3,confidence:.91});
  const free=run.events.at(-1); assert.equal(free.kind,'free'); assert.equal(free.ok,true); assert.equal(free.shot,'serve'); assert.equal(free.aim,.3); assert.equal(free.confidence,.91);
});

test('similar gestures produce an explanation, not an invented short shot or a blocked accessible profile', () => {
  const run=setup(); drives(run);
  for(const g of GESTURE_PLAN){
    const dir=g.want==='R'?-1:g.want==='L'?1:0;
    run.shot(dir,g.shot,g.shot==='drop'?{features:{lift:0,tilt:0,twist:0,speed:.25,duration:230,travel:.3}}:{});
  }
  assert.equal(run.cal.state.result.pass,true);
  assert.deepEqual(run.cal.state.result.gestureWarnings.filter(w=>w.shot==='drop').map(w=>w.reason),['similar','similar']);
});

test('wrong directions get three attempts and preserve partial training without requiring a larger movement', () => {
  const run=setup(); drives(run);
  for(let i=0;i<CAL.maxTries;i++)run.shot(-1,'slice');
  assert.equal(run.cal.state.idx,1);
  for(const g of GESTURE_PLAN.slice(1))run.shot(g.want==='R'?-1:g.want==='L'?1:0,g.shot);
  assert.equal(run.cal.state.result.pass,true);
  assert.ok(run.cal.state.result.gestureWarnings.some(w=>w.shot==='slice'&&w.dir===1&&w.reason==='missing'));
});

test('serving needs at least one measured example, while touch remains a complete alternative', () => {
  const run=setup(); drives(run);
  for(const g of GESTURE_PLAN.slice(0,6))run.shot(g.want==='R'?-1:1,g.shot);
  for(let i=0;i<6;i++)run.shot(0,'serve',{peak:8});
  assert.equal(run.cal.state.result.pass,false); assert.equal(run.cal.state.result.why,'servizio'); assert.equal(run.cal.confirm(),null);
  run.cal.useTouch(); assert.equal(run.cal.state.result.pass,true); run.cal.tryFree();run.cal.touch(-1,.5,'lob');
  assert.equal(run.events.at(-1).shot,'lob'); assert.equal(run.cal.confirm().input,'touch');
});

test('default six-swing calibration and inverted personal templates preserve their contracts', () => {
  const legacy=setup({range:'compact'}); drives(legacy);
  assert.equal(legacy.cal.state.step,'review'); assert.equal(legacy.cal.state.profile.version,2);
  const run=setup();drives(run);allShots(run);
  const before=run.cal.state.profile.templates.map(t=>({shot:t.shot,dir:t.dir}));
  run.cal.invert();
  assert.deepEqual(run.cal.state.profile.templates.map(t=>({shot:t.shot,dir:t.dir})),before.map(t=>({shot:t.shot,dir:-t.dir})));
});

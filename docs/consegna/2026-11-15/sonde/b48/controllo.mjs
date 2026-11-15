const ROOT = process.env.ROOT || process.cwd();
const { natural } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const NS = await import(`${ROOT}/src/natpf/natpf_skill.js`);
const { netPlayRules } = await import(`${ROOT}/src/natpf/natpf_net_play.js`);
const { movementRules } = await import(`${ROOT}/src/natpf/natpf_movement.js`);
const opts = { difficulty: 'casual', profile: 'bambino', points: 300, seeds: [1001, 1038, 1075, 1112], hot: false };
NS.serveTuning.casual = { base: .113, lateBase: .6 }; netPlayRules.off = true; movementRules.off = true;
const old = natural({ ...opts, serveModel: 'tardi' });
console.log(JSON.stringify({ puntoDiretto: old.puntoDiretto, puntiAlServizio: old.puntiAlServizio }));

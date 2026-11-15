// B48: i numeri del test «a Casual chi batte tardi con il telefono non perde il servizio» (natpf-b18-t2-servizio)
const ROOT = process.env.ROOT || process.cwd();
const { natural } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const NS = await import(`${ROOT}/src/natpf/natpf_skill.js`);
const { netPlayRules } = await import(`${ROOT}/src/natpf/natpf_net_play.js`);
const { movementRules } = await import(`${ROOT}/src/natpf/natpf_movement.js`);
const NO = await import(`${ROOT}/src/natpf/natpf_stroke_outcome.js`);
const opts = { difficulty: 'casual', profile: 'bambino', points: 300, seeds: [1001, 1038, 1075, 1112], hot: false };
const f = r => ({ puntoDiretto: r.puntoDiretto, puntiAlServizio: r.puntiAlServizio, q: r.q });
const late = natural({ ...opts, serveModel: 'tardi' }), taught = natural({ ...opts, serveModel: 'insegnato' });
NS.serveTuning.casual = { base: .113, lateBase: .6 }; netPlayRules.off = true; movementRules.off = true; if (NO.serveChoiceRules) NO.serveChoiceRules.off = true;
const old = natural({ ...opts, serveModel: 'tardi' });
console.log(process.env.TAG || '', JSON.stringify({ tardi: f(late), insegnato: f(taught), valoriDiPrima: f(old) }));

// difficoltà per livello e profilo: punti e game di chi gioca (8 semi dell'audit × 300 punti, battuta alternata)
//   ROOT=<natpf-tennis> node --import $ROOT/test/register.mjs diff.mjs [livelli] [profili]
const ROOT = process.env.ROOT;
const { run, metrics, SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const levels = (process.argv[2] || 'bambini,casual,evento,pro,leggenda').split(','), profiles = (process.argv[3] || 'medio,amatore,umano,tennista,preciso,bambino,impreciso').split(',');
for (const difficulty of levels) for (const profile of profiles){
  const m = metrics(run({ profile, difficulty, points: 300, seeds: SEEDS }));
  console.log(JSON.stringify({ difficulty, profile, puntiG: m.puntiG, err: m.puntiGErr, gameG: m.gameG }));
}

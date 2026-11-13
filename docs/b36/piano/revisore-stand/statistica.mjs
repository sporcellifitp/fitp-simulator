// Quanto si può decidere con una sessione vera: intervallo al 95% di una percentuale (binomiale, approssimazione
// normale) e errore standard della mediana (1,2533·σ/√n) per stimare l'errore del centro della mira.
const prop = (p, n) => 1.96 * Math.sqrt(p * (1 - p) / n) * 100;
const medSE = (s, n) => 1.2533 * s / Math.sqrt(n);
console.log('Percentuale di colpi giusti 65%: ± punti (95%) con n colpi voluti');
for (const n of [28, 56, 84, 100, 200]) console.log(`  n=${n}: ±${prop(0.65, n).toFixed(1)}`);
console.log('Percentuale 90% (fuori 0% / giusti alti): ± punti (95%)');
for (const n of [10, 14, 28]) console.log(`  n=${n}: ±${prop(0.9, n).toFixed(1)}`);
console.log('Errore standard della mediana del piatto (gradi) con rumore σ e n colpi normali');
for (const s of [5, 12, 16]) console.log(`  σ=${s}°: ` + [10, 20, 40, 100].map(n => `n=${n} ${medSE(s, n).toFixed(1)}°`).join(' · '));
console.log('Colpi normali per lato per avere ±1,5° (1 errore standard) sulla mediana:');
for (const s of [5, 12, 16]) console.log(`  σ=${s}°: ${Math.ceil((1.2533 * s / 1.5) ** 2)}`);
// Precision: 10 palle per partita; per distinguere due medie di punteggio servono più partite
console.log('Serie di 14 colpi uguali, soglia 13/14: probabilità di passare se la vera quota è p');
const binomGE = (n, k, p) => { let s = 0; const C = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; }; for (let j = k; j <= n; j++) s += C(n, j) * p ** j * (1 - p) ** (n - j); return s; };
for (const p of [0.85, 0.9, 0.93, 0.95]) console.log(`  p=${p}: P(≥13/14)=${(100 * binomGE(14, 13, p)).toFixed(0)}%`);

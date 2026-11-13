// La regola di Leggenda per chi gioca fino al B18.2 passo 3 (natpf_stroke_outcome.ASSIST.leggenda di prima: failQ .63,
// pressione degli scambi lunghi dal 10° colpo). Il gioco non la usa più (docs/b18/t2-3-leggenda-e-palla-corta.md): resta
// qui per le prove dei meccanismi che valgono solo con failQ sopra netQMin (colpo controllato a rete del B17.4, palla
// debole sulla palla corta raggiunta), che nessun livello di oggi accende. level.assist la sostituisce a quella del livello.
import { skillLevel } from '../src/natpf/natpf_skill.js';
export const ASSIST_LEGGENDA_B16 = Object.freeze({ xMax: 3.65, assistQ: .8, failQ: .63, pressureFrom: 10, pushOut: 1.1, attackQ: .82 });
export const legendaB16 = () => ({ ...skillLevel('leggenda'), assist: ASSIST_LEGGENDA_B16 });

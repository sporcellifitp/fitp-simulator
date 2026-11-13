// B32 · da caricare prima di un banco qualsiasi per misurare con il movimento di prima (velocità costante):
//   node --import ./test/register.mjs --import ./scripts/audit/senza-b32.mjs scripts/audit/legend.mjs
import { movementRules } from '../../src/natpf/natpf_movement.js';
movementRules.off = true;

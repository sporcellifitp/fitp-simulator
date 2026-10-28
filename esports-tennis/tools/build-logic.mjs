// Genera server/logic.js (il file delle regole della stanza online) unendo public/js/rules.js,
// senza "export" (il server accetta solo le sei funzioni del contratto), e server/logic-game.js.
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('..', import.meta.url);
const rules = readFileSync(new URL('public/js/rules.js', here), 'utf8').replace(/^export (const|function) /gm, '$1 ');
const game = readFileSync(new URL('server/logic-game.js', here), 'utf8');
writeFileSync(new URL('server/logic.js', here), `// File generato da tools/build-logic.mjs: non modificarlo a mano.\n\n${rules}\n${game}`);
console.log('server/logic.js aggiornato');

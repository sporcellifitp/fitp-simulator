// B72 (richiesta dell'utente del 19/11): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
// dei due campi in modalità doppio». Parte del telefono: selettore IT | EN sulla pagina (barra in alto, riga sotto la mano,
// riquadro del telefono bloccato con due tocchi), testi della pagina in inglese dal dizionario (site/js/tennis/lingua.js),
// lingua salvata sul telefono, messaggio { t: 'lang', l } al tocco e a ogni collegamento (k 1), lingua decisa dal gioco in
// cfg (lg). Il gioco: natpf-tennis/test/natpf-b72-lingua.test.mjs; nel browser tools/e2e/natpf-lingua.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as LG from '../../site/js/tennis/lingua.js';
import * as PS from '../../site/js/tennis/phone-screen.js';
import { standDenyText, slotLabel } from '../../site/js/tennis/stand-pairing.js';
import { netWhy } from '../../site/js/tennis/link.js';
import { lostText } from '../../site/js/tennis/link-life.js';
import { SHOT_NAMES } from '../../site/js/tennis/shot-options.js';
import { GESTURE_PLAN } from '../../site/js/tennis/calibration.js';
import { GRIP } from '../../site/js/tennis/grip-art.js';

const HTML = readFileSync(new URL('../../site/tennis/racchetta.html', import.meta.url), 'utf8');
const JS = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
const LINK = readFileSync(new URL('../../site/js/tennis/link.js', import.meta.url), 'utf8');
const EN = s => LG.phoneText(s, 'en');
// parole italiane che nella pagina in inglese non devono restare
const ITALIAN = /\b(il|la|del|della|di|che|telefono|Telefono|tocca|Tocca|gioco|partita|Partita|computer\.?\s+Se|sensori|calibrazione|colpo|Colpisci|palla|pronto|Pronto|Inquadra|inquadra|schermo|Riprova|Avanti|Indietro|Salta|Gioca|Rivincita|Scollega|Ricollega|Ricalibra|Mano|Destra|Sinistra|Opzioni|Lingua)\b/;
const translated = (s, ctx = s) => { const e = EN(s); assert.notEqual(e, s, `non tradotto: «${s}» (${ctx})`); assert.doesNotMatch(e, ITALIAN, `resta italiano in «${e}» (${ctx})`); };

test('B72 lingua salvata sul telefono: IT di base, EN se scelta, IT con un archivio che non c\'è o che si rompe', () => {
  const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const s = mem();
  assert.equal(LG.readLang(s), 'it');
  LG.writeLang('en', s); assert.equal(s.getItem(LG.LANG_KEY), 'en'); assert.equal(LG.readLang(s), 'en');
  LG.writeLang('fr', s); assert.equal(LG.readLang(s), 'it', 'valori strani: IT');
  const broken = { getItem(){ throw new Error('negato'); }, setItem(){ throw new Error('negato'); } };
  assert.equal(LG.readLang(broken), 'it'); assert.doesNotThrow(() => LG.writeLang('en', broken));
  assert.equal(LG.readLang(null), 'it');
  assert.equal(LG.LANG_KEY, 'natpf-simulator.lingua');
});

test('B72 messaggio della lingua: tocco { t: lang, l } e annuncio al collegamento con k 1', () => {
  assert.deepEqual(LG.langMsg('en'), { t: 'lang', l: 'en' });
  assert.deepEqual(LG.langMsg('it', { link: true }), { t: 'lang', l: 'it', k: 1 });
  assert.deepEqual(LG.langMsg('xx'), { t: 'lang', l: 'it' });
  // computer: il messaggio letto solo con 'it' o 'en' (le versioni di prima del computer non hanno il caso: lo ignorano)
  assert.match(LINK, /case 'lang': if \(d\.l === 'it' \|\| d\.l === 'en'\) emit\('lang', \{ lang: d\.l, link: d\.k === 1 \}\); break;/);
});

test('B72 cfg dal gioco: la lingua del gioco vale, ma per 3 s dopo un tocco non annulla il tocco non ancora confermato', () => {
  assert.deepEqual(LG.langOnCfg('en', { current: 'it' }), { lang: 'en', pending: null });
  assert.deepEqual(LG.langOnCfg(undefined, { current: 'en' }), { lang: 'en', pending: null }, 'cfg di un computer di prima: niente');
  const pending = { lang: 'en', at: 1000 };
  assert.deepEqual(LG.langOnCfg('it', { current: 'en', pending, now: 1500 }), { lang: 'en', pending }, 'cfg partito prima del tocco: resta EN');
  assert.deepEqual(LG.langOnCfg('en', { current: 'en', pending, now: 1600 }), { lang: 'en', pending: null }, 'conferma del gioco');
  assert.deepEqual(LG.langOnCfg('it', { current: 'en', pending, now: 1000 + LG.LANG_ECHO_MS + 1 }), { lang: 'it', pending: null }, 'dopo 3 s vale il gioco (nuovo giocatore)');
});

test('B72 riquadro del telefono bloccato: due tocchi per cambiare lingua (come la mano), un tocco nella barra', () => {
  const a = LG.langTap(null, { want: 'en', current: 'it', now: 0 });
  assert.equal(a.commit, null); assert.deepEqual(a.armed, { lang: 'en', until: LG.LANG_CONFIRM.ms });
  assert.equal(LG.langTap(a.armed, { want: 'en', current: 'it', now: 3000 }).commit, 'en');
  assert.equal(LG.langTap(a.armed, { want: 'en', current: 'it', now: LG.LANG_CONFIRM.ms + 1 }).commit, null, 'troppo tardi: si richiede');
  assert.deepEqual(LG.langTap(null, { want: 'it', current: 'it' }), { armed: null, commit: null }, 'la lingua già scelta: niente');
  assert.deepEqual(LG.langTap(null, { want: 'xx', current: 'it' }), { armed: null, commit: null });
  assert.equal(LG.langTap(null, { want: 'en', current: 'it', confirm: false }).commit, 'en', 'barra e riga sotto la mano: un tocco');
});

test('B72 pagina del telefono: selettore IT | EN nella barra in alto, sotto la mano e nel riquadro del telefono bloccato', () => {
  const bar = HTML.slice(HTML.indexOf('<div id="bar">'), HTML.indexOf('</div>', HTML.indexOf('<div id="bar">')));
  assert.match(bar, /<span id="langBar" class="lang-seg" role="radiogroup" aria-label="Lingua"><button type="button" data-lang="it"[^>]*>IT<\/button><button type="button" data-lang="en"[^>]*>EN<\/button><\/span>/);
  const lock = HTML.slice(HTML.indexOf('<div id="phoneTouchLock"'), HTML.indexOf('</div>', HTML.indexOf('<div id="phoneTouchLock"')));
  assert.match(lock, /<span id="langLock" class="lang-seg"[^>]*>.*data-lang="it".*data-lang="en"/);
  assert.ok(HTML.indexOf('<div id="langOptions"') > HTML.indexOf('<div id="profileOptions"') && HTML.indexOf('<div id="langOptions"') < HTML.indexOf('id="enable"'), 'riga della lingua sotto la mano, sopra «Attiva i sensori»');
  assert.match(HTML, /<div id="langOptions" class="hidden" role="radiogroup" aria-label="Lingua">\s*<span>Lingua<\/span><button type="button" data-lang="it"[^>]*>Italiano<\/button><button type="button" data-lang="en"[^>]*>English<\/button>/);
  // piccoli ma toccabili; nel riquadro bloccato in alto a destra, lontano dal pulsante dello staff
  assert.match(HTML, /\.lang-seg button\{min-width:42px;min-height:36px/); assert.match(HTML, /#langLock\{position:absolute;top:max\(16px,env\(safe-area-inset-top\)\);right:16px\}/);
  assert.match(HTML, /#langLock button\{min-height:44px/);
});

test('B72 racchetta.js: tocco → testi subito nella lingua e messaggio al gioco; annuncio a ogni collegamento; cfg lg dal gioco; due tocchi nel riquadro bloccato', () => {
  assert.match(JS, /import \{ readLang, writeLang, phoneText, translateDom, langTap, langOnCfg, langMsg, isLang, LANG_CONFIRM \} from '\.\/lingua\.js';/);
  assert.match(JS, /let lang = readLang\(\), langPending = null, langDirty = false, langArm = null, langArmT = null;/);
  const set = JS.slice(JS.indexOf('function setLang('), JS.indexOf('function applyLang('));
  assert.match(set, /if \(linkState === 'on' && conn\?\.open\) send\(langMsg\(next\)\); else langDirty = true;/, 'il tocco va al gioco (o al prossimo collegamento)');
  assert.match(set, /lang = next; writeLang\(lang\);\n  applyLang\(\);/, 'salvata sul telefono e applicata subito');
  const apply = JS.slice(JS.indexOf('function applyLang('), JS.indexOf('// un tocco nella barra'));
  assert.match(apply, /translateDom\(document\.body, lang/); assert.match(apply, /if \(lastUi\) ui\(\.\.\.lastUi\);/); assert.match(apply, /paint\(\); paintAlert\(\); paintVeil\(\);/);
  // annuncio con il racconto del dispositivo, una volta per collegamento
  assert.match(JS, /function sendLang\(\)\{ send\(langMsg\(lang, \{ link: !langDirty \}\)\); langDirty = false; \}/);
  assert.match(JS, /\.\.\.appVersion\(\) \}\); sendLang\(\); \};/);
  // cfg dal gioco
  assert.match(JS, /if \(isLang\(d\.lg\)\)\{ const r = langOnCfg\(d\.lg, \{ current: lang, pending: langPending, now: performance\.now\(\) \}\); langPending = r\.pending; if \(r\.lang !== lang\) setLang\(r\.lang, \{ from: 'game' \}\); \}/);
  // i testi scritti dal codice passano dalla traduzione
  assert.match(JS, /function ui\(big, sub, ring = '', arrow = ''\)\{ lastUi = \[big, sub, ring, arrow\]; \$\('#big'\)\.textContent = L\(big\); \$\('#sub'\)\.textContent = L\(sub\);/);
  assert.match(JS, /\$\('#barTxt'\)\.textContent = L\(txt\);/);
  assert.match(JS, /\$\('#alertTitle'\)\.textContent = L\(a\.t\); \$\('#alertText'\)\.textContent = L\(a\.p\);/);
  // riquadro bloccato: langTap con la conferma; barra e riga sotto la mano: un tocco
  const lockTap = JS.slice(JS.indexOf("$('#langLock')?.addEventListener('click'"), JS.indexOf('if (lang !== \'it\') applyLang();'));
  assert.match(lockTap, /langTap\(langArm, \{ want: b\.dataset\.lang, current: lang, now: performance\.now\(\) \}\)/); assert.match(lockTap, /if \(r\.commit\) setLang\(r\.commit\);/);
  assert.match(JS, /for \(const box of \['#langBar', '#langOptions'\]\) \$\(box\)\?\.addEventListener\('click'/);
  // il blocco dei tocchi lascia passare i pulsanti dentro il riquadro (la lingua è lì)
  assert.match(JS, /const blocked = !touchOverlay\.contains\(event\.target\)/);
});

test('B72 dizionario della pagina: i testi del telefono (schermate, avvisi, stand, tutorial, conto, esiti) in inglese', () => {
  // testi fissi dell'HTML (nodi di testo e etichette), quelli in italiano
  const texts = [...HTML.slice(HTML.indexOf('<body>')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<svg[\s\S]*?<\/svg>/g, '').matchAll(/>([^<>]+)</g)].map(m => m[1].trim()).filter(s => /\p{L}{2}/u.test(s));
  const skip = new Set(['NATPF', 'IT', 'EN', 'Italiano', 'English', 'Verticale · manico', 'Orizzontale · piatto', '65%']);
  for (const s of texts) if (!skip.has(s)) translated(s, 'HTML');
  for (const a of ['aria-label="([^"]+)"', 'placeholder="([^"]+)"']) for (const m of HTML.matchAll(new RegExp(a, 'g'))) if (!/piatto|Dove punta/.test(m[1])) translated(m[1], 'attributo');
  // scritte dell'anello scritte da racchetta.js (ui('…', '…')) e barra
  for (const m of JS.matchAll(/ui\('([^'$`]+)', '([^'$`]+)'/g)) for (const s of [m[1], m[2]]) translated(s, 'ui()');
  for (const s of ['Non collegato', 'Collegamento…', 'Collegato al computer', 'Connessione persa', 'Ricollegamento…', 'In pausa', 'Gioca!', 'Arma dopo l’apertura', 'Colpisci',
    'Scegli il colpo; schiacciata e servizio seguono la palla.', 'Gesto letto', 'Verso l’alto', 'Taglio verso il basso', 'Tocco corto', 'Movimento letto', 'Colpo dall’alto',
    'Preparazione', 'Colpo riconosciuto', 'Accompagnamento', 'Riconosciuto', 'Più deciso', 'Altro verso', 'Un colpetto un po’ più ampio.', 'Al servizio', 'Pausa', 'Pronto']) translated(s, 'racchetta.js');
  // phone-screen.js: schermate e messaggi del computer
  const gate = { v: 2, i: 1, n: 5, s: 3, m: 7, all: false, name: 'Presa' };
  const T = PS.tutorialTexts(gate);
  for (const s of [T.big, T.sub, T.where, T.hint, PS.tutorialTexts({ v: 1 }).sub]) translated(s, 'tutorial');
  for (const r of [{ me: true, other: false, name: 'Marco' }, { me: true, other: true }, { me: false, other: true, name: 'Marco' }, { me: false, other: false }, { me: false, other: true, name: '' }]){
    const v = PS.rematchView(r); for (const s of [v.label, v.big, v.sub]) translated(s, 'rivincita');
  }
  for (const n of [{ ready: true, label: 'Sono pronto' }, { ready: true, me: true, note: 'Aspetto Giulia e Marco' }]){ const v = PS.readyView(n); for (const s of [v.big, v.sub, v.label]) translated(s, 'pronto'); }
  assert.equal(EN('Aspetto Giulia e Marco'), 'Waiting for Giulia and Marco');
  for (const s of ['Avanti ›', 'Salta ›', 'Salta la calibrazione ›', 'Sono pronto', 'Pronto ✓']) translated(s, 'offerta del computer');
  for (const s of Object.values(PS.NAME_TEXT).filter(x => typeof x === 'string')) translated(s, 'nome');
  for (const s of ['Scrivi il tuo nome, oppure tocca «Salta».', 'Almeno 2 caratteri', 'Al massimo 14 caratteri', 'Solo lettere, numeri, spazio, punto e trattino', 'Scegli un altro nome', 'Scrivi il tuo nome']) translated(s, 'nome');
  for (const [slot, ls, sensor, phase] of [['p1', 'lost', 'ready', 'menu'], ['p2', 'on', 'off', 'menu'], ['p1', 'on', 'ready', 'over'], ['p1', 'on', 'ready', 'menu'], ['p2', 'on', 'ready', 'play']]){
    const v = PS.standView({ slot, linkState: ls, sensor, phase }); for (const s of [v.big, v.sub, v.bar, v.tag].filter(Boolean)) translated(s, 'stand');
  }
  const b = PS.batteryAlert({ level: .12 }); translated(b.t); translated(b.p);
  for (const w of ['expired', 'closed', 'refused', 'busy', 'insecure', 'other', 'replaced', 'unpaired', 'role', 'denied']) translated(standDenyText(w, 'p2'), `stand ${w}`);
  translated(slotLabel('p2')); translated(`${slotLabel('p1')} dello stand`); translated('Non sei più il Telefono 2');
  for (const d of [{ stop: 1, txt: 'Si scelgono le impostazioni sul computer.' }, { stop: 1, txt: 'Conto annullato · Marco: telefono scollegato' }, { stop: 1 }, { n: 3 }, { n: 0 }, { trial: 1, n: 2 }, { trial: 1, n: 0 }]){
    const f = PS.countFlash(d); for (const s of [f.big, f.sub].filter(Boolean)) translated(s, 'conto');
  }
  for (const d of [{ k: 'contact', label: 'perfetto' }, { k: 'contact', label: 'buono' }, { k: 'contact', label: 'anticipo' }, { k: 'contact', label: 'ritardo' }, { k: 'contact', shot: 'drop' }, { k: 'contact', shot: 'slice' },
    { k: 'contact', out: true, why: 'troppo presto' }, { k: 'contact', net: true, why: 'in ritardo · da troppo lontano' }, { k: 'contact', long: true, why: 'gesto troppo forte', shot: 'drop' }, { k: 'contact', wait: 1 },
    { k: 'miss', why: 'presto' }, { k: 'miss', why: 'tardi' }, { k: 'miss', why: 'portata' }, { k: 'miss', why: 'nessuno' }, { k: 'miss', why: 'lancio' }, { k: 'miss' },
    { k: 'point', mine: true, txt: 'Fuori' }, { k: 'point', mine: false, txt: 'Vincente' }, { k: 'point', mine: true, txt: 'Palla non presa' }]){
    const f = PS.eventFlash(d); for (const s of [f.big, f.sub].filter(Boolean)) translated(s, `esito ${JSON.stringify(d)}`);
  }
  for (const ls of ['on', 'lost']) for (const sensor of ['ready', 'cal', 'off']) for (const gate of [null, { v: 2 }]) translated(PS.veilText({ linkState: ls, sensor, gate }), 'velo');
  for (const s of [PS.TRIAL_TEXT.big, PS.TRIAL_TEXT.sub, ...Object.values(PS.HAND_LABEL), ...Object.values(PS.HAND_ASK)]) translated(s);
  // pause annunciate dal computer (natpf_phone_watch.otherPhoneNote, moviola)
  translated('Partita in pausa: aspetto il telefono di Giulia. Si riprende da soli.'); translated('Partita in pausa: aspetto il telefono dell’altro giocatore. Si riprende da soli.');
  translated('Moviola del punto: guarda il computer, si riprende da solo.');
  // collegamento: motivi e riprova (LAN e internet)
  for (const lan of [true, false]) for (const n of [{ signal: false }, { signal: true, ice: 'failed' }, { signal: true, ice: 'new' }]){ const w = netWhy(n, { lan }); translated(w, 'rete'); translated(lostText(w, true)); translated(lostText(w, false)); }
  translated(lostText(null, true)); translated(lostText(null, false));
  // calibrazione: colpi, consigli, presa
  for (const s of Object.values(SHOT_NAMES).filter(x => !['Slice', 'Lob', 'Smash'].includes(x))) translated(s, 'colpo');
  for (const g of GESTURE_PLAN) translated(`Gesto 4 di 9: ${g.hint}`, 'consiglio');
  for (const k of Object.keys(GRIP)) if (GRIP[k]?.short) translated(`${GRIP[k].short}. Guarda il computer.`, 'presa');
  translated('Ora: un colpo naturale verso sinistra, poi fermati. Gesto 1 di 2.'); translated('Hai mosso ←: rifallo →'); translated('Forza 64%');
  assert.equal(EN('Dritto ←'), 'Forehand ←'); assert.equal(EN('Rovescio →'), 'Backhand →');
});

test('B72 IT: la pagina in italiano resta com\'è (nessun testo cambia)', () => {
  for (const s of ['Collegato al computer', 'Fuori · Troppo presto', 'Aspetto Giulia e Marco', 'Telefono 2', null, '']) assert.equal(LG.phoneText(s, 'it'), s);
  assert.equal(LG.phoneText('NATPF', 'en'), 'NATPF', 'quello che non conosce resta');
  assert.equal(LG.phoneText('FUORI', 'en'), 'OUT', 'il maiuscolo resta');
});

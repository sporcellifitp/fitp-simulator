// B41.3 · revisione della B41 seconda parte, difetto 1, lato telefono (site/js/tennis/phone-screen.js, racchetta.js,
// link.js): il pulsante del telefono (#next) è uno solo e passa da «Sono pronto» a «Salta ›» degli scambi di prova; un
// doppio tocco arrivava al secondo. Ora il telefono rimanda con il tocco il numero dell'offerta (id, dai computer della
// B41.3), spegne il pulsante dopo il tocco finché non arriva l'offerta dopo (o per NEXT_REARM_MS, se il computer è di
// prima e non la rinnova), e il computer non accetta un tocco per un'offerta vecchia. Il lato del gioco (numeri delle
// offerte, «Salta ›» che non vale per il primo secondo, i tre casi del revisore) è in
// natpf-tennis/test/natpf-b41-3-tocchi.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextOnMsg, nextTap, NEXT_REARM_MS, readyView, phoneView } from '../../site/js/tennis/phone-screen.js';

test('offerta con il numero (computer della B41.3) e senza (computer di prima): come prima, più il numero', () => {
  assert.deepEqual(nextOnMsg({ t: 'nx', on: 1, lb: 'Salta ›', id: 42 }), { label: 'Salta ›', id: 42 });
  assert.deepEqual(nextOnMsg({ t: 'nx', on: 1, lb: 'Salta ›' }), { label: 'Salta ›' }, 'computer di prima');
  assert.deepEqual(nextOnMsg({ t: 'nx', on: 1, lb: 'Sono pronto', rd: 1, me: 0, id: 9 }), { label: 'Sono pronto', ready: true, me: false, note: '', id: 9 });
  assert.deepEqual(nextOnMsg({ t: 'nx', on: 1, lb: 'Avanti ›', id: '9' }), { label: 'Avanti ›' }, 'numero non valido: ignorato');
  assert.equal(nextOnMsg({ t: 'nx', on: 0, id: 3 }), null);
});

test('il tocco vale una volta per offerta: messaggio con il numero, pulsante spento fino all\'offerta dopo', () => {
  const offer = nextOnMsg({ t: 'nx', on: 1, lb: 'Sono pronto', rd: 1, me: 0, id: 17 });
  const r = nextTap(offer);
  assert.deepEqual(r.msg, { t: 'nx', y: 1, id: 17 });
  assert.equal(r.offer.sent, true);
  assert.equal(nextTap(r.offer), null, 'secondo tocco sulla stessa offerta: niente (il pulsante è spento)');
  assert.equal(readyView(r.offer).disabled, true, '«Sono pronto» spento appena toccato');
  assert.equal(readyView(offer).disabled, false);
  // computer di prima: il tocco senza numero, come prima
  assert.deepEqual(nextTap(nextOnMsg({ t: 'nx', on: 1, lb: 'Salta ›' })).msg, { t: 'nx', y: 1 });
  assert.equal(nextTap(null), null, 'niente offerta');
  assert.equal(nextTap(nextOnMsg({ t: 'nx', on: 1, lb: 'Pronto ✓', rd: 1, me: 1, id: 2 })), null, '«Pronto ✓»: già toccato');
  // l'offerta dopo («Salta ›» degli scambi di prova) arriva come un'offerta nuova: il pulsante si riaccende
  const next = nextOnMsg({ t: 'nx', on: 1, lb: 'Salta ›', id: 18 });
  assert.deepEqual(nextTap(next).msg, { t: 'nx', y: 1, id: 18 });
  // il pulsante resta in vista (spento) dove era
  assert.equal(phoneView({ linkState: 'on', sensor: 'ready', phase: 'menu', next: r.offer }).show['#next'], true);
  assert.ok(NEXT_REARM_MS >= 1500 && NEXT_REARM_MS <= 4000, String(NEXT_REARM_MS));
});

test('pagina del telefono: il tocco usa nextTap, spegne il pulsante e lo riaccende all\'offerta dopo (o dopo NEXT_REARM_MS); il collegamento del computer passa il numero', () => {
  const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  const click = js.slice(js.indexOf("$('#next').addEventListener('click'"), js.indexOf("$('#calSkip')"));
  assert.match(click, /nextTap\(nextOffer\)/);
  assert.match(click, /nextOffer = r\.offer; send\(r\.msg\)/);
  assert.match(click, /setTimeout\(\(\) => \{ if \(nextOffer === tapped\)\{ nextOffer = \{ \.\.\.tapped, sent: false \}; paint\(\); \} \}, NEXT_REARM_MS\)/, 'si riaccende da solo se il computer non risponde');
  assert.ok(!/send\(\{ t: 'nx', y: 1 \}\)/.test(js), 'nessun tocco senza il controllo di nextTap');
  assert.match(js, /case 'nx': nextOffer = nextOnMsg\(d\); clearTimeout\(nextRearmT\);/, 'offerta nuova: pulsante acceso');
  assert.match(js, /nb\.disabled = !!nextOffer && \(!!nextOffer\.sent \|\| \(big && !!nextOffer\.me\)\)/, 'spento appena toccato (anche «Salta ›» e «Avanti ›»)');
  const link = readFileSync(new URL('../../site/js/tennis/link.js', import.meta.url), 'utf8');
  assert.match(link, /case 'nx': if \(d\.y === 1\) emit\('next', \{ id: Number\.isInteger\(d\.id\) \? d\.id : null \}\);/);
});

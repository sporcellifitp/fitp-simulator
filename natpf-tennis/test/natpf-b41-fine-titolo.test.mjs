// B41.5 · fine partita con il nome della fiera («Visitatore 12»): il titolo della schermata finale resta su una riga.
// Con la modalità fiera chi gioca contro la CPU senza un nome si chiama «Visitatore N», e «Bella sfida, Visitatore 12!» a
// 16:9 (1280×720, 1920×1080, 1366×768, 1024×600) andava su due righe: la scheda (centrata, senza scorrere: natpf-hud.css,
// B35) tagliava la pillola in alto e i pulsanti in basso. Ora HudUI._fitEndTitle misura il titolo con la schermata in vista
// e, se su una riga non ci sta, --fit lo rimpicciolisce in proporzione (natpf_match_stats.titleFit). Misure vere nel
// browser: sonda della B41 seconda parte e tools/e2e/natpf-fiera-telefoni.mjs (fine partita a tre misure).
// node --import ./test/register.mjs --test test/natpf-b41-fine-titolo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { titleFit } from '../src/natpf/natpf_match_stats.js';

test('B41.5: titleFit, il titolo ci sta o di quanto rimpicciolirlo (con margine, mai sotto la metà)', () => {
  assert.equal(titleFit({ natural: 800, avail: 900 }), 1);
  assert.equal(titleFit({ natural: 900, avail: 900 }), 1);
  // «Bella sfida, Visitatore 10!» a 1280×720, misurato nel browser: 893 px su una riga, 838 px a disposizione
  const f = titleFit({ natural: 893, avail: 838 });
  assert.ok(f > 0.9 && f < 0.94, String(f));
  assert.ok(893 * f <= 838, 'su una riga');
  assert.equal(titleFit({ natural: 4000, avail: 1000 }), 0.5);
  // misure che mancano (pagina finta, schermata nascosta): niente da cambiare
  for (const m of [{}, { natural: NaN, avail: 100 }, { natural: 100, avail: 0 }, { natural: 100 }, { avail: 100 }]) assert.equal(titleFit(m), 1, JSON.stringify(m));
});

// pagina finta: il titolo largo `natural` su una riga, `avail` quando va a capo
class FakeStyle {
  constructor(){ this.props = {}; this.whiteSpace = ''; }
  setProperty(k, v){ this.props[k] = String(v); }
  removeProperty(k){ delete this.props[k]; }
  getPropertyValue(k){ return this.props[k] || ''; }
}
const classes = (...on) => { const s = new Set(on); return { contains: c => s.has(c), add: c => s.add(c), remove: c => s.delete(c), toggle: (c, v) => (v ?? !s.has(c)) ? s.add(c) : s.delete(c) }; };
const title = { style: new FakeStyle(), natural: 0, avail: 0, measured: 0,
  get clientWidth(){ return Math.min(this.natural, this.avail); },
  get scrollWidth(){ this.measured++; return this.style.whiteSpace === 'nowrap' ? this.natural : Math.min(this.natural, this.avail); } };
const had = { document: globalThis.document, window: globalThis.window };
globalThis.document = { getElementById: id => (id === 'victory-result-banner' ? title : null), querySelector: () => null, querySelectorAll: () => [] };
globalThis.window ??= globalThis;
const { HudUI } = await import('../src/hud_ui.js');
test.after(() => { globalThis.document = had.document; if (had.window === undefined) delete globalThis.window; });

function hud(...cls){ const h = Object.create(HudUI.prototype); h.elVictoryModal = { classList: classes(...cls), querySelector: () => null }; return h; }

test('B41.5: _fitEndTitle, il titolo lungo della fiera rimpicciolito; quello che ci sta resta com\'è', () => {
  Object.assign(title, { natural: 893, avail: 838, measured: 0 }); title.style = new FakeStyle();
  const h = hud('has-stats');
  h._fitEndTitle();
  const fit = +title.style.getPropertyValue('--fit');
  assert.ok(fit > 0.9 && fit < 0.94, `--fit ${fit}`);
  assert.equal(title.style.whiteSpace, '', 'a capo come prima dopo la misura');
  // partita dopo con un nome corto: --fit tolto
  Object.assign(title, { natural: 700 });
  h._fitEndTitle();
  assert.equal(title.style.getPropertyValue('--fit'), '');
  // schermata di prima (senza i numeri) o nascosta: niente misure
  Object.assign(title, { natural: 2000, measured: 0 });
  hud()._fitEndTitle(); hud('has-stats', 'hidden')._fitEndTitle();
  assert.equal(title.style.getPropertyValue('--fit'), '');
  assert.equal(title.measured, 0);
});

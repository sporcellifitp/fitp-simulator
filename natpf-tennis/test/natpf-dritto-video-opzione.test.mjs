// Opzione «Dritto come nel video (prova)» nel menu Opzioni (B23, natpf_lobby.setForehandVideo): salvata, applicata
// subito, avviso a schermo, pulsanti nella pagina. Mondo di prova con l'interfaccia vera (ui-world.mjs): file a sé.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { FV_KEY, readForehandVideo, forehandVideoEnabled } from '../src/natpf/natpf_forehand_video.js';

test('Opzioni → «Dritto come nel video (prova)»: di base Sì; No lo spegne subito e lo salva, Sì lo riaccende', async () => {
  const w = await makeWorld({ controller: 'mouse' }), L = w.lobby;
  assert.equal(localStorage.getItem(FV_KEY), null); assert.equal(readForehandVideo(), true, 'di base acceso');
  assert.equal(forehandVideoEnabled(), true);
  L.setForehandVideo(false);
  assert.equal(localStorage.getItem(FV_KEY), '0'); assert.equal(forehandVideoEnabled(), false, 'vale subito, senza ricaricare');
  assert.match($('natpf-toast').textContent, /spento.*quello di prima/);
  L.setForehandVideo(true);
  assert.equal(localStorage.getItem(FV_KEY), '1'); assert.equal(forehandVideoEnabled(), true);
  assert.match($('natpf-toast').textContent, /Dritto come nel video \(prova\) acceso/);
  // il clic sul pulsante della pagina passa da qui
  const click = v => { const ev = { target: { closest: sel => (sel === '[data-natpf-dritto]' ? { dataset: { natpfDritto: v } } : null) }, stopPropagation(){} }; for (const l of $('title-modal').ls.click || []) l.fn(ev); };
  click('0'); assert.equal(localStorage.getItem(FV_KEY), '0'); assert.equal(forehandVideoEnabled(), false);
  click('1'); assert.equal(localStorage.getItem(FV_KEY), '1'); assert.equal(forehandVideoEnabled(), true);
  // la scelta salvata vale al prossimo avvio; il parametro nell'indirizzo vale di più e non la cambia
  localStorage.setItem(FV_KEY, '0');
  assert.equal(readForehandVideo(), false);
  assert.equal(readForehandVideo({ search: '?dritto=video' }), true); assert.equal(localStorage.getItem(FV_KEY), '0');
});

test('la voce è nella pagina, in italiano, con i due pulsanti Sì · No', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<span class="lobby-label">Dritto come nel video \(prova\)<\/span>/);
  const row = html.slice(html.indexOf('Dritto come nel video (prova)</span>'));
  assert.match(row.slice(0, 500), /data-natpf-dritto="1" role="radio">Sì<\/button\s*><button type="button" class="seg-btn" data-natpf-dritto="0" role="radio">No<\/button>/);
});

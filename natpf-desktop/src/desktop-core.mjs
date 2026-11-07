// Funzioni pure del programma Windows di NATPF Simulator (natpf-desktop/src/main.mjs): niente Electron qui, così si
// provano con node:test (natpf-desktop/test). Richiesta del 04/11/2026; dal 07/11 un solo installer che si aggiorna
// dal gioco (aggiornamenti.mjs).
import fs from 'node:fs';
import path from 'node:path';

export const DESKTOP = Object.freeze({
  port: 8443, caPort: 8081, setupPort: 8080,
  gamePath: '/?lan=1',
  ruleName: 'NATPF Simulator',
  settingsFile: 'desktop-app.json',
  // ponte con la pagina del gioco (src/preload.cjs, copiato in app/ da scripts/prepara.mjs): window.natpfDesktop
  preload: 'preload.cjs',
  ipcFullscreen: 'natpf:fullscreen',
  ipcFullscreenChanged: 'natpf:fullscreen-changed',
  // aggiornamenti dal gioco (aggiornamenti.mjs, window.natpfDesktop.updates; richiesta del 07/11/2026)
  ipcUpdates: 'natpf:updates',
  ipcUpdatesChanged: 'natpf:updates-changed',
  // disinstallazione scritta dall'installer accanto al programma: c'è solo nel programma installato
  uninstaller: 'Disinstalla NATPF Simulator.exe',
});
// azioni della pagina sugli aggiornamenti (window.natpfDesktop.updates)
export const UPDATE_ACTIONS = Object.freeze(['state', 'check', 'download', 'install']);

// Monitor del gioco: quello scelto l'ultima volta se c'è ancora; altrimenti il più grande non principale (agli eventi il
// ledwall è un monitor esteso), poi il principale. displays: screen.getAllDisplays() di Electron ({ id, bounds, ... })
export function chooseDisplay(displays = [], { savedId = null, primaryId = null } = {}){
  if (!displays.length) return null;
  const saved = savedId != null && displays.find(d => String(d.id) === String(savedId));
  if (saved) return saved;
  const area = d => (d.bounds?.width || 0)*(d.bounds?.height || 0);
  const others = displays.filter(d => d.id !== primaryId).sort((a, b) => area(b) - area(a));
  return others[0] || displays.find(d => d.id === primaryId) || displays[0];
}
// Monitor successivo (Ctrl+Maiusc+M); null se non ce n'è un altro (un solo monitor: niente da spostare)
export function nextDisplay(displays = [], currentId){
  if (!displays.length) return null;
  const i = displays.findIndex(d => d.id === currentId);
  const next = displays[(i + 1) % displays.length];
  return next.id === currentId ? null : next;
}
// Monitor voluto all'avvio: quello salvato anche se adesso manca (ledwall acceso dopo il programma: quando compare, il
// gioco ci va), altrimenti quello scelto da chooseDisplay. settings: desktop-app.json; chosen: il monitor di partenza
export function initialWanted(settings = {}, chosen = null){
  return settings?.displayId ?? chosen?.id ?? null;
}
export function displayLabel(d, i, primaryId){
  const b = d.bounds || {}, sf = d.scaleFactor && d.scaleFactor !== 1 ? ` · scala ${Math.round(d.scaleFactor*100)}%` : '';
  return `Monitor ${i + 1} · ${Math.round(b.width*(d.scaleFactor || 1))}×${Math.round(b.height*(d.scaleFactor || 1))}${d.id === primaryId ? ' (principale)' : ''}${sf}`;
}

// Finestra con bordi del gioco: rettangolo di partenza (la finestra nasce già a schermo intero e Windows sceglie il
// monitor che contiene la maggior parte di questo rettangolo) e misura a cui si torna uscendo dallo schermo intero.
// Al centro dell'area utile del monitor (senza la barra delle applicazioni), al massimo 1280×720 e al massimo il 90%
// del monitor: tutta dentro il monitor scelto anche con scale diverse tra i monitor. Coordinate intere (Electron).
export function windowedBounds(display, { width = 1280, height = 720, fill = 0.9 } = {}){
  const valid = r => r && [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0;
  const area = valid(display?.workArea) ? display.workArea : valid(display?.bounds) ? display.bounds : null;
  if (!area) return null;
  const w = Math.max(1, Math.min(width, Math.floor(area.width*fill))), h = Math.max(1, Math.min(height, Math.floor(area.height*fill)));
  return { x: Math.round(area.x) + Math.floor((area.width - w)/2), y: Math.round(area.y) + Math.floor((area.height - h)/2), width: w, height: h };
}
// Lo schermo intero copre ancora tutto il monitor? (cambio di risoluzione o di scala con il gioco aperto). Tolleranza
// di 2 px: arrotondamenti delle scale non intere e il pixel che Chromium toglie in basso quando un'altra finestra
// dello stesso monitor è attiva (non va «corretto»).
export function needsRefit(bounds, displayBounds, tolerance = 2){
  if (!bounds || !displayBounds) return false;
  return ['x', 'y', 'width', 'height'].some(k => Math.abs((bounds[k] ?? 0) - (displayBounds[k] ?? 0)) > tolerance);
}
// Come mettere a schermo intero il gioco su un monitor (placeOn in main.mjs, finestra già a schermo intero):
// 'fermo' è già lì e lo copre: niente da fare; 'rettangolo' stesso monitor che non copre più (risoluzione o scala
// cambiate): rettangolo del monitor restando a schermo intero (Windows lo riporta al monitor, Chromium
// OnWindowPosChanging); 'giro' altro monitor, o il rettangolo non è bastato: esce e rientra a finestra trasparente.
// Il giro usa setOpacity, che su Windows lascia la finestra «a strati» (WS_EX_LAYERED) per il resto della sessione:
// solo quando serve davvero
export function placeMode({ currentId = null, targetId = null, bounds = null, displayBounds = null, inPlaceTried = false } = {}){
  if (currentId == null || String(currentId) !== String(targetId)) return 'giro';
  if (!needsRefit(bounds, displayBounds)) return 'fermo';
  return inPlaceTried ? 'giro' : 'rettangolo';
}
// Monitor ricollegato (ledwall spento e riacceso, cavo staccato): si torna solo sul monitor voluto (quello salvato o
// scelto all'avvio), e solo se il gioco non c'è già
export function displayToFollow(added, { wantedId = null, currentId = null } = {}){
  if (!added || wantedId == null) return null;
  return String(added.id) === String(wantedId) && String(added.id) !== String(currentId) ? added : null;
}

// Scorciatoie del programma, lette prima della pagina (webContents 'before-input-event'): funzionano anche quando il
// gioco blocca i tasti (preventDefault nella schermata iniziale). Solo alla pressione, non alla ripetizione. Mai Esc
// (indietro nel gioco) né lettere senza Ctrl (F = schermo intero del gioco, gestito dalla pagina con natpfDesktop).
// Ctrl+Alt (AltGr sulle tastiere italiane) non è mai una scorciatoia. input: { type, key, control, shift, alt, meta }
export function shortcutFor(input){
  if (!input || input.type !== 'keyDown' || input.isAutoRepeat) return null;
  const key = String(input.key || ''), k = key.length === 1 ? key.toLowerCase() : key;
  const ctrl = !!input.control, shift = !!input.shift, alt = !!input.alt, meta = !!input.meta;
  if (key === 'F11') return ctrl || alt || meta ? null : 'schermo-intero';
  if (!ctrl || alt || meta) return null;
  if (shift && k === 'm') return 'monitor-successivo';
  if (shift && k === 'i') return 'strumenti';
  if (!shift && k === 'r') return 'ricarica';
  if (!shift && k === 'q') return 'esci';
  return null;
}
// Richiesta della pagina (window.natpfDesktop): stato voluto dello schermo intero, null se l'azione non esiste
export function fullscreenTarget(action, current){
  switch (action){
    case 'get': return !!current;
    case 'on': return true;
    case 'off': return false;
    case 'toggle': return !current;
    default: return null;
  }
}

// Indirizzi del gioco di cui il programma si fida (il proprio server): localhost e gli indirizzi del computer, porte del
// gioco e della pagina del certificato. Nessun altro sito passa dal controllo del certificato del programma.
export function isOwnUrl(url, addresses = [], { ports = [DESKTOP.port, DESKTOP.caPort] } = {}){
  let u; try { u = new URL(url); } catch { return false; }
  const hosts = new Set(['localhost', '127.0.0.1', '[::1]', ...addresses]);
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  return hosts.has(u.hostname) && ports.includes(port);
}
// stesso certificato (PEM) a meno di spazi e a capo
export const normalizePem = pem => String(pem || '').replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
export const samePem = (a, b) => !!normalizePem(a) && normalizePem(a) === normalizePem(b);

// Regola del firewall di Windows per il programma (tutti i protocolli, solo dalla rete locale): HTTPS del gioco, pagina
// del certificato, segnalazione e WebRTC dei telefoni passano tutti dallo stesso eseguibile. Comando per cmd.exe, da
// eseguire con i permessi di amministratore (l'installazione lo fa da sola; il portatile chiede il permesso).
// Prima toglie la regola con lo stesso nome e ogni regola legata a questo eseguibile: se qualcuno ha premuto «Annulla»
// sull'avviso del firewall di Windows, Windows ha creato regole di blocco, che vincono su quelle che consentono.
export function firewallCommand(exe, name = DESKTOP.ruleName){
  if (!exe || /["\r\n]/.test(exe)) throw new Error('percorso del programma non valido');
  const fw = 'netsh advfirewall firewall';
  return `${fw} delete rule name="${name}" & ${fw} delete rule name=all program="${exe}" & ${fw} add rule name="${name}" dir=in action=allow program="${exe}" enable=yes profile=any remoteip=localsubnet`;
}
// argomenti di PowerShell per chiedere il permesso (UAC) ed eseguire il comando
export function elevatedPowershellArgs(command){
  const ps = `Start-Process -FilePath cmd.exe -ArgumentList '/c ${command.replace(/'/g, "''")}' -Verb RunAs -Wait -WindowStyle Hidden`;
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps];
}
// la regola c'è già per questo eseguibile? (uscita di «netsh advfirewall firewall show rule name=… verbose»)
export function ruleCoversExe(netshOutput = '', exe = ''){
  const out = String(netshOutput).toLowerCase(), e = String(exe).toLowerCase();
  return !!e && out.includes(e) && /(enabled|abilitat)[^\n]*:\s*(yes|sì|si)/i.test(netshOutput);
}

// impostazioni del programma (monitor, schermo intero) in %LOCALAPPDATA%\NATPF
export function readSettings(dir){
  try { return JSON.parse(fs.readFileSync(path.join(dir, DESKTOP.settingsFile), 'utf8')) || {}; } catch { return {}; }
}
export function writeSettings(dir, settings){
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, DESKTOP.settingsFile), JSON.stringify(settings, null, 2)); return true; }
  catch { return false; }
}

// versione del gioco (site/js/tennis/version.js, «AAAA-MM-GG.n») → versione numerica di Windows «AAAA.MMGG.n»
export function windowsVersion(build){
  const m = /^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/.exec(String(build || ''));
  if (!m) throw new Error(`versione non riconosciuta: ${build}`);
  return `${Number(m[1])}.${Number(m[2] + m[3])}.${Number(m[4])}`;
}
export const readBuild = versionJs => /NATPF_BUILD\s*=\s*'([^']+)'/.exec(String(versionJs))?.[1] || null;

// Funzioni pure del programma Windows di NATPF Simulator (natpf-desktop/src/main.mjs): niente Electron qui, così si
// provano con node:test (natpf-desktop/test). Richiesta del 04/11/2026: eseguibile portatile e installabile.
import fs from 'node:fs';
import path from 'node:path';

export const DESKTOP = Object.freeze({
  port: 8443, caPort: 8081, setupPort: 8080,
  gamePath: '/?lan=1',
  ruleName: 'NATPF Simulator',
  settingsFile: 'desktop-app.json',
});

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
export function nextDisplay(displays = [], currentId){
  if (!displays.length) return null;
  const i = displays.findIndex(d => d.id === currentId);
  return displays[(i + 1) % displays.length];
}
export function displayLabel(d, i, primaryId){
  const b = d.bounds || {}, sf = d.scaleFactor && d.scaleFactor !== 1 ? ` · scala ${Math.round(d.scaleFactor*100)}%` : '';
  return `Monitor ${i + 1} · ${Math.round(b.width*(d.scaleFactor || 1))}×${Math.round(b.height*(d.scaleFactor || 1))}${d.id === primaryId ? ' (principale)' : ''}${sf}`;
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

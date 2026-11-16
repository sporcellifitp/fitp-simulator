// Funzioni pure del programma Windows di NATPF Simulator (natpf-desktop/src/main.mjs): niente Electron qui, così si
// provano con node:test (natpf-desktop/test). Richiesta del 04/11/2026; dal 07/11 un solo installer che si aggiorna
// dal gioco (aggiornamenti.mjs).
import fs from 'node:fs';
import path from 'node:path';

export const DESKTOP = Object.freeze({
  // B39 (stand con il solo mouse): la pagina dell'avvio guidato della LAN (tools/lan/launcher.mjs) nel programma non
  // serve (certificato e indirizzi li fa il programma): porta scelta dal sistema, solo su 127.0.0.1. Prima era la 8080
  // fissa e, se un altro programma la teneva, il gioco non partiva («EADDRINUSE» in inglese con il solo «OK»)
  port: 8443, caPort: 8081, setupPort: 0,
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
  // monitor del gioco dalla pagina (pannello dello stand, telecomando dello staff; B27, 12/11): window.natpfDesktop.displays
  ipcDisplays: 'natpf:displays',
  ipcDisplaysChanged: 'natpf:displays-changed',
  // coda del registro dello stand (B30, 12/11): window.natpfDesktop.registro, solo blocchi del registro (src/registro.mjs)
  ipcRegistro: 'natpf:registro',
  // pannello dello stand dalla tastiera del programma (B37, 13/11): F9 e la voce del menu lo aprono e lo chiudono nella
  // pagina del gioco (window.natpfDesktop.staffPanel.onToggle); sul PC dello stand Ctrl+Maiusc+K non arrivava al gioco
  ipcStaffPanel: 'natpf:staff-panel',
  // B39: comandi dello staff dal menu del tasto destro verso la pagina del gioco (solo quelli di PAGE_COMMANDS:
  // window.natpfDesktop.commands.onCommand) e avvisi del programma alla pagina (file salvato, link negato:
  // window.natpfDesktop.notices.onNotice). Tutti e due vanno solo alla finestra del gioco con una pagina del proprio server
  ipcCommand: 'natpf:command',
  ipcNotice: 'natpf:notice',
  // domanda all'avvio «Su quale schermo mostro il gioco?»: senza risposta entro questo tempo vale la proposta
  askDisplayMs: 30000,
  // B39: domanda del firewall all'avvio senza risposta entro questo tempo → «Più tardi» (prima il gioco restava fermo
  // su «Avvio del gioco…» finché qualcuno non rispondeva, e la domanda poteva stare su un altro schermo)
  firewallAskMs: 60000,
  // B39: pagina del gioco che non risponde: dopo hangDialogMs dall'evento 'unresponsive' la finestra «Il gioco non
  // risponde» (Ricarica · Aspetta · Chiudi il programma); senza risposta entro hangReloadMs il gioco si ricarica da solo
  hangDialogMs: 10000,
  hangReloadMs: 60000,
  // B39: file salvati dal gioco (classifica, coda del registro, diagnostica) senza «Salva con nome»: Download\NATPF
  downloadsFolder: 'NATPF',
  // disinstallazione scritta dall'installer accanto al programma: c'è solo nel programma installato
  uninstaller: 'Disinstalla NATPF Simulator.exe',
});
// azioni della pagina sugli aggiornamenti (window.natpfDesktop.updates)
// (B55, 16/11/2026: rollback = «Torna alla versione di prima» dalle Opzioni del gioco)
export const UPDATE_ACTIONS = Object.freeze(['state', 'check', 'download', 'install', 'rollback']);

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
  // (id confrontati come testo: quello salvato o arrivato dalla pagina può essere una stringa)
  const i = displays.findIndex(d => String(d.id) === String(currentId));
  const next = displays[(i + 1) % displays.length];
  return String(next.id) === String(currentId) ? null : next;
}
// Monitor voluto all'avvio: quello salvato anche se adesso manca (ledwall acceso dopo il programma: quando compare, il
// gioco ci va), altrimenti quello scelto da chooseDisplay. settings: desktop-app.json; chosen: il monitor di partenza
export function initialWanted(settings = {}, chosen = null){
  return settings?.displayId ?? chosen?.id ?? null;
}
// Misura in pixel veri (Electron dà i bounds in punti: con la scala di Windows al 125% un 1920×1080 è 1536×864)
export const displayPixels = d => ({ width: Math.round((d?.bounds?.width || 0)*(d?.scaleFactor || 1)), height: Math.round((d?.bounds?.height || 0)*(d?.scaleFactor || 1)) });
// Monitor quadrato (il ledwall 2×2 dello stand è 1024×1024): lati uguali entro il 2%
export const isSquare = d => { const { width: w, height: h } = displayPixels(d); return w > 0 && h > 0 && Math.abs(w - h) <= 0.02*Math.max(w, h); };
// Il monitor che probabilmente è il ledwall: un monitor quadrato (il più grande, meglio se non è il principale), altrimenti
// il più grande che non è il principale (lo schermo del portatile è il principale), altrimenti nessuno (null)
export function ledwallGuess(displays = [], primaryId = null){
  const area = d => { const p = displayPixels(d); return p.width*p.height; };
  const by = list => [...list].sort((a, b) => area(b) - area(a))[0] || null;
  const square = displays.filter(isSquare);
  return by(square.filter(d => d.id !== primaryId)) || by(square) || by(displays.filter(d => d.id !== primaryId));
}
// Le voci della scelta del monitor: nome, misura, «principale» e «probabile ledwall»
export function displayChoices(displays = [], primaryId = null){
  const led = displays.length > 1 ? ledwallGuess(displays, primaryId) : null;
  return displays.map((d, i) => {
    const px = displayPixels(d);
    return { id: d.id, index: i, ...px, primary: d.id === primaryId, ledwall: !!led && led.id === d.id,
      label: `${displayLabel(d, i, primaryId)}${led && led.id === d.id ? ' · probabile ledwall' : ''}` };
  });
}
// Domanda all'avvio (B27, richiesta dell'utente del 12/11: «a schermo intero la barra del menu non si vede»). Si chiede
// solo con almeno due monitor collegati e:
//   - nessun monitor mai scelto (niente displayId salvato), oppure
//   - quello salvato non c'è e nessun altro monitor ha la sua misura. Con un solo monitor collegato non si chiede: il
//     ledwall può accendersi dopo il programma e il gioco ci va da solo (initialWanted, displayToFollow). Con due monitor
//     e il salvato assente, invece, quasi sempre Windows ha dato un id nuovo allo stesso ledwall (altra porta o adattatore):
//     se un solo monitor non principale ha la misura salvata (settings.display) si usa quello senza chiedere (remap);
//     altrimenti si chiede, perché decidere da soli potrebbe mettere il gioco sullo schermo del portatile.
// → { ask, proposed (id), choices, why, remap (id, solo quando si usa la misura salvata) }
export function startupDisplayQuestion(displays = [], settings = {}, primaryId = null){
  const choices = displayChoices(displays, primaryId);
  const proposed = (ledwallGuess(displays, primaryId) || displays.find(d => d.id === primaryId) || displays[0])?.id ?? null;
  const saved = settings?.displayId;
  if (displays.length < 2) return { ask: false, proposed, choices, why: 'un solo monitor' };
  if (saved != null && displays.some(d => String(d.id) === String(saved))) return { ask: false, proposed: displays.find(d => String(d.id) === String(saved)).id, choices, why: 'monitor salvato presente' };
  if (saved != null && settings.display?.width){
    const same = displays.filter(d => d.id !== primaryId && displayPixels(d).width === settings.display.width && displayPixels(d).height === settings.display.height);
    if (same.length === 1) return { ask: false, proposed: same[0].id, remap: same[0].id, choices, why: 'stessa misura del monitor salvato (id nuovo)' };
  }
  return { ask: true, proposed, choices, why: saved == null ? 'nessun monitor scelto' : 'monitor salvato assente' };
}
// Dopo la domanda: quale monitor usare e se salvarlo. chosenId: il pulsante premuto (null se nessuno ha risposto entro
// il tempo). Un clic si salva sempre. Senza risposta: se non era mai stato scelto niente la proposta si salva (la
// domanda non torna: il programma può partire senza nessuno davanti); se invece c'è un monitor salvato che adesso
// manca (ledwall ancora spento, con il portatile e un altro monitor accesi) la proposta vale SOLO per questa sessione e
// la scelta salvata resta: quando il ledwall si accende il gioco ci va (initialWanted, displayToFollow). Prima la
// proposta la sovrascriveva e il gioco non seguiva più il ledwall (revisione del B27)
export function displayAnswer(question, chosenId = null, settings = {}){
  const use = chosenId ?? question?.proposed ?? null;
  if (use == null) return { use: null, save: false, how: 'niente' };
  if (chosenId != null) return { use, save: true, how: 'scelta' };
  const keep = settings?.displayId != null;
  return { use, save: !keep, how: keep ? 'proposta solo per questa sessione (resta il monitor salvato)' : 'proposta (nessuna risposta)' };
}
// Stato dei monitor per la pagina (window.natpfDesktop.displays): elenco, quello del gioco e quello voluto
export function displaysState(displays = [], { primaryId = null, currentId = null, wantedId = null } = {}){
  const list = displayChoices(displays, primaryId).map(c => ({ ...c, current: String(c.id) === String(currentId), wanted: String(c.id) === String(wantedId) }));
  return { list, current: list.find(c => c.current) || null, wanted: wantedId };
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
// B37: F9 da solo apre e chiude il pannello dello stand (anche a schermo intero, dove la barra del menu non c'è)
export function shortcutFor(input){
  if (!input || input.type !== 'keyDown' || input.isAutoRepeat) return null;
  const key = String(input.key || ''), k = key.length === 1 ? key.toLowerCase() : key;
  const ctrl = !!input.control, shift = !!input.shift, alt = !!input.alt, meta = !!input.meta;
  if (key === 'F11') return ctrl || alt || meta ? null : 'schermo-intero';
  if (key === 'F9') return ctrl || alt || meta || shift ? null : 'pannello-stand';
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
// Trailer dell'intro (B21): natpf-desktop/media/trailer-<primi 12 caratteri dello sha256>.mp4. Sta qui, fuori da
// natpf-tennis/public, perché nello zip Cloudflare non deve entrare (pesa 2,26 MB): prepara.mjs lo copia dentro il
// programma (app/natpf-tennis/dist/media/), dove il gioco lo cerca (natpf-tennis/src/natpf/natpf_intro.js, TRAILER.file);
// per il gioco sul web lo carica sul bucket R2 il workflow .github/workflows/natpf-windows.yml (media/)
export const TRAILER_RE = /^trailer-([0-9a-f]{12})\.mp4$/;
export function trailerFiles(dir){
  try { return fs.readdirSync(dir).filter(f => TRAILER_RE.test(f)).sort(); } catch { return []; }
}
// il nome porta l'impronta del contenuto: true se i primi 12 caratteri dello sha256 (esadecimale) sono quelli del nome
export const trailerNameMatches = (name, sha256) => TRAILER_RE.exec(String(name))?.[1] === String(sha256 || '').slice(0, 12).toLowerCase();
export const readBuild = versionJs => /NATPF_BUILD\s*=\s*'([^']+)'/.exec(String(versionJs))?.[1] || null;

// ---------------------------------------------------------------------------------------------------------------------
// B39 · Stand con il solo mouse (14/11/2026). Allo stand si vede solo il ledwall e il mouse è solo dello staff: niente
// icona nell'area di notifica (decisione dell'utente del 13-14/11). Il tasto destro nel programma apre al puntatore il menu
// di Windows con i comandi dello staff: si apre dove c'è il puntatore, quindi nella parte visibile del ledwall anche con
// un'area calibrata male. Un solo elenco di comandi (COMMANDS) per la barra del menu (Alt, in finestra), il menu del tasto
// destro e le scorciatoie (shortcutFor): main.mjs li esegue per id (ACTIONS).

// comandi che il programma manda alla pagina del gioco (window.natpfDesktop.commands.onCommand): elenco congelato, il
// preload consegna alla pagina solo questi. Il pannello dello stand passa dal canale del B37 (ipcStaffPanel, 'open')
export const PAGE_COMMANDS = Object.freeze(['diagnostica', 'calibra', 'azzera-calibrazione']);
// id → nome nel menu, scorciatoia (scritta accanto al nome; le esegue 'before-input-event') e comando della pagina
export const COMMANDS = Object.freeze({
  'pannello-stand': Object.freeze({ label: 'Pannello dello stand', accel: 'F9' }),
  diagnostica: Object.freeze({ label: 'Diagnostica', page: 'diagnostica' }),
  calibra: Object.freeze({ label: 'Calibra lo schermo…', page: 'calibra' }),
  'azzera-calibrazione': Object.freeze({ label: 'Azzera la calibrazione dello schermo', page: 'azzera-calibrazione' }),
  'schermo-intero': Object.freeze({ label: 'Schermo intero', accel: 'F11' }),
  monitor: Object.freeze({ label: 'Monitor' }),
  'monitor-successivo': Object.freeze({ label: 'Monitor successivo', accel: 'CmdOrCtrl+Shift+M' }),
  ricarica: Object.freeze({ label: 'Ricarica il gioco', accel: 'CmdOrCtrl+R' }),
  riavvia: Object.freeze({ label: 'Riavvia il programma' }),
  esci: Object.freeze({ label: 'Esci', accel: 'CmdOrCtrl+Q' }),
  'rete-apri': Object.freeze({ label: 'Apri la rete ai telefoni (firewall)…' }),
  'rete-indirizzi': Object.freeze({ label: 'Indirizzi e certificato per i telefoni…' }),
  aggiornamenti: Object.freeze({ label: 'Cerca aggiornamenti…' }),
  'cartella-salvati': Object.freeze({ label: 'Cartella dei file salvati (Download › NATPF)' }),
  'cartella-dati': Object.freeze({ label: 'Cartella dei dati (certificati, registri)' }),
  'scheda-grafica': Object.freeze({ label: 'Scheda grafica in uso…' }),
  strumenti: Object.freeze({ label: 'Strumenti per sviluppatori', accel: 'CmdOrCtrl+Shift+I' }),
});
export const SEPARATOR = Object.freeze({ type: 'separator' });
// voce di un comando: { cmd, label, accel?, arg?, type?, checked?, enabled? } (main.mjs la trasforma in una voce di Electron)
export function commandItem(cmd, extra = {}){
  const c = COMMANDS[cmd];
  if (!c) throw new Error(`comando sconosciuto: ${cmd}`);
  return { cmd, label: c.label, ...(c.accel ? { accel: c.accel } : {}), ...extra };
}
// monitor: uno per riga (quello del gioco spuntato), poi «Monitor successivo»
export function displayItems(displays = [], { currentId = null, primaryId = null } = {}){
  return [
    ...displays.map((d, i) => commandItem('monitor', { arg: d.id, type: 'radio', checked: String(d.id) === String(currentId), label: displayLabel(d, i, primaryId) })),
    SEPARATOR,
    commandItem('monitor-successivo', { enabled: displays.length > 1 }),
  ];
}
// Menu del tasto destro (B39, decisione dell'utente: menu di Windows al puntatore). gamePage: la pagina del gioco (con i
// comandi della pagina); false sulla pagina «Avvio del gioco…» (solo i comandi del programma). editable: tasto destro in un
// campo di testo (Taglia, Copia, Incolla in cima). «Riavvia» ed «Esci» chiedono conferma con un sottomenu, che si apre
// accanto al puntatore (una finestra di Windows al centro potrebbe cadere fuori dalla parte visibile del ledwall); «Esci»
// non tocca la scelta dello schermo intero
export function staffMenu({ gamePage = true, fullscreen = true, displays = [], currentId = null, primaryId = null, editable = false, version = '' } = {}){
  const out = [];
  if (editable) out.push({ role: 'cut', label: 'Taglia' }, { role: 'copy', label: 'Copia' }, { role: 'paste', label: 'Incolla' }, SEPARATOR);
  if (gamePage) out.push(commandItem('pannello-stand', { arg: 'open' }), commandItem('diagnostica'), SEPARATOR, commandItem('calibra'), commandItem('azzera-calibrazione'), SEPARATOR);
  out.push(commandItem('schermo-intero', { type: 'checkbox', checked: !!fullscreen }));
  out.push({ label: 'Schermo del gioco', submenu: displayItems(displays, { currentId, primaryId }) });
  out.push(SEPARATOR);
  if (gamePage) out.push(commandItem('ricarica'));
  out.push({ label: 'Rete per i telefoni', submenu: [commandItem('rete-apri'), commandItem('rete-indirizzi')] });
  out.push({ label: 'Programma', submenu: [commandItem('aggiornamenti'), commandItem('cartella-salvati'), commandItem('cartella-dati'), commandItem('scheda-grafica'), SEPARATOR, { label: `Versione ${version || '?'}`, enabled: false }] });
  out.push(SEPARATOR);
  out.push({ label: 'Riavvia il programma', submenu: [commandItem('riavvia', { label: 'Sì, riavvia adesso' })] });
  out.push({ label: 'Esci', submenu: [commandItem('esci', { label: 'Sì, chiudi NATPF Simulator' })] });
  return out;
}
// Barra del menu del programma (in finestra con Alt): le voci di sempre, dallo stesso elenco. «Esci» qui resta diretto
// (Ctrl+Q, chi usa la tastiera); la voce del pannello dice il tasto nel nome (B37: F9 lo esegue 'before-input-event')
export function appMenu({ displays = [], currentId = null, primaryId = null, version = '' } = {}){
  return [
    { label: 'NATPF', submenu: [commandItem('schermo-intero'), commandItem('ricarica'), commandItem('pannello-stand', { label: 'Pannello dello stand (F9)', accel: undefined, arg: 'toggle' }), commandItem('diagnostica'), SEPARATOR, commandItem('esci')] },
    { label: 'Schermo', submenu: [...displayItems(displays, { currentId, primaryId }), SEPARATOR, commandItem('calibra'), commandItem('azzera-calibrazione')] },
    { label: 'Rete', submenu: [commandItem('rete-apri'), commandItem('rete-indirizzi')] },
    { label: 'Aiuto', submenu: [commandItem('aggiornamenti'), commandItem('cartella-salvati'), commandItem('cartella-dati'), commandItem('scheda-grafica'), commandItem('strumenti'), { label: `Versione ${version || '?'}`, enabled: false }] },
  ];
}
// tutti i comandi di un menu (anche nei sottomenu), per le prove e per il controllo all'avvio
export function menuCommands(items = []){
  return items.flatMap(i => [...(i.cmd ? [i.cmd] : []), ...(Array.isArray(i.submenu) ? menuCommands(i.submenu) : [])]);
}
// Tasto destro: 'gioco' sulle pagine del proprio server, 'avvio' sulla pagina «Avvio del gioco…» che il programma stesso
// carica (data:, comandi del programma soltanto; nessun'altra pagina può arrivare nella finestra: will-navigate),
// altrimenti nessun menu
export function contextMenuMode(url, addresses = [], { loading = false } = {}){
  if (isOwnUrl(url, addresses, { ports: [DESKTOP.port] })) return 'gioco';
  if (loading && String(url || '').startsWith('data:')) return 'avvio';
  return null;
}
// La finestra del gioco va solo sulle pagine del proprio server (https, porta del gioco): niente file trascinati, link
// esterni o pagine di altri siti al posto del gioco (will-navigate)
export function navigationAllowed(url, addresses = []){
  let u; try { u = new URL(url); } catch { return false; }
  return u.protocol === 'https:' && isOwnUrl(url, addresses, { ports: [DESKTOP.port] });
}

// --- file salvati dal gioco senza «Salva con nome» (B39 n. 16) ---------------------------------------------------------
// Il gioco salva classifica (CSV), coda del registro (zip) e sessioni della diagnostica (zip) con un link «download» su un
// blob: della pagina. Nel programma si salvano subito in Download\NATPF (niente finestra di Windows sul ledwall, che con
// un'area calibrata può cadere fuori dalla parte visibile) e la pagina lo dice con un avviso. Il nome lo propone la pagina:
// qui diventa solo un nome di file (mai un percorso), senza caratteri vietati da Windows, e non sovrascrive niente.
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
export function safeFileName(name, fallback = 'file-natpf'){
  let n = String(name ?? '').split(/[\\/]/).pop();
  n = n.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/\s+/g, ' ').replace(/^[.\s]+|[.\s]+$/g, '');
  if (!n) n = fallback;
  const dot = n.lastIndexOf('.');
  let base = dot > 0 ? n.slice(0, dot) : n, ext = dot > 0 ? n.slice(dot) : '';
  if (!/^\.[a-z0-9]{1,8}$/i.test(ext)){ base = n; ext = ''; }
  if (RESERVED_NAMES.test(base)) base = `_${base}`;
  return base.slice(0, 120 - ext.length).replace(/[.\s]+$/, '') + ext;
}
// nome libero nella cartella: «nome (2).csv», «nome (3).csv»… (taken(nome) dice se c'è già)
export function uniqueName(name, taken = () => false){
  if (!taken(name)) return name;
  const dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 2; i < 1000; i++){ const n = `${base} (${i})${ext}`; if (!taken(n)) return n; }
  return `${base} (${Date.now()})${ext}`;
}
// percorso completo del file da salvare in dir (la cartella la sceglie il programma, mai la pagina)
export function downloadTarget(dir, suggested, taken = () => false){
  return path.join(dir, uniqueName(safeFileName(suggested), n => taken(path.join(dir, n))));
}
// download accettato solo dalla pagina del gioco: un blob: del proprio server o una pagina del proprio server
export function downloadAllowed(url, addresses = []){
  const u = String(url || '');
  if (u.startsWith('blob:')) return navigationAllowed(u.slice(5), addresses);
  return navigationAllowed(u, addresses);
}

// --- porta occupata all'avvio (B39 n. 5) --------------------------------------------------------------------------------
// numero della porta da un errore «EADDRINUSE» (Node: «listen EADDRINUSE: address already in use 0.0.0.0:8443»), null se
// non è una porta occupata
export function busyPort(message){
  const m = /EADDRINUSE\b[^\n]*?:(\d{2,5})\b/.exec(String(message || ''));
  return m ? Number(m[1]) : null;
}
// chi tiene la porta (Windows, «netstat -ano»): PID della riga TCP in ascolto su quella porta, null se non si trova.
// Funziona con le colonne in qualunque lingua (LISTENING, ABHÖREN, IN ASCOLTO): una porta in ascolto ha l'indirizzo
// remoto «0.0.0.0:0» o «[::]:0»
export function netstatListener(output, port){
  for (const line of String(output || '').split(/\r?\n/)){
    const c = line.trim().split(/\s+/);
    if (c.length < 4 || !/^TCP$/i.test(c[0])) continue;
    const pid = Number(c[c.length - 1]);
    if (!c[1].endsWith(`:${port}`) || !/:0$/.test(c[2]) || !Number.isInteger(pid) || pid <= 0) continue;
    return pid;
  }
  return null;
}
// nome del programma dalla riga di «tasklist /FI "PID eq N" /FO CSV /NH» («"node.exe","4321",…»), null se non c'è
export function tasklistImage(csv){
  const m = /^"([^"]+)","(\d+)"/m.exec(String(csv || ''));
  return m ? m[1] : null;
}
// Testo della finestra quando il gioco non parte. Porta occupata: quale porta, chi la tiene (se si sa), cosa fare; i
// pulsanti sono «Riprova» e «Chiudi il programma» (main.mjs). Altrimenti l'errore e dove sta il registro
export function startupProblem(message, { port = null, owner = null, logPath = '' } = {}){
  if (port){
    const who = owner?.name ? ` da «${owner.name}»${owner.pid ? ` (PID ${owner.pid})` : ''}` : owner?.pid ? ` dal programma con PID ${owner.pid}` : ' da un altro programma';
    const what = port === DESKTOP.port ? 'il gioco e i telefoni' : port === DESKTOP.caPort ? 'la pagina del certificato dei telefoni' : 'il gioco';
    return { busy: true, port, message: `La porta ${port} è già in uso${who}.`,
      detail: `NATPF Simulator usa la porta ${port} per ${what}. Chiudi l'altro programma (per esempio una finestra «AVVIA NATPF LAN» o un altro server) e clicca «Riprova». Se non sai quale programma è, riavvia il computer.` };
  }
  return { busy: false, port: null, message: 'Il gioco non è partito.', detail: `${String(message || 'errore sconosciuto').slice(0, 400)}\n\nRegistro: ${logPath}` };
}

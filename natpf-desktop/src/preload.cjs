// Ponte tra il gioco e il programma Windows di NATPF Simulator (natpf-desktop/src/main.mjs). Gira prima della pagina,
// isolato (contextIsolation) e nella sandbox di Chromium: qui solo require('electron'). La pagina vede soltanto
// window.natpfDesktop; il processo principale accetta le richieste solo dalle pagine del proprio server (isOwnUrl).
//   window.natpfDesktop = { shell: 'electron', version: 2,
//     isFullScreen(), setFullScreen(on), toggleFullScreen(), onFullScreenChange(cb),     (schermo intero, B8, 04/11)
//     updates: { state(), check(), download(), install(), onChange(cb) },             (aggiornamenti, 07/11)
//     displays: { list(), next(), choose(id), onChange(cb) },                         (monitor del gioco, B27, 12/11)
//     registro: { put(id, testo), list(), read(id), remove(id), state(), open() },    (registro dello stand, B30, 12/11)
//     staffPanel: { onToggle(cb) } }                                                   (pannello dello stand, B37, 13/11)
// Schermo intero: le prime tre rispondono con lo stato nuovo (Promise<boolean>). Nel programma il gioco non usa
// requestFullscreen di HTML: Electron consumerebbe il primo Esc per uscirne.
// Aggiornamenti (src/aggiornamenti.mjs): state/check/download → Promise<S>, install → Promise<{ ok, error? }>,
// onChange(cb) → funzione che toglie l'ascolto. S = { status: 'off'|'idle'|'checking'|'none'|'available'|'downloading'|
// 'ready'|'installing'|'error', current, latest?, notes?, size?, progress? (0..1), error?, checkedAt? }.
// download() risponde a download finito (pronto o errore); l'avanzamento arriva con onChange. install() solo con
// 'ready': il programma avvia l'installer (permesso di Windows) e si chiude; l'installer riapre il gioco.
// Monitor (B27): list/next/choose → Promise<{ list: [{ id, label, width, height, primary, ledwall, current, wanted }],
// current, wanted }>; next e choose salvano la scelta e rispondono a spostamento finito. onChange(cb) come sopra.
// Registro dello stand (B30, src/registro.mjs): la coda sul disco dei blocchi di righe di gioco non ancora inviati allo
// spazio Cloudflare dell'utente. put → Promise<{ ok, perche? }> (il processo principale accetta solo blocchi del
// registro), list → Promise<[{ id, byte, righe }]>, read → Promise<testo | null>, remove → Promise<{ ok }>,
// state → Promise<{ blocchi, byte, righe, scartati, cartella }>, open → apre la cartella in Esplora file.
// Pannello dello stand (B37): F9 o la voce del menu NATPF «Pannello dello stand (F9)» nel processo principale;
// onToggle(cb) chiama cb('toggle') (oppure 'open' / 'close') e risponde con la funzione che toglie l'ascolto.
// Nomi dei canali uguali a DESKTOP.ipc* in desktop-core.mjs (provato).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const FULLSCREEN = 'natpf:fullscreen';
const FULLSCREEN_CHANGED = 'natpf:fullscreen-changed';
const UPDATES = 'natpf:updates';
const UPDATES_CHANGED = 'natpf:updates-changed';
const DISPLAYS = 'natpf:displays';
const DISPLAYS_CHANGED = 'natpf:displays-changed';
const REGISTRO = 'natpf:registro';
const STAFF_PANEL = 'natpf:staff-panel';
const registro = (action, ...a) => ipcRenderer.invoke(REGISTRO, action, ...a).then(copy);
const ask = action => ipcRenderer.invoke(FULLSCREEN, action);
const copy = v => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
const update = action => ipcRenderer.invoke(UPDATES, action);

contextBridge.exposeInMainWorld('natpfDesktop', {
  shell: 'electron',
  version: 5,
  isFullScreen: () => ask('get'),
  setFullScreen: on => ask(on ? 'on' : 'off'),
  toggleFullScreen: () => ask('toggle'),
  // alla pagina solo lo stato (true/false), mai l'evento di Electron
  onFullScreenChange: cb => {
    if (typeof cb !== 'function') return;
    ipcRenderer.on(FULLSCREEN_CHANGED, (_event, on) => { try { cb(!!on); } catch (e) { console.error(e); } });
  },
  updates: {
    state: () => update('state'),
    check: () => update('check'),
    download: () => update('download'),
    install: () => update('install'),
    // alla pagina solo lo stato S (una copia), mai l'evento di Electron; risponde con la funzione che toglie l'ascolto
    onChange: cb => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, s) => { try { cb(s && typeof s === 'object' ? { ...s } : s); } catch (e) { console.error(e); } };
      ipcRenderer.on(UPDATES_CHANGED, listener);
      return () => { ipcRenderer.removeListener(UPDATES_CHANGED, listener); };
    },
  },
  displays: {
    list: () => ipcRenderer.invoke(DISPLAYS, 'list').then(copy),
    next: () => ipcRenderer.invoke(DISPLAYS, 'next').then(copy),
    choose: id => ipcRenderer.invoke(DISPLAYS, 'choose', id).then(copy),
    onChange: cb => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, s) => { try { cb(copy(s)); } catch (e) { console.error(e); } };
      ipcRenderer.on(DISPLAYS_CHANGED, listener);
      return () => { ipcRenderer.removeListener(DISPLAYS_CHANGED, listener); };
    },
  },
  registro: {
    // solo testi: l'identificativo del blocco e le sue righe (il processo principale li controlla di nuovo)
    put: (id, testo) => registro('put', String(id), String(testo)),
    list: () => registro('list'),
    read: id => registro('read', String(id)),
    remove: id => registro('remove', String(id)),
    state: () => registro('state'),
    open: () => registro('open'),
  },
  staffPanel: {
    // alla pagina solo 'toggle', 'open' o 'close', mai l'evento di Electron
    onToggle: cb => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, action) => { try { cb(action === 'open' || action === 'close' ? action : 'toggle'); } catch (e) { console.error(e); } };
      ipcRenderer.on(STAFF_PANEL, listener);
      return () => { ipcRenderer.removeListener(STAFF_PANEL, listener); };
    },
  },
});

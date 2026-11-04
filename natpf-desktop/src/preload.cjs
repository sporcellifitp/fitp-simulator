// Ponte tra il gioco e il programma Windows di NATPF Simulator (natpf-desktop/src/main.mjs), richiesta del 04/11/2026:
// schermo intero senza cornici. Gira prima della pagina, isolato (contextIsolation) e nella sandbox di Chromium: qui
// solo require('electron'). La pagina vede soltanto window.natpfDesktop; il processo principale accetta le richieste
// solo dalle pagine del proprio server (isOwnUrl) e salva la scelta.
//   window.natpfDesktop = { shell: 'electron', version: 1, isFullScreen(), setFullScreen(on), toggleFullScreen(),
//                           onFullScreenChange(cb) }   (le prime tre rispondono con lo stato nuovo: Promise<boolean>)
// Nel programma il gioco non usa requestFullscreen di HTML: Electron consumerebbe il primo Esc per uscirne.
// Nomi dei canali uguali a DESKTOP.ipcFullscreen e DESKTOP.ipcFullscreenChanged in desktop-core.mjs (provato).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const FULLSCREEN = 'natpf:fullscreen';
const FULLSCREEN_CHANGED = 'natpf:fullscreen-changed';
const ask = action => ipcRenderer.invoke(FULLSCREEN, action);

contextBridge.exposeInMainWorld('natpfDesktop', {
  shell: 'electron',
  version: 1,
  isFullScreen: () => ask('get'),
  setFullScreen: on => ask(on ? 'on' : 'off'),
  toggleFullScreen: () => ask('toggle'),
  // alla pagina solo lo stato (true/false), mai l'evento di Electron
  onFullScreenChange: cb => {
    if (typeof cb !== 'function') return;
    ipcRenderer.on(FULLSCREEN_CHANGED, (_event, on) => { try { cb(!!on); } catch (e) { console.error(e); } });
  },
});

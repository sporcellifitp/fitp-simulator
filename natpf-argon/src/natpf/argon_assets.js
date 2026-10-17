// Asset di Argon dal pacchetto offline: gli indirizzi gstatic scritti nei sorgenti di Argon diventano ./assets/…,
// come Argon fa già per i modelli 3D. Il server (Vite o LAN) risponde dal disco e, solo se manca il file e c'è rete,
// da gstatic (scripts/offline-assets.mjs). I sorgenti tengono l'indirizzo originale: da lì download-assets.mjs
// ricava la lista dei file da scaricare.
export const ARGON_GSTATIC = 'https://www.gstatic.com/aistudio/starter-apps/tennis/';
export const argonAssetUrl = url => typeof url === 'string' && url.startsWith(ARGON_GSTATIC) ? './assets/' + url.slice(ARGON_GSTATIC.length) : url;

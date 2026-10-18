// Ritratti del personaggio NATPF per l'HUD (tabellone, lobby, vittoria): SVG semplici, coerenti con il modello 3D
// (testa tonda, capelli castani voluminosi, fascia, sopracciglia decise, occhi piccoli scuri, polo con colletto).
// I colori arrivano dalle stesse varianti del personaggio; qui solo numeri, niente three.js, così l'HUD resta leggero.
const LOOKS = {
  p1: { skin: '#f0c19a', skinShade: '#d99f78', hair: '#7b4a2b', hairLight: '#9a6440', brow: '#24150d', polo: '#f5f6f2', poloShade: '#d9dce3',
    collar: '#f5f6f2', placket: '#e3e6ea', button: '#aeb5c2', band: '#ffffff', bandShade: '#d7dbe3', badge: '#16378f' },
  cpu: { skin: '#d59d77', skinShade: '#b97f5b', hair: '#2a1c14', hairLight: '#463126', brow: '#160e09', polo: '#16378f', poloShade: '#0e2665',
    collar: '#ffffff', placket: '#1c45ad', button: '#ffffff', band: '#ffffff', bandShade: '#d7dbe3', badge: '#0b1a45' },
  p2: { skin: '#e6b38c', skinShade: '#c8916a', hair: '#7a3f22', hairLight: '#99583a', brow: '#2c160b', polo: '#f5f6f2', poloShade: '#d9dce3',
    collar: '#ff3d8b', placket: '#ff3d8b', button: '#ffffff', band: '#ff3d8b', bandShade: '#d42c70', badge: '#7a1d48' },
};
export const PORTRAIT_LOOKS = Object.freeze(Object.keys(LOOKS));
const LABEL = { p1: 'Ritratto del giocatore 1', cpu: "Ritratto dell'avversario CPU", p2: 'Ritratto del giocatore 2' };

let seq = 0;
export function natpfPortraitSVG(lookKey = 'p1', { uid, className = 'natpf-portrait-svg', dataId = '' } = {}){
  const key = LOOKS[lookKey] ? lookKey : 'p1', c = LOOKS[key], id = uid || `natpf-portrait-${++seq}`;
  const puffs = [[38, 34, 11], [48, 27, 12], [60, 24, 13], [72, 27, 12], [82, 34, 11], [54, 31, 10], [67, 31, 10]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="${className}" data-look="${key}"${dataId ? ` data-pl-id="${dataId}"` : ''} role="img" aria-label="${LABEL[key]}">
  <defs>
    <radialGradient id="${id}-bg" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset="1" stop-color="${c.badge}" stop-opacity=".55"/></radialGradient>
    <radialGradient id="${id}-skin" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset=".55" stop-color="${c.skin}" stop-opacity="0"/><stop offset="1" stop-color="${c.skinShade}" stop-opacity=".55"/></radialGradient>
    <clipPath id="${id}-clip"><circle cx="60" cy="60" r="56"/></clipPath>
  </defs>
  <circle cx="60" cy="60" r="56" fill="url(#${id}-bg)"/>
  <g clip-path="url(#${id}-clip)">
    <path d="M 16 122 C 18 100, 36 90, 60 90 C 84 90, 102 100, 104 122 Z" fill="${c.polo}" stroke="${c.poloShade}" stroke-width="1.6"/>
    <path d="M 22 120 C 25 104, 34 97, 44 94" fill="none" stroke="${c.poloShade}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <rect x="52" y="80" width="16" height="14" rx="6" fill="${c.skin}"/>
    <path d="M 57 94 L 63 94 L 62.5 112 L 57.5 112 Z" fill="${c.placket}" stroke="${c.poloShade}" stroke-width=".8"/>
    <circle cx="60" cy="100" r="1.5" fill="${c.button}"/><circle cx="60" cy="106" r="1.5" fill="${c.button}"/>
    <path d="M 45 88 L 60 95 L 52 103 Z" fill="${c.collar}" stroke="${c.poloShade}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M 75 88 L 60 95 L 68 103 Z" fill="${c.collar}" stroke="${c.poloShade}" stroke-width="1" stroke-linejoin="round"/>
    <ellipse cx="29.5" cy="57" rx="5" ry="7.5" fill="${c.skin}" stroke="${c.skinShade}" stroke-width="1"/>
    <ellipse cx="90.5" cy="57" rx="5" ry="7.5" fill="${c.skin}" stroke="${c.skinShade}" stroke-width="1"/>
    <path d="M 29 48 C 29 34, 41 28, 60 28 C 79 28, 91 34, 91 48 C 92 66, 82 85, 60 85 C 38 85, 28 66, 29 48 Z" fill="${c.skin}"/>
    <path d="M 29 48 C 29 34, 41 28, 60 28 C 79 28, 91 34, 91 48 C 92 66, 82 85, 60 85 C 38 85, 28 66, 29 48 Z" fill="url(#${id}-skin)" stroke="${c.skinShade}" stroke-width="1.1"/>
    <path d="M 29 50 C 27 40, 29 32, 34 28 L 37 44 Z M 91 50 C 93 40, 91 32, 86 28 L 83 44 Z" fill="${c.hair}"/>
    ${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.hair}"/>`).join('')}
    <path d="M 44 22 C 50 18, 56 18, 60 21 M 64 20 C 70 17, 76 19, 79 24" fill="none" stroke="${c.hairLight}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M 28.5 38.5 C 44 33, 76 33, 91.5 38.5 L 91 46.5 C 76 41.5, 44 41.5, 29 46.5 Z" fill="${c.band}" stroke="${c.bandShade}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M 31 41 C 46 36.5, 74 36.5, 89 41" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>
    <path d="M 41 51.5 L 54 53.5" stroke="${c.brow}" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M 79 51.5 L 66 53.5" stroke="${c.brow}" stroke-width="4.6" stroke-linecap="round"/>
    <ellipse cx="48.5" cy="61" rx="3.3" ry="4.4" fill="#16110e"/><ellipse cx="71.5" cy="61" rx="3.3" ry="4.4" fill="#16110e"/>
    <circle cx="47.5" cy="59.4" r="1.1" fill="#ffffff"/><circle cx="70.5" cy="59.4" r="1.1" fill="#ffffff"/>
    <ellipse cx="60" cy="67.5" rx="3" ry="2.2" fill="${c.skinShade}" opacity=".75"/>
    <path d="M 55 75 C 58 76, 62 76, 65 75" fill="none" stroke="#5a2a1c" stroke-width="2.2" stroke-linecap="round"/>
  </g>
  <circle cx="60" cy="60" r="55.2" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.6"/>
</svg>`;
}

// L'avversario nei ritratti segue quello in campo: CPU oppure P2 nelle partite 1v1 tra persone.
const listeners = new Set();
let opponentLook = 'cpu';
export const getOpponentPortraitLook = () => opponentLook;
export function setOpponentPortraitLook(look){
  const next = LOOKS[look] ? look : 'cpu';
  if (next === opponentLook) return false;
  opponentLook = next;
  for (const fn of listeners) try { fn(next); } catch (err) { console.warn('[natpf-portrait]', err); }
  return true;
}
export function onOpponentPortraitLook(fn){ listeners.add(fn); return () => listeners.delete(fn); }
// Dal profilo HUD («player1», «opponent2», …) alla variante del personaggio
export const portraitLookFor = profileId => (/opponent/i.test(String(profileId || '')) ? opponentLook : 'p1');

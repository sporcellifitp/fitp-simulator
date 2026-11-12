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
// B24 · Lob & Drop (natpf_lob_drop.js): ritratti delle due mascotte, con i colori della foto di riferimento
const MASCOTS = {
  drop: { body: '#1f6fd6', shade: '#1556ad', badge: '#0b2f6b', iris: '#1a9a62' },
  lob: { body: '#ffdd1f', shade: '#e0b400', badge: '#1556ad', iris: '#2f95ea', visor: '#1f6fd6', visorShade: '#1556ad' },
};
export const PORTRAIT_LOOKS = Object.freeze([...Object.keys(LOOKS), ...Object.keys(MASCOTS)]);
const LABEL = { p1: 'Ritratto del giocatore 1', cpu: "Ritratto dell'avversario CPU", p2: 'Ritratto del giocatore 2', drop: 'Ritratto di Drop', lob: 'Ritratto di Lob' };

// Ritratto di una mascotte: testa grande, occhi grandi (contorno nero, iride colorata), bocca aperta che sorride;
// Drop con la fascia bianca e il ciuffo, Lob con la punta, la visiera blu e gli occhiali.
function mascotSVG(key, id, className, dataId){
  const c = MASCOTS[key], lob = key === 'lob';
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="#12141a" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${(r*0.74).toFixed(1)}" fill="${c.iris}"/>`
    + `<circle cx="${x}" cy="${y}" r="${(r*0.46).toFixed(1)}" fill="#12141a"/><circle cx="${(x - r*0.26).toFixed(1)}" cy="${(y - r*0.3).toFixed(1)}" r="${(r*0.24).toFixed(1)}" fill="#ffffff"/>`
    + `<circle cx="${(x + r*0.24).toFixed(1)}" cy="${(y + r*0.26).toFixed(1)}" r="${(r*0.11).toFixed(1)}" fill="#ffffff"/>`;
  const head = lob
    ? `<path d="M 66 16 C 74 12, 84 6, 88 2 C 88 12, 84 22, 78 28 C 92 36, 98 48, 98 62 C 98 84, 82 98, 60 98 C 38 98, 22 84, 22 62 C 22 44, 34 30, 52 26 C 58 24, 62 20, 66 16 Z" fill="${c.body}" stroke="${c.shade}" stroke-width="1.4" stroke-linejoin="round"/>`
    : `<ellipse cx="60" cy="60" rx="42" ry="37" fill="${c.body}" stroke="${c.shade}" stroke-width="1.4"/>`;
  const hat = lob
    ? `<path d="M 21 50 C 34 36, 86 36, 99 50 L 99 58 C 86 48, 34 48, 21 58 Z" fill="${c.visor}" stroke="${c.visorShade}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M 12 62 C 24 50, 70 46, 96 54 C 78 56, 40 62, 18 72 C 12 72, 9 67, 12 62 Z" fill="${c.visor}" stroke="${c.visorShade}" stroke-width="1.1" stroke-linejoin="round"/>
    <text x="62" y="47" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="9" fill="#ffffff">LOB</text>`
    : `<path d="M 20 44 C 34 28, 86 28, 100 44 L 101 54 C 86 40, 34 40, 19 54 Z" fill="#ffffff" stroke="#cfd6e2" stroke-width="1.1" stroke-linejoin="round"/>
    <text x="60" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="9.5" fill="${c.body}">DROP</text>
    <path d="M 26 34 C 30 22, 46 18, 60 22 C 54 26, 44 30, 34 38 C 30 40, 25 39, 26 34 Z" fill="${c.body}" stroke="${c.shade}" stroke-width="1.1" stroke-linejoin="round"/>`;
  const ey = lob ? 70 : 66, er = lob ? 11.5 : 12.5, ex = lob ? 15.5 : 17;
  const glasses = lob ? `<circle cx="${60 - ex}" cy="${ey}" r="${er + 3.2}" fill="none" stroke="#12141a" stroke-width="2.4"/><circle cx="${60 + ex}" cy="${ey}" r="${er + 3.2}" fill="none" stroke="#12141a" stroke-width="2.4"/>` : '';
  const my = ey + er + 5;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="${className}" data-look="${key}"${dataId ? ` data-pl-id="${dataId}"` : ''} role="img" aria-label="${LABEL[key]}">
  <defs>
    <radialGradient id="${id}-bg" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset="1" stop-color="${c.badge}" stop-opacity=".55"/></radialGradient>
    <clipPath id="${id}-clip"><circle cx="60" cy="60" r="56"/></clipPath>
  </defs>
  <circle cx="60" cy="60" r="56" fill="url(#${id}-bg)"/>
  <g clip-path="url(#${id}-clip)">
    <path d="M 34 124 C 34 104, 44 94, 60 94 C 76 94, 86 104, 86 124 Z" fill="${c.body}" stroke="${c.shade}" stroke-width="1.4"/>
    ${head}
    ${hat}
    ${eye(60 - ex, ey, er)}${eye(60 + ex, ey, er)}${glasses}
    <path d="M ${60 - 9} ${my} L ${60 + 9} ${my} C ${60 + 8} ${my + 10}, ${60 - 8} ${my + 10}, ${60 - 9} ${my} Z" fill="#3a0d16" stroke="#12141a" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="60" cy="${my + 5.6}" rx="4.2" ry="2" fill="#f2877c"/>
  </g>
  <circle cx="60" cy="60" r="55.2" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.6"/>
</svg>`;
}

let seq = 0;
export function natpfPortraitSVG(lookKey = 'p1', { uid, className = 'natpf-portrait-svg', dataId = '' } = {}){
  if (MASCOTS[lookKey]) return mascotSVG(lookKey, uid || `natpf-portrait-${++seq}`, className, dataId);
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
// B24: con «Personaggi in campo: Lob & Drop» chi gioca è Drop e l'avversario è Lob, anche nei ritratti.
const listeners = new Set();
let opponentLook = 'cpu', playerLook = 'p1';
const known = look => !!(LOOKS[look] || MASCOTS[look]);
export const getOpponentPortraitLook = () => opponentLook;
export const getPlayerPortraitLook = () => playerLook;
// Aspetto dei due lati nei ritratti; chi ascolta (player_avatars.js) li ridisegna, una volta sola per cambio
export function setPortraitLooks(player, opponent){
  const p = known(player) ? player : 'p1', o = known(opponent) ? opponent : 'cpu';
  if (p === playerLook && o === opponentLook) return false;
  playerLook = p; opponentLook = o;
  for (const fn of listeners) try { fn(o, p); } catch (err) { console.warn('[natpf-portrait]', err); }
  return true;
}
export const setOpponentPortraitLook = look => setPortraitLooks(playerLook, look);
export function onOpponentPortraitLook(fn){ listeners.add(fn); return () => listeners.delete(fn); }
// Dal profilo HUD («player1», «opponent2», …) alla variante del personaggio
export const portraitLookFor = profileId => (/opponent/i.test(String(profileId || '')) ? opponentLook : playerLook);

// Ritratti dell'HUD (tabellone, lobby, targhetta, vittoria). NATPF: disegnano il personaggio procedurale
// (src/natpf/natpf_portrait.js); qui resta solo l'API usata da hud_ui.js e index.html, con gli stessi id degli elementi.
import { natpfPortraitSVG, portraitLookFor, onOpponentPortraitLook } from "./natpf/natpf_portrait.js";
let c = 0;
// Profili HUD: P1 (e il compagno del doppio) e l'avversario (CPU o P2, secondo la partita).
export const MII_PROFILES = {
    player1: { id: "player1", team: "player" },
    player2: { id: "player2", team: "player" },
    opponent1: { id: "opponent1", team: "opponent" },
    opponent2: { id: "opponent2", team: "opponent" },
  },
  ELEMENT_ID_TO_CHARACTER = {
    "mii-icon-player": "player1",
    "mii-icon-player-2": "player2",
    "plate-mii-player": "player1",
    "setup-mii-player": "player1",
    "victory-mii-icon": "player1",
    "mii-icon-opponent": "opponent1",
    "mii-icon-opponent-2": "opponent2",
    "setup-mii-opponent": "opponent1",
  };
export function resolveMiiProfile(l) {
  if (!l) return MII_PROFILES.player1;
  const a = String(l).trim();
  if (MII_PROFILES[a]) return MII_PROFILES[a];
  const i = ELEMENT_ID_TO_CHARACTER[a];
  return i && MII_PROFILES[i]
    ? MII_PROFILES[i]
    : a.includes("opponent-2") || a.includes("opponent2")
      ? MII_PROFILES.opponent2
      : a.includes("opponent")
        ? MII_PROFILES.opponent1
        : a.includes("player-2") || a.includes("player2")
          ? MII_PROFILES.player2
          : MII_PROFILES.player1;
}
export function getMiiAvatarSVG(l = "player1", a = {}) {
  const i = resolveMiiProfile(l);
  // la classe resta quella usata dai fogli di stile e da renderMiiAvatar per sostituire il ritratto
  return natpfPortraitSVG(portraitLookFor(i.id), { uid: a.uid || `${i.id}-${++c}`, className: "wii-mii-svg", dataId: i.id });
}
// La tela sotto il ritratto resta vuota: tutto il disegno è nell'SVG sovrapposto.
export function drawMiiCanvasHiDPI(l) {
  if (!l || typeof l.getContext != "function") return;
  const r = 192;
  l.width !== r && (l.width = r), l.height !== r && (l.height = r);
  const e = l.getContext("2d");
  e && e.clearRect(0, 0, r, r);
}
export function renderMiiAvatar(l, a = null, i = {}) {
  const r = typeof l == "string" ? document.getElementById(l) : l;
  if (!r) return null;
  const e = a || r.dataset?.miiId || r.id || "player1",
    o = resolveMiiProfile(e),
    h = i.uid || (r.id ? `${r.id}-${o.id}` : `${o.id}-${++c}`),
    f = getMiiAvatarSVG(o.id, { ...i, uid: h });
  if (r.tagName && r.tagName.toLowerCase() === "canvas") {
    drawMiiCanvasHiDPI(r, o.id), r.classList.add("mii-canvas-backed");
    const s = r.parentElement;
    if (s) {
      const p = s.querySelector(`svg.wii-mii-svg[data-for-canvas="${r.id}"]`);
      if (p) p.outerHTML = f.replace('class="wii-mii-svg"', `class="wii-mii-svg" data-for-canvas="${r.id}"`);
      else {
        const n = document.createElement("div");
        n.innerHTML = f.trim();
        const d = n.firstElementChild;
        d && (r.id && d.setAttribute("data-for-canvas", r.id), s.insertBefore(d, r.nextSibling));
      }
    }
    return r;
  }
  return (r.innerHTML = f), r;
}
export function renderAllHudMiiAvatars() {
  typeof document != "undefined" &&
    Object.entries(ELEMENT_ID_TO_CHARACTER).forEach(([l, a]) => {
      const i = document.getElementById(l);
      i && renderMiiAvatar(i, a);
    });
}
// NATPF: quando l'avversario passa da CPU a P2 (o viceversa) i suoi ritratti si ridisegnano
onOpponentPortraitLook(() => renderAllHudMiiAvatars());

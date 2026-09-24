// Elenco delle attività per il menu «Vai a…»: ognuna porta il giocatore sul posto e apre le regole (o indica chi cercare).
import { frame } from '../core/util.js';

export function createActivities(W){
  const { world, layout } = W, S = layout.sites;
  const near = (id, fallback) => { const n = W.npcs.byId(id); return n ? [n.x, n.z] : fallback; };
  const toNpc = (id, then) => () => {
    const n = W.npcs.byId(id); if (!n) return then && then();
    const a = Math.atan2(W.player.pos.x - n.x, W.player.pos.z - n.z);
    const [x, z] = W.pois.safeSpot(n.x + Math.sin(n.av.g.rotation.y)*2.6, n.z + Math.cos(n.av.g.rotation.y)*2.6, null);
    W.player.place(x, z, n.x, n.z);
    if (then) then();
  };
  const A = [
    { id: 'tennis', title: 'Partita di tennis', where: 'Campo Centrale · con Marco', go: toNpc('marco', () => W.games.openHowto('tennis')) },
    { id: 'padel', title: 'Partita di padel in doppio', where: 'Campo da padel · con Giulia', go: toNpc('giulia', () => W.games.openHowto('padel')), if: () => !!world.PF },
    { id: 'serve', title: 'Sfida al servizio', where: 'Campo Centrale', go: toNpc('marco', () => W.games.openHowto('serve')) },
    { id: 'vetro', title: 'Il vetro', where: 'Campo da padel', go: toNpc('giulia', () => W.games.openHowto('vetro')), if: () => !!world.PF },
    { id: 'raccattapalle', title: 'Raccattapalle', where: 'Campi esterni · con Luca', go: toNpc('luca', () => W.games.openHowto('raccattapalle')) },
    { id: 'medaglie', title: 'Caccia alle medaglie', where: 'Stadio dei Marmi · parla con Anna', go: toNpc('anna', () => W.hud.toast('Parla con Anna per iniziare')), if: () => !!world.P.marmi },
    { id: 'live', title: 'Guarda una partita dal vivo', where: 'Stadio Nicola Pietrangeli', go: () => { const q = W.pois.POIS.find(p => p.id === 'pietr') || W.pois.POIS[0]; W.pois.goPlace(q); }, if: () => !!world.P.pietr },
    { id: 'fanzone', title: 'Fan zone e bacheca dei tifosi', where: 'Granite, info point, maxischermo', go: toNpc('dario'), if: () => !!W.props.fanZone },
  ];
  return {
    list: () => A.filter(a => !a.if || a.if()),
    go(id){ const a = A.find(x => x.id === id); if (a) a.go(); },
  };
}

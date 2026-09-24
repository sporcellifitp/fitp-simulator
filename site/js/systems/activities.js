// Attività per il menu «Vai a…»: ognuna ha un punto d'arrivo (per il navigatore) e un'azione di teletrasporto.
export function createActivities(W){
  const { world } = W, VA = W.village ? W.village.anchors : null;
  const npc = id => W.npcs.byId(id);
  const nearNpc = id => { const n = npc(id); return n ? { x: n.x, z: n.z } : null; };
  const toNpc = (id, then) => () => {
    const n = npc(id); if (!n) return then && then();
    const [x, z] = W.pois.safeSpot(n.x + Math.sin(n.av.g.rotation.y)*2.6, n.z + Math.cos(n.av.g.rotation.y)*2.6, null);
    W.player.place(x, z, n.x, n.z);
    if (then) then();
  };
  const booth = game => VA && VA.booths.find(b => b.game === game);
  const toBooth = game => () => { const b = booth(game); if (!b) return; const [x, z] = W.pois.safeSpot(b.x, b.z, [b.x, b.z]); W.player.place(x, z, b.bx, b.bz); W.games.openHowto(game, { venue: b.venue }); };
  const A = [
    { id: 'percorso', group: 'Fan Village', title: 'Percorso del Foro', get where(){ const R = W.route; if (!R) return ''; const i = R.index; return R.on ? `In corso: tappa ${i + 1} di ${R.stops.length}, ${R.stops[Math.min(i, R.stops.length - 1)].name}` : i > 1 && i < R.stops.length ? `Riprendi dalla tappa ${i + 1} di ${R.stops.length}` : `Il giro guidato del Foro in ${R.stops.length} tappe`; },
      target: () => null, go: () => W.route.resume(), if: () => !!W.route && W.route.stops.length > 2 },   // il percorso ha già la sua guida
    { id: 'village', group: 'Fan Village', title: 'Fan Village', where: 'Tutti i giochi, i negozi e la golf car', target: () => VA && { x: VA.plaza[0], z: VA.plaza[1] }, go: () => { const [x, z] = VA.plaza; W.player.place(x, z, VA.entrance[0], VA.entrance[1]); }, if: () => !!VA },
    ...[['tennis', 'Partita di tennis'], ['padel', 'Partita di padel in doppio'], ['serve', 'Sfida al servizio'], ['vetro', 'Il vetro'], ['raccattapalle', 'Raccattapalle']]
      .map(([g, t]) => ({ id: g + '-v', game: g, group: 'Fan Village', title: t, where: 'Postazione nel Fan Village', target: () => booth(g), go: toBooth(g), if: () => !!booth(g) })),
    { id: 'shop', group: 'Fan Village', title: 'Negozio del giocatore', where: 'Vestiti e racchette con i gettoni', target: () => nearNpc('marta'), go: toNpc('marta', () => W.shop.openWardrobe()), if: () => !!VA },
    { id: 'store', group: 'Fan Village', title: 'Store del torneo', where: 'Spille da collezione', target: () => nearNpc('nico'), go: toNpc('nico', () => W.shop.openStore()), if: () => !!VA },
    { id: 'golfcar', group: 'Fan Village', title: 'Noleggio golf car', where: 'Da Franco, in cambio di gettoni', target: () => nearNpc('franco'), go: toNpc('franco'), if: () => !!VA },
    { id: 'fanzone', group: 'Fan Village', title: 'Bacheca dei tifosi e info point', where: 'Con Dario', target: () => nearNpc('dario'), go: toNpc('dario'), if: () => !!VA },
    { id: 'tour', group: 'Nel Foro', title: 'FITP Trophy Tour', get where(){ const T = W.tour; if (!T) return ''; const n = T.nextIn(); return `Il museo itinerante: ora è ${T.stop.hint}` + (n ? ` · riparte tra ${Math.floor(n/60)}:${String(n % 60).padStart(2, '0')}` : ''); },
      target: () => W.tour && W.tour.entrance, go: () => { const e = W.tour.entrance, F = W.tour.F; W.player.place(e.x, e.z, F.x, F.z); }, if: () => !!W.tour },
    { id: 'tennis', group: 'Nel Foro', title: 'Partita sul Campo Centrale', where: 'Con Marco, il giudice di sedia', target: () => nearNpc('marco'), go: toNpc('marco', () => W.games.openHowto('tennis', { venue: 'centrale' })) },
    { id: 'padel', group: 'Nel Foro', title: 'Padel con Giulia', where: 'Campo da padel', target: () => nearNpc('giulia'), go: toNpc('giulia', () => W.games.openHowto('padel', { venue: 'padel' })), if: () => !!world.PF },
    { id: 'raccattapalle', group: 'Nel Foro', title: 'Raccattapalle con Luca', where: 'Campi esterni', target: () => nearNpc('luca'), go: toNpc('luca', () => W.games.openHowto('raccattapalle', { venue: 'outer' })) },
    { id: 'medaglie', group: 'Nel Foro', title: 'Caccia alle medaglie', where: 'Stadio dei Marmi · parla con Anna', target: () => nearNpc('anna'), go: toNpc('anna', () => W.hud.toast('Parla con Anna per iniziare')), if: () => !!world.P.marmi },
    { id: 'live', group: 'Nel Foro', title: 'Guarda una partita dal vivo', where: 'Stadio Nicola Pietrangeli', target: () => { const q = W.pois.POIS.find(p => p.id === 'pietr'); return q && { x: q.x, z: q.z }; }, go: () => { const q = W.pois.POIS.find(p => p.id === 'pietr') || W.pois.POIS[0]; W.pois.goPlace(q); }, if: () => !!world.P.pietr },
  ];
  return {
    list: () => A.filter(a => !a.if || a.if()),
    go(id){ const a = A.find(x => x.id === id || x.game === id); if (a) a.go(); },
    get: id => A.find(x => x.id === id),
  };
}

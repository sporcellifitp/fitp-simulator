// «Nuovo giocatore» (B18, difetto 5 del B16, decisione dell'utente del 10/11: «sì»): a fine partita, nel risultato dei
// minigiochi e nel pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows). Prima il visitatore dopo ereditava nome, record, mano,
// calibrazione e tutorial già visto («Giochi come Marco», forza tarata sul braccio di un altro, nessun tutorial).
//
// Cosa si azzera (resetVisitor), SENZA scollegare il telefono (niente link.forget, niente QR da rifare):
//   - nickname (natpf_events: record, medaglie ed esperienza sono per nickname e per giorno, quindi spariscono anche quelli);
//     quelli di oggi di «Ospite» (chi preme «Salta» nel passo del nome) si cancellano, così l'ospite dopo parte da zero;
//   - colpi speciali imparati per le catene della Combo (natpf_events.forgetLearned), anche quelli di un ospite;
//   - tutorial visto, anche il corto a 5 schede (NatpfPhoneRacket.forgetTutorial);
//   - calibrazione, colpo tipico, prototipi dei colpi speciali, salita/piatto/mira abituali e riferimenti della forza
//     (NatpfPhoneRacket.resetPlayer: il telefono ricalibra e azzera i colpi giocati, swing-detect effRef);
//   - mano: torna «Destra» e si sceglie di nuovo nel passo del nome (stesso schermo: nella pagina «Collega», per ciascuno;
//     dalla strada 'menu' il passo del nome non c'è: la mano si cambia nella pagina «Collega» o nelle tessere del menu).
//     Motivo: è del giocatore, non dello stand; un mancino dopo un destro (o il contrario) giocherebbe specchiato. Nove
//     visitatori su dieci sono destri, quindi chi non sceglie gioca con la scelta giusta quasi sempre;
//   - nello stesso schermo i nomi dei due giocatori (tornano Player 1 e Player 2) e le loro fasce (B25: tornano «Adulto»,
//     cioè nessun aiuto: natpf_duo_rules.js).
//   - «Chi gioca» (B18.2 gruppo 3): torna al valore di base (Adulto, o il livello chiesto dall'indirizzo della pagina), il
//     livello Evento riparte dal suo valore di base e la spiegazione del colpo super si rivede (natpf_lobby.resetWho).
// Cosa resta: la durata e il formato della partita, la mira del telefono, il chiosco, il segnale del momento giusto e la
// musica: sono scelte dello staff, non del visitatore.
//
// Dove porta chi arriva (newPlayerRoute):
//   'match'     partita contro la CPU: nome (e mano) → in campo il tutorial corto → la calibrazione → pagina «Partita»;
//   'challenge' minigioco: nome (e mano) → tutorial corto → calibrazione → lo stesso minigioco;
//   'split'     stesso schermo: pagina «Collega» dei due telefoni (nomi e mani lì) → tutorial nelle due metà →
//               calibrazioni → conto alla rovescia → partita;
//   'versus'    sfida tra due computer: a fine partita il pulsante non c'è (la rivincita è tra le stesse due persone e
//               l'altro computer la aspetta); dal pannello dello stand si azzera il giocatore di QUESTO computer e si torna
//               al menu principale: la stanza si chiude (l'host la chiude come cambiando modalità, il Player 2 la lascia);
//   'menu'      dal pannello dello stand con il menu principale in vista (o dall'Allenamento): si azzera e si resta (o si
//               torna) al menu, il visitatore sceglie.
// Con la webcam o mouse e tastiera il nome e poi subito la pagina «Partita» (o il minigioco): niente da calibrare.

// pure: dove va chi arriva. mode: modalità della lobby; versus: sfida tra due computer (host o Player 2); atMenu: la lobby
// mostra il menu principale
export function newPlayerRoute({ mode = 'cpu', versus = false, atMenu = false } = {}){
  if (versus || mode === 'friend') return 'versus';
  if (mode === 'split') return 'split';
  if (atMenu || mode === 'training') return 'menu';
  if (mode === 'challenge') return 'challenge';
  return 'match';
}
// pure: si chiede il nome (con la mano)? Solo dove c'è un passo del nome: partita e minigioco (nello stesso schermo i nomi
// sono nella pagina «Collega»)
export const asksName = route => route === 'match' || route === 'challenge';
// pure: il telefono aspetta il tutorial prima di ricalibrare? Solo se chi arriva va in campo subito dopo il nome (lì si apre
// il tutorial corto); al menu il telefono ricalibra da solo come dopo un collegamento nuovo, nello stesso schermo il tutorial
// lo apre la sua metà della pagina «Collega»
export const gatesTutorial = (route, controller) => controller === 'phone' && asksName(route);

// Azzera il visitatore e lo porta al passo giusto. ui: NatpfUi. Restituisce la strada presa
export function resetVisitor(ui){
  const E = ui.engine, L = ui.lobby;
  const versus = L?.mode === 'friend' || E.playerRole === 'p2' || !!ui.versus?.hostActive;
  const route = newPlayerRoute({ mode: L?.mode, versus, atMenu: !!L?.visible && L.step === 'menu' });
  // fogli aperti (nome, pannello dello stand, guida) e schermata finale
  if (ui.onboarding?.isOpen) ui.onboarding.close();
  for (const id of ['natpf-nick', 'natpf-staff']) document.getElementById(id)?.classList.add('hidden');
  E.hud?.hideVictoryModal?.();
  ui.events.nickname = '';
  // chi arriva e non scrive il nome gioca come «Ospite»: non eredita i record degli ospiti di prima (revisione B18)
  ui.events.forgetGuest?.();
  // colpi speciali imparati (catene della Combo, R3): il setter del nickname li toglie solo se c'era un nome; un ospite senza
  // nome li lasciava al visitatore dopo (unione B18.1)
  ui.events.forgetLearned?.();
  // B18.2 gruppo 3: «Chi gioca» al valore di base, livello Evento da capo, spiegazione del colpo super da rivedere
  L?.resetWho?.(); ui.superHint?.reset?.();
  if (route === 'split'){
    const S = ui.split;
    // nomi, caselle e targhette in campo (prima restavano le targhette di chi aveva giocato prima: revisione B18)
    if (S?.resetNames) S.resetNames();
    else { E.natpfSplitNames = { p1: 'Player 1', p2: 'Player 2' }; E.natpfSplitBands = { p1: 'adulto', p2: 'adulto' }; for (const el of document.querySelectorAll('[data-split-name]')) el.value = ''; }
    // (gate false: il tutorial lo apre la metà di ciascuno nella pagina «Collega», che fa aspettare il telefono; le verifiche
    // fallite del giocatore di prima non contano per chi arriva)
    for (const id of ['p1', 'p2']){ S?.setHand?.(id, 'right'); S?.phone?.(id)?.resetPlayer?.({ gate: false }); if (S?.fails) S.fails[id] = 0; }
    ui.backToMenu('connect');
    return route;
  }
  ui.hand?.set?.('right'); ui.paintTiles?.();
  const gate = gatesTutorial(route, ui.controller) && !!ui.phone?.connected;
  ui.phone?.resetPlayer?.({ gate });
  if (route === 'versus'){
    if (E.playerRole !== 'p2') L.setMode('cpu');
    ui.backToMenu('menu');
    return route;
  }
  if (route === 'menu'){ ui.backToMenu('menu'); return route; }
  const challenge = route === 'challenge' ? L.challenge : null;
  ui.backToMenu(route === 'challenge' ? 'challenges' : 'match');
  // il telefono aspetta già il tutorial: lo prende in carico l'allenamento in campo (natpf_training.start), e lo libera
  // la lobby se si torna al menu senza entrare in campo (natpf_lobby.go)
  if (gate) L.tutPrearm = true;
  const go = () => {
    if (route === 'challenge' && challenge){ L.challenge = challenge; L.setMode('challenge'); }
    L.startWarmup();
  };
  L.askNickname(go, { newPlayer: true });
  return route;
}

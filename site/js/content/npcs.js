// Personaggi del Foro. Nomi e ruoli sono inventati: nessuna persona reale.
// I fatti citati nei dialoghi sono quelli verificati in docs/v0.2-planimetria.md; il resto è racconto di gioco.
import { frame } from '../core/util.js';

const FIRSTS = ['Chiara', 'Matteo', 'Giorgia', 'Andrea', 'Sofia', 'Lorenzo', 'Alice', 'Davide', 'Emma', 'Riccardo', 'Nina', 'Pietro', 'Bianca', 'Filippo', 'Livia', 'Gabriele'];
const BARKS = [
  'Che scambio sul Pietrangeli!', 'Andiamo a vedere chi gioca sul Centrale?', 'Hai visto la nuova arena dentro i Marmi?',
  'Oggi si gioca su tutti i campi.', 'Il padel qui è fortissimo.', 'Fa caldo: ci vuole una granita!',
  'Sulla bacheca dei tifosi c\'è anche il mio messaggio.', 'Hai già trovato le medaglie tra le statue?',
  'Il maxischermo fa vedere il punteggio del Centrale.', 'Io ho vinto a padel al primo tentativo!',
];
const TEAM = [0x1f4fa3, 0xffffff, 0xd8342c, 0xf3c623, 0x2b7bd6, 0x2f8f57, 0x0b2a5b, 0xf08a3c, 0x7a3fa0, 0xe9e2d0];
const HAIR = [0x1d1d1f, 0x3a2a1c, 0x6b3b1c, 0xc9a45c, 0x8a8a8a];
const SK = [0xf0d0b4, 0xe8c2a0, 0xe0b48f, 0xd6a67e, 0xb07a52, 0x8a5a3a];
const pick = a => a[Math.floor(Math.random()*a.length)];
const spectatorLook = () => ({ shirt: pick(TEAM), shorts: pick([0x2a2f3a, 0x1d2430, 0xe9e2d0, 0x5b6678, 0x0b2a5b]), cap: pick(TEAM), hasCap: Math.random() < .4, hair: pick(HAIR), skin: pick(SK), hasRacket: false, shoes: pick([0xf7f7f7, 0x1d1d1f, 0xc8643b]) });

export function npcDefs(W){
  const { layout, world } = W, S = layout.sites, { CF, PF, P, DIM } = world;
  const cL = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step;
  const hub = S.pietrangeli || S.centrale;
  const outer = (layout.courts || []).filter(c => Math.hypot(c.x - hub.x, c.z - hub.z) < 300).sort((a, b) => Math.hypot(a.x - hub.x, a.z - hub.z) - Math.hypot(b.x - hub.x, b.z - hub.z))[3];
  const VA = W.village ? W.village.anchors : null, VF = W.village ? W.village.F : null;
  const G = W.games, A = W.activities, PR = W.progress;
  const defs = [];

  /* ---------- Giulia, maestra di padel ---------- */
  if (PF) defs.push({ id: 'giulia', name: 'Giulia', role: 'maestra di padel', map: '#2b7bd6',
    look: { shirt: 0x2b7bd6, shorts: 0x0b2a5b, cap: 0xffffff, hair: 0x6b3b1c, skin: 0xe8c2a0 },
    at: () => PF.w(7.2, 3.5), face: () => PF.rot - Math.PI/2,
    dialogue: { start: 'hello', nodes: {
      hello: { text: 'Ciao {nick}! Io insegno padel. Ti va di giocare?', options: [
        { label: 'Giochiamo una partita in doppio', do: () => G.openHowto('padel') },
        { label: 'Proviamo la sfida del vetro', do: () => G.openHowto('vetro') },
        { label: 'Come funziona il padel?', next: 'rules' },
        { label: 'A dopo!' },
      ] },
      rules: { text: 'Si gioca in doppio su un campo di 10 metri per 20, chiuso da vetro e rete metallica. La palla deve rimbalzare nel campo avversario prima di toccare il vetro; dopo il rimbalzo si può giocare anche con le pareti. Il servizio si fa dal basso e il punteggio è quello del tennis.', options: [
        { label: 'E il Major al Foro?', next: 'major' }, { label: 'Ho capito, giochiamo!', do: () => G.openHowto('padel') }, { label: 'Grazie!' },
      ] },
      major: { text: 'Il Foro ospita il BNL Italy Major Premier Padel, uno dei quattro Major del circuito. Nel 2026 si è giocato dal 31 maggio al 7 giugno.', options: [{ label: 'Forte! Giochiamo', do: () => G.openHowto('padel') }, { label: 'Grazie!' }] },
    } } });

  /* ---------- Marco, giudice di sedia ---------- */
  defs.push({ id: 'marco', name: 'Marco', role: 'giudice di sedia', map: '#1f4fa3',
    look: { shirt: 0x0b2a5b, shorts: 0x5b6678, cap: 0xffffff, hasCap: false, hair: 0x8a8a8a, skin: 0xe0b48f, hasRacket: false },
    at: () => CF.w(3.5, cL + 3), face: () => CF.rot,
    dialogue: { start: 'hello', nodes: {
      hello: { text: 'Buongiorno {nick}. Il Centrale è libero: vuoi giocare?', options: [
        { label: 'Una partita di singolare', do: () => G.openHowto('tennis') },
        { label: 'La sfida al servizio', do: () => G.openHowto('serve') },
        { label: 'Come si conta nel tennis?', next: 'score' },
        { label: 'Raccontami del Centrale', next: 'centrale' },
        { label: 'Arrivederci' },
      ] },
      score: { text: 'I punti vanno 15, 30, 40 e game. Sul 40 pari si gioca il vantaggio: chi fa due punti di fila vince il game. Qui giochiamo partite brevi, da uno a quattro game.', options: [{ label: 'Proviamo!', do: () => G.openHowto('tennis') }, { label: 'Grazie' }] },
      centrale: { text: 'È il campo delle finali degli Internazionali BNL d\'Italia. Da giugno 2026 è in corso il rifacimento: copertura mobile e 12.500 posti, con la fine dei lavori prevista per il 2028.', options: [{ label: 'Giochiamo qui', do: () => G.openHowto('tennis') }, { label: 'Grazie' }] },
    } } });

  /* ---------- Luca, raccattapalle ---------- */
  defs.push({ id: 'luca', name: 'Luca', role: 'raccattapalle', map: '#f3c623', scale: .82,
    look: { shirt: 0x5b2a86, shorts: 0x1d2430, cap: 0x5b2a86, skin: 0xd6a67e, hasRacket: false },
    at: () => outer ? frame(outer).w(4, 20.5) : (P.pietr ? P.pietr.f.w(P.pietr.hw + 3, 4) : CF.w(12, cL)),
    face: () => outer ? frame(outer).rot : 0,
    marker: () => PR.item('granita') > 0 && PR.quest('granita') === 'active' ? '?' : '',
    dialogue: { start: () => PR.item('granita') > 0 && PR.quest('granita') === 'active' ? 'granita' : 'hello', nodes: {
      hello: { text: 'Ciao! Durante le partite noi raccattapalle raccogliamo le palline e le passiamo ai giocatori. Mi aiuti a raccoglierle prima che riprenda il gioco?', options: [
        { label: 'Certo, ci sto', do: () => G.openHowto('raccattapalle') },
        { label: 'Com\'è fare il raccattapalle?', next: 'role' },
        { label: 'Un\'altra volta' },
      ] },
      role: { text: 'Bisogna essere velocissimi e stare fermi al posto giusto. Si corre, si raccoglie, si torna in posizione. E qui al sole viene una gran sete…', options: [{ label: 'Proviamo!', do: () => G.openHowto('raccattapalle') }, { label: 'Ciao Luca' }] },
      granita: { text: 'Una granita? Per me? Grazie {nick}, sei un mito!', options: [{ label: 'Figurati!', do: W2 => { PR.give('granita', -1); PR.setQuest('granita', 'done'); PR.badge('granita'); } }] },
    } } });

  /* ---------- Anna, custode dei Marmi ---------- */
  if (P.marmi) defs.push({ id: 'anna', name: 'Anna', role: 'custode dei Marmi', map: '#e7e0d2',
    look: { shirt: 0x5b6678, shorts: 0x2a2f3a, hasCap: false, hair: 0x3a2a1c, skin: 0xf0d0b4, hasRacket: false },
    at: () => P.marmi.f.w(0, P.marmi.b + 3.5), face: () => P.marmi.rot + Math.PI,
    marker: () => ({ none: '!', active: W.medals.count() >= 6 ? '?' : '', done: '' }[PR.quest('medaglie')] || ''),
    dialogue: { start: () => ({ none: 'hello', active: W.medals.count() >= 6 ? 'turnin' : 'progress', done: 'after' }[PR.quest('medaglie')] || 'hello'), nodes: {
      hello: { text: 'Benvenuto allo Stadio dei Marmi, {nick}. Per gioco ho nascosto sei medaglie vicino alle statue dell\'anello. Le trovi tutte?', options: [
        { label: 'Accetto la caccia!', do: () => W.medals.start() },
        { label: 'Parlami delle statue', next: 'statues' }, { label: 'Più tardi' },
      ] },
      statues: { text: 'Sono circa sessanta statue di atleti in marmo di Carrara, donate dalle province italiane. Dal 2013 lo stadio porta anche il nome di Pietro Mennea.', options: [{ label: 'Cerco le medaglie', do: () => W.medals.start() }, { label: 'Grazie' }] },
      progress: { text: () => `Ne hai trovate ${W.medals.count()} su 6. Guarda bene lungo l'anello, le medaglie brillano.`, options: [{ label: 'Continuo a cercare' }] },
      turnin: { text: 'Tutte e sei! Questa medaglia va nel tuo album. E ora sai che ogni statua rappresenta uno sport: ne hai viste di tutti i tipi.', options: [{ label: 'Grazie Anna!', do: () => { PR.setQuest('medaglie', 'done'); PR.badge('medaglie'); W.medals.finish(); } }] },
      after: { text: 'Le medaglie sono al sicuro nel tuo album. Torna quando vuoi a guardare le partite nell\'arena.', options: [{ label: 'A presto' }] },
    } } });

  /* ---------- Paolo, guida alla Fontana ---------- */
  if (S.fontana) defs.push({ id: 'paolo', name: 'Paolo', role: 'guida', map: '#86bccb',
    look: { shirt: 0xf08a3c, shorts: 0x2a2f3a, cap: 0xf08a3c, skin: 0xb07a52, hasRacket: false },
    at: () => [S.fontana.x + 10, S.fontana.z + 3],
    dialogue: { start: 'hello', nodes: {
      hello: { text: 'Ciao {nick}, sono la guida del Foro. Dove ti porto?', options: [
        { label: 'Fammi vedere dove andare', do: () => W.pois.openPlaces() },
        { label: 'Cosa c\'è da fare qui?', next: 'todo' },
        { label: 'Raccontami della fontana', next: 'fontana' },
        { label: 'Ciao!' },
      ] },
      todo: { text: 'Puoi giocare a tennis sul Centrale e a padel in doppio, aiutare Luca a raccogliere le palline, cercare le medaglie ai Marmi con Anna e guardare le partite dal vivo. Alla fan zone c\'è la bacheca dei tifosi.', options: [{ label: 'Portami a un\'attività', do: () => W.pois.openPlaces() }, { label: 'Grazie' }] },
      fontana: { text: 'È la Fontana della Sfera, realizzata tra il 1933 e il 1935 su progetto di Mario Paniconi e Giulio Pediconi. La sfera è un unico blocco di marmo di Carrara.', options: [{ label: 'Grazie Paolo' }] },
    } } });

  /* ---------- Fan Village: Sara (punto ristoro), Dario (info point), Marta (negozio), Nico (store), Franco (golf car), Beatrice (museo) ---------- */
  if (VA){
    defs.push({ id: 'sara', talkR: 4.6, name: 'Sara', role: 'chiosco delle granite', map: '#d8342c',
      look: { shirt: 0xd8342c, shorts: 0xffffff, cap: 0xffffff, hair: 0x1d1d1f, skin: 0xe8c2a0, hasRacket: false },
      at: () => VA.sara, face: () => VF.rot + Math.PI,
      marker: () => PR.quest('granita') === 'none' ? '!' : '',
      dialogue: { start: () => PR.quest('granita') === 'none' ? 'quest' : 'hello', nodes: {
        quest: { text: 'Ciao! Luca il raccattapalle corre tutto il giorno e non ha tempo di venire qui. Gli porti tu una granita? Lo trovi ai campi esterni.', options: [
          { label: 'Ci penso io', do: () => { PR.give('granita', 1); PR.setQuest('granita', 'active'); W.hud.toast('Hai una granita per Luca: lo trovi ai campi esterni'); } },
          { label: 'Adesso no' },
        ] },
        hello: { text: () => PR.quest('granita') === 'active' ? 'Luca aspetta ancora la sua granita: è ai campi esterni!' : 'Granite, gelati e acqua fresca. Rinfrescarsi dà energia: per un po\' si corre più veloci!', options: [{ label: 'Vediamo cosa c\'è', do: () => W.shop.openFood() }, { label: 'Ciao Sara' }] },
      } } });
    defs.push({ id: 'dario', talkR: 4.6, name: 'Dario', role: 'info point', map: '#2f8f57',
      look: { shirt: 0x2f8f57, shorts: 0x1d2430, cap: 0x2f8f57, skin: 0xd6a67e, hasRacket: false },
      at: () => VA.dario, face: () => VF.rot + Math.PI,
      dialogue: { start: 'hello', nodes: {
        hello: { text: 'Benvenuto al Fan Village, {nick}! Qui trovi tutti i giochi: le postazioni sono in fondo, i campi ai lati. Ci sono anche negozi, il Museo FITP e il noleggio delle golf car.', options: [
          { label: 'Dove vado adesso?', do: () => W.pois.openPlaces() },
          { label: 'Come guadagno gettoni?', next: 'gettoni' },
          { label: 'Cambio il mio giocatore', do: () => W.ugc.profile.open() },
          { label: 'Scrivo sulla bacheca dei tifosi', do: () => W.ugc.board.open() },
          { label: 'Apro l\'album delle medaglie', do: () => W.progress.openAlbum() },
          { label: 'Come sfido un amico?', next: 'sfida' },
          { label: 'Ciao!' },
        ] },
        sfida: { text: 'Alla fine della sfida al servizio, del vetro o del raccattapalle premi «Sfida un amico»: ottieni un link con la stessa sequenza e il tuo punteggio da battere.', options: [{ label: 'Grazie Dario' }] },
        gettoni: { text: () => `Ne hai ${W.economy.coins}. Si guadagnano giocando: una partita vinta ne vale 30, le sfide fino a 22, le missioni 20 o 40, ogni medaglia 10, ogni luogo scoperto 3. Si spendono nei negozi e per la golf car.`, options: [{ label: 'Chiaro, grazie' }] },
      } } });
  }

  if (VA){
    defs.push({ id: 'marta', talkR: 4.6, name: 'Marta', role: 'Negozio del giocatore', map: '#c8643b',
      look: { shirt: 0xc8643b, shorts: 0x1d2430, hasCap: false, hair: 0x1d1d1f, skin: 0xd6a67e, hasRacket: false, glasses: true },
      at: () => VA.marta, face: () => VF.rot + Math.PI,
      dialogue: { start: 'hello', nodes: {
        hello: { text: () => `Ciao {nick}! Maglie, cappellini, fasce, occhiali, polsini, scarpe e racchette. Hai ${W.economy.coins} gettoni da spendere.`, options: [
          { label: 'Fammi vedere tutto', do: () => W.shop.openWardrobe() },
          { label: 'Apro il mio guardaroba', do: () => W.shop.openWardrobe({ ownedOnly: true, title: 'Il tuo guardaroba' }) },
          { label: 'Ciao Marta' },
        ] } } } });
    defs.push({ id: 'nico', talkR: 4.6, name: 'Nico', role: 'Store del torneo', map: '#0b2a5b',
      look: { shirt: 0x0b2a5b, shorts: 0xe9e2d0, cap: 0xf3c623, skin: 0xe8c2a0, hasRacket: false },
      at: () => VA.nico, face: () => VF.rot + Math.PI,
      dialogue: { start: 'hello', nodes: {
        hello: { text: 'Benvenuto allo Store del torneo! Le spille da collezione finiscono nel tuo album: chi le prende tutte diventa collezionista.', options: [
          { label: 'Vediamo le spille', do: () => W.shop.openStore() }, { label: 'Ciao Nico' },
        ] } } } });
    defs.push({ id: 'franco', talkR: 4.6, name: 'Franco', role: 'noleggio golf car', map: '#2f8f57',
      look: { shirt: 0x2f8f57, shorts: 0x2a2f3a, cap: 0xffffff, skin: 0xb07a52, hasRacket: false },
      at: () => VA.franco, face: () => VF.rot + Math.PI,
      dialogue: { start: () => W.carts.rented ? 'rented' : 'hello', nodes: {
        hello: { text: () => `Il Foro è grande: con la golf car lo giri tutto in un attimo. Il noleggio costa ${W.CART_PRICE} gettoni e vale finché resti nel gioco. Tu ne hai ${W.economy.coins}.`, options: [
          { label: `Noleggio la golf car`, do: () => W.carts.rent() },
          { label: 'Come si guida?', next: 'guida' }, { label: 'Più tardi' },
        ] },
        guida: { text: 'Frecce o WASD per accelerare, frenare e sterzare, Spazio per il clacson, E per scendere. Sul telefono c\'è il joystick. Attento ai muri!', options: [{ label: 'Noleggio', do: () => W.carts.rent() }, { label: 'Grazie' }] },
        rented: { text: 'La tua golf car è dove l\'hai lasciata: sulla minimappa è il punto blu. Buon giro!', options: [{ label: 'Portami il navigatore sulla golf car', do: () => { const c = W.carts.cart; if (c) W.nav.set({ x: c.x, z: c.z, name: 'La tua golf car' }); } }, { label: 'Grazie Franco' }] },
      } } });
  }
  if (W.tour) defs.push({ id: 'beatrice', talkR: 3.6, name: 'Beatrice', role: 'guida del Trophy Tour', map: '#0b2a5b',
    look: { shirt: 0x0b2a5b, shorts: 0xffffff, hasCap: false, hair: 0x6b3b1c, skin: 0xf0d0b4, hasRacket: false },
    at: () => [W.tour.curator.x, W.tour.curator.z], face: () => W.tour.F.rot + .4,
    dialogue: { start: 'hello', nodes: {
      hello: { text: () => { const T = W.tour, n = [...Object.keys(PR.st.museum)].length, tt = Object.keys(PR.st.tour).length; return `Benvenuto al FITP Trophy Tour, {nick}! È il museo itinerante della Federazione: gira il Foro e resta ${T.nextIn() ? Math.ceil(T.nextIn()/60) + ' minuti ancora' : 'qui per ora'} ${T.stop.hint}. Hai letto ${n} pannelli su ${T.total} e hai ${tt} timbri su ${T.stops.length}.`; }, options: [
        { label: 'Cosa c\'è da vedere?', next: 'start' },
        { label: 'Dove andrete dopo?', next: 'dopo' },
        { label: 'Voglio la foto con la Coppa', next: 'foto' },
        { label: 'Da dove vengono le foto?', next: 'fonti' },
        { label: 'Grazie Beatrice' },
      ] },
      start: { text: 'Nel camion c\'è la Coppa Davis, vinta dall\'Italia nel 1976 e poi tre volte di fila dal 2023 al 2025. Nella vetrina a sinistra la Billie Jean King Cup. Lungo il tappeto rosso i totem con la storia della Federazione, dal 1910 a oggi.', options: [{ label: 'Vado!' }] },
      dopo: { text: () => `La prossima tappa è ${W.tour.next().hint}. Ogni tappa in cui ci trovi vale un timbro: con tutti i timbri hai la medaglia del Passaporto del Tour.`, options: [{ label: 'Portami il navigatore', do: () => { const n = W.tour.next(); const [x, z] = n.F.w(-1.5, 18); W.nav.set({ x, z, name: 'Prossima tappa: ' + n.name }); } }, { label: 'Grazie' }] },
      foto: { text: 'Mettiti sul cerchio giallo davanti alla parete dei loghi, accanto alla Coppa, e premi Foto. La foto resta sul tuo dispositivo.', options: [{ label: 'Scatta adesso', do: () => W.tour.takePhoto() }, { label: 'Dopo' }] },
      fonti: { text: 'Sono foto di Wikimedia Commons con licenza libera: autore e licenza sono scritti sotto ogni foto. Nessuna ritrae da vicino un atleta.', options: [{ label: 'Chiaro' }] },
    } } });

  /* ---------- Elena, tifosa al Pietrangeli ---------- */
  if (P.pietr) defs.push({ id: 'elena', name: 'Elena', role: 'tifosa',
    look: { shirt: 0xf3c623, shorts: 0x0b2a5b, cap: 0x0b2a5b, hair: 0xc9a45c, skin: 0xf0d0b4, hasRacket: false },
    at: () => P.pietr.f.w(P.pietr.hw + 2.5, -6), face: () => P.pietr.rot - Math.PI/2,
    dialogue: { start: 'hello', nodes: {
      hello: { text: 'Guarda che partita! Il Pietrangeli è il più antico stadio del tennis al Foro: un tempo si chiamava Pallacorda e il campo è più in basso del viale.', options: [
        { label: 'Chi sta giocando?', next: 'who' }, { label: 'Bello! Ciao Elena' },
      ] },
      who: { text: () => { const s = W.live.pietr; return s ? `${s.names[0]} contro ${s.names[1]}: game ${s.games[0]}-${s.games[1]}, punti ${s.points[0]}-${s.points[1]}.` : 'Stanno per iniziare, resta a guardare!'; }, options: [{ label: 'Resto a guardare' }] },
    } } });

  /* ---------- pubblico che passeggia ---------- */
  const anchors = [S.viale, S.fontana, P.pietr && P.pietr.f.w(P.pietr.hw + 6, 0), CF.w(0, cL + 8), P.marmi && P.marmi.f.w(0, P.marmi.b + 8), VA && VA.plaza, VA && VA.entrance, S.supertennis]
    .filter(Boolean).map(a => Array.isArray(a) ? { x: a[0], z: a[1] } : a);
  const n = W.layout.source === 'schematic' ? 22 : 30;
  for (let i = 0; i < n; i++){
    const a = anchors[i % anchors.length];
    defs.push({ id: 'pubblico' + i, look: spectatorLook(), wander: 38, speed: 1.1 + Math.random()*.8,
      at: () => [a.x + (Math.random() - .5)*30, a.z + (Math.random() - .5)*30], barks: BARKS.slice().sort(() => Math.random() - .5).slice(0, 4), name: null, role: pick(FIRSTS) });
  }
  return defs;
}

# Foro Italico World

Prototipo di un mondo giocabile nel browser, ispirato al Foro Italico di Roma. Progetto esplorativo di FITP eSports, nato dall'analisi di [Como Junior](https://junior.comofootball.com/), il gioco del Como 1907.

**Stato:** prototipo v0.8, uso interno. Planimetria da OpenStreetMap con impianti e nomi dell'edizione 2026; alcune posizioni del 2026 sono stimate (vedi [ROADMAP.md](ROADMAP.md), [docs/v0.2-planimetria.md](docs/v0.2-planimetria.md) e [docs/mondo-analisi-e-piano.md](docs/mondo-analisi-e-piano.md) [docs/v0.5-village.md](docs/v0.5-village.md), [docs/v0.6-multiplayer.md](docs/v0.6-multiplayer.md) e [docs/v0.8-racchetta.md](docs/v0.8-racchetta.md)).

## Cosa si può fare

- Camminare, correre e saltare nel Foro costruito a blocchi sulla planimetria di OpenStreetMap: viale dei mosaici, Fontana della Sfera, Tevere, Stadio dei Marmi con la BNP Paribas Arena, Stadio Nicola Pietrangeli, Centrale, SuperTennis Arena, campi esterni.
- Giocare **partite vere**: tennis singolare sul Centrale e padel in doppio, con movimento, colpo, pallonetto, smash in salto, punteggio reale e tre livelli.
- Guardare partite tra NPC sugli altri campi, con arbitro e raccattapalle; il punteggio del Centrale va sul maxischermo della fan zone.
- Parlare con otto personaggi e fare le loro missioni: raccattapalle a tempo, medaglie tra le statue dei Marmi, una granita da consegnare. Minigiochi: sfida al servizio e il vetro.
- Entrare con il proprio **personaggio**: chi è nuovo lo crea vedendolo in 3D, chi ce l'ha scrive il nome.
- **Giocare con gli amici**: si crea una stanza, si manda il link e ci si ritrova nello stesso Foro (fino a 8). Nella stanza si sfidano gli amici a tennis (1 contro 1) o a padel (2 contro 2, i posti vuoti li gioca il computer).
- Giocare a **Racchetta** (`/tennis/`, gioco a sé, tennis arcade nello stile di Nintendo Switch Sports): contro la CPU o contro un amico con un link, con il **telefono come racchetta** (QR e calibrazione guidata) o con mouse e tastiera. Dettagli in [docs/v0.8-racchetta.md](docs/v0.8-racchetta.md).
- Farsi guidare come con **Google Maps**: linea blu a terra, manovre, distanza e tempo.
- Partire dal **Fan Village**, dove si compare, e seguire il **Percorso del Foro**: 11 tappe guidate da frecce a terra, con totem e schede con foto reali, fino al Trophy Tour.
- Nel **Fan Village**, vicino all'ingresso, trovare tutti i giochi insieme, il negozio del giocatore (vestiti e racchette), lo Store del torneo (spille), il punto ristoro e il noleggio della **golf car** per girare il Foro. Si paga con i gettoni guadagnati giocando, senza denaro vero.
- Visitare il **FITP Trophy Tour**, il museo itinerante: un camion-vetrina con la Coppa Davis e la Billie Jean King Cup, totem con la storia della Federazione e foto reali, foto ricordo con la Coppa. Cambia tappa ogni 5 minuti.
- Orientarsi con cartelli, navigatore con freccia gialla e minimappa.
- Personalizzare il giocatore, lasciare un messaggio sulla bacheca dei tifosi, sfidare un amico con un link, raccogliere medaglie nell'album.
- Da computer tastiera e mouse, da telefono joystick e pulsanti. Si gioca come ospite: i progressi restano nel browser.

## Struttura del codice

- `site/index.html`: interfaccia e stile. `site/js/main.js` avvia tutto e passa a ogni modulo il contesto condiviso `W`.
- `site/js/core/`: motore di rendering, input, eventi, archivio. `world/`: planimetria, collisioni, costruzione del mondo, allestimenti.
- `site/js/entities/`: avatar e giocatore. `systems/`: interazioni, luoghi, NPC e dialoghi, progressi, attività.
- `site/js/match/`: fisica, regole, IA e resa grafica delle partite (i primi tre senza Three.js, testabili con Node).
- `site/js/games/`: registro delle modalità e minigiochi. `ugc/`: profilo, bacheca, codici sfida, negozi. `content/`: personaggi e dialoghi, articoli dei negozi, pannelli del Trophy Tour.
- `site/js/world/village.js` (Fan Village), `world/tour.js` (Trophy Tour), `systems/route.js` e `world/grid.js` (Percorso del Foro e calcolo della strada), `entities/cart.js` (golf car), `systems/nav.js` ed `economy.js`.
- `site/js/match/online.js` (partite tra amici), `site/js/net/room.js` (gioco con gli amici, WebRTC con PeerJS in `js/vendor/`), `ugc/characters.js` (personaggi), `ui/preview.js` (anteprima 3D), `core/store.js` (dati per personaggio).
- `site/tennis/` e `site/js/tennis/` (Racchetta: pagina del computer `index.html`, pagina del telefono `racchetta.html`, arena, personaggi, scena, comandi unificati, telefono e calibrazione, partita tra amici) e `site/js/match/arcade.js` (partita arcade: colpo a tempo, assistenza, CPU). Il generatore di QR è in `js/vendor/qrcode.js` (MIT).
- `site/assets/`: loghi FITP (`brand/`), foto del Trophy Tour (`photos/`) e grafiche dell'arena di Racchetta (`arena/`), con fonti e licenze nei README.

**Aggiungere un personaggio:** una voce in `content/npcs.js` (posizione, aspetto, dialogo). **Aggiungere un gioco:** un modulo che chiama `W.games.register({...})` e una riga in `main.js`; per il menu «Vai a…», una voce in `systems/activities.js`.

## Come avviarlo

Il gioco è un unico file, `site/index.html`, più la planimetria in `site/data/`. Three.js arriva da CDN, quindi serve la connessione a internet.

```bash
python -m http.server 8765 -d site
```

Poi apri `http://localhost:8765` (il mondo) o `http://localhost:8765/tennis/` (Racchetta). Il telefono come racchetta e la partita tra amici funzionano dall'indirizzo pubblicato in https: istruzioni in [docs/v0.8-racchetta.md](docs/v0.8-racchetta.md). Con `#centrale` o `#padel` in fondo all'indirizzo si parte direttamente in campo, con `?layout=schematic` si forza la planimetria schematica anche quando c'è quella importata.

## Planimetria da OpenStreetMap

```bash
NODE_USE_ENV_PROXY=1 node tools/osm-import.mjs --fetch   # scarica da Overpass e scrive site/data/layout.json
                                    # (la variabile serve solo dietro un proxy)
node tools/osm-import.mjs           # usa data/osm/foro-italico.overpass.json esportato a mano
node --test tools/test/*.test.mjs   # test di importatore, regole, fisica, partite, codici sfida, colpo e telefono
```

Serve Node.js 18 o successivo, senza dipendenze. Le prove nel browser di Racchetta (computer, telefono simulato, partita tra amici, con Playwright) sono in `tools/e2e/`, con le istruzioni nel README della cartella. Se `site/data/layout.json` manca, il gioco usa la planimetria schematica scritta in `site/index.html`.

## Pubblicare online

La cartella `site/` è un sito statico, senza build. Solo lei viene pubblicata: documenti, strumenti e dati grezzi restano nel repository.

- **Vercel:** *Add New → Project*, importa il repository, lascia *Framework Preset: Other*. `vercel.json` imposta già la cartella `site`. Ogni push crea un'anteprima, il branch principale va in produzione.
- **Cloudflare Workers** (flusso *Create an application → Import a repository*): `wrangler.jsonc` pubblica già `site/` come sito statico, non serve comando di build. Serve l'app GitHub «Cloudflare Workers and Pages» autorizzata sul repository.
- **Cloudflare Pages:** *Create → Pages → Connect to Git*, build command vuoto, output directory `site`. Le intestazioni sono in `site/_headers`.

Il sito chiede ai motori di ricerca di non indicizzarlo, ma questo non ne limita l'accesso. Su Vercel Hobby si può proteggere con *Vercel Authentication* (entra solo chi ha accesso al progetto Vercel), la password è solo sui piani a pagamento. Per aprirlo a tutti gli indirizzi @fitp.it serve Cloudflare Pages con Cloudflare Access, gratuito fino a 50 utenti.

## Tecnologia

- HTML, CSS e JavaScript in un solo file, nessuna fase di build
- [Three.js](https://threejs.org/) 0.170 per il 3D
- Mondo generato in codice a partire dalla planimetria: niente modelli esterni né asset generati con AI in questa versione
- Foto del Trophy Tour da Wikimedia Commons (pubblico dominio, CC BY, CC BY-SA), con autore e licenza nel gioco
- Dati cartografici © OpenStreetMap contributors, licenza [ODbL](https://opendatacommons.org/licenses/odbl/), quando importati

## Note

- Repository privato. Contenuti, nomi e marchi (FITP, Internazionali BNL d'Italia, impianti del Foro Italico) vanno autorizzati prima di qualunque uso pubblico.
- Il codice è stato scritto con Claude Code.

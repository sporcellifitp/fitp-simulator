# Foro Italico World

Prototipo di un mondo giocabile nel browser, ispirato al Foro Italico di Roma. Progetto esplorativo di FITP eSports, nato dall'analisi di [Como Junior](https://junior.comofootball.com/), il gioco del Como 1907.

**Stato:** prototipo v0.2 in corso, uso interno. Impianti e nomi sono aggiornati all'edizione 2026; la planimetria diventa fedele quando si importano i dati di OpenStreetMap (vedi [ROADMAP.md](ROADMAP.md) e [docs/v0.2-planimetria.md](docs/v0.2-planimetria.md)).

## Cosa si può fare

- Camminare nel Foro costruito a blocchi: viale dei mosaici, Fontana della Sfera, Tevere, Stadio dei Marmi con la BNP Paribas Arena al centro, Stadio Nicola Pietrangeli ribassato tra le statue, Centrale, SuperTennis Arena, campi esterni in terra rossa.
- Giocare alla **sfida al servizio** sul Campo Centrale: dieci battute, ace e servizi dentro fanno punti, il record resta nel browser.
- Giocare al **vetro** sul campo da padel: la palla rimbalza sulla parete di fondo e va colpita al ritorno, quando il cerchio si chiude.
- Da computer si usano tastiera e mouse, da telefono joystick e tocchi. Si gioca come ospite, senza registrazione.

## Come avviarlo

Il gioco è un unico file, `site/index.html`, più la planimetria in `site/data/`. Three.js arriva da CDN, quindi serve la connessione a internet.

```bash
python -m http.server 8765 -d site
```

Poi apri `http://localhost:8765`. Con `#centrale` o `#padel` in fondo all'indirizzo si parte direttamente in campo, con `?layout=schematic` si forza la planimetria schematica anche quando c'è quella importata.

## Planimetria da OpenStreetMap

```bash
NODE_USE_ENV_PROXY=1 node tools/osm-import.mjs --fetch   # scarica da Overpass e scrive site/data/layout.json
                                    # (la variabile serve solo dietro un proxy)
node tools/osm-import.mjs           # usa data/osm/foro-italico.overpass.json esportato a mano
node --test tools/test/*.test.mjs   # test dell'importatore
```

Serve Node.js 18 o successivo, senza dipendenze. Se `site/data/layout.json` manca, il gioco usa la planimetria schematica scritta in `site/index.html`.

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
- Dati cartografici © OpenStreetMap contributors, licenza [ODbL](https://opendatacommons.org/licenses/odbl/), quando importati

## Note

- Repository privato. Contenuti, nomi e marchi (FITP, Internazionali BNL d'Italia, impianti del Foro Italico) vanno autorizzati prima di qualunque uso pubblico.
- Il codice è stato scritto con Claude Code.

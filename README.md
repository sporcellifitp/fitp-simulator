# Foro Italico World

Prototipo di un mondo giocabile nel browser, ispirato al Foro Italico di Roma. Progetto esplorativo di FITP eSports, nato dall'analisi di [Como Junior](https://junior.comofootball.com/), il gioco del Como 1907.

**Stato:** prototipo v0.1, uso interno. La planimetria è indicativa e non ancora fedele (vedi [ROADMAP.md](ROADMAP.md)).

## Cosa si può fare

- Camminare nel Foro costruito a blocchi: viale dei mosaici, Fontana della Sfera, Tevere, Stadio dei Marmi e Pietrangeli ribassati tra le statue, Centrale, Grand Stand Arena, SuperTennis Arena, campi esterni in terra rossa.
- Giocare alla **sfida al servizio** sul Campo Centrale: dieci battute, ace e servizi dentro fanno punti, il record resta nel browser.
- Da computer si usano tastiera e mouse, da telefono joystick e tocchi. Si gioca come ospite, senza registrazione.

## Come avviarlo

Il gioco è un unico file, `index.html`. Three.js arriva da CDN, quindi serve la connessione a internet.

```bash
python -m http.server 8765
```

Poi apri `http://localhost:8765`. Con `http://localhost:8765/#centrale` si parte direttamente in campo.

## Tecnologia

- HTML, CSS e JavaScript in un solo file, nessuna fase di build
- [Three.js](https://threejs.org/) 0.170 per il 3D
- Mondo generato in codice: niente modelli esterni né asset generati con AI in questa versione

## Note

- Repository privato. Contenuti, nomi e marchi (FITP, Internazionali BNL d'Italia, impianti del Foro Italico) vanno autorizzati prima di qualunque uso pubblico.
- Il codice è stato scritto con Claude Code.

# B17.3 · Tabellone della partita in alto a sinistra (08/11/2026)

Richiesta dell'utente (08/11 sera, punto 3): «la UI attuale del punteggio non mi piace: voglio il punteggio in alto a
sinistra, anziché al centro, possibilmente più grande e leggibile. Cura proporzioni e posizionamento rispetto al resto
dell'interfaccia». La schermata di riferimento citata **non è arrivata** tra gli allegati: le scelte qui sotto sono da
regia televisiva (riquadro compatto in un angolo, una riga per giocatore con pallina di chi serve · nome · game · punti,
piede con il formato e «Parità»/«Vantaggio …») e si allineano alla schermata appena l'utente la manda.

## Prima e dopo (1280×720, 1v1 contro la CPU, 30-15)

| Prima (B10: centro, `--sb` 16,6 px) | Dopo (B17.3: angolo in alto a sinistra, `--sb` 23 px) |
|---|---|
| ![prima](img/punteggio-prima-1280.jpg) | ![dopo](img/punteggio-dopo-1280.jpg) |

Stesso schermo (1280×720, Marco e Giulia):

| Prima: un tabellone al centro, a cavallo della linea | Dopo: un tabellone in alto a sinistra di ogni metà |
|---|---|
| ![prima](img/punteggio-prima-1280-stesso-schermo.jpg) | ![dopo](img/punteggio-dopo-1280-stesso-schermo.jpg) |

Altre schermate: 1920×1080 (![1920](img/punteggio-dopo-1920.jpg)), 1024×600 (![1024](img/punteggio-dopo-1024.jpg)),
ledwall 720×720 con lo stesso schermo (![ledwall](img/punteggio-dopo-ledwall-720-stesso-schermo.jpg)), sfida un amico
con «In attesa di Player 2» sotto il tabellone (![attesa](img/punteggio-dopo-1280-attesa.jpg)), nomi di 24 caratteri a
1920×1080 nello stesso schermo (![nomi lunghi](img/punteggio-dopo-1920-nomi-lunghi.jpg)).

## Misure scelte (CSS in `natpf-tennis/natpf-round.css`, variabili su `#hud-root`)

| Misura | Prima | Dopo | Perché |
|---|---|---|---|
| `--sb` (carattere base del tabellone) | `clamp(13px, 2.3cqh, 32px)` | `clamp(16px, 3.2cqh, 44px)` | +39 %: 23 px a 720p, 35 px a 1080p, 19 px a 1024×600, 16 px a 844×390 (minimo alzato da 13) |
| posizione | `#top-hud-bar` relativa, tabellone con `margin-inline: auto` (centro) | `#top-hud-bar` assoluta a `--sb-top` / `--sb-left`, tabellone a sinistra | stesso angolo della scritta dell'esito in basso (`#timing-popup.anchored`: 10–28 px) |
| `--sb-top` | 12 px fissi | `clamp(10px, 1.8cqh, 24px)` | 13 px a 720p, 19 px a 1080p |
| `--sb-left` | — | `clamp(10px, 1.6cqw, 28px)` | 20 px a 1280, 28 px a 1920, 12 px nel ledwall 720 |
| larghezza massima | `min(94cqw, 26em)` | `min(60cqw, 26em)`; stesso schermo `min(calc(49.8cqw - var(--sb-left) - 110px), 26em)` | non oltre metà schermo; nello stesso schermo lo spazio reale della metà meno il pulsante di pausa (52 px a 18 px dal bordo: comincia a larghezza − 70 px) e 40 px di margine, così la copia del P2, che parte a 50,2 cqw + `--sb-left`, finisce al più a 100 cqw − 110 px (revisione del 08/11: con `min(46cqw, 26em)` a 844×390 copriva la pausa). I nomi lunghi si accorciano con i puntini come prima |
| piede (formato, «Vantaggio …») | `max(10px, 0.62em)` | `max(11px, 0.62em)` | ≥ 11 px chiesti; 14,3 px a 720p, 21,4 px a 1080p, 11,9 px a 1024×600 |
| stesso schermo, metà strette | — | `--sb: clamp(16px, min(3.2cqh, 2.4cqw), 44px)` | nel ledwall 720×720 diviso (358 px per metà) la copia del P2 a 23 px finiva sotto il pulsante di pausa: a 17,3 px le resta libero il margine di 40 px; a 1280 e oltre non cambia nulla |
| «In attesa di Player 2» | centrato, `top: 26px + 5.4·--sb` | `left: --sb-left`, `top: --sb-top + 5.65·--sb`, niente `translate(-50%)` | sotto il tabellone, allineato al suo bordo sinistro (7 px sotto a 720p); il rimpicciolimento durante lo scambio e l'animazione dell'arrivo partono dall'angolo in alto a sinistra |

Il tabellone è alto circa 5,3 em (intestazione 0,58 + due righe 1,57 ciascuna + piede 0,93 + bordi 0,62): **123 px a
720p (17 %)**, 185 px a 1080p (17 %), 103 px a 1024×600. La prova nel browser accetta fino al 20 % dell'altezza (prima
il 13 %, con il carattere piccolo; il 19 % del primo passo passava per 0,5–1 px, revisione del 08/11).

Riquadri misurati dalla prova `tools/e2e/natpf-tabellone.mjs` (x, y, larghezza, altezza in px):

| Schermo | Tabellone | `--sb` | Piede | Copia del P2 (stesso schermo) | Pausa |
|---|---|---|---|---|---|
| 1280×720, 1v1 CPU | 20, 13, 303×123 | 23,0 | 14,3 | — | 1210–1262 |
| 1920×1080, 1v1 CPU | 28, 19, 454×185 | 34,6 | 21,4 | — | 1850–1902 |
| 1024×600, 1v1 CPU | 16, 11, 252×103 | 19,2 | 11,9 | — | 954–1006 |
| 1024×600, stesso schermo, nomi di 24 caratteri al vantaggio | 16, 11, 384×103 | 19,2 | 11,9 | 530, 11, 384×103 (finisce a 914, 40 px prima della pausa; prima della revisione 407 larga → 937, 17 px) | 954 |
| 1280×720, 2v2 CPU («Tu + CPU» / «2 CPU») | 20, 13, 316×123 | 23,0 | 14,3 | — | |
| 1280×720, stesso schermo (Marco/Giulia) | 20, 13, 303×123 (finisce a 323 < 637) | 23,0 | 14,3 | 663, 13, 303×123 (finisce a 966 < 1170) | 1210 |
| 1920×1080, stesso schermo, nomi di 24 caratteri al vantaggio | 28, 19, 733×185 | 34,6 | 21,4 | 992, 19, 733×185 (finisce a 1725 < 1810) | 1850 |
| 844×390, stesso schermo, nomi lunghi | 14, 10, 297×87 | 16 | 11 | 437, 10, 297×87 (finisce a 734, 40 px prima della pausa; prima della revisione 375 larga → 812, **sotto la pausa**) | 774 |
| 1280×720, sfida un amico, «Vantaggio di Player 2» | 20, 13, 351×123 | 23,0 | 14,3 | — | |
| ledwall 720×720, 1v1 CPU | 12, 13, 303×123 | 23,0 | 14,3 | — | 650–702 |
| ledwall 720×720, stesso schermo | 12, 13, 227×93 (finisce a 239 < 358) | 17,3 | 11 | 373, 13, 227×93 (finisce a 600 < 610) | 650 |

## Stesso schermo: perché due tabelloni

Nel disegno diviso ogni metà è lo schermo di un giocatore (camera propria, etichetta in basso, scritta dell'esito nel
proprio angolo). Il tabellone unico al centro stava a cavallo della linea scura, fuori da tutte e due le metà. Ora
`#natpf-scoreboard` sta in alto a sinistra della metà del Player 1 e la copia `#natpf-scoreboard-p2` (markup in
`index.html`, riempita da `natpf_ui.onScore` con lo stesso HTML solo quando lo stesso schermo è attivo, nascosta dal CSS
fuori dallo stesso schermo) in alto a sinistra della metà del Player 2, a `50cqw + 0.2cqw + --sb-left` (la linea scura di
`splitViewports` è larga 0,4 cqw). Le righe sono le stesse (P1 sopra, P2 sotto) su tutti e due: è il tabellone della
partita, non la vista di uno dei due. In allenamento e in arcade restano nascosti come prima (`natpf-ui.css`).

## Revisione del 08/11: la copia del P2 sotto la pausa alle larghezze strette

Con `max-width: min(46cqw, 26em)` nello stesso schermo la copia del P2 (che parte a 50,2 cqw + `--sb-left`) poteva
arrivare a ~96 cqw, mentre il pulsante di pausa (fisso, 52 px a 18 px dal bordo destro) comincia a larghezza − 70 px: a
844×390 con i nomi di 24 caratteri il «40» e il «Vant.» del P2 finivano sotto la pausa (812 > 774), a 1024×600 restavano
17 px dei 40 richiesti. Ora la larghezza massima è lo spazio reale della metà meno pausa e margine,
`min(calc(49.8cqw - var(--sb-left) - 110px), 26em)`: 507 px a 1280, 384 a 1024×600, 297 a 844×390, 237 nel ledwall 720
diviso (dove il tabellone ne usa 227); a 1280 e oltre non cambia nulla. I nomi lunghi e la scritta «Vantaggio …» si
accorciano con i puntini.

| Prima (844×390, nomi lunghi: P2 sotto la pausa) | Dopo (297 px, 40 px prima della pausa) |
|---|---|
| ![prima](img/punteggio-prima-844-stesso-schermo-nomi-lunghi.jpg) | ![dopo](img/punteggio-dopo-844-stesso-schermo-nomi-lunghi.jpg) |

1024×600 con i nomi lunghi (![1024 stesso schermo](img/punteggio-dopo-1024-stesso-schermo-nomi-lunghi.jpg)).

Minori della stessa revisione: la prova pretende il pulsante di pausa in partita (prima `!v.pause ||` passava senza
misurare) e accetta un tabellone alto fino al 20 % dello schermo (il 19 % passava per 0,5–1 px); `startSplit()` e
`endSplit()` del motore chiamano `natpfUi.onScore` così la copia del P2 è piena subito all'avvio dello stesso schermo
(prima restava vuota fino al primo punteggio: `setMatchFormat('singles')` sincronizzava prima di `natpfSplit.active`) e
si svuota alla fine; in arcade `natpf-ui.css` nasconde `.natpf-scoreboard` (anche la copia), come in allenamento.
Preesistente e non toccato qui (da segnalare in B16/B17): nello stesso schermo l'etichetta «AL SERVIZIO» del P2 compare
al bordo sinistro della metà destra a 1280 e tagliata a destra nel ledwall 720.

## Prove

- `cd natpf-tennis && npm test`: 927/927 (aggiornato `test/natpf-scoreboard.test.mjs`: piede ≥ 11 px).
- `node --test tools/test/*.test.mjs`: 197/197. `npm run build`: ok.
- `tools/e2e/natpf-tabellone.mjs` (GAME_PORT 3631): 37/37 verifiche, con le nuove: angolo in alto a sinistra e
  carattere atteso a 1280×720, 1920×1080, 1024×600, ledwall 720×720; 40 px liberi prima della pausa (il pulsante deve
  esserci: senza, la prova è rossa); copia del P2 nello stesso schermo (1280×720, ledwall 720×720, e con i nomi di 24
  caratteri a 1920×1080, 1024×600 e 844×390: nella sua metà e 40 px prima della pausa), piena subito dopo `startSplit()`
  e sparita dopo `endSplit()`; «In attesa di Player 2» 4–24 px sotto il tabellone e allineato; piede ≥ 11 px. Prima
  della correzione della larghezza le due verifiche nuove a 1024×600 e 844×390 erano rosse (34/36). Prova di mutazione:
  senza la regola `body.natpf-split #hud-root { --sb: … 2.4cqw … }` la verifica del ledwall 720 diviso è rossa (36/37:
  carattere 23 px invece di 17; con la nuova larghezza massima la copia resta comunque 40 px prima della pausa).
- `natpf-scritte-2v2.mjs` (la scritta dell'esito ora non deve coprire nemmeno il tabellone, misura `tabellone` in
  `overlaps`): 73/73. `natpf-menu.mjs`: 22/22. `natpf-split-ready.mjs`: 34/34 (i QR e le schede «In attesa» non sono toccati dal tabellone, che compare solo in partita).

Non verificato: schermo reale (Windows, ledwall vero), la schermata di riferimento dell'utente (non arrivata), la
sfida un amico con due computer veri (il tabellone del Player 2 è provato con il ruolo cambiato nel motore).

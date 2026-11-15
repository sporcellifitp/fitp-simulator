# B50 · Prova del ritardo del ledwall per lo staff, e pulizie

Piano dell'analista: `docs/coda/B50-piano-analisi.md` (passi B50-0…B50-10, prove §4). Codice entrato con la versione
**2026-11-14.7** (`8018967`, un solo commit insieme a B40, B48 e B49), senza documento del blocco e senza alcune prove del
piano: questo file è stato scritto nella ripresa del 15/11/2026 (dopo la 14.8), che ha anche aggiunto le prove mancanti.

## 1. Cosa fa

- **Prova del ritardo dello schermo (20 s)** nella diagnostica (`natpf_lag_measure.js` calcolo puro, `natpf_lag_test.js`
  strato e scheda, `natpf_diag.js` pulsante e salvataggio): una palla rimbalza al centro; chi tiene il telefono fa un colpo
  secco a ogni rimbalzo; 18 rimbalzi (3 di riscaldamento, 3 «nascosti» in cui la palla sparisce, 12 misurati). Stima
  robusta in due giri (abbinamento al contatto più vicino, poi scarto oltre 3 MAD), rifiuti con il motivo (pochi colpi,
  colpi sui rimbalzi nascosti, colpi irregolari). Con il riferimento del monitor («Questa era sul monitor», valido 12 ore)
  la proposta è *ledwall − riferimento*; senza, il misurato. Proposta = mediana con le ultime due prove salvate,
  arrotondata a 5 ms, tra 0 e 200. **«Salva»** scrive il ritardo di tutti e due i telefoni del computer (la correzione
  del B48 a `saveLag`). I colpi della prova **non arrivano al gioco** (`probeSwings`, `natpf_phone_racket.js:884-902`).
  Riga del registro `stand.provaRitardo`.
- **Pulizie del piano**:
  - 1a `let screen` in `racchetta.js` (blocco dell'orientamento mai partito): **corretto nel B51** (`viewScreen`,
    `window.screen`), provato da `natpf-telefono-bloccato` («orientamento verticale richiesto dal tocco reale»,
    «dimensioni dello schermo nella diagnostica»).
  - 1b-1 «Parità» e «Vantaggio» nella pillola del tabellone (`natpf_scoreboard.js:38-39`): fatto.
  - 1b-2 istruzioni del servizio a 720×720 (`natpf-ui.css:2386`): fatto.
  - 1b-3 diagnostica con `?diag=1` (la partita resta ferma finché il pannello è aperto): documenti aggiornati nella
    ripresa (`docs/NATPF_DIAGNOSTICA.md` passo 3, riga `diag=1` di `docs/GUIDA_STAND.md`).
  - 1c prova della Leggenda con il riferimento per lato (`tools/e2e/natpf-leggenda.mjs`): fatto.
- **Resti della revisione B41.3** (passaggio §4.5): n. 1 «o Invio» tolto; n. 2 sonde del pannello e della pagina della
  fiera portate in `tools/e2e/` dalla 14.8 (`natpf-stand-layout`, `natpf-fiera-layout`, `natpf-stand-settle`); n. 3
  `?stand=fiera` con la calibrazione «Con i gesti» (il pannello mostra il valore vero, `natpf_kiosk.js:392-394`).

**Come si usa con il mouse:** tasto destro → pannello dello stand → «Diagnostica» → «Ritardo dello schermo» → «▶ Prova
del ritardo (20 s)». Guida dello stand §8.8 e `docs/NATPF_DIAGNOSTICA.md` («Prova del ritardo dello schermo»).

## 2. Misure della stima (ripresa del 15/11)

Partite simulate con il calcolo vero (`natpf_lag_measure.js`), colpo = contatto + ritardo + rumore gaussiano:

| caso | risultato | criterio del piano |
|---|---|---|
| ritardo 0 / 80 / 160 / 200 ms, σ 5 ms, 200 semi | errore massimo 5 / 5 / 5 / 6 ms, nessuna prova rifiutata | ≤ 10 ms |
| persona simulata (σ 35 ms, 10% di colpi persi, 5% a caso), 400 semi, ritardi 0 / 120 / 200 ms | valide 98,0–98,3%, entro 30 ms 98,5–98,7% delle valide | ≥ 95% e ≥ 95% |
| colpi anche sui rimbalzi nascosti | «ritmo» 200/200 | rifiuto |
| 6 colpi su 12 | «pochi» 200/200 | rifiuto |
| due colpi fuori misura (+400, −200 ms) | spostamento 0 ms | ≤ 5 ms |
| colpi molto irregolari, σ 120 ms | «irregolari» 84%; **accettate 16%, con errore fino a ~110 ms** | rifiuto |

**Limite noto (trovato nella ripresa).** Con colpi irregolari la stima accettata può sbagliare: σ 60 ms → accettate 78%,
errore p95 43 ms; σ 80 ms → accettate 45%, errore p95 54 ms; σ 120 ms → accettate 15%, errore p95 87 ms. Il motivo è che
l'abbinamento sceglie per ogni rimbalzo il colpo più vicino, e così la dispersione misurata è più piccola di quella vera.
Stringere la soglia di regolarità (0,07 s) fa rifiutare troppe prove buone: con 0,055 s la persona simulata scende al
94,0–94,5% di prove valide, sotto il 95% del piano. **Scelta: lasciare il calcolo com'è.** In pratica: fare la prova 2–3
volte con la stessa persona (la proposta è la mediana delle ultime tre); la scheda chiede di ripetere quando le prove
differiscono di oltre 40 ms.

## 3. Prove

- Test del gioco `natpf-tennis/test/natpf-b50-ritardo-prova.test.mjs`: **8** (erano 3 nella 14.7; aggiunti nella
  ripresa i gruppi del piano: altezza della palla, persona simulata, rifiuti con il motivo, colpi fuori misura, proposta).
- Nel browser `tools/e2e/natpf-ritardo-schermo.mjs` (B50-9, scritto nella ripresa): gioco vero con un telefono finto che
  colpisce al contatto disegnato + un ritardo noto: pulsante e frase d'aiuto, 80 → 80 ± 20 ms, 160 → 160 ± 20 ms, rifiuto
  «ritmo», riferimento del monitor 30 + ledwall 130 → proposta 100 ± 20, «Salva» sui due telefoni, nessun colpo al motore,
  nessun errore. Risultato nel registro dei passi (`docs/WORK_PROGRESS.md`, ripresa del 15/11).
- Correzione della ripresa: nella diagnostica la frase «Collega un telefono e attiva i sensori per iniziare» restava
  visibile anche con il pulsante acceso; ora si vede solo con il pulsante spento (`natpf_diag.js`).

## 4. Cosa non è provato

- **Ledwall vero e persone vere**: la prova nel browser usa un telefono finto con il ritardo esatto. Sul ledwall il
  numero dipende da chi colpisce (vedi il limite sopra) e dal ritardo vero dello schermo. Da fare allo stand: prova sul
  monitor del PC e poi sul ledwall con la stessa persona, 2–3 volte.
- Telefoni veri (tempo dei colpi del telefono sulla rete della fiera), Windows vero.
- Oltre 160 ms di ritardo dello schermo la palla riparte 2–4 m dietro il personaggio (nota dell'analisi B50 per il
  revisore finale): non cambiato.

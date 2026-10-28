# SESSION_HANDOFF · ultimo stato verificato

Aggiornato 28/10/2026 · branch `natpf-simulator`.

## Priorità attuale

Quattro problemi segnalati: loop del telefono dopo riapertura browser, freeze webcam, palla corta poco riconosciuta, risposte alle palle corte CPU a Leggenda sempre sbagliate. Vedere la sezione finale di `WORK_PROGRESS.md`. Il redesign precedente resta in coda.

## Checkpoint

Base: `59ce56c6640e03884a9ff4da4f7feac892904286` (memoria di Claude preservata). Il commit che contiene questo file salva le correzioni e i test; usare `git log -1` per lo SHA.
400/400 test gioco, 152/152 test root; quattro test di riconnessione falliscono tutti sulla base precedente. Anche le quattro regressioni palla corta/Leggenda falliscono sulla base. Versione 2026-10-28.1; build riuscita con worker e asset MediaPipe offline. LAN da confezionare e verificare.

## Prossima azione esatta

1. Codice e build verificati; checkpoint precedente e4af4ce, questo commit completa il lifecycle webcam.
2. Verificare e creare pacchetto LAN Windows aggiornato; salvare ZIP durevole e aggiornare questo handoff con la consegna.
3. Prova fisica S24 Ultra + Lenovo E14: riaprire browser telefono ripetutamente, accendere/spegnere webcam, palle corte e recuperi a Leggenda. Mai dichiararla già eseguita.

## Limiti dell'ambiente

Chromium Playwright in questa sessione non scaricabile: archivio ricevuto vuoto/troncato. L'ambiente di Claude che aveva Chromium funzionante era diverso. I test webcam sono simulazioni e test del protocollo worker, non misure hardware.

# WORK_PROGRESS · registro dei passi (dal 04/11/2026)

Registro dettagliato dei blocchi di `docs/PIANO_LAVORI.md` (§4): per ogni passo file toccati, intervento, verifiche
con i numeri, ciò che non è verificato, commit e pacchetti. Lo stato sintetico e la prossima azione sono in
`docs/PIANO_LAVORI.md`; il registro fino al 04/11 è in `docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md` (lì si
trovano anche le sezioni citate nei commenti del codice come «WORK_PROGRESS, «…»» scritti prima del 04/11).

Legenda: [x] fatto, verificato e pubblicato · [~] in corso · [ ] da fare.

Modello di una voce:

```
## Bn · titolo · stato · date
Obiettivo · criterio di fine
- [x] Bn.k · cosa (commit abc1234, push sì, pacchetti <versione> | invariati)
  File: … · Verifiche: comando → numeri · Non verificato: …
```

---

## B0 · Continuità · [~] · 04/11/2026
Obiettivo: un file di ripresa unico per tutti gli agenti, regole del 04/11 scritte nelle istruzioni.
Criterio di fine: `docs/PIANO_LAVORI.md` presente e citato da CLAUDE.md e AGENTS.md; test invariati; push fatto.
- [~] B0.1 · `docs/PIANO_LAVORI.md` (checkpoint, regole, risposte dell'utente, punti aperti con cosa/come/perché,
  procedure); `docs/SESSION_HANDOFF.md` e `docs/WORK_PROGRESS.md` archiviati in `docs/archivio/` con `git mv`, al loro
  posto un rimando e questo registro; `CLAUDE.md` (ordine di lettura, push, pacchetti, un agente alla volta, comandi
  aggiornati); `AGENTS.md` nuovo; foto della presa dell'utente in `docs/riferimenti/`.
  Verifica avversaria del piano (workflow, 04/11): un verificatore su tre ha completato (gli altri fermati dal limite
  d'uso); correzioni applicate: CI descritta com'è davvero (due workflow), incoerenza della guida spiegata giusta, punti
  di partenza della calibrazione per la modale, altri testi «martello», regola degli ZIP fedele alle parole
  dell'utente, `CHROMIUM_PATH` obbligatorio, documento Windows rinominato `docs/DESKTOP_WINDOWS.md` (il nome
  `NATPF_*.md` è dell'archivio), punti aperti precedenti con cosa/come/perché.
  Verifiche: su `b076a0d` gioco 673/673, sito 182/182, LAN 5/5 (solo documenti cambiati). Pacchetti invariati.

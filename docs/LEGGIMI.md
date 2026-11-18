# docs/ · indice

Che cosa c'è in `docs/` e cosa si legge per primo. Regole permanenti: `CLAUDE.md` (radice), `AGENTS.md` per gli altri agenti.

## Documenti vivi (si aggiornano)

| File | A cosa serve |
|---|---|
| `TRACCIA_PASSI.md` | **da leggere per primo**: stato attuale, decisioni ancora valide, prossimi passi (breve, a ogni passo) |
| `PIANO_LAVORI.md` | file di ripresa: ultimo Checkpoint con la «Prossima azione esatta», regole dell'utente, registro dei blocchi (§4), punti aperti (§5), procedure dei pacchetti (§6) |
| `WORK_PROGRESS.md` | registro dei passi dal 16/11/2026: file toccati, verifiche con i numeri, non verificato |
| `PROJECT_MEMORY.md` | decisioni tecniche durature (gesti, audio, schermo e ledwall, pacchetti, …) |
| `PRODOTTI_FIERA_E_ONLINE.md` | i due prodotti (FIERA e ONLINE/white label) e registro delle richieste per prodotto |
| `GUIDA_STAND.md` | guida dello staff allo stand (tutte le opzioni con il solo mouse) |
| `PASSAGGIO_CONSEGNE.md` | passaggio di consegne fino all'08/11 (storia, ancora citato da CLAUDE.md) |

Guide operative (citate dal codice o dai workflow): `COLLAUDO_WINDOWS.md` (copiato accanto all'installer dal workflow
Windows), `DESKTOP_WINDOWS.md`, `GUIDA_AGGIORNAMENTI_R2.md`, `GUIDA_REGISTRO_CLOUDFLARE.md`, `GUIDA_TURN_CLOUDFLARE.md`,
`GUIDA_TELECOMANDO.md`, `GUIDA_MISURA_MIRA.md`, `NATPF_DIAGNOSTICA.md`, `NATPF_LEGGENDA.md`.
`NATPF_PLAYABILITY_2026-10-16.md` lo legge `tools/package-natpf.py`: non spostarlo senza cambiare lo script.

## Blocchi di lavoro: `docs/bNN/`

Una cartella per blocco (`b9` … `b69`), con il documento del blocco, misure e immagini. Il numero è quello del registro
dei blocchi (`PIANO_LAVORI.md` §4) e delle voci di `WORK_PROGRESS.md`. Il codice cita questi percorsi nei commenti: non
rinominarli. Alcune cartelle sono anche uscita di script: `b9/img`, `b17/img`, `b23/img`; `b17/gesti-video.json` è letto da
`natpf-tennis/scripts/video/ottimizza.mjs` e `tools/e2e/natpf-gesti-video-confronto.mjs`.

Altre cartelle:
- `coda/`: schede dei blocchi preparati in coda (B28.1, B37–B50), tutti chiusi; citate da commenti del codice.
- `analisi/`: anteprime delle mascotte 3D (B63, B67, B69) e analisi delle ridondanze del 17/11.
- `hardware/`: progetto parallelo HW1 (grip-racchetta come controller).
- `riferimenti/`: foto dell'utente (presa, Lob & Drop); `lob-drop-2026-11-11.webp` è usata da `tools/e2e/natpf-lob-drop.mjs`.

## Archivio: `docs/archivio/` (si consulta, non si aggiorna)

| File | Contenuto |
|---|---|
| `TRACCIA_PASSI_fino_al_2026-11-18.md` | traccia integrale dal 12/11 al 18/11 |
| `WORK_PROGRESS_dal_2026-11-04_al_2026-11-15.md` | blocchi B0–B52 del registro |
| `WORK_PROGRESS_fino_al_2026-11-04.md`, `SESSION_HANDOFF_fino_al_2026-11-04.md` | diari dal 28/10 al 04/11 |
| `PIANO_LAVORI_checkpoint_fino_al_2026-11-18.md`, `PIANO_checkpoint_fino_al_2026-11-07.md` | checkpoint vecchi di `PIANO_LAVORI.md` |
| `consegna-2026-11-15/` | passaggio di consegne del 15/11 e script di rilascio di allora |
| `MEMORY.md`, `SESSION_HANDOFF.md`, `WORKLOG.md` | diari fino al 28/10 (prima alla radice del repository) |
| `GAMEPLAY_PROPOSAL.md`, `PRIORITY_AUDIT.md`, `NATPF_*_2026-10-1x.md` | analisi del 15–16/10 |

Restano ancora alla radice di `docs/` altri documenti fermi al 21–27/10 (`NATPF_*.md` non elencati sopra,
`RIPRESA_AGENTE.md`, `revisione-finale-2026-11-13.md`) e quelli del vecchio sito «Foro Italico World» (`v0.*.md`,
`mondo-analisi-e-piano.md`): da spostare in archivio solo con l'accordo dell'utente (alcuni sono citati nei commenti).

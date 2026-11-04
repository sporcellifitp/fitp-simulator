# AGENTS.md · istruzioni per ogni agente (Codex e altri)

Le istruzioni complete e vincolanti sono in **`CLAUDE.md`**: valgono identiche per tutti gli agenti, non solo per
Claude. In breve, a ogni apertura del progetto:

1. Leggere **`docs/PIANO_LAVORI.md`**: checkpoint con l'ultimo stato verificato e la «Prossima azione esatta», regole
   di lavoro e decisioni dell'utente, punti aperti con stato, cosa fare, come e perché.
2. `git fetch origin natpf-simulator` · `git status -sb` · `git log --oneline -10`: se il repository e i documenti
   divergono, vale il repository.
3. Lavorare solo sul branch `natpf-simulator`, un agente alla volta, a passi piccoli: test verdi → commit → push
   (solo avanzamento lineare, mai `--force`) → Checkpoint di `docs/PIANO_LAVORI.md` riscritto e voce in
   `docs/WORK_PROGRESS.md`. Dopo ogni commit: ZIP LAN e Cloudflare consegnati all'utente (nuovi se il commit cambia i
   pacchetti, altrimenti gli ultimi, dicendolo).

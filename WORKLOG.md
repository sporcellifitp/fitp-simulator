# WORKLOG · decisioni e checkpoint

Cronologia breve delle decisioni e dei checkpoint dei giri di lavoro lunghi. Lo stato da cui ripartire è in
`SESSION_HANDOFF.md`; la memoria del progetto in `MEMORY.md`.

## 22/10/2026 · giro «racchetta virtuale»

- Checkpoint 1: ZIP della sessione reale letto (eventi, metriche, profilo). Prime evidenze in `SESSION_HANDOFF.md`:
  lateralità del telefono e del computer non allineate, servizio sempre automatico, pallonetti con confidenza bassa,
  direzione dal piatto spesso saturata, colpi a vuoto con la palla lontana. Collegamento e prestazioni in ordine.
- Checkpoint 2 (fine diagnosi): `docs/NATPF_RACCHETTA_VIRTUALE.md` §2 (P1–P10).
  - Scoperte dai campioni grezzi:
    - dopo «Salta» della calibrazione il verso del gesto era sempre 0;
    - la deriva del giroscopio tolta era il movimento della mano;
    - il verso si misura dalla gravità senza calibrazione;
    - il percorso ottenuto integrando l'accelerazione non è affidabile a 60 Hz.
  - Decisioni:
    - la mano la decide il gioco sul computer;
    - il percorso della racchetta si calcola dal giroscopio (rotazione × asse lungo del telefono);
    - la direzione viene dal tempo dentro la finestra e dal piatto rispetto al proprio colpo abituale;
    - nessun numero casuale nel colpo di chi gioca;
    - finestra d'impatto arcade a tutti i livelli.

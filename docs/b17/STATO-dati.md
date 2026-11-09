# B17.1 · passo A (dati dal video) · stato dei lavori

> File di ripresa del passo A (chi riprende legge questo, poi `docs/b17/gesti-video.md`). Aggiornato a ogni commit.

## Fatto
- `natpf-tennis/scripts/video/estrai-posa.mjs`: opzione `--ranges=30-150,225-360` (più tratti nello stesso processo).
- Confronto Pose *heavy* (complessità 2) / *full* (complessità 1) su 21 fotogrammi (270–290, inizio del dritto):
  scarto ≤ 6 px su gomito e polso destri, ≤ 11 px sulle anche, profondità mondo ≤ 0,10 m sul braccio destro;
  tempi 2,1 s → 0,4–0,5 s per fotogramma. **Si usa `--pose=1`** per tutta l'estrazione.
- Estrazione lanciata (09/11 08:57 UTC) in 4 processi in background sui tratti dei colpi più la presa:
  p1 30–150 e 225–360, p2 432–612 e 660–720, p3 807–1010, p4 721–756 e 1011–1158 (895 fotogrammi);
  uscite `scratchpad/b17/mp-p1..p4.json`, log `mp-p1..p4.log`.

## Da fare
- Attendere i 4 JSON, unirli (`ricostruisci.mjs --in=a,b,c,d`), ricostruire, segmentare, misurare → `docs/b17/gesti-video.json`
  e sezione RISULTATI di `docs/b17/gesti-video.md`.
- Fogli `docs/b17/img/V-*.webp` (≥ 10 fotogrammi per colpo), guardarli, correggere dove lo scheletro sbaglia.
- Test del gioco e del sito, commit finale.

## Non verificato
- Nessun dato dei colpi ancora ricostruito (solo la prova sul tratto 270–290).

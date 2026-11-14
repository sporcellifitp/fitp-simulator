# B44 · Servizio: un'animazione leggera al posto del riquadro di testo

Richiesta dell'utente (13/11 notte): «Togli "Premi ↑ o W: lanci la palla", è orribile, magari metti una leggera animazione
per indicare di salire su». Decisioni con le domande a scelta:
- **al posto del riquadro** «Premi ↑ o W: lanci la palla / Poi colpisci quando la palla è in alto» (e della versione del
  telefono «Alza il telefono: lanci la palla»; istruzioni del servizio del B18, `natpf_serve_coach.js`) una **piccola icona
  di telefono che sale con la palla sopra, in loop, accanto a chi batte, senza scritte**;
- **solo ai primi servizi**: ai primi 2 servizi di ogni giocatore nuovo (anche dopo «Nuovo giocatore» e nel formato in
  fiera), poi sparisce; torna se chi batte non lancia per qualche secondo (oggi c'è già un tempo d'attesa nel coach del
  servizio: riusarlo).

Da tenere: la casella gialla «Al servizio» e il riquadro di servizio a terra (B37.1); il lancio automatico dopo 30 s del
B25 (opzione dello stand) e il suo avviso; lo stesso schermo (una icona per metà, nella metà di chi batte); la sfida tra due
computer (sul computer di chi batte). Con mouse e tastiera l'icona può essere la stessa (o una freccia ↑ piccola) ma senza
testo. Leggera: niente asset pesanti, CSS con cqw/cqh e `@container natpf` o un piccolo oggetto 3D senza ombre; il
tutorial e l'allenamento («Servizio») devono dire la stessa cosa del gioco.

Prove: test di unità (quando compare e quando no: primi 2 servizi, giocatore nuovo, attesa, CPU che batte → mai);
prove nel browser `natpf-servizio-lancio`, `natpf-chi-serve`, `natpf-stesso-schermo-b20`, `natpf-formato-fiera`,
`natpf-tabellone`; schermate guardate (contro la CPU, stesso schermo, 1920×1080, 720×720, 1920×540). Documento
`docs/b44/servizio-animato.md`.

# B17.1 · La presa dell'utente (foto del 09/11/2026)

Foto mandate dall'utente su richiesta del passo B: `docs/riferimenti/presa-utente-2026-11-09-dietro.webp` (vista da
dietro, lato di chi gioca) e `…-davanti.webp` (vista da davanti, lato dello schermo di gioco). Sostituiscono il
fotogramma del video come riferimento della presa «upright» e la foto del 04/11 (`presa-palmo-utente-2026-11-04.webp`)
come immagine della scheda «Presa».

## Che cosa si vede
- Il telefono sta **orizzontale, lungo l'avambraccio**, con la **cima (lato delle fotocamere) in avanti**, verso lo
  schermo di gioco; non in verticale nel pugno.
- Lo **schermo è rivolto in avanti e un poco in alto** (nella foto da davanti si vede il display); il **dorso con le
  fotocamere è verso chi gioca** e verso l'alto (foto da dietro).
- Le **quattro dita avvolgono il bordo inferiore** del telefono (quello opposto alle fotocamere) e sporgono poco sul
  vetro; il **pollice corre lungo il bordo laterale** superiore, disteso, non sullo schermo.
- Il polso è dritto, in linea con l'avambraccio; il telefono è inclinato di circa 15–25° verso l'alto rispetto
  all'avambraccio (la cima più in alto della base).
- È la presa «a manico di racchetta»: il telefono prolunga l'avambraccio come farebbe il manico, con il piatto dello
  schermo che fa da piatto corde.

## Conseguenze per il passo B
- `GRIP_POSE.upright` va definita così (asse lungo del telefono ≈ avanti, normale dello schermo ≈ avanti-alto,
  bordo destro del telefono verso il pollice), non con il telefono verticale come letto a occhio dal video (lì nei
  primi secondi l'utente mostrava lo schermo alla camera; nei colpi il telefono è come nelle foto).
- La scheda «Presa» mostra la foto da davanti (chi gioca la vede come la vede nello specchio dello schermo) e, di
  lato, il disegno; le indicazioni: «Telefono disteso nel palmo, cima in avanti», «Dita sotto, attorno al bordo»,
  «Pollice lungo il bordo, schermo verso lo schermo di gioco».
- Il riconoscimento è calibrato su chi gioca e non dipende dalla presa; i test di fedeltà vanno rifatti con questa
  posa della mano (il telefono gira attorno alla verticale nel dritto e nel rovescio, come con la presa nel palmo).

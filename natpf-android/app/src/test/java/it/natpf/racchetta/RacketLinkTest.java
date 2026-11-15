package it.natpf.racchetta;

import static org.junit.Assert.*;

import org.junit.Test;

public class RacketLinkTest {
  private static final String LAN = "https://192.168.1.20:8443/natpf/tennis/racchetta.html#s=racchetta-tel-thhrdse8iu3r46qq2d95wngd7k&k=kztdcvx45rx4mksczjyee2487j";
  private static final String CF = "https://natpf.example.pages.dev/natpf/tennis/racchetta.html#s=racchetta-tel-abc&k=def";

  @Test public void riconosceIlLinkDelQrInReteLocaleESuCloudflare() {
    assertTrue(RacketLink.isRacketUrl(LAN));
    assertTrue(RacketLink.isRacketUrl(CF));
    assertTrue(RacketLink.isRacketUrl("http://10.0.0.5:8080/natpf/tennis/racchetta.html"));
  }

  @Test public void rifiutaAltriLinkEAltriSchemi() {
    assertFalse(RacketLink.isRacketUrl(null));
    assertFalse(RacketLink.isRacketUrl(""));
    assertFalse(RacketLink.isRacketUrl("https://192.168.1.20:8443/natpf/"));
    assertFalse(RacketLink.isRacketUrl("https://192.168.1.20:8443/natpf/tennis/racchetta.html.evil/x"));
    assertFalse(RacketLink.isRacketUrl("javascript:alert(1)//tennis/racchetta.html"));
    assertFalse(RacketLink.isRacketUrl("file:///sdcard/tennis/racchetta.html"));
    assertFalse(RacketLink.isRacketUrl("intent://x/tennis/racchetta.html"));
  }

  @Test public void estraeIlLinkDaUnTestoCondivisoETieneLaChiave() {
    assertEquals(LAN, RacketLink.extract(LAN));
    assertEquals(LAN, RacketLink.extract("NATPF Simulator · controller smartphone " + LAN));
    assertEquals(LAN, RacketLink.extract("Apri «" + LAN + "».")); // virgolette e punto finale tolti
    assertEquals(CF, RacketLink.extract("https://example.com/altro " + CF));
    assertNull(RacketLink.extract("nessun link qui"));
    assertNull(RacketLink.extract("https://example.com/pagina"));
  }

  @Test public void stessaOrigineConLePorteDiBase() {
    assertTrue(RacketLink.sameOrigin(LAN, "https://192.168.1.20:8443/natpf/tennis/altro.html"));
    assertFalse(RacketLink.sameOrigin(LAN, "https://192.168.1.21:8443/natpf/tennis/racchetta.html"));
    assertFalse(RacketLink.sameOrigin(LAN, "http://192.168.1.20:8443/natpf/tennis/racchetta.html"));
    assertTrue(RacketLink.sameOrigin("https://a.dev/x", "https://a.dev:443/y"));
    assertFalse(RacketLink.sameOrigin("https://a.dev/x", "https://a.dev:8443/y"));
  }
}

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

  @Test public void certificatoDelPcDelloStandSoloInReteLocaleESulloStessoIndirizzo() {
    // pagina del QR, file della pagina e collegamento wss del PC: sì
    assertTrue(RacketLink.trustStandCertificate(LAN, LAN));
    assertTrue(RacketLink.trustStandCertificate(LAN, "https://192.168.1.20:8443/natpf/js/tennis/racchetta.js"));
    assertTrue(RacketLink.trustStandCertificate(LAN, "wss://192.168.1.20:8443/lan-signal"));
    assertTrue(RacketLink.trustStandCertificate("https://10.0.0.5:8443/natpf/tennis/racchetta.html", "https://10.0.0.5:8443/x"));
    assertTrue(RacketLink.trustStandCertificate("https://172.20.1.2:8443/natpf/tennis/racchetta.html", "https://172.20.1.2:8443/x"));
    // altro indirizzo, Cloudflare, nomi, http, indirizzi pubblici o scritti in modo strano: no
    assertFalse(RacketLink.trustStandCertificate(LAN, "https://192.168.1.21:8443/x"));
    assertFalse(RacketLink.trustStandCertificate(LAN, "https://evil.example/x"));
    assertFalse(RacketLink.trustStandCertificate(CF, CF));
    assertFalse(RacketLink.trustStandCertificate("https://pc-stand.local:8443/natpf/tennis/racchetta.html", "https://pc-stand.local:8443/x"));
    assertFalse(RacketLink.trustStandCertificate("http://192.168.1.20:8080/natpf/tennis/racchetta.html", "https://192.168.1.20:8080/x"));
    assertFalse(RacketLink.trustStandCertificate("https://8.8.8.8/natpf/tennis/racchetta.html", "https://8.8.8.8/x"));
    assertFalse(RacketLink.trustStandCertificate("https://172.32.0.1/natpf/tennis/racchetta.html", "https://172.32.0.1/x"));
    assertFalse(RacketLink.trustStandCertificate("https://192.168.001.020/natpf/tennis/racchetta.html", "https://192.168.001.020/x"));
    assertFalse(RacketLink.trustStandCertificate(null, LAN));
    assertFalse(RacketLink.trustStandCertificate(LAN, null));
  }

  @Test public void stessaOrigineConLePorteDiBase() {
    assertTrue(RacketLink.sameOrigin(LAN, "https://192.168.1.20:8443/natpf/tennis/altro.html"));
    assertFalse(RacketLink.sameOrigin(LAN, "https://192.168.1.21:8443/natpf/tennis/racchetta.html"));
    assertFalse(RacketLink.sameOrigin(LAN, "http://192.168.1.20:8443/natpf/tennis/racchetta.html"));
    assertTrue(RacketLink.sameOrigin("https://a.dev/x", "https://a.dev:443/y"));
    assertFalse(RacketLink.sameOrigin("https://a.dev/x", "https://a.dev:8443/y"));
  }
}

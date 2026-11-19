package it.natpf.racchetta;

import static org.junit.Assert.*;

import org.junit.Test;

/** B71: sensori dell'app (docs/b71/sensori.md). Unità e assi come devicemotion di Chrome, ritmo a 60 Hz, lotti, orologio. */
public class CampioniNativiTest {
  private static final double G = 9.80665;
  private static final long MS = 1_000_000L;

  /** Il lotto letto come lo legge la pagina (sensori-nativi.js parseBatch): [persi, [t µs, 9 valori in decimi]…]. */
  private static long[][] leggi(String testo) {
    String[] parti = testo.split(";", -1);
    long[][] out = new long[parti.length][];
    out[0] = new long[] { Long.parseLong(parti[0]) };
    for (int i = 1; i < parti.length; i++) {
      String[] c = parti[i].split(",", -1);
      assertEquals("10 campi per campione", 10, c.length);
      out[i] = new long[10];
      for (int k = 0; k < 10; k++) out[i][k] = c[k].isEmpty() ? Long.MIN_VALUE : Long.parseLong(c[k]);
    }
    return out;
  }

  @Test public void unitaEAssiComeChrome() {
    CampioniNativi c = new CampioniNativi();
    // telefono in verticale, fermo: +9,8 sull'asse y (verso l'alto, segno grezzo di Android come lo passa Chrome)
    c.accelerometro(0.04f, (float) G, -0.26f);
    c.lineare(0.01f, -0.04f, 0.05f);
    // 1 rad/s sull'asse x, −2 su y, 0,5 su z: alpha = x, beta = y, gamma = z in °/s (device_motion_event_pump.cc)
    assertTrue(c.giroscopio(1f, -2f, 0.5f, 5_000 * MS, 5_000 * MS + 3 * MS));
    long[][] l = leggi(c.svuota());
    assertEquals(0, l[0][0]);
    assertEquals(2, l.length);
    long[] s = l[1];
    assertEquals("istante dell'evento in µs, non l'arrivo", 5_000_000L, s[0]);
    assertArrayEquals(new long[] { 0, 98, -3 }, new long[] { s[1], s[2], s[3] });           // decimi di m/s² (0,1 come Chromium)
    assertArrayEquals(new long[] { 0, 0, 1 }, new long[] { s[4], s[5], s[6] });             // 0,05 → 0,1 (metà lontano da zero)
    assertArrayEquals(new long[] { 573, -1146, 286 }, new long[] { s[7], s[8], s[9] });     // 57,3 °/s · −114,6 · 28,6
    assertEquals("svuotato", "0", c.svuota());
  }

  @Test public void arrotondamentoDiChromium() {
    assertEquals(1, CampioniNativi.decimi(0.05));
    assertEquals(-1, CampioniNativi.decimi(-0.05));
    assertEquals(0, CampioniNativi.decimi(0.0499));
    assertEquals(785, CampioniNativi.decimi(78.4532));      // fondo scala ±8 g
    assertEquals(0, CampioniNativi.decimi(Double.NaN));
    // 2000 °/s in rad/s → 2000,0
    assertEquals(20000, CampioniNativi.decimi(Math.toRadians(2000) * CampioniNativi.RAD_GRADI));
  }

  @Test public void senzaAccelerometroNienteCampioneESenzaLineareCampiVuoti() {
    CampioniNativi c = new CampioniNativi();
    assertFalse("prima dell'accelerometro niente", c.giroscopio(0, 0, 0, 1000 * MS, 1000 * MS));
    c.accelerometro(0, 9.8f, 0);
    assertTrue(c.giroscopio(0, 0, 0, 1020 * MS, 1020 * MS));
    String t = c.svuota();
    assertEquals("0;1020000,0,98,0,,,,0,0,0", t);
    long[][] l = leggi(t);
    assertEquals(Long.MIN_VALUE, l[1][4]);
  }

  /** Giroscopio a f Hz per secondi: quanti campioni consegna (la griglia dei 60 Hz di Chrome). */
  private static int consegnati(double hz, double secondi, double tremolio) {
    CampioniNativi c = new CampioniNativi();
    c.accelerometro(0, 9.8f, 0);
    java.util.Random r = new java.util.Random(7);
    int n = 0;
    double per = 1000 / hz;
    for (double t = 0; t < secondi * 1000; t += per) {
      double tt = 10_000 + t + (r.nextDouble() - .5) * tremolio;
      if (c.giroscopio(0, 0, 0, Math.round(tt * MS), Math.round(tt * MS))) n++;
      if (c.inAttesa() > 100) c.svuota();
    }
    return n;
  }

  @Test public void ritmoDi60HzQualunqueSiaIlSensore() {
    // sensore a 60 Hz con un tremolio di ±1 ms: passano tutti
    int a = consegnati(60, 10, 2);
    assertTrue("60 Hz: " + a, a >= 598 && a <= 601);
    // sensore a 104 Hz (molti telefoni, chiedendo 60 Hz): ~60 al secondo, mai di più
    int b = consegnati(104, 10, 1);
    assertTrue("104 Hz → " + b, b >= 580 && b <= 610);
    // 200 Hz
    int d = consegnati(200, 10, 0.5);
    assertTrue("200 Hz → " + d, d >= 590 && d <= 610);
    // sensore più lento (50 Hz): passano tutti, come prima
    int e = consegnati(50, 10, 1);
    assertTrue("50 Hz: " + e, e >= 499 && e <= 501);
  }

  @Test public void lottiInRitardoNessunCampionePersoFinoAllaCapienza() {
    CampioniNativi c = new CampioniNativi();
    c.accelerometro(0, 9.8f, 0);
    // la pagina ferma per 200 ms: 12 campioni aspettano con il loro istante
    for (int i = 0; i < 12; i++) c.giroscopio(0, 0, i, (2000 + Math.round(i * 16.667)) * MS, 2300 * MS);
    long[][] l = leggi(c.svuota());
    assertEquals(0, l[0][0]);
    assertEquals(13, l.length);
    for (int i = 1; i < l.length; i++) assertTrue("in ordine", i == 1 || l[i][0] > l[i - 1][0]);
    assertEquals(2_000_000L, l[1][0]);
    // pagina che non chiede niente per più di CAPIENZA campioni: si buttano i più vecchi e si contano
    for (int i = 0; i < CampioniNativi.CAPIENZA + 25; i++) c.giroscopio(0, 0, 0, (3000 + Math.round(i * 16.667)) * MS, (3000 + Math.round(i * 16.667)) * MS);
    long[][] m = leggi(c.svuota());
    assertEquals(25, m[0][0]);
    assertEquals(CampioniNativi.CAPIENZA + 1, m.length);
    assertEquals("il primo tenuto è il 26°", (3000 + Math.round(25 * 16.667)) * 1000, m[1][0]);
    assertEquals("dopo lo svuotamento i persi ripartono da zero", "0", c.svuota());
  }

  @Test public void orologioDegliEventi() {
    // evento sulla base di elapsedRealtime (la regola di Android): si tiene l'istante dell'evento
    assertEquals(5_000_000L, CampioniNativi.istanteUs(5_000 * MS, 5_030 * MS));
    // base strana (troppo lontana dall'ora), zero o negativa: l'ora d'arrivo
    assertEquals(9_000_000L, CampioniNativi.istanteUs(1 * MS, 9_000 * MS));
    assertEquals(9_000_000L, CampioniNativi.istanteUs(0, 9_000 * MS));
    assertEquals(9_000_000L, CampioniNativi.istanteUs(20_000 * MS, 9_000 * MS));
  }

  @Test public void azzeraDaCapo() {
    CampioniNativi c = new CampioniNativi();
    c.accelerometro(0, 9.8f, 0); c.lineare(0, 0, 0);
    c.giroscopio(0, 0, 0, 1000 * MS, 1000 * MS);
    c.azzera();
    assertEquals("0", c.svuota());
    assertFalse("dopo azzera serve di nuovo l'accelerometro", c.giroscopio(0, 0, 0, 1100 * MS, 1100 * MS));
  }

  @Test public void infoSoloNumeri() {
    String s = CampioniNativi.info(new float[] { 78.4532f, 0.0023956f, 2404, 0 }, new float[] { 34.906586f, 0.0010652f, 2404, 300 }, null);
    assertEquals("{\"p\":1,\"us\":16667,\"acc\":[78.5,0.0024,2404,0],\"gir\":[2000.0,0.0610,2404,300],\"lin\":null}", s);
    for (String vietato : new String[] { "nome", "name", "vendor", "id\"" }) assertFalse(vietato, s.contains(vietato));
    assertEquals("{\"p\":1,\"us\":16667,\"acc\":null,\"gir\":null,\"lin\":null}", CampioniNativi.info(null, null, null));
  }
}

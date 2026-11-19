package it.natpf.racchetta;

import static org.junit.Assert.*;

import org.junit.Test;

/** B71: schermo spento con il tasto di accensione mentre si gioca (docs/b71/sensori.md). */
public class RisveglioSchermoTest {
  @Test public void inUsoSiRiaccendeFuoriNo() {
    RisveglioSchermo r = new RisveglioSchermo();
    r.inUso(true);
    assertTrue(r.spento(1_000, false));
    r.inUso(false);
    assertFalse("menu, fine partita: lo schermo resta spento", r.spento(60_000, true));
  }

  @Test public void treVolteDiFilaLoVuoleSpento() {
    RisveglioSchermo r = new RisveglioSchermo();
    r.inUso(true);
    assertTrue(r.spento(10_000, false));
    assertTrue(r.spento(15_000, false));
    assertFalse("terza volta in 20 s: spento apposta", r.spento(18_000, false));
    assertFalse(r.spento(25_000, false));
    // passati 20 s dall'ultima riaccensione si riaccende di nuovo
    assertTrue(r.spento(40_000, false));
  }

  @Test public void paginaDiPrimaValeLAppFissata() {
    RisveglioSchermo r = new RisveglioSchermo();
    assertFalse(r.spento(1_000, false));
    assertTrue("pagina 18.3 (non dice niente) con l'app fissata", r.spento(2_000, true));
    r.inUso(false);
    assertFalse("appena la pagina parla vale la pagina", r.adesso(true));
  }
}

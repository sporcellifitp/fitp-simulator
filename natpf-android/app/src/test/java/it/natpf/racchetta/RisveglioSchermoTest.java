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

  /** B71, revisione: l'«in uso» della pagina non vale più se la pagina è nascosta o cambiata. */
  @Test public void paginaNascostaOCambiataNonVale() {
    RisveglioSchermo r = new RisveglioSchermo();
    r.inUso(true);
    assertFalse("schermata d'avvio dello staff (pagina nascosta): resta spento", r.spento(1_000, false, false));
    assertFalse("pagina non arrivata: resta spento", r.adesso(false, true));
    assertTrue("pagina aperta che dice «in uso»", r.spento(2_000, true, false));
    // tre volte «volume giù»: schermata d'avvio, quello che diceva la pagina si dimentica
    r.azzera();
    assertFalse("pagina nuova che non ha ancora parlato, app non fissata", r.spento(60_000, true, false));
    assertTrue("pagina nuova che non ha ancora parlato, app fissata con la pagina aperta", r.spento(61_000, true, true));
    r.inUso(false);
    assertFalse(r.adesso(true, true));
  }
}

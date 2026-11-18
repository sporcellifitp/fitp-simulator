package it.natpf.racchetta;

import static org.junit.Assert.*;

import org.junit.Test;

public class PhoneStatusTest {
  private static final int N = PhoneStatus.NONE;

  @Test public void bandaDallaFrequenza() {
    assertEquals(2.4, PhoneStatus.band(2412), 0);
    assertEquals(2.4, PhoneStatus.band(2484), 0);
    assertEquals(5, PhoneStatus.band(5180), 0);
    assertEquals(5, PhoneStatus.band(5825), 0);
    assertEquals(6, PhoneStatus.band(5955), 0);
    assertEquals(0, PhoneStatus.band(-1), 0);
    assertEquals(0, PhoneStatus.band(0), 0);
  }

  @Test public void batteria() {
    assertEquals(76, PhoneStatus.batteryPercent(76, 100));
    assertEquals(50, PhoneStatus.batteryPercent(128, 256));
    assertEquals(N, PhoneStatus.batteryPercent(-1, 100));
    assertEquals(N, PhoneStatus.batteryPercent(50, 0));
  }

  @Test public void testoSoloConINumeriCheCi() {
    assertEquals("{\"rssi\":-58,\"ghz\":5,\"mbps\":433,\"batt\":76,\"carica\":1,\"temp\":312,\"fissa\":1,\"spenti\":2}",
        PhoneStatus.json(-58, 5180, 433, 76, 1, 312, 1, 2));
    assertEquals("{\"ghz\":2.4,\"fissa\":0,\"spenti\":0}", PhoneStatus.json(N, 2437, N, N, -1, N, 0, 0));
    // Wi-Fi spenta (rssi −127 del sistema, frequenza −1, velocità −1): niente rete
    assertEquals("{\"batt\":40,\"carica\":0,\"spenti\":3}", PhoneStatus.json(-127, -1, -1, 40, 0, N, -1, 3));
    assertEquals("{}", PhoneStatus.json(N, 0, N, N, -1, N, -1, -1));
  }

  @Test public void maiNomiDiReteOIndirizzi() {
    String s = PhoneStatus.json(-60, 5500, 300, 50, 0, 280, 1, 1);
    for (String vietato : new String[] {"ssid", "bssid", "ip", "mac", "nome", "\"id\""}) assertFalse(vietato, s.toLowerCase().contains(vietato));
  }
}

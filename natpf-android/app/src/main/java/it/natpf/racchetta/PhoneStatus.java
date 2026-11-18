package it.natpf.racchetta;

import java.util.Locale;

/**
 * Stato del telefono per il registro dello stand (B66, richiesta dell'utente del 18/11/2026): segnale e banda della Wi-Fi,
 * velocità del collegamento, batteria, carica, temperatura della batteria, «Fissa app», schermi spenti. La pagina della
 * racchetta lo legge dal ponte (Bridge.stato) e lo manda al PC a grandi linee (site/js/tennis/phone-stats.js).
 *
 * Solo numeri: MAI nome della rete (SSID), indirizzo del punto d'accesso (BSSID), indirizzi IP o MAC, identificativi del
 * telefono. Questa classe non li riceve nemmeno: chi la chiama le passa solo i numeri. Niente Android qui: si prova con JUnit.
 */
public final class PhoneStatus {
  private PhoneStatus() {}

  /** Valore che manca (Wi-Fi spenta, batteria non letta…). */
  public static final int NONE = Integer.MIN_VALUE;

  /** Banda della Wi-Fi in GHz dalla frequenza del canale (MHz): 2.4, 5, 6; 0 se non si sa. */
  public static double band(int mhz) {
    if (mhz >= 2400 && mhz < 2500) return 2.4;
    if (mhz >= 4900 && mhz < 5900) return 5;
    if (mhz >= 5925 && mhz < 7125) return 6;
    return 0;
  }

  /** Batteria in percentuale da livello e scala del sistema; NONE se non c'è. */
  public static int batteryPercent(int level, int scale) {
    if (level < 0 || scale <= 0) return NONE;
    return Math.max(0, Math.min(100, Math.round(level * 100f / scale)));
  }

  /**
   * Il testo per la pagina: un JSON piccolo con i soli campi che ci sono.
   * rssi dBm (−127…0) · ghz banda · mbps velocità del collegamento · batt % · carica 0/1 · temp decimi di °C · fissa 0/1 ·
   * spenti schermi spenti dall'avvio dell'app.
   */
  public static String json(int rssi, int mhz, int mbps, int batt, int carica, int tempDeci, int fissa, int spenti) {
    StringBuilder b = new StringBuilder("{");
    if (rssi != NONE && rssi > -127 && rssi <= 0) add(b, "rssi", Integer.toString(rssi));
    double ghz = band(mhz);
    if (ghz > 0) add(b, "ghz", ghz == 2.4 ? "2.4" : Integer.toString((int) ghz));
    if (mbps != NONE && mbps >= 0 && mbps <= 10000) add(b, "mbps", Integer.toString(mbps));
    if (batt != NONE && batt >= 0 && batt <= 100) add(b, "batt", Integer.toString(batt));
    if (carica == 0 || carica == 1) add(b, "carica", Integer.toString(carica));
    if (tempDeci != NONE && tempDeci > -400 && tempDeci < 1000) add(b, "temp", Integer.toString(tempDeci));
    if (fissa == 0 || fissa == 1) add(b, "fissa", Integer.toString(fissa));
    if (spenti >= 0) add(b, "spenti", Integer.toString(spenti));
    return b.append('}').toString();
  }

  private static void add(StringBuilder b, String k, String v) {
    if (b.length() > 1) b.append(',');
    b.append('"').append(k.toLowerCase(Locale.ROOT)).append("\":").append(v);
  }
}

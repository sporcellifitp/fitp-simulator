package it.natpf.racchetta;

import java.util.Locale;

/**
 * B71 (19/11/2026, registri della fiera del 18 e 19/11): sensori del telefono presi dall'app invece che da devicemotion
 * della WebView, FASE A (stesso ritmo di oggi, 60 Hz). Docs: docs/b71/sensori.md.
 *
 * Perché: devicemotion di Chrome legge l'ultimo valore dei sensori con un timer a 60 Hz sul thread della pagina; se la
 * pagina si ferma (tocchi sul blocco B51: buchi da ~200 ms in 137 partite-telefono su 437) quei campioni si perdono.
 * Qui i campioni restano in un buffer con il loro istante vero e la pagina li prende a lotti (Bridge.campioni): un thread
 * della pagina fermo li riceve in ritardo, ma tutti e con l'istante giusto.
 *
 * Unità e assi IDENTICI a devicemotion di Chrome su Android (Chromium, controllato il 19/11/2026 sul codice):
 *  - accelerationIncludingGravity = TYPE_ACCELEROMETER x, y, z in m/s² (segno grezzo di Android: +9,8 verso l'alto da
 *    fermo), arrotondata a multipli di 0,1 m/s² (services/device/generic_sensor/platform_sensor_util.h,
 *    kAccelerometerRoundingMultiple);
 *  - acceleration = TYPE_LINEAR_ACCELERATION x, y, z, come sopra;
 *  - rotationRate = TYPE_GYROSCOPE in °/s con alpha = x, beta = y, gamma = z
 *    (third_party/blink/renderer/modules/device_orientation/device_motion_event_pump.cc: Create(RadToDeg(gyro.x),
 *    RadToDeg(gyro.y), RadToDeg(gyro.z))), arrotondata a multipli di 0,1°/s (kGyroscopeRoundingMultiple, in rad).
 * La pagina controlla lo stesso all'avvio, confrontando per qualche secondo i due flussi (site/js/tennis/sensori-nativi.js):
 * se segno, assi o unità non tornano resta il browser.
 *
 * Ritmo: si chiede ai sensori il periodo di Chrome (16 667 µs), ma l'hardware può andare più veloce (molti a 104 Hz):
 * come il timer di Chrome, si consegna al più un campione ogni 16,667 ms (griglia con tolleranza), così soglie e filtri
 * dei gesti tarati a 60 Hz restano validi.
 *
 * Testo per la pagina (svuota): «persi;c1;c2;…», ogni campione «t,ax,ay,az,lx,ly,lz,ra,rb,rg» in numeri interi: t in
 * microsecondi sull'orologio elapsedRealtime (lo stesso di Bridge.orologio), accelerazioni in decimi di m/s², rotazioni
 * in decimi di °/s; accelerazione lineare vuota se il sensore non ha ancora dato niente. persi = campioni buttati perché
 * il buffer era pieno (la pagina non li ha chiesti per più di CAPIENZA campioni).
 *
 * Niente Android qui: si prova con JUnit (CampioniNativiTest). La classe Android è SensoriNativi.
 */
public final class CampioniNativi {
  /** Versione del protocollo tra app e pagina (sensori-nativi.js la controlla con Bridge.sensoriVersione). */
  public static final int PROTOCOLLO = 1;
  /** Periodo chiesto ai sensori e ritmo della consegna: 60 Hz come devicemotion di Chrome. */
  public static final int PERIODO_US = 16667;
  /** Campioni tenuti se la pagina non li prende (10 s a 60 Hz): oltre si butta il più vecchio e si conta. */
  public static final int CAPIENZA = 600;
  /** Tolleranza della griglia dei 60 Hz (ms): un campione che arriva fino a tanto prima del suo turno passa. */
  static final double TOLLERANZA_MS = 4;
  /** Istante dell'evento più lontano di così dall'ora del sistema: base dei tempi strana, si usa l'ora d'arrivo. */
  static final long SCARTO_MAX_NS = 2_000_000_000L;
  static final double RAD_GRADI = 180 / Math.PI;
  private static final int CAMPI = 10;

  private final long[] buf = new long[CAPIENZA * CAMPI];
  private int testa, quanti, persi;
  private float ax, ay, az, lx, ly, lz;
  private boolean haAcc, haLin;
  private double prossimoMs = Double.NaN;

  /** Da capo (sensori riaccesi): niente valori vecchi, niente griglia, buffer vuoto. */
  public synchronized void azzera() {
    testa = 0; quanti = 0; persi = 0; haAcc = false; haLin = false; prossimoMs = Double.NaN;
  }

  /** Ultimo valore dell'accelerometro (m/s², con la gravità). */
  public synchronized void accelerometro(float x, float y, float z) { ax = x; ay = y; az = z; haAcc = true; }

  /** Ultimo valore dell'accelerazione lineare (m/s², senza la gravità). */
  public synchronized void lineare(float x, float y, float z) { lx = x; ly = y; lz = z; haLin = true; }

  /**
   * Un evento del giroscopio (rad/s): diventa un campione con le ultime accelerazioni, se è il suo turno nella griglia dei
   * 60 Hz. eventoNs = SensorEvent.timestamp, oraNs = SystemClock.elapsedRealtimeNanos() all'arrivo. true se il campione
   * è entrato nel buffer.
   */
  public synchronized boolean giroscopio(float x, float y, float z, long eventoNs, long oraNs) {
    if (!haAcc) return false;
    long us = istanteUs(eventoNs, oraNs);
    double t = us / 1000.0;
    if (!Double.isNaN(prossimoMs) && t + TOLLERANZA_MS < prossimoMs) return false;   // troppo presto: come il timer di Chrome
    double p = PERIODO_US / 1000.0;
    prossimoMs = Double.isNaN(prossimoMs) || t - prossimoMs > p ? t + p : prossimoMs + p;
    if (quanti == CAPIENZA) { testa = (testa + 1) % CAPIENZA; quanti--; persi++; }
    int i = ((testa + quanti) % CAPIENZA) * CAMPI;
    buf[i] = us;
    buf[i + 1] = decimi(ax); buf[i + 2] = decimi(ay); buf[i + 3] = decimi(az);
    if (haLin) { buf[i + 4] = decimi(lx); buf[i + 5] = decimi(ly); buf[i + 6] = decimi(lz); }
    else { buf[i + 4] = Long.MIN_VALUE; }
    buf[i + 7] = decimi(x * RAD_GRADI); buf[i + 8] = decimi(y * RAD_GRADI); buf[i + 9] = decimi(z * RAD_GRADI);
    quanti++;
    return true;
  }

  /** I campioni non ancora consegnati, come testo per la pagina (e il buffer si svuota). */
  public synchronized String svuota() {
    StringBuilder b = new StringBuilder(16 + quanti * 48);
    b.append(persi);
    for (int k = 0; k < quanti; k++) {
      int i = ((testa + k) % CAPIENZA) * CAMPI;
      b.append(';').append(buf[i]);
      for (int c = 1; c < CAMPI; c++) {
        b.append(',');
        if (c >= 4 && c <= 6 && buf[i + 4] == Long.MIN_VALUE) continue;   // accelerazione lineare non ancora arrivata
        b.append(buf[i + c]);
      }
    }
    testa = 0; quanti = 0; persi = 0;
    return b.toString();
  }

  /** Quanti campioni aspettano la pagina. */
  public synchronized int inAttesa() { return quanti; }

  /** Istante in µs sull'orologio elapsedRealtime: quello dell'evento, o l'ora d'arrivo se l'evento ha una base strana. */
  static long istanteUs(long eventoNs, long oraNs) {
    if (eventoNs <= 0 || Math.abs(oraNs - eventoNs) > SCARTO_MAX_NS) return oraNs / 1000;
    return eventoNs / 1000;
  }

  /** Valore arrotondato a multipli di 0,1 come Chromium (RoundToMultiple: la metà si allontana da zero), in decimi. */
  static long decimi(double v) {
    if (Double.isNaN(v) || Double.isInfinite(v)) return 0;
    double s = v * 10;
    return s < 0 ? -(long) Math.floor(-s + 0.5) : (long) Math.floor(s + 0.5);
  }

  /**
   * Caratteristiche dei sensori per la pagina (Bridge.infoSensori), solo numeri: per ognuno [fondo scala, risoluzione,
   * periodo minimo µs, FIFO] con l'accelerazione in m/s² e la rotazione in °/s; null se il sensore manca.
   * acc, gir, lin: { getMaximumRange, getResolution, getMinDelay, getFifoMaxEventCount } o null (gir in rad/s).
   */
  public static String info(float[] acc, float[] gir, float[] lin) {
    StringBuilder b = new StringBuilder("{\"p\":").append(PROTOCOLLO).append(",\"us\":").append(PERIODO_US);
    b.append(",\"acc\":"); sensore(b, acc, 1);
    b.append(",\"gir\":"); sensore(b, gir, RAD_GRADI);
    b.append(",\"lin\":"); sensore(b, lin, 1);
    return b.append('}').toString();
  }

  private static void sensore(StringBuilder b, float[] v, double k) {
    if (v == null || v.length < 4) { b.append("null"); return; }
    b.append('[').append(numero(v[0] * k, 1)).append(',').append(numero(v[1] * k, 4)).append(',')
        .append(numero(v[2], 0)).append(',').append(numero(v[3], 0)).append(']');
  }

  private static String numero(double v, int cifre) {
    if (Double.isNaN(v) || Double.isInfinite(v)) return "null";
    if (cifre == 0) return Long.toString(Math.round(v));
    return String.format(Locale.ROOT, "%." + cifre + "f", v);
  }
}

package it.natpf.racchetta;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Process;
import android.os.SystemClock;

/**
 * B71 (fase A, docs/b71/sensori.md): accelerometro, accelerazione lineare e giroscopio con SensorManager, a 60 Hz come
 * devicemotion di Chrome, in un thread tutto loro. I campioni vanno in CampioniNativi (unità e assi di Chrome, istante
 * vero, buffer) e la pagina li prende a lotti dal ponte (Bridge.campioni). Accesi solo se la pagina li chiede
 * (Bridge.sensoriAvvia) e solo con l'app in primo piano, come il browser: spenti in onPause, riaccesi in onResume.
 * Nessun permesso: fino a 200 Hz i sensori non ne chiedono.
 */
final class SensoriNativi implements SensorEventListener {
  private final SensorManager sm;
  private final Sensor acc, gir, lin;
  private final CampioniNativi campioni = new CampioniNativi();
  private HandlerThread filo;
  /** La pagina li vuole (Bridge.sensoriAvvia) e sono registrati adesso. */
  private boolean voluti, attivi, primoPiano = true;

  SensoriNativi(Context c) {
    SensorManager s = null;
    try { s = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE); } catch (RuntimeException e) { /* niente sensori */ }
    sm = s;
    acc = sm != null ? sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) : null;
    gir = sm != null ? sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE) : null;
    lin = sm != null ? sm.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION) : null;
  }

  /** Accelerometro, giroscopio e accelerazione lineare ci sono tutti (come li usa Chrome per devicemotion). */
  boolean disponibili() { return acc != null && gir != null && lin != null; }

  /** La pagina li chiede: si accendono subito se l'app è in primo piano. true se sono accesi. */
  synchronized boolean avvia() {
    voluti = true;
    if (primoPiano) accendi();
    return attivi;
  }

  /** La pagina non li vuole più. */
  synchronized void ferma() { voluti = false; spegni(); }

  /** onResume: di nuovo accesi se la pagina li voleva. */
  synchronized void primoPiano() { primoPiano = true; if (voluti) accendi(); }

  /** onPause: spenti (come devicemotion a pagina nascosta). */
  synchronized void sfondo() { primoPiano = false; spegni(); }

  String campioni() { return campioni.svuota(); }

  /** Fondo scala, risoluzione, periodo minimo e FIFO dei tre sensori (CampioniNativi.info: solo numeri). */
  String info() { return CampioniNativi.info(dati(acc), dati(gir), dati(lin)); }

  private static float[] dati(Sensor s) {
    if (s == null) return null;
    return new float[] { s.getMaximumRange(), s.getResolution(), s.getMinDelay(), s.getFifoMaxEventCount() };
  }

  private void accendi() {
    if (attivi || !disponibili()) return;
    campioni.azzera();
    filo = new HandlerThread("natpf-sensori", Process.THREAD_PRIORITY_DISPLAY);
    filo.start();
    Handler h = new Handler(filo.getLooper());
    boolean ok;
    try {
      ok = sm.registerListener(this, acc, CampioniNativi.PERIODO_US, h)
          & sm.registerListener(this, lin, CampioniNativi.PERIODO_US, h)
          & sm.registerListener(this, gir, CampioniNativi.PERIODO_US, h);
    } catch (RuntimeException e) {
      ok = false;
    }
    attivi = true;
    if (!ok) spegni();
  }

  private void spegni() {
    if (!attivi) return;
    try { sm.unregisterListener(this); } catch (RuntimeException e) { /* già tolti */ }
    if (filo != null) { filo.quitSafely(); filo = null; }
    attivi = false;
  }

  @Override public void onSensorChanged(SensorEvent e) {
    float[] v = e.values;
    if (v == null || v.length < 3) return;
    switch (e.sensor.getType()) {
      case Sensor.TYPE_ACCELEROMETER: campioni.accelerometro(v[0], v[1], v[2]); break;
      case Sensor.TYPE_LINEAR_ACCELERATION: campioni.lineare(v[0], v[1], v[2]); break;
      case Sensor.TYPE_GYROSCOPE: campioni.giroscopio(v[0], v[1], v[2], e.timestamp, SystemClock.elapsedRealtimeNanos()); break;
      default: break;
    }
  }

  @Override public void onAccuracyChanged(Sensor s, int accuracy) { /* niente */ }
}

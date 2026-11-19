package it.natpf.racchetta;

/**
 * B71 (19/11/2026): lo schermo che si spegne mentre si gioca. Nei registri della fiera ogni «pagina nascosta» era uno
 * schermo spento vero (23 + 30 nei due giorni, pause di 5–8 s): il tasto di accensione premuto impugnando il telefono come
 * una racchetta. L'app riaccende lo schermo da sola (MainActivity, wake lock con ACQUIRE_CAUSES_WAKEUP e
 * setShowWhenLocked/setTurnScreenOn), ma solo:
 *  - se il telefono è in uso: la pagina lo dice con Bridge.inUso (partita, servizio, pausa, calibrazione, telefono bloccato
 *    dal B51); con una pagina di prima, che non lo dice, se l'app è fissata («Fissa app») con la pagina aperta;
 *  - al più MAX volte in FINESTRA_MS: chi spegne lo schermo tre volte di fila lo vuole spento (lo staff a fine giornata).
 * Niente Android qui: si prova con JUnit (RisveglioSchermoTest).
 */
public final class RisveglioSchermo {
  public static final long FINESTRA_MS = 20_000;
  public static final int MAX = 2;

  private final long[] ultimi = new long[MAX];
  private int n;
  /** Cosa ha detto la pagina: null se non ha mai detto niente (pagina di prima della 1.0.5). */
  private Boolean pagina;

  /** La pagina dice se il telefono è in uso. */
  public synchronized void inUso(boolean v) { pagina = v; }

  /** In uso adesso: quello che dice la pagina o, se non dice niente, app fissata con la pagina aperta. */
  public synchronized boolean adesso(boolean fissataConPagina) { return pagina != null ? pagina : fissataConPagina; }

  /** Lo schermo si è spento all'istante oraMs: true se l'app lo deve riaccendere. */
  public synchronized boolean spento(long oraMs, boolean fissataConPagina) {
    if (!adesso(fissataConPagina)) return false;
    int recenti = 0;
    for (int i = 0; i < Math.min(n, MAX); i++) if (oraMs - ultimi[i] <= FINESTRA_MS) recenti++;
    if (recenti >= MAX) return false;
    ultimi[n % MAX] = oraMs;
    n++;
    return true;
  }
}

package it.natpf.racchetta;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.http.SslError;
import android.graphics.Typeface;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.journeyapps.barcodescanner.ScanIntentResult;
import com.journeyapps.barcodescanner.ScanOptions;

/**
 * NATPF Racchetta (B52, richiesta dell'utente del 15/11/2026: «i visitatori escono da Chrome cambiando schermata»).
 *
 * La pagina vera del telefono-racchetta (site/tennis/racchetta.html, servita dal PC dello stand o da Cloudflare) dentro
 * una WebView, in un'app che:
 *  · si fissa da sola appena la pagina è aperta («Fissa app» di Android, startLockTask senza essere amministratore del
 *    telefono: Home e app recenti non portano fuori; per uscire il gesto di sistema e, se attivo, il PIN);
 *  · tiene lo schermo acceso e la Wi-Fi sveglia a bassa latenza mentre è in primo piano;
 *  · riapre da sola l'ultimo collegamento (telefoni dello stand abbinati una volta, B41) e, se la pagina non arriva o la
 *    WebView si chiude, riprova da sola;
 *  · legge il QR del PC con la fotocamera (da Android 12 i link della fotocamera vanno sempre al browser), accetta anche
 *    il link condiviso da Chrome («Condividi») o aperto da un link.
 * Lo staff torna alla schermata d'avvio (per un QR nuovo) premendo tre volte di fila «volume giù».
 * B66 (1.0.4): il ponte dà alla pagina anche lo stato del telefono per il registro dello stand (PhoneStatus: segnale e banda
 * della Wi-Fi, velocità, batteria, carica, temperatura, «Fissa app», schermi spenti), solo numeri: mai nome della rete,
 * indirizzi o identificativi.
 * B71 (1.0.5, registri della fiera del 18 e 19/11, docs/b71/sensori.md): segnale e velocità della Wi-Fi letti davvero (da
 * Android 10 networkId vale sempre −1 senza il permesso della posizione e prima si buttavano); sensori presi dall'app
 * (SensoriNativi: stessi valori di devicemotion, istante vero, consegnati a lotti, nessun campione perso se la pagina si
 * ferma) con le caratteristiche dei sensori (infoSensori); lo schermo spento con il tasto di accensione mentre si gioca si
 * riaccende da solo (RisveglioSchermo).
 * Niente di tutto questo è provato su un telefono vero (docs/b52/app-android.md).
 */
public class MainActivity extends Activity {
  private static final String PREFS = "natpf-racchetta", KEY_URL = "url";
  private static final long RETRY_MS = 5000;
  /** Tre «volume giù» entro questo tempo: schermata d'avvio (staff). */
  private static final long STAFF_KEYS_MS = 1500;
  private static final int SCAN_REQUEST = 0xc0de;

  // Lo script che gira nella pagina: il blocco dell'orientamento della pagina (lockOrientation in racchetta.js) passa
  // all'app, perché la WebView non sa bloccarlo da sola; e lo schermo intero, che l'app ha già, risponde subito di sì
  // (racchetta.js:766-767 blocca l'orientamento solo dopo lo schermo intero, che in una WebView verrebbe rifiutato)
  private static final String ORIENTATION_SHIM =
      "(function(){try{if(window.__natpfApp)return;window.__natpfApp=1;"
      + "try{Element.prototype.requestFullscreen=function(){return Promise.resolve();};}catch(e){}"
      + "var so=screen.orientation;if(so&&window.NATPFApp){"
      + "so.lock=function(o){NATPFApp.lock(String(o));return Promise.resolve();};"
      + "so.unlock=function(){NATPFApp.lock('portrait');};}}catch(e){}})();";

  private final Handler ui = new Handler(Looper.getMainLooper());
  private FrameLayout root;
  private WebView web;
  private LinearLayout start;
  private TextView banner;
  private SharedPreferences prefs;
  private WifiManager.WifiLock wifiLock;
  private String current;
  /** Ultimo errore (rete, certificato, pagina), mostrato nella schermata dello staff. */
  private String lastError;
  /** La pagina principale non è arrivata (rete, HTTP, certificato): niente «Fissa app» e l'avviso resta. */
  private boolean pageFailed;
  private final long[] volumeDown = new long[3];
  private int volumeIdx;
  /** B66: schermi spenti dall'avvio dell'app (per il registro dello stand: telefono bloccato e schermo spento). */
  private volatile int screensOff;
  private final BroadcastReceiver screenOff = new BroadcastReceiver() {
    @Override public void onReceive(Context c, Intent i) { if (Intent.ACTION_SCREEN_OFF.equals(i.getAction())) schermoSpento(); }
  };
  /** B71: sensori presi dall'app per la pagina (Bridge.campioni) e schermo da riaccendere se si spegne giocando. */
  private SensoriNativi sensori;
  private final RisveglioSchermo risveglio = new RisveglioSchermo();
  private PowerManager.WakeLock sveglia;
  /** Attesa tra lo spegnimento e la riaccensione (lo schermo finisce di spegnersi) e durata del wake lock. */
  private static final long RISVEGLIO_DOPO_MS = 300, RISVEGLIO_DURA_MS = 3000;
  private final Runnable riaccendi = this::riaccendiSchermo;

  private final Runnable retry = () -> { if (current != null && web != null) web.loadUrl(current); };

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    sensori = new SensoriNativi(this);
    mostraSulBlocco();
    root = new FrameLayout(this);
    root.setBackgroundColor(Color.rgb(8, 16, 34));
    if (Build.VERSION.SDK_INT >= 30) {
      getWindow().setDecorFitsSystemWindows(false);
      // La tastiera del nome riduce l'area della pagina; quando si chiude l'app torna a occupare lo schermo.
      root.setOnApplyWindowInsetsListener((view, insets) -> {
        view.setPadding(0, 0, 0, insets.getInsets(WindowInsets.Type.ime()).bottom);
        return insets;
      });
    }
    setContentView(root);
    // B66: lo schermo che si spegne (trasmissione di sistema: nessun permesso)
    registerReceiver(screenOff, new IntentFilter(Intent.ACTION_SCREEN_OFF));
    banner = text("", 18, false);
    banner.setBackgroundColor(Color.argb(220, 8, 16, 34));
    banner.setPadding(dp(16), dp(12), dp(16), dp(12));
    banner.setVisibility(View.GONE);
    root.addView(banner, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));
    if (!handleLink(getIntent())) {
      String saved = prefs.getString(KEY_URL, null);
      if (RacketLink.isRacketUrl(saved)) openPage(saved); else showStart(null);
    }
  }

  @Override protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleLink(intent);
  }

  /** Link da «apri con» o da «Condividi»: true se c'era un link della racchetta. */
  private boolean handleLink(Intent intent) {
    if (intent == null) return false;
    String text = null;
    if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) text = intent.getData().toString();
    else if (Intent.ACTION_SEND.equals(intent.getAction())) text = intent.getStringExtra(Intent.EXTRA_TEXT);
    String url = RacketLink.extract(text);
    if (url == null) {
      if (text != null) Toast.makeText(this, "Questo non è il collegamento del telefono-racchetta", Toast.LENGTH_LONG).show();
      return false;
    }
    openPage(url);
    return true;
  }

  // ---------- schermata d'avvio ----------

  private void showStart(String note) {
    ui.removeCallbacks(retry);
    sensori.ferma();
    if (web != null) web.setVisibility(View.GONE);
    banner.setVisibility(View.GONE);
    if (start == null) {
      start = new LinearLayout(this);
      start.setOrientation(LinearLayout.VERTICAL);
      start.setGravity(Gravity.CENTER);
      start.setPadding(dp(28), dp(28), dp(28), dp(28));
      root.addView(start, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }
    start.removeAllViews();
    start.setVisibility(View.VISIBLE);
    TextView title = text("NATPF Racchetta", 30, true);
    title.setTextColor(Color.rgb(232, 252, 83));
    start.addView(title);
    start.addView(text("Sul PC apri l'abbinamento del telefono (in fiera: «Telefoni dello stand» → «Abbina»), poi inquadra il QR.", 18, false));
    if (note != null) { TextView n = text(note, 16, false); n.setTextColor(Color.rgb(255, 179, 115)); start.addView(n); }
    Button scan = button("Inquadra il QR del PC");
    scan.setOnClickListener(v -> scanQr());
    start.addView(scan);
    String saved = prefs.getString(KEY_URL, null);
    if (RacketLink.isRacketUrl(saved)) {
      Button again = button("Riapri l'ultimo collegamento");
      again.setOnClickListener(v -> openPage(saved));
      start.addView(again);
    }
    TextView ver = text("App " + versionName() + " · Android " + Build.VERSION.RELEASE + " · WebView " + webViewVersion(), 13, false);
    ver.setTextColor(Color.rgb(147, 168, 188));
    start.addView(ver);
    if (lastError != null) {
      TextView err = text("Ultimo errore: " + lastError, 13, false);
      err.setTextColor(Color.rgb(147, 168, 188));
      start.addView(err);
    }
  }

  private void scanQr() {
    // ScanOptions e non IntentIntegrator: IntentIntegrator rimanda anche ai Fragment di AndroidX, che l'app non ha
    Intent scan = new ScanOptions()
        .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        .setPrompt("Inquadra il QR del telefono sul PC")
        .setOrientationLocked(false)
        .setBeepEnabled(false)
        .createScanIntent(this);
    try {
      startActivityForResult(scan, SCAN_REQUEST);
    } catch (RuntimeException e) {
      showStart("Non riesco ad aprire la fotocamera: apri il link del QR con la fotocamera di Android e scegli «NATPF Racchetta», o condividilo da Chrome.");
    }
  }

  @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode != SCAN_REQUEST) { super.onActivityResult(requestCode, resultCode, data); return; }
    ScanIntentResult r = ScanIntentResult.parseActivityResult(resultCode, data);
    if (r == null || r.getContents() == null) return;      // annullato
    String url = RacketLink.extract(r.getContents());
    if (url != null) openPage(url);
    else showStart("Questo QR non è quello del telefono: usa il QR dell'abbinamento sul PC.");
  }

  // ---------- pagina della racchetta ----------

  private void openPage(String url) {
    current = url;
    banner.setTag(null);
    banner.setVisibility(View.GONE);
    prefs.edit().putString(KEY_URL, url).apply();
    if (start != null) start.setVisibility(View.GONE);
    if (web == null) createWebView();
    web.setVisibility(View.VISIBLE);
    web.loadUrl(url);
  }

  private void createWebView() {
    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);                           // la pagina tiene stanza, mano e profilo nel suo archivio
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setTextZoom(100);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setUserAgentString(s.getUserAgentString() + " NATPFApp/" + versionName());
    web.setBackgroundColor(Color.rgb(8, 16, 34));
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    web.addJavascriptInterface(new Bridge(), "NATPFApp");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
        // dentro l'app solo la pagina del PC che l'ha aperta; tutto il resto resta fuori (niente browser)
        return current == null || !RacketLink.sameOrigin(current, req.getUrl().toString());
      }
      // (B71: una pagina nuova chiede di nuovo i sensori dell'app se li vuole; fino ad allora spenti)
      @Override public void onPageStarted(WebView view, String url, Bitmap favicon) { pageFailed = false; sensori.ferma(); }
      @Override public void onPageFinished(WebView view, String url) {
        // dopo un errore arriva anche la fine del caricamento (della pagina d'errore): l'avviso resta e l'app NON si
        // fissa (nella 1.0.1 si fissava su una pagina vuota e lo staff restava bloccato senza sapere perché)
        if (pageFailed) return;
        view.evaluateJavascript(ORIENTATION_SHIM, null);
        if (banner.getVisibility() == View.VISIBLE && banner.getTag() == null) banner.setVisibility(View.GONE);
        pin();
      }
      @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
        if (!req.isForMainFrame()) return;
        pageFailed = true;
        lastError = "rete: " + err.getDescription();
        showBanner("Non raggiungo il PC dello stand (" + err.getDescription() + "). Riprovo da solo…");
        ui.removeCallbacks(retry);
        ui.postDelayed(retry, RETRY_MS);
      }
      @Override public void onReceivedHttpError(WebView view, WebResourceRequest req, WebResourceResponse res) {
        if (!req.isForMainFrame()) return;
        pageFailed = true;
        lastError = "pagina: HTTP " + res.getStatusCode();
        showBanner("Il PC dello stand risponde con un errore (HTTP " + res.getStatusCode() + "). Riprovo da solo…");
        ui.removeCallbacks(retry);
        ui.postDelayed(retry, RETRY_MS);
      }
      // Certificato del PC dello stand (1.0.2): senza il certificato NATPF sul telefono la WebView rifiutava la pagina in
      // silenzio (schermo vuoto, app fissata e ferma). Si va avanti solo per l'indirizzo di rete locale del QR
      // (RacketLink.trustStandCertificate); la WebView ricorda la scelta per lo stesso indirizzo e certificato, anche per
      // il collegamento wss del PC. Altrimenti si dice cosa non va, mai schermo vuoto
      @SuppressLint("WebViewClientOnReceivedSslError")
      @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        if (current != null && RacketLink.trustStandCertificate(current, error.getUrl())) { handler.proceed(); return; }
        handler.cancel();
        pageFailed = true;
        lastError = "certificato: errore " + error.getPrimaryError() + " su " + error.getUrl();
        showBanner("Il certificato del PC non è valido per questo indirizzo (errore " + error.getPrimaryError()
            + "). Controlla l'ora del telefono e del PC, poi inquadra di nuovo il QR (tre volte «volume giù»).");
        banner.setTag("ssl");
      }
      @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        // la pagina si è chiusa (memoria, errore): si rifà la WebView e si riapre il collegamento
        root.removeView(web);
        web.destroy();
        web = null;
        if (current != null) ui.post(() -> openPage(current));
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
      // l'ultimo errore della pagina si legge nella schermata dello staff (sul telefono non c'è altro modo di vederlo)
      @Override public boolean onConsoleMessage(ConsoleMessage m) {
        if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
          lastError = "pagina: " + m.message() + " (" + m.sourceId().replaceAll("^.*/", "") + ":" + m.lineNumber() + ")";
        return false;
      }
      // «vuoi lasciare la pagina?» del blocco del telefono (B51): dentro l'app si riapre sempre la stessa pagina
      @Override public boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result) { result.confirm(); return true; }
      @Override public boolean onJsPrompt(WebView view, String url, String message, String def, JsPromptResult result) { result.cancel(); return true; }
    });
    root.addView(web, 0, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
  }

  private void showBanner(String msg) {
    banner.setText(msg);
    banner.setVisibility(View.VISIBLE);
    banner.bringToFront();
  }

  /**
   * Ponte per la pagina: l'orientamento, la versione dell'app, (B66) lo stato del telefono a grandi linee e (B71) i sensori
   * presi dall'app e il telefono in uso. I metodi girano nel thread del ponte della WebView, non in quello principale.
   */
  private final class Bridge {
    @JavascriptInterface public void lock(String o) {
      final int want = o != null && o.startsWith("landscape") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
      ui.post(() -> setRequestedOrientation(want));
    }
    @JavascriptInterface public String version() { return versionName(); }
    /** B66: lo stato del telefono per il registro dello stand (PhoneStatus.json: solo numeri). La pagina lo chiede ogni 5 s. */
    @JavascriptInterface public String stato() { return phoneStatus(); }
    /** B71: versione del protocollo dei sensori dell'app (CampioniNativi.PROTOCOLLO), 0 se ne manca uno. */
    @JavascriptInterface public int sensoriVersione() { return sensori.disponibili() ? CampioniNativi.PROTOCOLLO : 0; }
    /** B71: accende i sensori dell'app (60 Hz); true se sono accesi. */
    @JavascriptInterface public boolean sensoriAvvia() { return sensori.avvia(); }
    /** B71: spegne i sensori dell'app. */
    @JavascriptInterface public void sensoriFerma() { sensori.ferma(); }
    /** B71: i campioni arrivati dall'ultima chiamata (CampioniNativi.svuota). La pagina li chiede ~60 volte al secondo. */
    @JavascriptInterface public String campioni() { return sensori.campioni(); }
    /** B71: l'orologio dei campioni (elapsedRealtime in ms, con i decimali), per allinearli a performance.now() della pagina. */
    @JavascriptInterface public double orologio() { return SystemClock.elapsedRealtimeNanos() / 1e6; }
    /** B71: fondo scala, risoluzione, periodo minimo e FIFO di accelerometro, giroscopio e accelerazione lineare (solo numeri). */
    @JavascriptInterface public String infoSensori() { return sensori.info(); }
    /** B71: la pagina dice se il telefono è in uso (partita, calibrazione, telefono bloccato): lo schermo spento si riaccende. */
    @JavascriptInterface public void inUso(boolean v) { risveglio.inUso(v); }
  }

  // ---------- B71: schermo spento con il tasto di accensione mentre si gioca ----------

  /** Mostrata anche sopra la schermata di blocco, con lo schermo che si accende quando torna in primo piano. */
  @SuppressWarnings("deprecation")
  private void mostraSulBlocco() {
    if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
    else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
  }

  /** App fissata con la pagina della racchetta aperta: vale come «in uso» con le pagine di prima della 1.0.5. */
  private boolean fissataConPagina() {
    if (current == null || web == null || web.getVisibility() != View.VISIBLE || pageFailed) return false;
    try {
      ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
      return am != null && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
    } catch (RuntimeException e) { return false; }
  }

  private void schermoSpento() {
    screensOff++;
    if (risveglio.spento(SystemClock.elapsedRealtime(), fissataConPagina())) {
      ui.removeCallbacks(riaccendi);
      ui.postDelayed(riaccendi, RISVEGLIO_DOPO_MS);
    }
  }

  /**
   * Schermo di nuovo acceso: un wake lock che sveglia il telefono (ACQUIRE_CAUSES_WAKEUP, per qualche secondo); l'attività,
   * mostrata sopra il blocco, torna in primo piano e FLAG_KEEP_SCREEN_ON tiene acceso lo schermo. Con targetSdk 34 non
   * serve il permesso TURN_SCREEN_ON (Android lo chiede solo alle app fatte per Android 15 e oltre: compat change
   * REQUIRE_TURN_SCREEN_ON_PERMISSION). Nessun permesso nuovo: WAKE_LOCK c'era già (Wi-Fi).
   */
  @SuppressWarnings("deprecation")
  private void riaccendiSchermo() {
    try {
      PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
      if (pm == null || pm.isInteractive()) return;
      if (sveglia == null) {
        sveglia = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
            "natpf-racchetta:schermo");
        sveglia.setReferenceCounted(false);
      }
      sveglia.acquire(RISVEGLIO_DURA_MS);
    } catch (RuntimeException e) {
      lastError = "schermo: " + e.getClass().getSimpleName();
    }
  }

  // ---------- B66: stato del telefono per il registro dello stand ----------

  /** Solo i numeri di PhoneStatus: della Wi-Fi si leggono segnale, frequenza e velocità, mai nome della rete o indirizzi. */
  @SuppressWarnings("deprecation")
  private String phoneStatus() {
    int rssi = PhoneStatus.NONE, mhz = 0, mbps = PhoneStatus.NONE, batt = PhoneStatus.NONE, carica = -1, temp = PhoneStatus.NONE, fissa = -1;
    try {
      WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
      WifiInfo w = wm != null ? wm.getConnectionInfo() : null;
      // B71: da Android 10, senza il permesso della posizione, networkId vale sempre −1 (come SSID e BSSID): la condizione
      // di prima era sempre falsa e segnale, banda e velocità non arrivavano mai. Collegata = frequenza e segnale veri
      if (w != null && PhoneStatus.wifiCollegata(w.getFrequency(), w.getRssi())) { rssi = w.getRssi(); mhz = w.getFrequency(); mbps = w.getLinkSpeed(); }
    } catch (RuntimeException e) { /* Wi-Fi non leggibile: niente rete */ }
    try {
      Intent b = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
      if (b != null) {
        batt = PhoneStatus.batteryPercent(b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), b.getIntExtra(BatteryManager.EXTRA_SCALE, -1));
        int plugged = b.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
        carica = plugged < 0 ? -1 : plugged > 0 ? 1 : 0;
        int t = b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE);
        if (t != Integer.MIN_VALUE) temp = t;
      }
    } catch (RuntimeException e) { /* batteria non leggibile */ }
    try {
      ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
      if (am != null) fissa = am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE ? 1 : 0;
    } catch (RuntimeException e) { /* stato di «Fissa app» non leggibile */ }
    return PhoneStatus.json(rssi, mhz, mbps, batt, carica, temp, fissa, screensOff);
  }

  // ---------- fissare l'app, schermo, Wi-Fi ----------

  private void pin() {
    if (current == null) return;
    ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
    if (am == null || am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) return;
    try {
      // senza amministratore del telefono è «Fissa app»: Android può chiedere una conferma
      startLockTask();
    } catch (RuntimeException e) {
      showBanner("Non riesco a fissare l'app: attiva «Fissa app» nelle impostazioni di Android (guida dello stand, 8.9).");
      banner.setTag("pin");
    }
  }

  @Override protected void onResume() {
    super.onResume();
    immersive();
    if (wifiLock == null) {
      WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
      if (wm != null) {
        int mode = Build.VERSION.SDK_INT >= 29 ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY : WifiManager.WIFI_MODE_FULL_HIGH_PERF;
        wifiLock = wm.createWifiLock(mode, "natpf-racchetta");
        wifiLock.setReferenceCounted(false);
      }
    }
    if (wifiLock != null) wifiLock.acquire();
    if (web != null) { web.onResume(); if (current != null && web.getVisibility() == View.VISIBLE) pin(); }
    // B71: sensori dell'app di nuovo accesi (se la pagina li voleva); lo schermo è acceso, il wake lock non serve più
    sensori.primoPiano();
    ui.removeCallbacks(riaccendi);
    if (sveglia != null && sveglia.isHeld()) sveglia.release();
  }

  @Override protected void onPause() {
    if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
    if (web != null) web.onPause();
    sensori.sfondo();
    super.onPause();
  }

  @Override public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) immersive();
  }

  @SuppressWarnings("deprecation")
  private void immersive() {
    if (Build.VERSION.SDK_INT >= 30) {
      WindowInsetsController c = getWindow().getInsetsController();
      if (c != null) {
        c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
      }
    } else {
      getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
  }

  // ---------- tasti ----------

  @SuppressWarnings("deprecation")
  @Override public void onBackPressed() {
    // Indietro va alla pagina (che lo intrappola durante il gioco, B51); l'app non si chiude mai con Indietro
    if (web != null && web.getVisibility() == View.VISIBLE && web.canGoBack()) web.goBack();
  }

  @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN && event.getRepeatCount() == 0) {
      long now = SystemClock.uptimeMillis();
      volumeDown[volumeIdx % 3] = now;
      volumeIdx++;
      long oldest = volumeDown[volumeIdx % 3];
      if (volumeIdx >= 3 && now - oldest <= STAFF_KEYS_MS) {
        volumeIdx = 0;
        showStart("Schermata dello staff: inquadra un QR nuovo o riapri il collegamento.");
        return true;
      }
    }
    return super.onKeyDown(keyCode, event);
  }

  @Override protected void onDestroy() {
    ui.removeCallbacksAndMessages(null);
    try { unregisterReceiver(screenOff); } catch (IllegalArgumentException e) { /* già tolto */ }
    sensori.ferma();
    ui.removeCallbacks(riaccendi);
    if (sveglia != null && sveglia.isHeld()) sveglia.release();
    if (web != null) { web.destroy(); web = null; }
    if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
    super.onDestroy();
  }

  // ---------- piccoli aiuti ----------

  private static String webViewVersion() {
    try {
      PackageInfo p = WebView.getCurrentWebViewPackage();
      return p != null ? p.versionName : "?";
    } catch (RuntimeException e) {
      return "?";
    }
  }

  private String versionName() {
    try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
  }

  private int dp(int v) {
    return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
  }

  private TextView text(String s, int sp, boolean bold) {
    TextView t = new TextView(this);
    t.setText(s);
    t.setTextColor(Color.WHITE);
    t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
    t.setGravity(Gravity.CENTER);
    if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    lp.bottomMargin = dp(16);
    t.setLayoutParams(lp);
    return t;
  }

  private Button button(String s) {
    Button b = new Button(this);
    b.setText(s);
    b.setAllCaps(false);
    b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64));
    lp.bottomMargin = dp(14);
    b.setLayoutParams(lp);
    return b;
  }
}

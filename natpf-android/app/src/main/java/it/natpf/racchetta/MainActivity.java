package it.natpf.racchetta;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.http.SslError;
import android.graphics.Typeface;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

  private final Runnable retry = () -> { if (current != null && web != null) web.loadUrl(current); };

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    root = new FrameLayout(this);
    root.setBackgroundColor(Color.rgb(8, 16, 34));
    setContentView(root);
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
      @Override public void onPageStarted(WebView view, String url, Bitmap favicon) { pageFailed = false; }
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

  /** Ponte per la pagina: solo l'orientamento e la versione dell'app. */
  private final class Bridge {
    @JavascriptInterface public void lock(String o) {
      final int want = o != null && o.startsWith("landscape") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
      ui.post(() -> setRequestedOrientation(want));
    }
    @JavascriptInterface public String version() { return versionName(); }
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
  }

  @Override protected void onPause() {
    if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
    if (web != null) web.onPause();
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

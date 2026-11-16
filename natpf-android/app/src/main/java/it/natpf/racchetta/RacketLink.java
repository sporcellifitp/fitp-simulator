package it.natpf.racchetta;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Il link della pagina del telefono-racchetta (B52). Il PC lo mette nel QR: https://IP:8443/natpf/tennis/racchetta.html#…
 * in rete locale, https://dominio/natpf/tennis/racchetta.html#… con Cloudflare. Il pezzo dopo «#» porta la stanza e la
 * chiave dell'abbinamento e va tenuto intero. Niente Android qui: si prova con JUnit.
 */
public final class RacketLink {
  private RacketLink() {}

  static final String PAGE = "/tennis/racchetta.html";
  private static final Pattern IN_TEXT = Pattern.compile("https?://\\S+");

  /** true se è un link http(s) con un indirizzo e il percorso della pagina della racchetta. */
  public static boolean isRacketUrl(String url) {
    if (url == null) return false;
    try {
      URI u = new URI(url.trim());
      String scheme = u.getScheme();
      if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) return false;
      if (u.getHost() == null || u.getHost().isEmpty()) return false;
      String path = u.getRawPath();
      return path != null && path.endsWith(PAGE);
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * Il link della racchetta dentro un testo (QR, «Condividi» di Chrome, che a volte aggiunge il titolo della pagina),
   * oppure null.
   */
  public static String extract(String text) {
    if (text == null) return null;
    Matcher m = IN_TEXT.matcher(text);
    while (m.find()) {
      String candidate = m.group();
      // punteggiatura finale di un testo («… racchetta.html#s=…».) non fa parte del link
      while (!candidate.isEmpty() && ".,;)»\"'".indexOf(candidate.charAt(candidate.length() - 1)) >= 0)
        candidate = candidate.substring(0, candidate.length() - 1);
      if (isRacketUrl(candidate)) return candidate;
    }
    return null;
  }

  /** Stessa origine (schema, host, porta): dentro l'app si naviga solo sulla pagina del PC che l'ha aperta. */
  public static boolean sameOrigin(String a, String b) {
    try {
      URI x = new URI(a), y = new URI(b);
      return x.getScheme() != null && x.getScheme().equalsIgnoreCase(y.getScheme())
          && x.getHost() != null && x.getHost().equalsIgnoreCase(y.getHost())
          && port(x) == port(y);
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * Certificato del PC dello stand (16/11/2026, app 1.0.2). In rete locale il PC usa un certificato fatto da sé
   * (tools/lan/certificato.mjs, un'autorità per ogni PC): se il telefono non ha installato il certificato NATPF, la
   * WebView rifiutava la pagina in silenzio e restava vuota (Chrome invece lascia «Procedi»). Si accetta solo se la
   * pagina aperta dal QR è in https su un indirizzo di rete locale scritto in cifre (10.x, 172.16–31.x, 192.168.x,
   * 169.254.x, 127.x) e la richiesta va allo stesso indirizzo (pagina, file e collegamento wss del PC). Non è più debole
   * di quello che l'app già permette in rete locale (http in chiaro, network_security_config). Mai su Cloudflare.
   */
  public static boolean trustStandCertificate(String page, String url) {
    try {
      URI p = new URI(page), u = new URI(url);
      if (!"https".equalsIgnoreCase(p.getScheme())) return false;
      String s = u.getScheme();
      if (s == null || !(s.equalsIgnoreCase("https") || s.equalsIgnoreCase("wss"))) return false;
      return p.getHost() != null && p.getHost().equals(u.getHost()) && isLocalIpv4(p.getHost());
    } catch (Exception e) {
      return false;
    }
  }

  /** Indirizzo IPv4 scritto in cifre di una rete locale (niente nomi: un nome può puntare ovunque). */
  static boolean isLocalIpv4(String host) {
    if (host == null || !host.matches("\\d{1,3}(\\.\\d{1,3}){3}")) return false;
    String[] p = host.split("\\.");
    int[] b = new int[4];
    for (int i = 0; i < 4; i++) {
      if (p[i].length() > 1 && p[i].charAt(0) == '0') return false;   // 010 = ottale per qualcuno: no
      b[i] = Integer.parseInt(p[i]);
      if (b[i] > 255) return false;
    }
    return b[0] == 10 || (b[0] == 172 && b[1] >= 16 && b[1] <= 31) || (b[0] == 192 && b[1] == 168)
        || (b[0] == 169 && b[1] == 254) || b[0] == 127;
  }

  private static int port(URI u) {
    if (u.getPort() >= 0) return u.getPort();
    return "https".equalsIgnoreCase(u.getScheme()) ? 443 : 80;
  }
}

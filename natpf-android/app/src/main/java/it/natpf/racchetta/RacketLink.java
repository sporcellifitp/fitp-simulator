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

  private static int port(URI u) {
    if (u.getPort() >= 0) return u.getPort();
    return "https".equalsIgnoreCase(u.getScheme()) ? 443 : 80;
  }
}

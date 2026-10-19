// Relay della partita di motore base (1v1 tra due computer, racchetta via HTTP): estratto da vite.config.ts senza
// cambiarne la logica, per usarlo sia nel server Vite (npm run dev / preview) sia nel server LAN (lan/server.mjs).
// L'host è autorevole e manda lo snapshot con /api/match/sync; il P2 legge /api/match/state e manda i colpi con
// /api/racket/swing. Le stanze vivono in memoria nel processo del server.
// nessun indirizzo pubblico esterno: i link della stanza usano l'host del gioco
export const PUBLIC_URL = "";
function N(t) {
  return {
    role: t,
    seq: 0,
    lastSeenTs: 0,
    connected: !1,
    orientation: { pitch: 0, roll: 0, yaw: 0, accelMag: 0, buttonB: !1, connected: !1 },
    lastSwing: null,
    swingHistory: [],
    feedbackSeq: 0,
    lastFeedback: null,
  };
}
function R(t, r = "Player 1", a = "Player 2", c = 2) {
  return {
    roomId: t,
    hostName: r,
    guestName: a,
    gamesToWin: c,
    rackets: { p1: N("p1"), p2: N("p2") },
    stateSeq: 0,
    matchSnapshot: null,
    p1DesktopSeenTs: 0,
    p2DesktopSeenTs: 0,
  };
}
function T(t) {
  const r = Date.now(),
    a = t.lastSeenTs > 0 ? Math.max(0, r - t.lastSeenTs) : -1,
    c = t.connected && a >= 0 && a < 12e3;
  return {
    role: t.role,
    connected: c,
    lastSeenMs: a,
    orientation: { ...t.orientation, connected: c },
    lastSwing: t.lastSwing ? { ...t.lastSwing } : null,
    lastFeedback: t.lastFeedback ? { ...t.lastFeedback } : null,
    swingHistory: t.swingHistory.slice(-15),
  };
}
function H(t) {
  return new Promise((r) => {
    const a = [];
    (t.on("data", (c) => a.push(String(c))),
      t.on("end", () => {
        try {
          const c = a.join("");
          r(c ? JSON.parse(c) : {});
        } catch {
          r({});
        }
      }),
      t.on("error", () => r({})));
  });
}
function d(t, r, a) {
  const c = JSON.stringify(a);
  ((t.statusCode = r),
    t.setHeader("Content-Type", "application/json; charset=utf-8"),
    t.setHeader("Access-Control-Allow-Origin", "*"),
    t.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"),
    t.end(c));
}
// NATPF: corpo dei giocatori per /api/match/state; dopo 1 s senza notizie non è più attivo
function bodyState(e) {
  const out = {},
    now = Date.now();
  for (const k of ["p1", "p2"]) {
    const b = e.body?.[k];
    out[k] = b ? { active: b.active && now - b.at < 1e3, x: b.x, z: b.z, ageMs: now - b.at } : null;
  }
  return out;
}
// NATPF: campi aggiunti al colpo del P2 perché l'host lo giochi come quello del P1 (natpf_phone_racket.js →
// natpfSwingToEngine). Solo oggetti piccoli e una mano valida; senza questi campi il colpo resta quello del motore base.
export function natpfSwingExtras(e = {}) {
  const out = {};
  if (e.natpf && typeof e.natpf === "object" && !Array.isArray(e.natpf)) {
    try {
      const j = JSON.stringify(e.natpf);
      j.length <= 4096 && (out.natpf = JSON.parse(j));
    } catch {}
  }
  (e.hand === "left" || e.hand === "right") && (out.hand = e.hand);
  return out;
}
// publicUrl: indirizzo restituito nei link della stanza (stringa o funzione della richiesta). Il default è quello
// originale del motore base; il server LAN passa l'indirizzo di rete del computer.
export function createMatchRelay({ publicUrl = PUBLIC_URL } = {}) {
  const t = new Map();
  t.set("default", R("default"));
  const a = (u) => {
    const p = (u || "default").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || "default",
      n = p === "DEFAULT" ? "default" : p;
    let g = t.get(n);
    return (g || ((g = R(n)), t.set(n, g)), g);
  };
  const relay = async (p, n, g) => {
    // NATPF: un indirizzo non valido (es. «//») non deve far cadere il server con il relay della partita
    const I = (p.url || "/").replace(/^\/{2,}/, "/"),
      w = new URL(I, "http://localhost:3000"),
      l = w.pathname;
    if (l === "/___rPc_sWiTcH___") {
      ((n.statusCode = 200), n.setHeader("Content-Type", "text/plain; charset=utf-8"), n.end("OK"));
      return;
    }
    const r = typeof publicUrl === "function" ? publicUrl(p) : publicUrl;
    if (!l.startsWith("/api/")) {
      g();
      return;
    }
    if (p.method === "OPTIONS") {
      ((n.statusCode = 204),
        n.setHeader("Access-Control-Allow-Origin", "*"),
        n.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
        n.setHeader("Access-Control-Allow-Headers", "Content-Type"),
        n.end());
      return;
    }
    const b = w.searchParams.get("room") || "default",
      y = (w.searchParams.get("role") || "p1").toLowerCase(),
      f = y === "p2" || y === "2" || y === "opponent" ? "p2" : "p1";
    if (p.method === "GET" && l === "/api/racket/state") {
      const e = a(b),
        m = e.rackets[f];
      d(n, 200, { ...T(m), roomId: e.roomId, tunnelUrl: r });
      return;
    }
    if (p.method === "GET" && l === "/api/tunnel/status") {
      const e = a(b),
        m = e.roomId !== "default" ? `room=${e.roomId}&` : "";
      d(n, 200, {
        ok: !0,
        active: !0,
        tunnelUrl: r,
        companionUrl: `${r}/companion.html?${m}role=${f}`,
        joinUrl: `${r}/join.html?room=${e.roomId}&role=${f}`,
      });
      return;
    }
    if (p.method === "GET" && l === "/api/match/state") {
      const e = a(b),
        m = w.searchParams.get("touch");
      (m === "p1" || m === "p2") &&
        (m === "p2" ? (e.p2DesktopSeenTs = Date.now()) : (e.p1DesktopSeenTs = Date.now()));
      const h = Date.now(),
        k = T(e.rackets.p1),
        i = T(e.rackets.p2),
        o = e.p1DesktopSeenTs > 0 && h - e.p1DesktopSeenTs < 8e3,
        s = e.p2DesktopSeenTs > 0 && h - e.p2DesktopSeenTs < 8e3;
      d(n, 200, {
        ok: !0,
        roomId: e.roomId,
        hostName: e.hostName,
        guestName: e.guestName,
        gamesToWin: e.gamesToWin,
        p1Online: o,
        p2Online: s,
        p1DesktopOnline: o,
        p2DesktopOnline: s,
        p1PhoneConnected: k.connected,
        p2PhoneConnected: i.connected,
        p1: k,
        p2: i,
        rackets: { p1: k, p2: i },
        snapshotSeq: e.stateSeq,
        snapshot: e.matchSnapshot,
        tunnelUrl: r,
        // NATPF: bersaglio in campo dal corpo davanti alla webcam («segui il corpo», src/natpf/webcam_body_follow.js)
        body: bodyState(e),
      });
      return;
    }
    if (p.method === "POST") {
      const e = await H(p),
        m = String(e.room || b || "default"),
        h = String(e.role || f || "p1").toLowerCase(),
        k = h === "p2" || h === "2" || h === "opponent" ? "p2" : "p1",
        i = a(m),
        o = i.rackets[k];
      // NATPF: il P2 manda dove lo porta il corpo; l'host lo legge da /api/match/state (body.p2)
      if (l === "/api/body") {
        const x = Number(e.x),
          z = Number(e.z);
        (i.body ||= {})[k] = { active: !!e.active && Number.isFinite(x) && Number.isFinite(z), x: Number.isFinite(x) ? x : 0, z: Number.isFinite(z) ? z : 0, at: Date.now() };
        d(n, 200, { ok: !0, roomId: i.roomId, role: k });
        return;
      }
      if (l === "/api/racket/swing") {
        const s = Date.now();
        ((o.seq += 1), (o.lastSeenTs = s), (o.connected = !0));
        const S = {
          seq: o.seq,
          role: o.role,
          type: String(e.type || "swing").toLowerCase() === "toss" ? "toss" : "swing",
          shotType: String(e.shotType || "topspin").toLowerCase(),
          speed: Number(e.speed ?? 1),
          angleX: Number(e.angleX ?? e.dirX ?? 0),
          dirX: Number(e.angleX ?? e.dirX ?? 0),
          dirY: Number(e.dirY ?? 0),
          pitch: Number(e.pitch ?? o.orientation.pitch ?? 0),
          roll: Number(e.roll ?? o.orientation.roll ?? 0),
          yaw: Number(e.yaw ?? o.orientation.yaw ?? 0),
          timestamp: Number(e.timestamp ?? s),
          serverTimeMs: s,
          source: String(e.source || "phone"),
          // NATPF: dati del telefono del P2 (colpo speciale, mira, latenza, mano), solo se arrivano
          ...natpfSwingExtras(e),
        };
        ((o.lastSwing = S),
          o.swingHistory.push(S),
          o.swingHistory.length > 50 && o.swingHistory.shift(),
          d(n, 200, { ok: !0, roomId: i.roomId, role: o.role, swing: S }));
        return;
      }
      if (l === "/api/racket/telemetry") {
        ((o.lastSeenTs = Date.now()),
          (o.connected = !!(e.connected ?? !0)),
          (o.orientation = {
            pitch: Number(e.pitch ?? o.orientation.pitch ?? 0),
            roll: Number(e.roll ?? o.orientation.roll ?? 0),
            yaw: Number(e.yaw ?? o.orientation.yaw ?? 0),
            accelMag: Number(e.accelMag ?? 0),
            buttonB: !!(e.buttonB ?? !1),
            connected: o.connected,
          }),
          d(n, 200, {
            ok: !0,
            roomId: i.roomId,
            role: o.role,
            orientation: o.orientation,
            lastFeedback: o.lastFeedback,
          }));
        return;
      }
      if (l === "/api/racket/feedback") {
        ((o.feedbackSeq += 1),
          (o.lastFeedback = {
            seq: o.feedbackSeq,
            role: o.role,
            kind: String(e.kind || "hit"),
            grade: String(e.grade || "PERFECT"),
            shotType: String(e.shotType || "TOPSPIN"),
            speedKmh: Number(e.speedKmh ?? 160),
            intensity: Number(e.intensity ?? 1),
            serverTimeMs: Date.now(),
          }),
          d(n, 200, { ok: !0, roomId: i.roomId, feedback: o.lastFeedback }));
        return;
      }
      if (l === "/api/match/sync") {
        ((i.stateSeq += 1), (i.p1DesktopSeenTs = Date.now()));
        const s = e.snapshot && typeof e.snapshot == "object" ? e.snapshot : e;
        ((i.matchSnapshot = { ...s, seq: i.stateSeq, serverTimeMs: Date.now() }),
          d(n, 200, { ok: !0, roomId: i.roomId, seq: i.stateSeq, p2Racket: T(i.rackets.p2) }));
        return;
      }
      if (l === "/api/match/create") {
        const s = "AT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
          S = R(
            s,
            String(e.hostName || "Ammaar"),
            String(e.guestName || "Challenger"),
            Number(e.gamesToWin || 2),
          );
        (t.set(s, S),
          d(n, 200, {
            ok: !0,
            roomId: s,
            hostDesktopUrl: `${r}/?room=${s}&role=p1`,
            guestDesktopUrl: `${r}/?room=${s}&role=p2`,
            p1PhoneUrl: `${r}/companion.html?room=${s}&role=p1`,
            p2PhoneUrl: `${r}/companion.html?room=${s}&role=p2`,
            guestJoinHubUrl: `${r}/join.html?room=${s}&role=p2`,
          }));
        return;
      }
    }
    g();
  };
  relay.rooms = t;
  return relay;
}

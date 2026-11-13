import { renderAllHudPlayerAvatars as P, renderPlayerAvatar as L } from "./player_avatars.js";
// NATPF: testi dell'HUD in italiano (traduzione al momento della visualizzazione)
import { t as tr, scoreText as sc } from "./natpf/natpf_i18n.js";
import { viewport } from "./natpf/natpf_screen.js"; // NATPF: finestra intera o area del ledwall
import { statsHtml, endScreen } from "./natpf/natpf_match_stats.js"; // NATPF B33/B35: i numeri veri della partita nella schermata finale
// NATPF: scritture nel DOM solo se il valore cambia. updateMultiplayerRoomInfo gira a ogni risposta del relay (20 al
// secondo nella sfida) e updateTimingGauge due volte per fotogramma (passi di fisica a 120 Hz): textContent riscritto
// uguale sostituisce comunque il nodo di testo e fa ricalcolare lo stile (come natpf_split_ui.js)
const setText = (el, s) => { el && el.textContent !== s && (el.textContent = s); };
const setHref = (el, v) => { el && el.getAttribute("href") !== v && el.setAttribute("href", v); };
export class HudUI {
  constructor(t = {}) {
    (this.callbacks = t),
      (this.bannerTimer = null),
      (this.timingPopupTimer = null),
      (this.skillHistory = [980, 1005, 1030, 1065, 1120]),
      (this.selectedGamesToWin = 2),
      (this.selectedInputMode = "mouse"),
      (this.selectedDifficulty = "casual"),
      (this.currentRoomId = "default"),
      (this.currentTunnelUrl = ""), // NATPF: link del companion sull'indirizzo da cui gira il gioco
      (this.elTitleModal = document.getElementById("title-modal")),
      (this.elCompanionModal = document.getElementById("companion-modal")),
      (this.elVictoryModal = document.getElementById("victory-modal")),
      (this.elScoreCenter = document.getElementById("score-center-display")),
      (this.elScorePlayer = document.getElementById("score-player-text")),
      (this.elScoreSep = document.getElementById("score-separator")),
      (this.elScoreOpponent = document.getElementById("score-opponent-text")),
      (this.elGamesPlayer = document.getElementById("games-pill-player")),
      (this.elGamesOpponent = document.getElementById("games-pill-opponent")),
      (this.elServerTag = document.getElementById("server-tag")),
      (this.elPlayerNameplate = document.getElementById("player-nameplate")),
      (this.elTimingPopup = document.getElementById("timing-popup")),
      (this.elTimingGrade = document.getElementById("timing-popup-grade")),
      (this.elTimingDetail = document.getElementById("timing-popup-detail")),
      (this.elBannerLayer = document.getElementById("center-banner-layer")),
      (this.elBannerText = document.getElementById("center-banner-text")),
      (this.elBannerSub = document.getElementById("center-banner-sub")),
      (this.elReplayBadge = document.getElementById("replay-badge")),
      (this.elTimingCursor = document.getElementById("timing-cursor")),
      (this.elGaugeModeTitle = document.getElementById("gauge-mode-title")),
      (this.elGaugeSpeedReadout = document.getElementById("gauge-speed-readout")),
      (this.elAudioDot = document.getElementById("audio-status-dot")),
      (this.elAudioLabel = document.getElementById("audio-track-label")),
      (this.elCameraLabel = document.getElementById("camera-mode-label")),
      (this.elWebcamPip = document.getElementById("webcam-pip-card")),
      (this.elWebcamDot = document.getElementById("webcam-status-dot")),
      (this.elPhoneDot = document.getElementById("phone-status-dot")),
      (this.elPhoneLabel = document.getElementById("phone-status-label")),
      (this.elOpponentPresencePill = document.getElementById("opponent-presence-pill")),
      (this.elOpponentPresenceText = document.getElementById("opponent-presence-text")),
      (this._lastRoomStatus = {}),
      (this._lastOtherReady = !1),
      (this._justJoinedTimer = null),
      this._renderAllPlayerPortraits(),
      this._bindEvents(),
      this._initUrlParamsState();
  }
  _renderAllPlayerPortraits() {
    P();
  }
  _drawPlayerFace(t, n = {}) {
    L(t, n.characterId || t?.id || "player1", n);
  }
  _initUrlParamsState() {
    const t = new URLSearchParams(window.location.search),
      n = (t.get("room") || "").trim().toUpperCase(),
      e = (t.get("role") || "p1").trim().toLowerCase() === "p2" ? "p2" : "p1",
      i = (t.get("mode") || t.get("difficulty") || "").toLowerCase();
    if (
      ((this.playerRole = e),
      n && n !== "DEFAULT"
        ? ((this.currentRoomId = n), this._setDifficultySelection("1v1", { notify: !1 }))
        : ["casual", "pro", "leggenda", "1v1", "bambini", "evento"].includes(i) && this._setDifficultySelection(i, { notify: !1 }),
      e === "p2")
    ) {
      const o = document.querySelector(".you-tag");
      o && (o.textContent = "Player 1");
      const s = document.getElementById("setup-opponent-label");
      s && (s.textContent = "Tu");
    }
    this.updateMultiplayerRoomInfo({
      roomId: this.currentRoomId,
      tunnelUrl: this.currentTunnelUrl,
      role: this.playerRole,
    });
  }
  _setDifficultySelection(t, { notify: n = !0 } = {}) {
    const e = ["casual", "pro", "leggenda", "1v1", "bambini", "evento"].includes(t) ? t : "casual"; // NATPF B18.2 gruppo 3: livelli Bambini ed Evento
    (this.selectedDifficulty = e),
      document.querySelectorAll("#difficulty-mode-group .nt-green-choice").forEach((a) => {
        a.classList.toggle("selected", a.dataset.difficulty === e);
      });
    const o = document.getElementById("match-length-section");
    // NATPF 1v1: anche tra due computer si sceglie la durata (prima sempre un game: il servizio non passava mai al P2)
    {
      o && o.classList.remove("hidden");
      const a = document.querySelector("#match-length-group .nt-green-choice.selected"),
        r = parseInt(a?.dataset?.games || "3", 10);
      (this.selectedGamesToWin = Math.ceil(r / 2)),
        this.configureGameBubbles(this.selectedGamesToWin),
        n &&
          this.callbacks.onSelectMatchLength &&
          this.callbacks.onSelectMatchLength(this.selectedGamesToWin);
    }
    const s = document.getElementById("setup-opponent-label");
    s &&
      this.playerRole !== "p2" &&
      (e === "1v1"
        ? (s.textContent = "Player 2")
        : e === "pro"
          ? (s.textContent = "CPU Pro")
          : e === "leggenda"
            ? (s.textContent = "CPU Leggenda")
            : (s.textContent = "CPU")),
      this.updateOpponentPresence(this._lastRoomStatus || {}),
      n && this.callbacks.onSelectDifficulty && this.callbacks.onSelectDifficulty(e);
  }
  _bindEvents() {
    document.querySelectorAll("#difficulty-mode-group .nt-green-choice").forEach((l) => {
      l.addEventListener("click", () => {
        const c = l.dataset.difficulty || "casual";
        this._setDifficultySelection(c, { notify: !0 });
      });
    });
    const n = document.querySelectorAll("#match-length-group .nt-green-choice");
    n.forEach((l) => {
      l.addEventListener("click", () => {
        n.forEach((u) => u.classList.remove("selected")), l.classList.add("selected");
        const c = parseInt(l.dataset.games || "3", 10);
        (this.selectedGamesToWin = Math.ceil(c / 2)),
          this.configureGameBubbles(this.selectedGamesToWin),
          this.callbacks.onSelectMatchLength && this.callbacks.onSelectMatchLength(this.selectedGamesToWin);
      });
    });
    const e = document.querySelectorAll("#input-mode-group .nt-cyan-choice");
    e.forEach((l) => {
      l.addEventListener("click", () => {
        e.forEach((c) => c.classList.remove("selected")),
          l.classList.add("selected"),
          (this.selectedInputMode = l.dataset.input || "mouse"),
          this.callbacks.onSelectInputMode && this.callbacks.onSelectInputMode(this.selectedInputMode);
      });
    });
    const i = document.getElementById("btn-start-match");
    i &&
      i.addEventListener("click", () => {
        this.hideTitleModal(),
          this.callbacks.onStartMatch &&
            this.callbacks.onStartMatch({
              gamesToWin: this.selectedGamesToWin,
              inputMode: this.selectedInputMode,
              difficulty: this.selectedDifficulty,
            });
      });
    const o = document.getElementById("btn-audio-toggle");
    o &&
      o.addEventListener("click", (l) => {
        l.stopPropagation(), this.callbacks.onToggleAudio && this.callbacks.onToggleAudio();
      });
    const s = document.getElementById("btn-camera-cycle");
    s &&
      s.addEventListener("click", (l) => {
        l.stopPropagation(), this.callbacks.onCycleCamera && this.callbacks.onCycleCamera();
      });
    const a = document.getElementById("btn-replay-trigger");
    a &&
      a.addEventListener("click", (l) => {
        l.stopPropagation(), this.callbacks.onToggleReplay && this.callbacks.onToggleReplay();
      });
    const r = document.getElementById("btn-webcam-toggle");
    r &&
      r.addEventListener("click", (l) => {
        l.stopPropagation(), this.callbacks.onToggleWebcam && this.callbacks.onToggleWebcam();
      });
    const m = document.getElementById("btn-phone-racket");
    m &&
      m.addEventListener("click", (l) => {
        // NATPF: il pulsante apre il collegamento del telefono NATPF (QR + calibrazione)
        l.stopPropagation(),
          this.callbacks.onOpenPhoneRacket ? this.callbacks.onOpenPhoneRacket() : this.openMultiplayerModal();
      });
    const p = document.getElementById("btn-multiplayer-modal");
    p &&
      p.addEventListener("click", (l) => {
        l.stopPropagation(), this.openMultiplayerModal();
      });
    const g = document.getElementById("btn-create-1v1-room");
    g &&
      g.addEventListener("click", async () => {
        (g.disabled = !0), (g.textContent = "Creo la stanza\u2026");
        try {
          if (this.callbacks.onCreateMultiplayerRoom) {
            const l = await this.callbacks.onCreateMultiplayerRoom();
            l &&
              l.roomId &&
              ((this.currentRoomId = l.roomId),
              this._setDifficultySelection("1v1", { notify: !1 }),
              this.updateMultiplayerRoomInfo({
                roomId: l.roomId,
                tunnelUrl: l.tunnelUrl || this.currentTunnelUrl,
                urls: l.urls,
              }));
          }
        } finally {
          (g.disabled = !1), (g.textContent = "+ Nuova stanza 1v1");
        }
      });
    const y = document.getElementById("btn-save-tunnel-url");
    y &&
      y.addEventListener("click", async () => {
        const l = document.getElementById("tunnel-url-input"),
          c = (l ? l.value : "").trim().replace(/\/+$/, "");
        if (c) {
          this.currentTunnelUrl = c;
          try {
            await fetch("/api/tunnel/url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tunnelUrl: c }),
            });
          } catch {}
          this.updateMultiplayerRoomInfo({ roomId: this.currentRoomId, tunnelUrl: this.currentTunnelUrl }),
            (y.textContent = "Salvato \u2713"),
            setTimeout(() => {
              y.textContent = "Aggiorna indirizzo";
            }, 1400);
        }
      });
    const f = document.getElementById("btn-send-gchat-invite");
    f &&
      f.addEventListener("click", async () => {
        const l = document.getElementById("gchat-target-input"),
          c = document.getElementById("gchat-send-status"),
          u = (l ? l.value : "").trim();
        if (!u) {
          c &&
            (c.textContent = "Scrivi prima lo spazio o l'email a cui mandare l'invito.");
          return;
        }
        if (
          (!this.currentRoomId || this.currentRoomId === "default") &&
          this.callbacks.onCreateMultiplayerRoom
        ) {
          const h = await this.callbacks.onCreateMultiplayerRoom();
          h && h.roomId && (this.currentRoomId = h.roomId);
        }
        (f.disabled = !0), (f.textContent = "Invio\u2026");
        try {
          const h = u.includes("@"),
            E = await (
              await fetch("/api/gchat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  room: this.currentRoomId,
                  spaceId: h ? "" : u,
                  dmEmail: h ? u : "",
                  tunnelUrl: this.currentTunnelUrl,
                }),
              })
            ).json();
          c &&
            (E.sent
              ? (c.textContent = `\u2705 Invito 1v1 (stanza ${this.currentRoomId}) inviato a ${u}`)
              : (c.textContent = `\u2139\uFE0F Stanza ${this.currentRoomId} pronta: condividi i link del campo e del telefono.`));
        } catch {
          c &&
            (c.textContent = `Stanza ${this.currentRoomId} pronta \u2014 condividi i link del campo e del telefono.`);
        } finally {
          (f.disabled = !1), (f.textContent = "Invia invito");
        }
      });
    const I = document.getElementById("btn-copy-gchat-cmd");
    I &&
      I.addEventListener("click", async () => {
        const l = document.getElementById("gchat-target-input"),
          c = document.getElementById("gchat-send-status"),
          h = `${(this.currentTunnelUrl || window.location.origin).replace(/\/+$/, "")}/?room=${encodeURIComponent(this.currentRoomId)}&role=p2`;
        try {
          navigator.clipboard && navigator.clipboard.writeText && (await navigator.clipboard.writeText(h)),
            c && (c.textContent = `\u{1F4CB} Copiato: ${h}`);
        } catch {
          c && (c.textContent = h);
        }
      });
    const b = document.getElementById("btn-close-companion");
    b &&
      b.addEventListener("click", () => {
        this.elCompanionModal && this.elCompanionModal.classList.add("hidden");
      });
    const B = document.getElementById("btn-play-again");
    B &&
      B.addEventListener("click", () => {
        this.hideVictoryModal(), this.callbacks.onPlayAgain && this.callbacks.onPlayAgain();
      });
    const T = document.getElementById("btn-return-title");
    T &&
      T.addEventListener("click", () => {
        this.hideVictoryModal(), this.showTitleModal();
      });
  }
  async openMultiplayerModal() {
    if (this.elCompanionModal) {
      try {
        const t = await fetch("/api/tunnel/status", { cache: "no-store" });
        if (t.ok) {
          const n = await t.json();
          if (n.tunnelUrl) {
            this.currentTunnelUrl = n.tunnelUrl;
            const e = document.getElementById("tunnel-url-input");
            e && (e.value = n.tunnelUrl);
          }
        }
      } catch {}
      this.updateMultiplayerRoomInfo({ roomId: this.currentRoomId, tunnelUrl: this.currentTunnelUrl }),
        this.elCompanionModal.classList.remove("hidden");
    }
  }
  hideTitleModal() {
    document.documentElement.classList.add("autoplay-mode"),
      this.elTitleModal &&
        (this.elTitleModal.classList.add("hidden"), (this.elTitleModal.style.display = "none"));
  }
  showTitleModal() {
    // NATPF: con la lobby torna la sua musica (src/audio_engine.js)
    window.dispatchEvent(new Event("natpf:lobby")),
      document.documentElement.classList.remove("autoplay-mode"),
      this.elTitleModal &&
        (this.elTitleModal.classList.remove("hidden"), (this.elTitleModal.style.display = "flex"));
  }
  hideVictoryModal() {
    this.elVictoryModal && this.elVictoryModal.classList.add("hidden");
  }
  // NATPF (B18, difetto 4 e punto 18 del B16): chi ha vinto con il nome e i game dei due giocatori, dal lato di chi guarda
  // (view: natpf_point_call.matchEndView, la calcola il motore). Prima «Hai vinto!/Riprova!» dal lato del Player 1, il
  // nome «Tu» e un rating finto (1145 se vinci, 1020 se perdi) con un grafico fisso. Senza view (chiamate di prima): i
  // testi dal lato di chi guarda, senza nomi. «Nuovo giocatore» lo mostra o lo nasconde natpf_ui (sfida tra due computer)
  showVictoryModal({ playerWon: t, playerGames: n, opponentGames: e, view: v = null }) {
    if (!this.elVictoryModal) return;
    const w = v || { title: t ? "Hai vinto!" : "Vince l’avversario", won: !!t, rows: [{ name: "Tu", games: n, win: !!t }, { name: "Avversario", games: e, win: !t }], score: `${n}-${e}` },
      i = document.getElementById("victory-result-banner"),
      o = document.getElementById("victory-match-score"),
      r = document.getElementById("victory-rows"),
      x = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    i && ((i.textContent = w.title), (i.style.color = "")),
      this.elVictoryModal.classList.toggle("natpf-lost", !w.won),
      r && (r.innerHTML = w.rows.map((s) => `<li class="${s.win ? "win" : ""}" data-victory-row><span>${x(s.name)}</span><b>${s.games | 0}</b></li>`).join("")),
      o && (o.textContent = `Game ${w.score}`);
    // NATPF B33: numeri veri della partita (natpf_match_stats.js: la vista la prepara il motore); senza dati la schermata
    // resta quella di prima
    // B35: con i numeri la schermata della proposta grafica (natpf_match_stats.endScreen): kicker, titolo («Bella sfida,
    // Luca!» quando si perde), riga sotto, game in una pillola, riquadri delle cose migliori, pillola in basso, «Gioca
    // ancora» o «Rivincita»
    const S = w.stats ? endScreen(w, w.stats) : null,
      st = document.getElementById("victory-stats"), html = S ? statsHtml(w.stats, w) : "",
      el = (id) => document.getElementById(id),
      put = (id, text) => { const n = el(id); n && ((n.textContent = text || ""), n.classList.toggle("hidden", !text)); };
    st && ((st.innerHTML = html), st.classList.toggle("hidden", !html));
    const kick = el("victory-kicker");
    kick && (kick.textContent = S ? S.kicker : "Fine partita");
    S && i && (i.textContent = S.title);
    put("victory-sub", S ? S.sub : "");
    const gp = el("victory-games");
    gp && ((gp.innerHTML = S?.games ? `<b>${S.games.mine | 0}</b><span>game a</span><b>${S.games.theirs | 0}</b>` : ""), gp.classList.toggle("hidden", !S?.games));
    put("victory-pill", S ? S.pill : "");
    const again = el("btn-play-again");
    again && (again.textContent = S ? S.again : "Gioca ancora");
    this.elVictoryModal.classList.toggle("has-stats", !!html),
      this.elVictoryModal.classList.toggle("stats-split", !!S?.players),
      this.elVictoryModal.classList.toggle("natpf-lost", !w.won || (!!S && !S.won)),
      this.elVictoryModal.classList.remove("hidden"),
      window.dispatchEvent(new Event("natpf:victory"));
  }
  configureGameBubbles(t = 2) {
    [this.elGamesPlayer, this.elGamesOpponent].forEach((n) => {
      if (!n) return;
      n.querySelectorAll(".game-bubble").forEach((i, o) => {
        o < Math.max(1, t) ? i.classList.remove("hidden") : i.classList.add("hidden");
      });
    });
  }
  updateScoreboard({
    playerScoreText: t = "00",
    opponentScoreText: n = "00",
    deuceLabel: e = null,
    playerGames: i = 0,
    opponentGames: o = 0,
    gamesToWin: s = 2,
  }) {
    this.elScoreCenter &&
      (e
        ? (this.elScoreCenter.classList.add("deuce-mode"),
          (this.elScorePlayer.textContent = sc(e)),
          this.elScoreSep.classList.add("hidden"),
          this.elScoreOpponent.classList.add("hidden"))
        : (this.elScoreCenter.classList.remove("deuce-mode"),
          (this.elScorePlayer.textContent = sc(t)),
          this.elScoreSep.classList.remove("hidden"),
          this.elScoreOpponent.classList.remove("hidden"),
          (this.elScoreOpponent.textContent = sc(n))),
      this.configureGameBubbles(s),
      this.elGamesPlayer &&
        this.elGamesPlayer
          .querySelectorAll(".game-bubble")
          .forEach((r, m) => r.classList.toggle("won", m < i)),
      this.elGamesOpponent &&
        this.elGamesOpponent
          .querySelectorAll(".game-bubble")
          .forEach((r, m) => r.classList.toggle("won", m < o)));
  }
  updateServerTag(t, n) {
    if (!this.elServerTag) return;
    if (!n || !t || !t.visible) {
      this.elServerTag.classList.add("hidden");
      return;
    }
    this.elServerTag.classList.remove("hidden");
    const e = Math.max(80, Math.min(viewport().w - 80, t.x)),
      i = Math.max(95, Math.min(viewport().h - 90, t.y));
    (this.elServerTag.style.left = `${e.toFixed(1)}px`), (this.elServerTag.style.top = `${i.toFixed(1)}px`);
  }
  updatePlayerNameplate(t, n) {
    if (!this.elPlayerNameplate) return;
    if (!n || !t || !t.visible) {
      this.elPlayerNameplate.classList.add("hidden");
      return;
    }
    this.elPlayerNameplate.classList.remove("hidden");
    const e = Math.max(90, Math.min(viewport().w - 90, t.x)),
      i = Math.max(120, Math.min(viewport().h - 50, t.y));
    (this.elPlayerNameplate.style.left = `${e.toFixed(1)}px`),
      (this.elPlayerNameplate.style.top = `${i.toFixed(1)}px`);
  }
  showTimingPopup({
    grade: t = "PERFECT",
    detail: n = "POWER TOPSPIN \u2022 176 KM/H",
    screenPos: e = null,
    durationMs: i = 1100,
  }) {
    if (this.elTimingPopup) {
      if (
        (this.timingPopupTimer && clearTimeout(this.timingPopupTimer),
        (this.elTimingGrade.textContent = tr(t)),
        (this.elTimingGrade.className = "timing-grade"),
        t.includes("EARLY")
          ? this.elTimingGrade.classList.add("grade-early")
          : t.includes("LATE")
            ? this.elTimingGrade.classList.add("grade-late")
            : this.elTimingGrade.classList.add("grade-perfect"),
        (this.elTimingDetail.textContent = tr(n)),
        e && e.visible)
      ) {
        const o = Math.max(110, Math.min(viewport().w - 110, e.x)),
          s = Math.max(110, Math.min(viewport().h - 120, e.y));
        (this.elTimingPopup.style.left = `${o.toFixed(1)}px`),
          (this.elTimingPopup.style.top = `${s.toFixed(1)}px`);
      } else (this.elTimingPopup.style.left = "50%"), (this.elTimingPopup.style.top = "54%");
      this.elTimingPopup.classList.remove("hidden"),
        i > 0 &&
          (this.timingPopupTimer = setTimeout(() => {
            this.elTimingPopup.classList.add("hidden");
          }, i));
    }
  }
  showCenterBanner(
    t,
    { style: n = "style-gold", subText: e = "", durationMs: i = 1500, persistent: o = !1 } = {},
  ) {
    !this.elBannerLayer ||
      !this.elBannerText ||
      (this.bannerTimer && (clearTimeout(this.bannerTimer), (this.bannerTimer = null)),
      (this.elBannerText.textContent = tr(sc(t))),
      (this.elBannerText.className = `center-banner-text ${n}`),
      this.elBannerSub &&
        (e
          ? ((this.elBannerSub.textContent = tr(e)), this.elBannerSub.classList.remove("hidden"))
          : this.elBannerSub.classList.add("hidden")),
      this.elBannerLayer.classList.remove("hidden"),
      !o &&
        i > 0 &&
        (this.bannerTimer = setTimeout(() => {
          this.hideCenterBanner();
        }, i)));
  }
  hideCenterBanner() {
    this.bannerTimer && (clearTimeout(this.bannerTimer), (this.bannerTimer = null)),
      this.elBannerLayer && this.elBannerLayer.classList.add("hidden");
  }
  setReplayMode(t) {
    document.body.classList.toggle("replay-mode", !!t),
      this.elReplayBadge && this.elReplayBadge.classList.toggle("hidden", !t);
  }
  setActiveShotChip(t) {}
  updateTimingGauge({ cursorNormalized: t = 0.5, modeTitle: n = "SWING TIMING", speedText: e = "READY" }) {
    // NATPF: stessi valori dell'ultima chiamata: niente da scrivere (in NATPF la scheda è anche nascosta)
    const k = `${t}|${n}|${e}`;
    if (this._timingKey === k) return;
    this._timingKey = k;
    if (this.elTimingCursor) {
      const i = Math.max(4, Math.min(96, t * 100));
      this.elTimingCursor.style.left = `${i.toFixed(1)}%`;
    }
    setText(this.elGaugeModeTitle, tr(n)), setText(this.elGaugeSpeedReadout, tr(e));
  }
  updateAudioStatus({ playing: t, trackName: n }) {
    this.elAudioDot && this.elAudioDot.classList.toggle("music-on", !!t),
      this.elAudioLabel &&
        (this.elAudioLabel.textContent = t ? `Musica: ${n || "sì"}` : "Musica: no");
  }
  updateCameraLabel(t) {
    this.elCameraLabel && (this.elCameraLabel.textContent = tr(t));
  }
  updateMotionStatus({ webcamActive: t = !1, phoneConnected: n = !1, p1Phone: e = !1, p2Phone: i = !1 }) {
    this.elWebcamPip && this.elWebcamPip.classList.toggle("hidden", !t),
      this.elWebcamDot && this.elWebcamDot.classList.toggle("active", !!t),
      this.elPhoneDot && this.elPhoneDot.classList.toggle("active", !!(n || e || i)),
      this.elPhoneLabel &&
        (e && i
          ? (this.elPhoneLabel.textContent = "Racchette P1 e P2")
          : n || e || i
            ? (this.elPhoneLabel.textContent = "Telefono collegato")
            : (this.elPhoneLabel.textContent = "Telefono"));
  }
  updateMultiplayerRoomInfo(t = {}) {
    const n = { ...(this._lastRoomStatus || {}), ...t };
    if (
      ((this._lastRoomStatus = n),
      n.roomId && (this.currentRoomId = String(n.roomId).toLowerCase()),
      n.role && (this.playerRole = String(n.role).toLowerCase() === "p2" ? "p2" : "p1"),
      n.tunnelUrl)
    ) {
      this.currentTunnelUrl = String(n.tunnelUrl).replace(/\/+$/, "");
      const d = document.getElementById("tunnel-url-input");
      d && document.activeElement !== d && (d.value = this.currentTunnelUrl);
    }
    const e = this.playerRole === "p2",
      i = document.getElementById("mp-card-p1"),
      o = document.getElementById("mp-card-p2"),
      s = document.getElementById("mp-gchat-invite-box"),
      a = document.getElementById("btn-create-1v1-room");
    i && i.classList.toggle("hidden", e),
      o && o.classList.toggle("hidden", !e),
      s && s.classList.toggle("hidden", e),
      a && a.classList.toggle("hidden", e);
    const r = document.getElementById("companion-room-badge");
    setText(r, `STANZA #${this.currentRoomId.toUpperCase()} \u2022 ${e ? "PLAYER 2" : "PLAYER 1"}`);
    const m = encodeURIComponent(this.currentRoomId),
      p = (this.currentTunnelUrl || window.location.origin).replace(/\/+$/, ""),
      g = `${p}/companion.html?room=${m}&role=p1`,
      y = `${p}/companion.html?room=${m}&role=p2`,
      f = document.getElementById("companion-link");
    setHref(f, g);
    const I = document.getElementById("companion-link-p2");
    setHref(I, y);
    // NATPF: QR del companion generati sul link vero (window.qrcode), niente immagini esterne. Solo quando il link
    // cambia: questa funzione gira a ogni risposta del relay (ogni 50 ms con il server LAN) e prima rigenerava i due QR
    // ogni volta (~30 ms di lavoro ogni 50 ms: scatti continui nel menu e in partita)
    const qrSet = (img, url) => {
        if (!img || img.dataset.qrUrl === url) return;
        try {
          if (!window.qrcode) return;
          const q = window.qrcode(0, "M");
          q.addData(new URL(url, window.location.href).href), q.make(), (img.src = q.createDataURL(4, 2)), (img.dataset.qrUrl = url);
        } catch {}
      };
    qrSet(document.getElementById("companion-qr"), g), qrSet(document.getElementById("companion-qr-p2"), y);
    const T = document.getElementById("court-link-p1");
    setHref(T, `/?room=${m}&role=p1`);
    const l = document.getElementById("court-link-p2");
    setHref(l, `/?room=${m}&role=p2`);
    const c = document.getElementById("mp-p1-status");
    if (c) {
      const d = !!(n.p1Phone || n.p1Online);
      setText(c, n.p1Phone ? "Collegato \u2713" : d ? "In campo" : "Scansiona il QR"),
        c.classList.toggle("online", !!n.p1Phone);
    }
    const u = document.getElementById("mp-p2-status");
    if (u) {
      const d = !!(n.p2Phone || n.p2Online);
      setText(u, n.p2Phone ? "Collegato \u2713" : d ? "In campo" : "Scansiona il QR"),
        u.classList.toggle("online", !!n.p2Phone);
    }
    const h = document.getElementById("mp-active-status");
    if (h) {
      const d = e ? !!n.p2Phone : !!n.p1Phone;
      setText(h, d ? "Collegato \u2713" : "Scansiona il QR"), h.classList.toggle("online", d);
    }
    this.updateOpponentPresence(n);
  }
  updateOpponentPresence(t = {}) {
    const n = !!(
        t.isMultiplayer ||
        this.selectedDifficulty === "1v1" ||
        (this.currentRoomId && this.currentRoomId !== "default")
      ),
      e = document.querySelector(".pl-side-opponent .pl-avatar-badge:not(.secondary-pl)");
    if (!n) {
      this.elOpponentPresencePill && this.elOpponentPresencePill.classList.add("hidden"),
        e && e.classList.remove("opponent-ready"),
        (this._lastOtherReady = !1);
      return;
    }
    const i = t.hostName && t.hostName.trim() ? t.hostName.trim() : "Player 1",
      o = t.guestName && t.guestName.trim() ? t.guestName.trim() : "Player 2",
      s = this.playerRole === "p2";
    let a = !1,
      r = "";
    s
      ? ((a = !!(t.p2Phone || t.p1Phone || t.p1Online)),
        // NATPF 1v1: il telefono-racchetta del P2 si collega al suo computer, non al relay (p2Phone resta falso): prima
        // il P2 leggeva sempre \u00abinquadra il QR per usare il telefono\u00bb, anche con il telefono collegato e calibrato
        t.p2Phone
          ? (r = `Racchetta pronta \u2022 ${i} in campo`)
          : t.p1Phone || t.p1Online
            ? (r = `${i} in campo \u2022 pronti al servizio!`)
            : (r = `In attesa di ${i}\u2026`))
      : ((a = !!(t.p2Phone || t.p2Online)),
        t.p2Phone && t.p2Online
          ? (r = `${o} collegato \u2022 pronti al servizio!`)
          : t.p2Phone
            ? (r = `Racchetta di ${o} pronta \u2022 pronti al servizio!`)
            : t.p2Online
              ? (r = `${o} in campo \u2022 pronti al servizio!`)
              : (r = `In attesa di ${o}\u2026`)),
      this.elOpponentPresencePill &&
        (this.elOpponentPresencePill.classList.remove("hidden"),
        this.elOpponentPresencePill.classList.toggle("ready", a),
        this.elOpponentPresencePill.classList.toggle("in-rally", !!t.inRally),
        a &&
          !this._lastOtherReady &&
          (this.elOpponentPresencePill.classList.remove("just-joined"),
          this.elOpponentPresencePill.offsetWidth,
          this.elOpponentPresencePill.classList.add("just-joined"),
          this._justJoinedTimer && clearTimeout(this._justJoinedTimer),
          (this._justJoinedTimer = setTimeout(() => {
            this.elOpponentPresencePill && this.elOpponentPresencePill.classList.remove("just-joined");
          }, 950)))),
      setText(this.elOpponentPresenceText, r),
      e && e.classList.toggle("opponent-ready", a);
    const m = document.getElementById("setup-opponent-label");
    // NATPF 1v1: «pronto» solo con il Player 2 pronto (prima bastava che fosse entrato, mentre la lobby diceva «sta
    // preparando la racchetta» e «Gioca» restava spento). B9: «pronto ✓» al posto dell'emoji nell'etichetta maiuscola
    m && this.selectedDifficulty === "1v1" && !s && setText(m, a && t.p2Ready ? `${o} pronto \u2713` : a ? `${o} entrato` : o),
      (this._lastOtherReady = a);
  }
}

import C from "path";
import { defineConfig as D, loadEnv as P } from "vite";
import v from "@vitejs/plugin-react";
import { natpfSitePlugin } from "./scripts/natpf-site-plugin.mjs";
import { createArgonRelay } from "./scripts/argon-relay.mjs";
import { offlineAssetsPlugin } from "./scripts/offline-assets.mjs";
// Relay della partita 1v1 di Argon (scripts/argon-relay.mjs, lo stesso del server LAN) nel server Vite.
// Gli asset /assets/… (modelli, audio, texture, MediaPipe) li serve offlineAssetsPlugin: dal disco, poi da gstatic.
function q() {
  const relay = createArgonRelay();
  return {
    name: "argon-tennis-relay",
    configureServer(u) {
      u.middlewares.use(relay);
    },
    configurePreviewServer(u) {
      u.middlewares.use(relay);
    },
  };
}
// NATPF Simulator vive in ../site (sito statico del repository): il desktop ne importa i moduli con «@natpf»,
// la pagina del telefono viene servita/copiata sotto /natpf/ (scripts/natpf-site-plugin.mjs).
const NATPF_SITE = C.resolve(__dirname, "../site");
export default D(async ({ mode: t }) => {
  const r = P(t, ".", "");
  // HTTPS locale (certificato autofirmato) per i sensori del telefono in LAN: NATPF_HTTPS=1 npm run dev
  const https = process.env.NATPF_HTTPS === "1" ? [(await import("@vitejs/plugin-basic-ssl")).default()] : [];
  return {
    server: {
      port: 3e3,
      host: "0.0.0.0",
      hmr: process.env.DISABLE_HMR !== "true",
      fs: { allow: [C.resolve(__dirname), NATPF_SITE] },
    },
    plugins: [v(), q(), offlineAssetsPlugin(), natpfSitePlugin({ siteDir: NATPF_SITE }), ...https],
    define: { "process.env.GEMINI_API_KEY": JSON.stringify(r.GEMINI_API_KEY || "") },
    resolve: {
      alias: {
        "../assets/vendor/GLTFLoader.js": "three/examples/jsm/loaders/GLTFLoader.js",
        "@natpf": C.join(NATPF_SITE, "js"),
        "@": C.resolve("."),
      },
      // i moduli di ../site importano «three»: una sola istanza, quella del motore base
      dedupe: ["three"],
    },
  };
});

// Revisore B39 (solo lettura del repository): stessa configurazione del gioco, cache di Vite qui e niente HMR.
// Si avvia DALLA CARTELLA natpf-tennis: npx vite --config <questa cartella>/vite.config.mjs --port 3561 --strictPort
import base from '/home/user/foro-italico-world/natpf-tennis/vite.config.ts';
export default async (env) => {
  const c = await (typeof base === 'function' ? base(env) : base);
  return { ...c, root: '/home/user/foro-italico-world/natpf-tennis', cacheDir: '/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/revisore/vite-cache',
    server: { ...c.server, host: '127.0.0.1', hmr: false } };
};

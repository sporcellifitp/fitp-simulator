// Riuso di NATPF Simulator dentro natpf-argon, senza copiarne il codice nel progetto.
// - Il desktop importa i moduli NATPF (arena, collegamento del telefono, camera) con l'alias «@natpf» → ../site/js.
// - La pagina del telefono (site/tennis/racchetta.html) resta quella di NATPF, servita così com'è sotto /natpf/:
//   in sviluppo da questo middleware, nella build copiata in dist/natpf/ con le sole dipendenze transitive.
// - Le grafiche dell'arena vanno anche in dist/assets/arena/, dove le cerca arena.js una volta incluso nel bundle.
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.LICENSE': 'text/plain; charset=utf-8',
};
// Solo ciò che serve al telefono e all'arena: niente mondo esplorabile, minigiochi o dati del Foro.
const ENTRIES = ['tennis/racchetta.html', 'js/tennis/racchetta.js', 'js/vendor/peerjs.min.js', 'js/vendor/peerjs.LICENSE', 'js/vendor/qrcode.js'];
const ALLOWED = /^(tennis\/racchetta\.html|js\/tennis\/[\w.-]+\.js|js\/match\/[\w.-]+\.js|js\/vendor\/(peerjs\.min\.js|peerjs\.LICENSE|qrcode\.js)|assets\/arena\/[\w.-]+\.png)$/;

// Dipendenze relative di un modulo ES, come tools/package-natpf.py.
export function phoneFiles(siteDir){
  const files = new Set();
  const visit = relative => {
    const source = path.resolve(siteDir, relative);
    const rel = path.relative(siteDir, source).split(path.sep).join('/');
    if (rel.startsWith('..') || files.has(rel)) return;
    if (!fs.statSync(source, { throwIfNoEntry: false })?.isFile()) throw new Error(`[natpf] dipendenza mancante: ${rel}`);
    files.add(rel);
    if (rel.endsWith('.js') && !rel.startsWith('js/vendor/')){
      const code = fs.readFileSync(source, 'utf8');
      for (const [, , spec] of code.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)){
        if (spec.startsWith('.')) visit(path.relative(siteDir, path.resolve(path.dirname(source), spec)));
        else throw new Error(`[natpf] import esterno inatteso nella pagina del telefono: ${spec} (${rel})`);
      }
    }
  };
  for (const entry of ENTRIES) visit(entry);
  return [...files].sort();
}
export const arenaFiles = siteDir => fs.readdirSync(path.join(siteDir, 'assets/arena')).filter(f => f.endsWith('.png')).map(f => `assets/arena/${f}`);

export function natpfSitePlugin({ siteDir }){
  let outDir = null;
  return {
    name: 'natpf-site',
    configureServer(server){
      server.middlewares.use((req, res, next) => {
        let url = null;
        try { url = new URL((req.url || '/').replace(/^\/{2,}/, '/'), 'http://localhost'); } catch { return next(); }
        if (!url.pathname.startsWith('/natpf/')) return next();
        const rel = decodeURIComponent(url.pathname.slice('/natpf/'.length));
        if (!ALLOWED.test(rel)) { res.statusCode = 404; res.end('Not found'); return; }
        const file = path.join(siteDir, rel);
        fs.readFile(file, (err, body) => {
          if (err) { res.statusCode = 404; res.end('Not found'); return; }
          res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(body);
        });
      });
    },
    configResolved(config){ if (config.command === 'build') outDir = path.resolve(config.root, config.build.outDir); },
    closeBundle(){
      if (!outDir || !fs.existsSync(outDir)) return;
      const copy = (rel, dest) => { const target = path.join(outDir, dest); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(siteDir, rel), target); };
      for (const rel of phoneFiles(siteDir)) copy(rel, `natpf/${rel}`);
      for (const rel of arenaFiles(siteDir)) copy(rel, rel);
    },
  };
}

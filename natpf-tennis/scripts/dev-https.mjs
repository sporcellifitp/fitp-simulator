// npm run dev:https — come npm run dev, ma in HTTPS con certificato autofirmato (vite.config.ts → NATPF_HTTPS):
// serve al telefono in LAN, perché i sensori di movimento richiedono una pagina sicura.
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port=3000', '--host=0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NATPF_HTTPS: '1' } });
child.on('exit', code => process.exit(code ?? 0));

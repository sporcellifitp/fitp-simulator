import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { X509Certificate, createPrivateKey } from 'node:crypto';

export const legacyCerts = fileURLToPath(new URL('./certs', import.meta.url));
export function dataDirectory({ platform = process.platform, env = process.env } = {}) {
  if (env.NATPF_DATA_DIR) return path.resolve(env.NATPF_DATA_DIR);
  if (platform === 'win32' && env.LOCALAPPDATA) return path.join(env.LOCALAPPDATA, 'NATPF');
  return null;
}
export const dataDir = dataDirectory();
export const certificateDir = dataDir ? path.join(dataDir, 'certs') : legacyCerts;

// Copy the complete authority atomically, never combine keys from different releases.
export function migrateCertificates(source = legacyCerts, target = certificateDir) {
  if (path.resolve(source) === path.resolve(target)) return false;
  if (fs.existsSync(target)) {
    if (fs.readdirSync(target).length) return false;
    fs.rmdirSync(target);
  }
  if (!fs.existsSync(source)) return false;
  const cert = new X509Certificate(fs.readFileSync(path.join(source, 'ca/rootCA.pem')));
  const key = createPrivateKey(fs.readFileSync(path.join(source, 'ca/rootCA-key.pem')));
  if (!cert.ca || !cert.checkPrivateKey(key)) throw Error('Autorità precedente non valida: certificato e chiave non corrispondono.');
  if (Date.parse(cert.validTo) <= Date.now()) throw Error('Autorità precedente scaduta.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = fs.mkdtempSync(path.join(path.dirname(target), '.cert-migration-'));
  try {
    fs.mkdirSync(path.join(temporary, 'ca'));
    for (const name of ['ca/rootCA.pem', 'ca/rootCA-key.pem', 'cert.pem', 'key.pem', 'natpf-ca.crt']) {
      const file = path.join(source, name);
      if (fs.existsSync(file)) fs.writeFileSync(path.join(temporary, name), fs.readFileSync(file), { mode: 0o600 });
    }
    fs.renameSync(temporary, target);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  return true;
}

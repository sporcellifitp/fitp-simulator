// Certificato HTTPS per la LAN senza programmi da installare (al posto di mkcert):
//   1. un'autorità di certificazione locale, una sola volta per questo computer (certs/ca/: la chiave non esce mai da qui);
//   2. il certificato del server per gli indirizzi di rete attuali del computer, più localhost (certs/cert.pem, key.pem),
//      rifatto quando cambiano gli indirizzi; l'avvio guidato (launcher.mjs) lo vede da solo e parte in HTTPS;
//   3. la parte pubblica dell'autorità (certs/natpf-ca.crt) da installare sui telefoni e sul computer.
//   node certificato.mjs              crea o aggiorna e stampa cosa fare
//   node certificato.mjs --servi      in più serve natpf-ca.crt ai telefoni su http://IP:8081/ (QR nella finestra)
//   node certificato.mjs --forza      rifà il certificato del server anche se gli indirizzi non sono cambiati
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { X509Certificate } from 'node:crypto';
import { lanAddresses } from './server.mjs';

const require = createRequire(import.meta.url);
const forge = require('node-forge');
const DIR = path.dirname(fileURLToPath(import.meta.url));
export const CERTS = path.join(DIR, 'certs');
const CA_DIR = path.join(CERTS, 'ca');
const files = { caCert: path.join(CA_DIR, 'rootCA.pem'), caKey: path.join(CA_DIR, 'rootCA-key.pem'), cert: path.join(CERTS, 'cert.pem'), key: path.join(CERTS, 'key.pem'), publicCa: path.join(CERTS, 'natpf-ca.crt') };
const DAY = 864e5;

const serial = () => '01' + forge.util.bytesToHex(forge.random.getBytesSync(15));
function loadOrCreateCa(){
  if (fs.existsSync(files.caCert) && fs.existsSync(files.caKey)){
    const cert = forge.pki.certificateFromPem(fs.readFileSync(files.caCert, 'utf8'));
    if (cert.validity.notAfter.getTime() - Date.now() > 400*DAY) return { cert, key: forge.pki.privateKeyFromPem(fs.readFileSync(files.caKey, 'utf8')), created: false };
  }
  const keys = forge.pki.rsa.generateKeyPair(2048), cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey; cert.serialNumber = serial();
  cert.validity.notBefore = new Date(Date.now() - DAY); cert.validity.notAfter = new Date(Date.now() + 3650*DAY);
  const attrs = [{ name: 'commonName', value: `NATPF Simulator LAN (${os.hostname()})` }, { name: 'organizationName', value: 'NATPF Simulator' }];
  cert.setSubject(attrs); cert.setIssuer(attrs);
  cert.setExtensions([{ name: 'basicConstraints', cA: true, critical: true, pathLenConstraint: 0 }, { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true }, { name: 'subjectKeyIdentifier' }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  fs.mkdirSync(CA_DIR, { recursive: true });
  fs.writeFileSync(files.caKey, forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
  fs.writeFileSync(files.caCert, forge.pki.certificateToPem(cert));
  return { cert, key: keys.privateKey, created: true };
}
// indirizzi coperti dal certificato del server attuale (vuoto se manca o è scaduto)
export function coveredAddresses(certPath = files.cert){
  try {
    const x = new X509Certificate(fs.readFileSync(certPath));
    if (Date.now() > Date.parse(x.validTo) - 30*DAY) return [];
    return (x.subjectAltName || '').split(',').map(s => s.trim()).filter(s => s.startsWith('IP Address:')).map(s => s.slice(11));
  } catch { return []; }
}
export function ensureCertificate({ addresses = lanAddresses(), force = false } = {}){
  const ca = loadOrCreateCa();
  const ips = [...new Set([...addresses, '127.0.0.1'])];
  const covered = coveredAddresses();
  const upToDate = !force && !ca.created && fs.existsSync(files.key) && ips.every(ip => covered.includes(ip));
  if (!upToDate){
    const keys = forge.pki.rsa.generateKeyPair(2048), cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey; cert.serialNumber = serial();
    // al massimo 825 giorni: oltre, iPhone e Safari rifiutano il certificato del server
    cert.validity.notBefore = new Date(Date.now() - DAY); cert.validity.notAfter = new Date(Date.now() + 800*DAY);
    cert.setSubject([{ name: 'commonName', value: ips[0] || 'localhost' }]); cert.setIssuer(ca.cert.subject.attributes);
    cert.setExtensions([
      { name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [...ips.map(ip => ({ type: 7, ip })), { type: 2, value: 'localhost' }, { type: 2, value: os.hostname() }] },
    ]);
    cert.sign(ca.key, forge.md.sha256.create());
    fs.mkdirSync(CERTS, { recursive: true });
    fs.writeFileSync(files.key, forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(files.cert, forge.pki.certificateToPem(cert));
  }
  fs.writeFileSync(files.publicCa, forge.pki.certificateToPem(ca.cert));
  return { ips, caCreated: ca.created, renewed: !upToDate, files };
}

// Pagina per i telefoni: scarica natpf-ca.crt e istruzioni per iPhone e Android. Serve solo la parte pubblica.
const page = url => `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NATPF · certificato</title>
<body style="font:17px/1.45 system-ui,sans-serif;margin:0;padding:20px;background:#071233;color:#f3f6fb"><h1 style="font-size:24px">NATPF Simulator · telefono</h1>
<p>Una volta sola per telefono: installa il certificato della rete NATPF, così il telefono può usare i sensori con il gioco.</p>
<p><a href="/natpf-ca.crt" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#e8ff3a;color:#071233;font-weight:700;text-decoration:none">Scarica il certificato</a></p>
<h2 style="font-size:19px">iPhone</h2><ol><li>Tocca «Scarica il certificato», poi «Consenti».</li><li>Impostazioni → Profilo scaricato → Installa.</li>
<li>Impostazioni → Generali → Info → Impostazioni attendibilità certificati → attiva «NATPF Simulator LAN».</li></ol>
<h2 style="font-size:19px">Android</h2><ol><li>Tocca «Scarica il certificato».</li><li>Impostazioni → Sicurezza (o Password e sicurezza) → Altre impostazioni → Crittografia e credenziali → Installa un certificato → Certificato CA.</li>
<li>Scegli il file scaricato «natpf-ca.crt». I nomi delle voci cambiano un po' da marca a marca.</li></ol>
<p>Poi apri il gioco sul computer e inquadra il QR. Indirizzo di questa pagina: ${url}</p></body></html>`;
export function serveCa({ port = 8081, ips = lanAddresses() } = {}){
  const server = http.createServer((req, res) => {
    const p = (req.url || '/').split('?')[0];
    if (p === '/natpf-ca.crt'){ res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="natpf-ca.crt"', 'Cache-Control': 'no-store' }); res.end(fs.readFileSync(files.publicCa)); return; }
    if (p === '/'){ res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(page(`http://${req.headers.host}/`)); return; }
    res.writeHead(404).end();
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', () => resolve({ server, urls: ips.map(ip => `http://${ip}:${port}/`) })); });
}
// QR nella finestra del programma (caratteri a blocchi), con il generatore di QR del sito
function asciiQr(text){
  try {
    const qrcode = require('../../site/js/vendor/qrcode.js');
    const q = qrcode(0, 'L'); q.addData(text); q.make();
    const n = q.getModuleCount(), on = (r, c) => r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c), lines = [];
    for (let r = -2; r < n + 2; r += 2){ let line = ''; for (let c = -2; c < n + 2; c++){ const a = on(r, c), b = on(r + 1, c); line += a && b ? ' ' : a ? '▄' : b ? '▀' : '█'; } lines.push(line); }
    return lines.join('\n');
  } catch { return ''; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const args = new Set(process.argv.slice(2));
  const r = ensureCertificate({ force: args.has('--forza') });
  console.log('');
  console.log(r.caCreated ? 'Creata l’autorità di certificazione locale di questo computer (tools/lan/certs/ca: non darla a nessuno).' : 'Autorità di certificazione locale già presente.');
  console.log(r.renewed ? `Certificato del server creato per: ${r.ips.join(', ')}, localhost.` : `Certificato del server già valido per: ${r.ips.join(', ')}.`);
  console.log(`Parte pubblica da installare su telefoni e computer: ${r.files.publicCa}`);
  if (!r.ips.some(ip => ip !== '127.0.0.1')) console.log('ATTENZIONE: nessun indirizzo di rete trovato. Collega il computer alla Wi-Fi e riapri.');
  if (args.has('--servi')){
    const { urls } = await serveCa({ ips: r.ips.filter(ip => ip !== '127.0.0.1') });
    console.log('');
    console.log('Sul telefono (stessa Wi-Fi) apri uno di questi indirizzi, oppure inquadra il QR:');
    for (const u of urls) console.log(`  ${u}`);
    const qr = urls[0] && asciiQr(urls[0]); if (qr) console.log('\n' + qr + '\n');
    console.log('Quando i telefoni hanno il certificato chiudi questa finestra (o premi Ctrl+C).');
  }
}

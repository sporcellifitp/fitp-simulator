// Manifesto degli aggiornamenti (windows/latest.json sul bucket Cloudflare R2) per l'installer appena costruito, e
// controllo che la pubblicazione non torni indietro. Usato dal workflow .github/workflows/natpf-windows.yml:
//   node scripts/manifesto.mjs --exe=dist/NATPF-Simulator-Setup-<versione>.exe --out=dist/latest.json
//                              [--novita=novita.txt] [--note=testo]
//   node scripts/manifesto.mjs --confronta=remoto.json --build=<versione>    esce con 3 se sul bucket c'è già questa
//                                                                            versione o una più nuova (non si pubblica)
// Il manifesto è lo stesso che il programma legge (src/aggiornamenti.mjs, validateManifest): si ricontrolla qui.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateManifest, compareBuilds, parseBuild, installerName, UPDATES } from '../src/aggiornamenti.mjs';
import { windowsVersion } from '../src/desktop-core.mjs';

// note per l'utente: testo semplice, una riga o poche, senza le righe di attribuzione dei commit
export function cleanNotes(text = ''){
  return String(text).split(/\r?\n/).filter(l => !/^(Co-Authored-By|Claude-Session|Signed-off-by):/i.test(l.trim()))
    .join('\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, UPDATES.maxNotes);
}
// note della versione da novita.txt (righe «AAAA-MM-GG.n: testo per chi gioca»; # commento): solo quelle della
// versione pubblicata, altrimenti niente (il manifesto mette «Versione …»). Mai l'oggetto dei commit: è per chi sviluppa
export function notesFor(text = '', build){
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => /^(\d{4}-\d{2}-\d{2}\.\d+)\s*:\s*(.*)$/.exec(l)).filter(m => m && m[1] === build && m[2]).map(m => m[2]).join('\n');
}
export function makeManifest({ build, bytes, notes = '', published = new Date().toISOString() }){
  if (!parseBuild(build)) throw new Error(`versione non valida: ${build}`);
  const m = { build, version: windowsVersion(build), file: installerName(build), size: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), notes: cleanNotes(notes) || `Versione ${build}.`, published };
  validateManifest(m, 'https://controllo.invalid');
  return m;
}
// si pubblica solo se sul bucket non c'è niente di valido o c'è una versione più vecchia. Mai con la stessa versione:
// la costruzione non dà gli stessi byte (date dei file nel pacchetto), e un installer già pubblicato non si riscrive
// (nome con la versione e cache lunga: la cache di Cloudflare darebbe i byte vecchi con lo sha256 nuovo del manifesto)
export function shouldPublish(remoteJson, build){
  let remote; try { remote = JSON.parse(remoteJson); } catch { return true; }
  if (!parseBuild(remote?.build)) return true;
  return compareBuilds(build, remote.build) > 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(2, i), v.slice(i + 1)]; }));
  if (args.confronta){
    const ok = shouldPublish(fs.readFileSync(args.confronta, 'utf8'), String(args.build));
    console.log(ok ? `si pubblica ${args.build}` : `sul bucket c'è già ${args.build} o una versione più nuova: non si pubblica`);
    process.exit(ok ? 0 : 3);
  }
  const exe = path.resolve(String(args.exe || ''));
  const m = /NATPF-Simulator-Setup-(.+)\.exe$/.exec(path.basename(exe));
  if (!m || !fs.existsSync(exe)){ console.error('Serve --exe=dist/NATPF-Simulator-Setup-<versione>.exe'); process.exit(1); }
  let notes = typeof args.note === 'string' ? args.note : '';
  if (!notes && typeof args.novita === 'string'){ try { notes = notesFor(fs.readFileSync(args.novita, 'utf8'), m[1]); } catch (e){ if (e.code !== 'ENOENT') throw e; } }
  const manifest = makeManifest({ build: m[1], bytes: fs.readFileSync(exe), notes });
  const out = path.resolve(String(args.out || path.join(path.dirname(exe), 'latest.json')));
  fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${out}\n${JSON.stringify(manifest, null, 2)}`);
}

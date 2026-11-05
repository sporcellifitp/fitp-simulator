// Consegna degli eseguibili in pezzi (richiesta del 05/11/2026: «i file exe non riesco a scaricarli dal tuo
// messaggio»): gli .exe da ~125 MB non si scaricavano, gli zip da ~60 MB sì. Qui ogni .exe di dist/ diventa pezzi da
// 45 MB (nome.exe.001, .002, …) più «UNISCI I PEZZI.cmd», che su Windows li rimette insieme con copy /b e controlla lo
// sha256 con certutil (tutto già in Windows, niente da installare). Uso, dopo scripts/costruisci.mjs:
//   node scripts/dividi.mjs [--mb=45] [--out=dist/consegna]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PART_MB = 45;
// testo di UNISCI I PEZZI.cmd per gli eseguibili { name, parts: [nomi dei pezzi], sha256 } (righe CRLF)
export function joinScript(files){
  const lines = ['@echo off', 'rem NATPF Simulator: rimette insieme gli eseguibili scaricati a pezzi e ne controlla lo sha256.',
    'rem Metti tutti i pezzi (.001, .002, ...) nella stessa cartella di questo file, poi doppio clic.', 'chcp 65001 >nul', 'cd /d "%~dp0"'];
  files.forEach((f, i) => {
    if (/["%&|<>^]/.test(f.name) || f.parts.some(p => /["%&|<>^]/.test(p))) throw new Error(`nome non valido: ${f.name}`);
    const label = `salta${i + 1}`;
    lines.push('', `if not exist "${f.parts[0]}" goto ${label}`);
    for (const p of f.parts) lines.push(`if not exist "${p}" (echo Manca il pezzo ${p}: scaricalo e riprova. & goto ${label})`);
    lines.push(`echo Unisco ${f.name} ...`,
      `copy /b ${f.parts.map(p => `"${p}"`).join('+')} "${f.name}" >nul`,
      `certutil -hashfile "${f.name}" SHA256 | findstr /i /c:"${f.sha256}" >nul`,
      `if errorlevel 1 (echo ATTENZIONE: ${f.name} non corrisponde, riscarica i pezzi.) else (echo ${f.name} pronto e verificato.)`,
      `:${label}`);
  });
  lines.push('', 'echo.', 'echo Fatto. Ora puoi cancellare i file .001, .002, ...', 'pause', '');
  return lines.join('\r\n');
}
export function splitFile(file, outDir, partBytes){
  const buf = fs.readFileSync(file), name = path.basename(file), parts = [];
  for (let i = 0, n = 1; i < buf.length; i += partBytes, n++){
    const part = `${name}.${String(n).padStart(3, '0')}`;
    fs.writeFileSync(path.join(outDir, part), buf.subarray(i, i + partBytes));
    parts.push(part);
  }
  return { name, parts, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(2, i), v.slice(i + 1)]; }));
  const mb = Number(args.mb || PART_MB), out = path.resolve(args.out || path.join(HERE, 'dist/consegna'));
  const exes = fs.readdirSync(path.join(HERE, 'dist')).filter(f => /^NATPF-Simulator-.*\.exe$/.test(f)).sort();
  if (!exes.length){ console.error('Nessun eseguibile in dist/: prima «npm run costruisci».'); process.exit(1); }
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const files = exes.map(f => splitFile(path.join(HERE, 'dist', f), out, mb*1e6));
  fs.writeFileSync(path.join(out, 'UNISCI I PEZZI.cmd'), joinScript(files));
  for (const f of files) console.log(`${f.name}: ${f.parts.length} pezzi da al massimo ${mb} MB, sha256 ${f.sha256}`);
  console.log(`Consegna in ${out}`);
}

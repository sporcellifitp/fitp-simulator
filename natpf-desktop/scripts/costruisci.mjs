// Costruisce gli eseguibili Windows di NATPF Simulator (da Linux o da Windows), dopo scripts/prepara.mjs:
//   dist/NATPF-Simulator-Setup-<versione>.exe      installazione (Programmi, collegamenti, firewall, disinstalla)
//   dist/NATPF-Simulator-Portatile-<versione>.exe  un solo file, senza installazione (si estrae al primo avvio)
// 1) electron-builder prepara dist/win-unpacked (Electron per Windows x64 con il gioco in resources/app);
// 2) makensis (lo stesso che usa electron-builder, scaricato nella sua cache) compila build/installatore.nsi e
//    build/portatile.nsi. Il target nsis di electron-builder da Linux chiede wine per la disinstallazione; qui la
//    disinstallazione si scrive durante l'installazione (WriteUninstaller), quindi niente wine.
// Senza firma del codice (decisione dell'utente del 04/11): SmartScreen avvisa alla prima apertura. Icona e dati del
// programma nell'eseguibile con resedit (da Linux non c'è rcedit, che chiede Windows o wine).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import builder from 'electron-builder';
import * as ResEdit from 'resedit';
import windowsToolset from 'app-builder-lib/out/toolsets/windows.js';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(fs.readFileSync(path.join(HERE, 'app/package.json'), 'utf8'));
const electronVersion = JSON.parse(fs.readFileSync(path.join(HERE, 'node_modules/electron/package.json'), 'utf8')).version;
const build = app.natpfBuild, [a, b, c] = app.version.split('.').map(Number);

// icona e informazioni sulla versione dentro «NATPF Simulator.exe» (prima di comporre installazione e portatile)
function editExe(exe){
  const exeFile = ResEdit.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exeFile);
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(HERE, 'build/icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const g = groups[0] || { id: 1, lang: 1033 };
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, icon.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
  const lang = vi.getAllLanguagesForStringValues?.()[0] || { lang: 1033, codepage: 1200 };
  // prima i numeri (resedit riscrive anche le stringhe delle versioni), poi i testi: versione prodotto = quella del gioco
  vi.setFileVersion(a, b, c, 0, lang.lang); vi.setProductVersion(a, b, c, 0, lang.lang);
  vi.setStringValues(lang, { ProductName: 'NATPF Simulator', FileDescription: 'NATPF Simulator', CompanyName: 'NATPF Simulator',
    LegalCopyright: 'NATPF Simulator', OriginalFilename: 'NATPF Simulator.exe', InternalName: 'NATPF Simulator', ProductVersion: build, FileVersion: app.version });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(exeFile);
  fs.writeFileSync(exe, Buffer.from(exeFile.generate()));
}

const DIST = path.join(HERE, 'dist'), UNPACKED = path.join(DIST, 'win-unpacked');
fs.rmSync(DIST, { recursive: true, force: true });
const config = {
  appId: 'it.natpf.simulator', productName: 'NATPF Simulator', copyright: 'NATPF Simulator',
  directories: { app: 'app', output: 'dist', buildResources: 'build' },
  electronVersion, asar: false, npmRebuild: false, nodeGypRebuild: false,
  electronLanguages: ['it', 'en-US'],
  win: { target: [{ target: 'dir', arch: ['x64'] }], icon: 'build/icon.ico', signAndEditExecutable: false },
  afterPack: async ctx => { const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`); editExe(exe); console.log(`icona e versione: ${exe}`); },
};
await builder.build({ projectDir: HERE, targets: builder.Platform.WINDOWS.createTarget(null, builder.Arch.x64), config, publish: 'never' });
if (!fs.existsSync(path.join(UNPACKED, 'NATPF Simulator.exe'))) throw new Error('manca dist/win-unpacked/NATPF Simulator.exe');

// file del programma (primo livello di win-unpacked): l'installazione li toglie per aggiornare e per disinstallare,
// così non cancella altro se la cartella scelta contiene anche altri file
const elenco = path.join(DIST, 'elenco.nsh');
fs.writeFileSync(elenco, ['; generato da scripts/costruisci.mjs: file del programma (aggiornamento e disinstallazione)', '!macro RimuoviProgramma',
  ...fs.readdirSync(UNPACKED, { withFileTypes: true }).map(e => (e.isDirectory() ? `  RMDir /r "$INSTDIR\\${e.name}"` : `  Delete "$INSTDIR\\${e.name}"`)),
  '!macroend', ''].join('\n'));

const makensis = await windowsToolset.getMakeNsisPath();
const defines = { VERSION: app.version, BUILD: build, SRC: UNPACKED, ELENCO: elenco,
  ICONA: path.join(HERE, 'build/icon.ico'), LATO: path.join(HERE, 'build/installatore-lato.bmp'), TESTATA: path.join(HERE, 'build/installatore-testata.bmp') };
const out = [];
for (const [script, name] of [['installatore.nsi', `NATPF-Simulator-Setup-${build}.exe`], ['portatile.nsi', `NATPF-Simulator-Portatile-${build}.exe`]]){
  const file = path.join(DIST, name);
  console.log(`makensis ${script} → ${name} (compressione lzma, qualche minuto)`);
  execFileSync(makensis.path, ['-V2', '-INPUTCHARSET', 'UTF8', '-WX', ...Object.entries({ ...defines, OUT: file }).map(([k, v]) => `-D${k}=${v}`), path.join(HERE, 'build', script)],
    { stdio: 'inherit', env: { ...process.env, ...(makensis.env || {}) } });
  out.push(file);
}
console.log('costruiti:'); for (const f of out) console.log(`  ${f}  ${(fs.statSync(f).size/1e6).toFixed(1)} MB`);

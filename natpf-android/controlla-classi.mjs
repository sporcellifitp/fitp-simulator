#!/usr/bin/env node
// Controllo delle classi mancanti nell'APK (16/11/2026, dopo il crash dell'app 1.0.0 su «Inquadra il QR del PC»).
//
// Il lettore di QR della libreria (CaptureManager) usava ContextCompat e ActivityCompat di AndroidX, che la libreria non
// porta con sé: la build, i test e lint erano verdi, l'APK no (NoClassDefFoundError appena si apriva la fotocamera).
// Qui si leggono tutte le classi a cui rimanda il codice dentro l'APK (dexdump) e si controlla che ognuna sia nell'APK o
// in Android (android.jar della compileSdk). Rosso = una classe che sul telefono non c'è.
//
//   node controlla-classi.mjs [percorso.apk]      (di base app/build/outputs/apk/release/app-release.apk)
//
// L'SDK si cerca in ANDROID_HOME, ANDROID_SDK_ROOT o in local.properties (sdk.dir).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPILE_SDK = (readFileSync(join(HERE, 'app/build.gradle'), 'utf8').match(/compileSdk\s+(\d+)/) || [])[1] || '34';

// Classi della libreria che rimandano a parti di AndroidX che l'app non usa (e quindi non porta): non si caricano mai.
// Chi usa una di queste classi deve prima aggiungere la dipendenza e toglierla da qui.
const NON_USATE = {
  'Lcom/google/zxing/integration/android/IntentIntegrator;': 'vecchia API del lettore, rimanda ai Fragment: l\'app usa ScanOptions',
  'Lcom/journeyapps/barcodescanner/ScanContract;': 'API ActivityResult di AndroidX: l\'app usa startActivityForResult',
};

function sdkDir() {
  for (const v of [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT]) if (v && existsSync(v)) return v;
  const lp = join(HERE, 'local.properties');
  if (existsSync(lp)) {
    const m = readFileSync(lp, 'utf8').match(/^sdk\.dir=(.*)$/m);
    if (m && existsSync(m[1].trim())) return m[1].trim();
  }
  throw new Error('SDK di Android non trovato (ANDROID_HOME, ANDROID_SDK_ROOT o local.properties)');
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr || r.error}`);
  return r.stdout;
}

const apk = process.argv[2] || join(HERE, 'app/build/outputs/apk/release/app-release.apk');
if (!existsSync(apk)) { console.error(`APK non trovato: ${apk}`); process.exit(2); }
const sdk = sdkDir();
const tools = readdirSync(join(sdk, 'build-tools')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const dexdump = join(sdk, 'build-tools', tools[tools.length - 1], 'dexdump');
const androidJar = join(sdk, 'platforms', `android-${COMPILE_SDK}`, 'android.jar');
if (!existsSync(dexdump) || !existsSync(androidJar)) { console.error(`mancano ${dexdump} o ${androidJar}`); process.exit(2); }

const platform = new Set(run('unzip', ['-Z1', androidJar]).split('\n')
  .filter(n => n.endsWith('.class')).map(n => `L${n.slice(0, -6)};`));

const tmp = mkdtempSync(join(tmpdir(), 'natpf-dex-'));
const defined = new Set(), refs = new Map();   // classe a cui si rimanda → classi che rimandano
let dexes = 0;
try {
  run('unzip', ['-o', '-q', apk, 'classes*.dex', '-d', tmp]);
  for (const f of readdirSync(tmp).filter(n => /^classes\d*\.dex$/.test(n))) {
    dexes++;
    let cur = null;
    for (const line of run(dexdump, ['-d', join(tmp, f)]).split('\n')) {
      const c = line.match(/^\s*Class descriptor\s*:\s*'(L[^']+;)'/);
      if (c) { cur = c[1]; defined.add(cur); continue; }
      if (!cur || /const-string/.test(line)) continue;  // i testi non sono classi
      for (const m of line.matchAll(/L[A-Za-z_$][\w$/]*;/g)) {
        if (!refs.has(m[0])) refs.set(m[0], new Set());
        refs.get(m[0]).add(cur);
      }
    }
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

const outer = c => c.replace(/\$[^/]*;$/, ';');
const missing = [], tolerated = [];
for (const [cls, from] of refs) {
  if (defined.has(cls) || platform.has(cls)) continue;
  const users = [...from].filter(u => !NON_USATE[outer(u)]);
  (users.length ? missing : tolerated).push([cls, users.length ? users : [...from]]);
}
console.log(`${apk}: ${dexes} dex, ${defined.size} classi nell'APK, ${refs.size} classi richiamate, Android ${COMPILE_SDK}`);
for (const [cls, from] of tolerated.sort()) console.log(`  tollerata ${cls} (solo da ${[...new Set(from.map(outer))].join(', ')})`);
if (missing.length) {
  console.error(`\nROSSO: ${missing.length} classi richiamate che sul telefono non ci sono:`);
  for (const [cls, from] of missing.sort()) console.error(`  ${cls} ← ${[...new Set(from.map(outer))].slice(0, 4).join(', ')}`);
  process.exit(1);
}
console.log('VERDE: tutte le classi richiamate sono nell\'APK o in Android');

"""Package only the NATPF simulator and its transitive browser dependencies."""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import zipfile

REPO = pathlib.Path(__file__).resolve().parent.parent
SITE = REPO / 'site'


def package(output, commit='working-tree'):
    output = pathlib.Path(output).resolve()
    static = output / 'static'
    lan = output / 'lan'
    # Only these owned staging directories are replaced; never the source tree.
    for directory in (static, lan):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True)
    files = set()

    def include(relative):
        source = (SITE / relative).resolve()
        if not source.is_relative_to(SITE) or not source.is_file():
            raise ValueError(f'Missing/outside simulator dependency: {relative}')
        relative = source.relative_to(SITE).as_posix()
        if relative in files:
            return
        files.add(relative)
        if source.suffix == '.js' and '/vendor/' not in '/' + relative:
            code = source.read_text()
            for specifier in re.findall(r"(?:from\s*|import\s*\()(['\"])([^'\"]+)\1", code):
                target = specifier[1]
                if target.startswith('.'):
                    include((source.parent / target).resolve().relative_to(SITE).as_posix())
                elif target != 'three':
                    raise ValueError(f'Unexpected external import: {target}')

    for relative in ('tennis/index.html', 'tennis/racchetta.html', 'tennis/build.json',
                     'js/tennis/main.js', 'js/tennis/racchetta.js', '_headers',
                     'js/vendor/three.module.js', 'js/vendor/THREE-LICENSE.txt',
                     'js/vendor/peerjs.min.js', 'js/vendor/peerjs.LICENSE', 'js/vendor/qrcode.js'):
        include(relative)
    for source in (SITE / 'assets/arena').glob('*.png'):
        include(source.relative_to(SITE).as_posix())
    assert not any(p.startswith(('js/world/', 'js/games/', 'js/content/', 'assets/photos/', 'data/')) for p in files)
    for relative in sorted(files):
        destination = static / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SITE / relative, destination)
    (static / 'index.html').write_text('<!doctype html><html lang="it"><meta charset="utf-8"><title>NATPF Simulator</title><script>location.replace("./tennis/"+location.search+location.hash)</script><a href="./tennis/">Apri NATPF Simulator</a></html>')
    manifest = {'product': 'NATPF Simulator', 'commit': commit, 'files': {
        p.relative_to(static).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(static.rglob('*')) if p.is_file()}}
    (static / 'natpf-manifest.json').write_text(json.dumps(manifest, indent=2))
    shutil.copytree(static, lan / 'site')
    for source in (REPO / 'tools/lan').iterdir():
        if source.is_file() and source.suffix in ('.mjs', '.json', '.md', '.cmd', '.html'):
            dest = lan / 'tools/lan' / source.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, dest)
    for source in sorted((REPO / 'docs').glob('NATPF_PLAYABILITY_*.md')):
        dest = lan / 'docs' / source.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)
    results = []
    for name, directory in (('natpf-simulator-cloudflare.zip', static), ('natpf-simulator-lan.zip', lan)):
        dest = output / name
        with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for source in sorted(directory.rglob('*')):
                if source.is_file():
                    archive.write(source, source.relative_to(directory))
        with zipfile.ZipFile(dest) as archive:
            assert archive.testzip() is None
        results.append({'path': str(dest), 'bytes': dest.stat().st_size,
                        'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    return {'commit': commit, 'static_files': len(manifest['files']), 'packages': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('--commit', default='working-tree')
    options = parser.parse_args()
    print(json.dumps(package(options.out, options.commit), indent=2))

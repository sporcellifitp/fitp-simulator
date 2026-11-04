// Advisory only: denied or unsupported wake locks must never interrupt play.
export function keepScreenAwake(doc = globalThis.document, nav = globalThis.navigator) {
  if (!doc?.addEventListener || !nav?.wakeLock?.request) return () => {};
  let lock = null, pending = false, disposed = false;
  const acquire = async () => {
    if (disposed || pending || lock || doc.visibilityState !== 'visible') return;
    pending = true;
    try {
      const next = await nav.wakeLock.request('screen');
      if (disposed || doc.visibilityState !== 'visible') { await next.release(); return; }
      lock = next;
      next.addEventListener('release', () => { if (lock === next) lock = null; });
    } catch {} finally { pending = false; }
  };
  doc.addEventListener('visibilitychange', acquire);
  doc.addEventListener('pointerdown', acquire);
  acquire();
  return () => { disposed = true; doc.removeEventListener('visibilitychange', acquire); doc.removeEventListener('pointerdown', acquire); lock?.release().catch(() => {}); lock = null; };
}

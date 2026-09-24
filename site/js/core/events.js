// Bus di eventi minimo: i sistemi si parlano senza conoscersi.
export function createBus(){
  const map = new Map();
  return {
    on(type, fn){ if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return () => map.get(type).delete(fn); },
    emit(type, data){ for (const fn of map.get(type) || []) fn(data); },
  };
}

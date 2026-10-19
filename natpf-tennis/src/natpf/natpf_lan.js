// Gioco servito dal server LAN (lan/server.mjs): telefono e Player 2 devono ricevere l'indirizzo di rete del
// computer, non localhost. Il server pubblica in /lan/status gli indirizzi https coperti dal certificato
// (tools/lan/launcher.mjs); qui si sceglie quello da mettere nel QR e nel link di invito.
import { isLanMode } from '@natpf/tennis/lan-transport.js';

export const isLoopbackHost = host => /^(localhost|127\.|0\.0\.0\.0|\[::1\]|::1$)/.test(host || '');

let pending = null;
// Origine (https://ip:porta) da dare agli altri dispositivi; null se non serve o se il server non lo sa.
export function lanOrigin({ location = globalThis.location, fetchImpl = globalThis.fetch } = {}){
  if (!location || !isLoopbackHost(location.hostname)) return Promise.resolve(null);
  if (pending) return pending;
  return pending = (async () => {
    try {
      const status = await fetchImpl('/lan/status', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
      const url = status?.urls?.map(u => { try { return new URL(u); } catch { return null; } }).find(u => u && !isLoopbackHost(u.hostname));
      return url ? url.origin : null;
    } catch { return null; } finally { setTimeout(() => { pending = null; }, 5000); }
  })();
}

// Link per il Player 2: stesso server, indirizzo di rete se il gioco è aperto da localhost, e ?lan=1 in LAN.
// p2p: sfida senza server (sito statico, natpf_p2p.js) → stessa pagina con ?net=p2p; format: formato scelto dall'host;
// il server di segnalazione di prova (?peer=…) passa anche al P2.
export async function guestInviteUrl(roomId, { location = globalThis.location, fetchImpl, p2p = false, format = null } = {}){
  const origin = (await lanOrigin({ location, fetchImpl })) || location.origin;
  const params = new URLSearchParams({ room: roomId, role: 'p2' });
  if (isLanMode()) params.set('lan', '1');
  if (p2p){
    params.set('net', 'p2p');
    const peer = new URLSearchParams(location.search || '').get('peer'); if (peer) params.set('peer', peer);
  }
  if (format && format !== 'singles') params.set('format', format);
  // sul sito pubblicato il gioco può stare in una sottocartella: stessa pagina dell'host
  const path = p2p ? (location.pathname || '/') : '/';
  const url = `${origin}${path}?${params}`;
  // reachable: un altro computer può aprirlo (non è localhost)
  return { url, reachable: !isLoopbackHost(new URL(url).hostname) };
}

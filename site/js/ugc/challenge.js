// Codici sfida: minigioco + sequenza (seme) + punteggio da battere + nome, in un link da condividere.
// Senza dipendenze dal browser per poterlo provare con node --test.
export const CHALLENGE_GAMES = ['serve', 'vetro', 'raccattapalle'];

export function encodeChallenge({ game, seed, score, nick }){
  const g = CHALLENGE_GAMES.indexOf(game); if (g < 0) return null;
  const nickSafe = String(nick || '').replace(/[^A-Za-zÀ-ÿ ]/g, '').slice(0, 24);
  const body = [1, g, (seed >>> 0).toString(36), Math.max(0, score | 0).toString(36), encodeURIComponent(nickSafe)].join('.');
  let h = 7; for (const ch of body) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  return body + '.' + (h % 1296).toString(36);
}
export function decodeChallenge(code){
  if (!code || typeof code !== 'string') return null;
  const parts = code.split('.'); if (parts.length !== 6) return null;
  const body = parts.slice(0, 5).join('.');
  let h = 7; for (const ch of body) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  if ((h % 1296).toString(36) !== parts[5]) return null;
  const [v, g, s, sc, n] = parts;
  if (v !== '1' || !CHALLENGE_GAMES[+g]) return null;
  let nick = ''; try { nick = decodeURIComponent(n).replace(/[^A-Za-zÀ-ÿ ]/g, '').slice(0, 24); } catch (e){ return null; }
  const seed = parseInt(s, 36), score = parseInt(sc, 36);
  if (!Number.isFinite(seed) || !Number.isFinite(score)) return null;
  return { game: CHALLENGE_GAMES[+g], seed, score, nick: nick || 'Un amico' };
}

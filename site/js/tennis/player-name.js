// Nome del giocatore: le regole sono le stesse sul computer (nickname della classifica, «Nome» dello staff, nomi dello stesso
// schermo) e sul telefono (B54, 16/11/2026: il visitatore scrive il suo nome sul telefono prima di «Sono pronto»). Prima
// stavano in natpf-tennis/src/natpf/natpf_events.js (validNickname), che ora le prende da qui.
// Il nome va sul tabellone, sulla schermata finale e nella classifica del giorno, in fiera anche sul ledwall: niente
// parolacce, bestemmie, insulti (decisione dell'utente del 16/11: filtro sul telefono e correzione dello staff dal PC).
// Il controllo vero lo rifà sempre il computer: una pagina del telefono vecchia o cambiata non lo salta.

// Pezzi di parola che non si mostrano (minuscole, senza accenti, lettere doppie ridotte a una: «cazzo» → «cazo»). Solo pezzi
// che non stanno dentro nomi veri (provati con i nomi italiani più comuni in natpf-tennis/test/natpf-b54-nome.test.mjs)
const PIECES = ['cazzo', 'merda', 'merde', 'stronz', 'vaffanc', 'fanculo', 'puttan', 'coglion', 'minchi', 'mignott',
  'zoccola', 'bastard', 'froci', 'ricchion', 'pompin', 'sborr', 'leccacul', 'culon', 'porcodi', 'porcoddi', 'diocan',
  'dioporc', 'porcamad', 'diobo', 'cornut', 'hitler', 'nazist', 'fuck', 'bitch', 'pussy', 'whore', 'asshole', 'penis',
  'vagin', 'porn', 'dildo', 'sieg heil'];
// Parole intere che non si mostrano (dentro un nome vero possono stare: «Nazario», «Troiano», «Yamashita», «Fagotto»…)
const WORDS = ['dux', 'duce', 'culo', 'suca', 'sucate', 'figa', 'fica', 'pene', 'sega', 'tette', 'troia', 'negro', 'terrone',
  'nazi', 'dick', 'cock', 'fag', 'faggot', 'sex', 'heil', 'shit', 'cunt', 'slut', 'nigga', 'nigger'];
// nomi veri che contengono un pezzo
const OK_WORDS = ['cazorla'];

const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5|\$/g, 's').replace(/7/g, 't');
const single = s => s.replace(/(.)\1+/g, '$1');
const PIECES_1 = PIECES.map(p => single(p.replace(/ /g, '')));
const WORDS_1 = new Set(WORDS.map(single));

// true se il nome contiene una parola da non mostrare
export function rudeName(raw){
  const f = fold(raw);
  const words = f.split(/[^a-z0-9]+/).filter(Boolean).map(single);
  if (words.some(w => WORDS_1.has(w))) return true;
  const joined = single(f.replace(/[^a-z]/g, ''));
  const clean = OK_WORDS.reduce((s, w) => s.split(w).join('_'), joined);
  return PIECES_1.some(p => clean.includes(p));
}

export const NAME_MAX = 14;

// { ok, nick, why }: nick ripulito (spazi doppi tolti); why in italiano, da mostrare a chi scrive
export function validNickname(raw){
  const nick = String(raw || '').replace(/\s+/g, ' ').trim();
  if (nick.length < 2) return { ok: false, nick, why: 'Almeno 2 caratteri' };
  if (nick.length > NAME_MAX) return { ok: false, nick, why: `Al massimo ${NAME_MAX} caratteri` };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(nick)) return { ok: false, nick, why: 'Solo lettere, numeri, spazio, punto e trattino' };
  if (rudeName(nick)) return { ok: false, nick, why: 'Scegli un altro nome' };
  // B38: «Ospite» è chi gioca senza nome (fuori classifica): non si sceglie come nome, così in classifica non c'è mai
  if (fold(nick).replace(/[ ._-]/g, '') === 'ospite') return { ok: false, nick, why: '«Ospite» è per chi gioca senza nome: scegline un altro' };
  // i nomi che il gioco dà da solo non si scelgono (non si distinguerebbe chi l'ha scritto da chi ha saltato)
  if (/^(player|giocatore|telefono|visitatore)\s*\d*$/i.test(nick)) return { ok: false, nick, why: 'Scrivi il tuo nome' };
  return { ok: true, nick };
}

// B10, revisione del 07/11: il tabellone passa dal vero NatpfUi.onScore (interfaccia NATPF con il DOM finto di
// ui-world), non da un sostituto di prova. La revisione aveva visto che con `viewer: 'player'` fisso o `split: false`
// in onScore i test unitari restavano verdi: qui si legge l'HTML che onScore scrive in #natpf-scoreboard dopo
// _syncScoreboardHUD del motore, in tutte le modalità (CPU, 2v2, sfida un amico dai due lati, stesso schermo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';

const sc = (pp, op, pg = 0, og = 0, server = 'player') => ({ playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og, server });
// righe come le vede chi guarda: «•Nome game punti» (• = al servizio), più formato e scritta del momento
function board(E, score, gamesToWin = 2){
  E.matchConfig.gamesToWin = gamesToWin;
  Object.assign(E.score, score);
  E._syncScoreboardHUD();
  const html = $('natpf-scoreboard').innerHTML;
  // B17.3: la riga scrive la sigla, il nome intero sta in data-sb-name; «AD» al vantaggio (qui riletto come «Vant.»)
  const rows = [...html.matchAll(/<div class="sb-row sb-(me|them)( serving)?[^"]*" data-sb-row="\1"[^>]*>.*?data-sb-name="([^"]*)"[^>]*>([^<]*)<.*?data-sb-games>([^<]*)<.*?data-sb-points>([^<]*)</g)]
    .map(m => `${m[2] ? '•' : ' '}${m[3]}=${m[4]} ${m[5]} ${m[6] === 'AD' ? 'Vant.' : m[6]}`);
  const format = html.match(/data-sb-format>([^<]*)</)?.[1];
  const label = html.match(/data-sb-label>([^<]*)</)?.[1];
  return { rows, format, label };
}

test('onScore vero: contro la CPU la propria riga sopra, formato in parole', async () => {
  const { E } = await makeWorld({ controller: 'mouse' });
  const b = board(E, sc(2, 1, 1, 0, 'player'), 2);
  assert.deepEqual(b.rows, ['•Tu=TU 1 30', ' CPU=CPU 0 15']);
  assert.equal(b.format, 'Al meglio di 3 game');
  assert.equal(b.label, '');
  assert.equal(board(E, sc(3, 4), 3).label, 'Vantaggio della CPU');
});

test('onScore vero: 2v2 contro la CPU, righe delle squadre', async () => {
  const { E } = await makeWorld({ controller: 'mouse' });
  E.setMatchFormat('doubles');
  assert.deepEqual(board(E, sc(2, 2, 0, 1, 'opponent')).rows, [' Tu + CPU=TU+CPU 0 30', '•2 CPU=2CPU 1 30']);
  E.setMatchFormat('singles');
});

test('onScore vero: sfida un amico dall\'host e dal Player 2 (la propria riga sopra, il vantaggio dell\'altro col suo nome)', async () => {
  const { E } = await makeWorld({ controller: 'mouse' });
  E.isMultiplayer = true;
  let b = board(E, sc(3, 4, 1, 2, 'player'), 3);
  assert.deepEqual(b.rows, ['•Tu=TU 1 40', ' Player 2=P2 2 Vant.']);
  assert.equal(b.format, 'Al meglio di 5 game');
  assert.equal(b.label, 'Vantaggio di Player 2');
  E.roomStatus.guestName = 'Giulia';
  assert.equal(board(E, sc(3, 4, 1, 2, 'player'), 3).label, 'Vantaggio di Giulia');
  // dal Player 2: i punti e i game del motore «opponent» sono i suoi, e il servizio dell'host va nella riga di sotto
  const w = await makeWorld({ controller: 'mouse', role: 'p2' });
  b = board(w.E, sc(5, 4, 2, 1, 'player'), 3);
  assert.deepEqual(b.rows, [' Tu=TU 1 40', '•Player 1=P1 2 Vant.']);
  assert.equal(b.label, 'Vantaggio di Player 1');
  assert.equal(board(w.E, sc(3, 4, 2, 1, 'opponent'), 3).label, 'Vantaggio tuo');
});

test('onScore vero: stesso schermo con i nomi della pagina «Collega», P1 sopra', async () => {
  const { E } = await makeWorld({ controller: 'mouse' });
  E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' };
  E.natpfSplit.active = true;
  const b = board(E, sc(4, 5, 1, 2, 'opponent'), 3);
  assert.deepEqual(b.rows, [' Marco=MAR 1 40', '•Giulia=GIU 2 Vant.']);
  assert.equal(b.label, 'Vantaggio Giulia');
  E.natpfSplit.active = false;
});

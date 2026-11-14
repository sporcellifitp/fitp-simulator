// B46 «dritto e rovescio al sicuro» (14/11/2026). Segnalazione dell'utente sulla 2026-11-14.1 (stesso schermo, Player 1,
// Android, «Calibrazione: Giocando»): «se provavo a fare un rovescio mi veniva fuori un dritto lungolinea, se facevo un
// dritto veniva fuori un rovescio incrociato». Uno dei tre casi che danno esattamente quelle scritte: la mano del Player 1
// salvata «sinistra» mentre gioca un destro (bastava un tocco su «Sinistra» nella pagina del telefono, e restava salvata).
// Negli scambi di prova i puntini si riempiono lo stesso (il verso segue il lato della palla, non la mano) e il problema si
// vedeva solo in partita. Ora la mano sinistra si vede dove guarda chi gioca:
//   - «Mancino» nella riga dei puntini degli scambi di prova (natpf_trial.js), nella targhetta della propria metà dello
//     stesso schermo (natpf_split_ui.js) e nella pagina «Pronto per la partita» contro la CPU (natpf_lobby.js);
//   - quando la mano cambia DAL TELEFONO, per HAND_NOTICE_MS un avviso grande sul computer («Telefono 1: mano sinistra
//     (mancino)» o «… mano destra»): qui. La mano cambiata dal gioco (pulsanti del computer, «Nuovo giocatore», chiosco)
//     non lo mostra: chi la cambia la sta già guardando.
// L'avviso ascolta i telefoni (NatpfPhoneRacket._diag 'mano': mano, causa, ruolo); il Telefono 2 nasce tardi (stesso
// schermo, modalità fiera) e lo si aggancia al primo controllo (tick, ogni 100 ms da natpf_ui).
const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const HAND_NOTICE_MS = 3000;
// scritta della targhetta della mano sinistra
export const LEFTY_TAG = 'Mancino';
export const LEFTY_HINT = 'Mano sinistra: dritto e rovescio da mancino. Si cambia nella pagina dei telefoni o dal telefono (due tocchi)';
// testi dell'avviso (funzione pura): ruolo 'p1' | 'p2', mano 'left' | 'right'
export function handNoticeText({ ruolo = 'p1', mano = 'right' } = {}){
  const tel = `Telefono ${ruolo === 'p2' ? 2 : 1}`;
  return mano === 'left'
    ? { title: `${tel}: mano sinistra (mancino)`, sub: 'Cambiata dal telefono. Per un destro: sul telefono «Destra», due tocchi' }
    : { title: `${tel}: mano destra`, sub: 'Cambiata dal telefono' };
}
// l'avviso si mostra? Solo per un cambio arrivato dalla pagina del telefono
export const noticeFor = (kind, d) => kind === 'mano' && d?.causa === 'telefono';

export class NatpfHandNotice {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-hand-notice');
    this._seen = new WeakSet(); this._t = null; this.last = null;
    show(this.el, false);
    this.watch(ui?.phone); this.watch(engine?.natpfPhone2);
  }
  // un telefono da ascoltare (una volta sola)
  watch(phone){
    if (!phone?.onDiag || this._seen.has(phone)) return false;
    this._seen.add(phone);
    phone.onDiag((kind, d) => { if (noticeFor(kind, d)) this.show(handNoticeText(d), d); });
    return true;
  }
  // ogni 100 ms (natpf_ui): il Telefono 2 appena nato
  tick(){ this.watch(this.engine?.natpfPhone2); }
  get visible(){ return !!this.el && !this.el.classList.contains('hidden'); }
  show(text, d = {}, ms = HAND_NOTICE_MS){
    this.last = { ...text, mano: d.mano === 'left' ? 'left' : 'right', ruolo: d.ruolo === 'p2' ? 'p2' : 'p1' };
    const el = this.el; if (!el) return;
    const b = el.querySelector('b'), s = el.querySelector('small');
    if (b) b.textContent = text.title; if (s) s.textContent = text.sub || '';
    el.dataset.hand = this.last.mano; el.dataset.role = this.last.ruolo;
    show(el, true);
    clearTimeout(this._t); this._t = setTimeout(() => this.hide(), ms);
  }
  hide(){ clearTimeout(this._t); this._t = null; show(this.el, false); }
}

// Registro dello stand (B30, richiesta dell'utente del 12/11): collegamento con il gioco e con il pannello dello stand.
// Il gioco annota da solo, per tutta la giornata, come vanno le partite (registro/registro_registratore.js): solo
// gioco, niente dati di chi gioca. È SEMPRE ACCESO di base, in tutte le versioni (decisione dell'utente: «vorrei avere
// questa modalità di default sempre attiva»); lo staff lo spegne dal pannello dello stand (Ctrl+Maiusc+K) e la scelta
// resta salvata. Il PC dello stand non è dell'utente: le righe partono a blocchi verso il suo spazio Cloudflare
// (registro/registro_invio.js → cloudflare/registro-worker.js); sul PC resta solo la coda non ancora inviata
// (registro/registro_coda.js). L'indirizzo del Worker sta nel pacchetto: /natpf/registro.json nella versione web
// (scripts/pacchetto-cloudflare.mjs --registro-url=…), registro.json del programma Windows (attraverso
// window.natpfDesktop.registro). Senza indirizzo il registro resta in coda e il pannello lo dice.
// Il gioco funziona identico se il registro non si può scrivere o inviare: nessun errore a schermo, nessuna attesa.
// Documento per l'utente: docs/b30/registro-dello-stand.md; guida di Cloudflare: docs/GUIDA_REGISTRO_CLOUDFLARE.md.
import { REGISTRO, indirizzoRegistro, leggiIdBlocco, byteLeggibili } from './registro/registro_formato.js';
import { creaCoda, conRiserva } from './registro/registro_coda.js';
import { InvioRegistro } from './registro/registro_invio.js';
import { RegistroStand } from './registro/registro_registratore.js';
import { zipBlob } from './diag/diag_zip.js';
import { download } from './diag/diag_export.js';
import { viewport } from './natpf_screen.js';

const p2 = v => String(v).padStart(2, '0');
const ora = ms => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const righe = n => (n === 1 ? '1 riga' : `${n} righe`);
// nome dei file nello zip della coda: lo stesso albero dello spazio Cloudflare (lo strumento di riassunto legge tutti e due)
export const nomeNelloZip = id => { const b = leggiIdBlocco(id); return b ? `registro/${b.giorno}/${b.postazione}/${b.parte}.jsonl` : null; };

// Stato del registro in parole semplici, per il pannello dello stand. s: { acceso, partite, inMemoria, coda: { righe,
// blocchi, byte, tipo, inMemoria? }, invio: { configurato, ultimoOk, ultimoErrore, inCorso, rifiutati, fuoriGiorno }, cerca }
export function testoStato(s){
  if (!s) return '';
  if (!s.acceso) return 'Registro spento: non si annota niente. Per riaccenderlo premi qui a sinistra.';
  const inCoda = (s.coda?.righe || 0) + (s.inMemoria || 0);
  const parti = [`Oggi ${s.partite === 1 ? '1 partita registrata' : `${s.partite || 0} partite registrate`}`];
  if (s.cerca) parti.push('cerco l’indirizzo dello spazio…');
  else if (!s.invio?.configurato) parti.push(`indirizzo dello spazio non configurato: ${inCoda ? `${righe(inCoda)} in coda su questo computer` : 'le righe restano in coda su questo computer'}`);
  else {
    parti.push(s.invio.ultimoOk ? `ultimo invio riuscito alle ${ora(s.invio.ultimoOk)}` : 'ancora nessun invio riuscito');
    parti.push(inCoda ? `${righe(inCoda)} ancora in coda${s.coda?.byte ? ` (${byteLeggibili(s.coda.byte)})` : ''}` : 'niente in coda');
    if (s.invio.inCorso) parti.push('invio in corso…');
    else if (s.invio.ultimoErrore) parti.push(`invio non riuscito: ${s.invio.ultimoErrore}; si riprova da solo`);
    const blocchi = n => (n === 1 ? '1 blocco' : `${n} blocchi`);
    if (s.invio.fuoriGiorno) parti.push(`${blocchi(s.invio.fuoriGiorno)} con un giorno non accettato (orologio del computer?)`);
    if (s.invio.rifiutati) parti.push(`${blocchi(s.invio.rifiutati)} rifiutati dallo spazio`);
  }
  if (s.coda?.tipo === 'memoria' || s.coda?.inMemoria) parti.push('la coda è solo in memoria: chiudendo il gioco si perde quello che non è partito');
  if (s.problema && !s.coda?.inMemoria) parti.push(`coda non scrivibile (${s.problema})`);
  return parti.join(' · ') + '.';
}

export class NatpfRegistro {
  constructor(engine, ui, { win = window } = {}){
    this.engine = engine; this.ui = ui; this.win = win;
    this.url = null; this.cerca = true;
    const ponte = win.natpfDesktop?.registro;
    this.coda = conRiserva(creaCoda({ win }));
    this.invio = new InvioRegistro({ coda: this.coda, indirizzo: () => this.url,
      beacon: (url, testo) => { try { return !!win.navigator?.sendBeacon?.(url, new Blob([testo], { type: 'text/plain;charset=UTF-8' })); } catch { return false; } } });
    this.rec = new RegistroStand({ engine, ui, coda: this.coda, invio: this.invio, programma: !!win.natpfDesktop, win, area: () => viewport() });
    this._indirizzo(ponte);
    // il pannello dello stand, se è aperto, si aggiorna da solo (invii, coda)
    const t = setInterval(() => { if (ui.kiosk?.isOpen) this.dipingi(); }, 2000); t?.unref?.();
  }
  // indirizzo del Worker dell'utente: dal programma Windows o dal file del pacchetto. Se manca: solo coda
  async _indirizzo(ponte){
    try {
      if (ponte?.state) this.url = indirizzoRegistro({ url: (await ponte.state())?.url });
      else { const res = await this.win.fetch(REGISTRO.config, { cache: 'no-store' }); this.url = res.ok ? indirizzoRegistro(await res.json()) : null; }
    } catch { this.url = null; }
    this.cerca = false;
    try { this.invio.tic(); } catch {}
  }
  get acceso(){ return this.rec.on; }
  async stato(){
    let coda = null; try { coda = await this.coda.stato(); } catch {}
    const r = this.rec.stato();
    return { acceso: r.acceso, partite: r.partite, inMemoria: r.inMemoria, problema: r.problema, perse: r.perse, coda, invio: this.invio.stato(), cerca: this.cerca };
  }
  // pannello dello stand: «Registro di gioco: Sì · No» e lo stato in parole semplici
  async dipingi(){
    const el = document.getElementById('staff-registro'); if (!el) return;
    const b = el.querySelector('[data-staff="registro"]'), bb = b?.querySelector('b');
    if (bb){ bb.textContent = this.acceso ? 'Sì' : 'No'; b.classList.toggle('on', this.acceso); }
    const s = await this.stato(), p = document.getElementById('staff-registro-stato'), testo = testoStato(s);
    if (p && p.textContent !== testo) p.textContent = testo;
    const vuota = !((s.coda?.righe || 0) + (s.inMemoria || 0));
    const invia = el.querySelector('[data-staff="registro-invia"]'), scarica = el.querySelector('[data-staff="registro-scarica"]');
    if (invia) invia.disabled = !s.acceso && vuota;
    if (scarica) scarica.disabled = vuota;
  }
  // comandi del pannello dello stand (natpf_kiosk.run)
  async comando(cmd){
    const toast = t => this.ui.toast?.(t);
    try {
      if (cmd === 'registro'){
        const on = this.rec.accendi(!this.acceso);
        toast(on ? 'Registro di gioco acceso: solo dati di gioco, niente nomi; resta salvato' : 'Registro di gioco spento; resta salvato');
      } else if (cmd === 'registro-invia'){
        await this.rec.blocco();
        if (this.cerca) toast('Un momento: cerco l’indirizzo dello spazio');
        else if (!this.url) toast('Indirizzo dello spazio non configurato: le righe restano in coda su questo computer');
        else { const r = await this.invio.invia({ forza: true }); toast(r.ok ? (r.inviati ? `Registro inviato: ${r.inviati === 1 ? '1 blocco' : `${r.inviati} blocchi`}` : 'Niente da inviare: è già tutto nello spazio') : `Invio non riuscito: ${r.perche}`); }
      } else if (cmd === 'registro-scarica'){
        await this.rec.blocco();
        const n = await this.scaricaCoda();
        toast(n ? `Coda scaricata: ${n === 1 ? '1 blocco' : `${n} blocchi`} in uno zip` : 'La coda è vuota: non c’è niente da scaricare');
      }
    } catch { toast('Registro: operazione non riuscita'); }
    this.dipingi();
  }
  // zip di ciò che non è ancora partito (riserva: se lo spazio non è raggiungibile lo staff lo porta via a mano).
  // I blocchi restano in coda: partiranno comunque, e lo spazio non scrive due volte lo stesso blocco
  async scaricaCoda(){
    const elenco = await this.coda.elenco(), entries = [];
    for (const b of elenco){ const testo = await this.coda.leggi(b.id), name = nomeNelloZip(b.id); if (testo && name) entries.push({ name, data: testo }); }
    if (!entries.length) return 0;
    const d = new Date();
    download(zipBlob(entries, { date: d }), `natpf-registro-coda-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.zip`);
    return entries.length;
  }
}

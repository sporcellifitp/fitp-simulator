// Messaggi a schermo, istruzioni, pannelli sovrapposti, suggerimento di interazione.
import { $, show, isTouch, esc } from '../core/util.js';

let flashT = 0, toastT = 0, shownAt = 0;
const Q = []; let cur = null;
function enqueue(item){
  if ((cur && cur.text === item.text) || Q.some(q => q.text === item.text)) return;
  Q.push(item);
  // coda corta: se si accumulano messaggi, restano i più recenti e quelli importanti
  while (Q.length > 3){ const k = Q.findIndex(q => q.kind !== 'gold' && q.kind !== 'note'); Q.splice(k >= 0 ? k : 0, 1); }
  if (!cur) nextNote(); else if (cur.kind !== 'note' && cur.kind !== 'gold'){ clearTimeout(toastT); toastT = setTimeout(nextNote, 700); }
}
function nextNote(){
  const el = $('#toast');
  cur = Q.shift() || null;
  if (!cur){ show(el, false); return; }
  el.className = cur.kind || '';
  if (cur.title){
    el.innerHTML = `<b>${esc(cur.title)}</b>${cur.sub ? `<small>${esc(cur.sub)}</small>` : ''}${cur.action ? `<button>${esc(cur.action.label)}</button>` : ''}`;
    if (cur.action){ const a = cur.action; el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); clearTimeout(toastT); nextNote(); a.fn(); }); }
  } else el.textContent = cur.text;
  show(el, true);
  clearTimeout(toastT); toastT = setTimeout(nextNote, Q.length ? Math.min(cur.ms, 2000) : cur.ms);
}
export const hud = {
  flash(big, small){
    const el = $('#msg'); el.innerHTML = esc(big) + (small ? `<small>${esc(small)}</small>` : '');
    el.classList.toggle('long', String(big).length > 9); el.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('show'), 1000);
  },
  instr(touch, desk){ show('#instr', true); $('#instr').textContent = isTouch ? touch : (desk || touch); },
  hideInstr(){ show('#instr', false); },
  // notifiche in alto: una alla volta, in coda, senza doppioni. toast = solo testo; note = titolo, riga e un pulsante
  // (per esempio «Leggi»). Il testo lungo non compare mai da solo: si apre solo se il giocatore lo chiede.
  toast(text, kind = ''){ enqueue({ text, kind, ms: kind === 'gold' ? 3200 : 2300 }); },
  note({ title, sub = '', action = null, ms = 5000, kind = 'note' }){ enqueue({ title, sub, action, ms, kind, text: title + sub }); },
  clearNotes(){ Q.length = 0; if (cur){ clearTimeout(toastT); cur = null; show('#toast', false); } },
  // suggerimento «E: parla con…» vicino a un oggetto interattivo
  prompt(text){
    const el = $('#prompt');
    if (!text){ show(el, false); return; }
    el.innerHTML = (isTouch ? '' : '<kbd>E</kbd> ') + esc(text); show(el, true);
  },
  // pannello generico: titolo, testo, pulsanti [{label, primary, onClick}]
  panel({ tag = '', title = '', html = '', buttons = [], onClose = null }){
    const box = $('#panel');
    box.querySelector('.tag').textContent = tag;
    box.querySelector('h2').textContent = title;
    box.querySelector('.body').innerHTML = html;
    const bb = box.querySelector('.buttons'); bb.innerHTML = '';
    for (const b of buttons){
      const el = document.createElement('button'); el.className = b.primary ? 'primary' : 'secondary'; el.textContent = b.label;
      el.addEventListener('click', () => { if (performance.now() - shownAt < 450) return; if (b.keep !== true) hud.closePanel(); b.onClick && b.onClick(); });
      bb.appendChild(el);
    }
    hud.onPanelClose = onClose;
    show(box, true); shownAt = performance.now();
    return box;
  },
  closePanel(){ show('#panel', false); const f = hud.onPanelClose; hud.onPanelClose = null; if (f) f(); },
  panelOpen(){ return !$('#panel').classList.contains('hidden'); },
};

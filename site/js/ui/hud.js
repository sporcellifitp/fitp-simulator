// Messaggi a schermo, istruzioni, pannelli sovrapposti, suggerimento di interazione.
import { $, show, isTouch, esc } from '../core/util.js';

let flashT = 0, toastT = 0, shownAt = 0;
export const hud = {
  flash(big, small){
    const el = $('#msg'); el.innerHTML = esc(big) + (small ? `<small>${esc(small)}</small>` : '');
    el.classList.toggle('long', String(big).length > 9); el.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('show'), 1000);
  },
  instr(touch, desk){ show('#instr', true); $('#instr').textContent = isTouch ? touch : (desk || touch); },
  hideInstr(){ show('#instr', false); },
  // notifica breve in alto (medaglie, missioni, suggerimenti)
  toast(text, kind = ''){
    const el = $('#toast'); el.textContent = text; el.className = kind; show(el, true);
    clearTimeout(toastT); toastT = setTimeout(() => show(el, false), 2600);
  },
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

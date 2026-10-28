// Cursori dei volumi (musica, effetti, voci) nelle Opzioni e nella Pausa. Valgono subito e restano salvati
// (AudioEngine.setVolume, natpf.audio nel browser). Ogni contenitore [data-audio-sliders] riceve i tre cursori.
export const VOLUME_KINDS = Object.freeze([
  { id: 'music', label: 'Musica' },
  { id: 'sfx', label: 'Effetti' },
  { id: 'voice', label: 'Voci' },
]);
export const slidersHtml = (vol = {}) => VOLUME_KINDS.map(k => {
  const v = Math.round(100 * (vol[k.id] ?? 0.8));
  return `<label class="vol-row"><span>${k.label}</span><input type="range" min="0" max="100" step="5" value="${v}" data-volume="${k.id}" aria-label="Volume ${k.label.toLowerCase()}" style="--v:${v}%"><output>${v}</output></label>`;
}).join('');

export function bindAudioSliders(audio, root = document){
  const boxes = [...(root.querySelectorAll?.('[data-audio-sliders]') || [])];
  const read = () => Object.fromEntries(VOLUME_KINDS.map(k => [k.id, audio?.getVolume?.(k.id) ?? 0.8]));
  for (const box of boxes){
    box.innerHTML = slidersHtml(read());
    box.addEventListener('input', e => {
      const input = e.target?.closest?.('[data-volume]'); if (!input) return;
      const v = Number(input.value)/100;
      audio?.setVolume?.(input.dataset.volume, v);
      input.style.setProperty('--v', `${input.value}%`);
      const out = input.parentElement?.querySelector('output'); if (out) out.textContent = input.value;
      // un piccolo suono di prova per gli effetti e le voci
      if (input.dataset.volume === 'sfx') audio?.playUiClick?.();
    });
    box.addEventListener('change', e => { if (e.target?.dataset?.volume === 'voice') audio?.cue?.('perfect'); });
    // i tasti freccia servono al cursore, non al menu
    box.addEventListener('keydown', e => { if (/Arrow/.test(e.key)) e.stopPropagation(); });
  }
  // allinea i cursori ai valori correnti (chi li cambia altrove: l'altro pannello)
  return () => { const vol = read(); for (const box of boxes) for (const input of box.querySelectorAll('[data-volume]')){ const v = Math.round(100*vol[input.dataset.volume]); if (Number(input.value) !== v){ input.value = v; input.style.setProperty('--v', `${v}%`); const out = input.parentElement?.querySelector('output'); if (out) out.textContent = v; } } };
}

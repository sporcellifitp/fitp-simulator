// Camera televisiva rialzata per lo schermo principale. Il telefono resta la racchetta.
// La vista locale cambia lato senza trasformare le coordinate della partita.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dot = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

export function cameraFieldOfView(aspect = 16/9){
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16/9;
  // Un modesto allargamento sui monitor stretti; il resto viene dalla distanza,
  // evitando il grandangolo che schiaccia l'avversario e le traiettorie lontane.
  return 48 + clamp((1.6-a)*5, 0, 8);
}

export function playerCameraFrame(player, halfLength = 11.885, aspect = 16/9){
  const team = player && player.team === 1 ? 1 : 0;
  const side = team === 0 ? 1 : -1;
  const x = player && Number.isFinite(player.x) ? player.x : 0;
  const half = Number.isFinite(halfLength) && halfLength > 0 ? halfLength : 11.885;
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16/9;
  // Punto di mira sotto il piano di gioco: il campo occupa il centro della
  // schermata, lasciando meno spazio vuoto alle tribune. Campo stabile anche
  // quando il giocatore corre a rete o arretra: niente zoom
  // legato alla sua z. Un piccolo seguito laterale conserva il senso del movimento.
  const target = { x: clamp(x*.035, -.25, .25), y: -2.5, z: -side*.8 };
  const offset = { x: clamp(x*.12, -.7, .7)-target.x, y: 16, z: side*(half+12.115)-target.z };
  const distance = Math.hypot(offset.x, offset.y, offset.z);
  const forward = { x: -offset.x/distance, y: -offset.y/distance, z: -offset.z/distance };
  const horizontal = Math.hypot(forward.x, forward.z);
  const right = { x: -forward.z/horizontal, y: 0, z: forward.x/horizontal };
  const up = { x: -right.z*forward.y, y: right.z*forward.x-right.x*forward.z, z: right.x*forward.y };
  const fov = cameraFieldOfView(a), tan = Math.tan(fov*Math.PI/360);
  // Inquadra entrambi i fondocampo con 2,6 m di recupero, i corridoi laterali
  // e la testa della racchetta. I margini NDC lasciano aria per HUD e rimbalzi.
  let scale = 1;
  const fit = p => {
    const q = { x: p.x-target.x, y: p.y-target.y, z: p.z-target.z };
    const depth = dot(q, forward);
    scale = Math.max(scale,
      (Math.abs(dot(q, right))/(tan*a*.88)-depth)/distance,
      (Math.abs(dot(q, up))/(tan*.86)-depth)/distance);
  };
  for (const px of [-6.3, 6.3]) for (const pz of [-half-2.6, half+2.6]) for (const py of [0, 3.4]) fit({ x: px, y: py, z: pz });
  // Un lob alto deve restare leggibile sopra la rete, senza inseguire la palla.
  for (const px of [-5, 0, 5]) for (const pz of [-6, 0, 6]) fit({ x: px, y: 9, z: pz });
  return {
    team, fov,
    camera: { x: target.x+offset.x*scale, y: target.y+offset.y*scale, z: target.z+offset.z*scale },
    target,
  };
}

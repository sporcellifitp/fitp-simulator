// Trasformazione del punto di vista locale. Non trasforma le coordinate della partita:
// il client si posiziona dietro la propria linea di fondo e guarda verso la rete.
export function playerCameraFrame(player, halfLength = 11.885){
  const team = player && player.team === 1 ? 1 : 0;
  const x = player && Number.isFinite(player.x) ? player.x : 0;
  const z = player && Number.isFinite(player.z) ? player.z : (team === 0 ? halfLength : -halfLength);
  // La camera resta dietro al giocatore: team 0 guarda verso -z, team 1 verso +z.
  const cameraSide = team === 0 ? 1 : -1;
  return {
    team,
    camera: {
      x: x*.45,
      y: 3.3,
      z: cameraSide*(Math.max(Math.abs(z), halfLength - 1) + 7.4),
    },
    target: {
      x: x*.2,
      y: 2.1,
      z: -cameraSide*10,
    },
  };
}

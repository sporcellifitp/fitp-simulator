// Worker: costruisce la pelle del braccio fuori dal thread principale (la pagina resta reattiva).
import { gesturePose } from './motion.js';
import { makeBind } from './rig.js';
import { buildArmMesh } from './mesh.js';

self.onmessage = e => {
  const p = gesturePose('ready', 0);
  const bind = makeBind(p.pos, p.q);
  const r = buildArmMesh(bind, e.data || {});
  self.postMessage(r, [r.pos.buffer, r.nrm.buffer, r.idx.buffer, r.color.buffer, r.skinIndex.buffer, r.skinWeight.buffer, r.fade.buffer]);
};

import { Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { partnerBallNow } from './natpf_doubles.js';

export function partnerRingState(engine){
  const ball = partnerBallNow(engine);
  const actor = engine.playerPartner;
  if (!ball || !actor || engine.phase !== 'RALLY' || engine.autoPlayMode || engine.natpfUi?.lobby?.visible || engine.natpfReplay?.active) return { visible: false };
  const age = Math.max(0, engine.elapsedTime - ball.at);
  return { visible: true, x: actor.pos.x, z: actor.pos.z, scale: .6 + .4 * Math.min(age / .12, 1), opacity: .8 + .15 * Math.sin(age * 9) };
}

export class NatpfPartnerRing {
  constructor(engine){
    this.engine = engine;
    this.mesh = new Mesh(new RingGeometry(.46, .57, 36), new MeshBasicMaterial({ color: 0x84deff, transparent: true, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    engine.scene.add(this.mesh);
  }

  update(){
    const state = partnerRingState(this.engine);
    this.mesh.visible = state.visible;
    if (!state.visible) return;
    this.mesh.position.set(state.x, .03, state.z);
    this.mesh.scale.setScalar(state.scale);
    this.mesh.material.opacity = state.opacity;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {disposeSceneResources} from '../../site/js/tennis/scene-resources.js';
const resource=extra=>({count:0,...extra,dispose(){this.count++;}});
test('removed character frees shared geometries, materials and textures once',()=>{
  const geometry=resource(),texture=resource({isTexture:true}),material=resource({map:texture});
  const root={traverse(fn){fn({geometry,material});fn({geometry,material:[material]});}};
  disposeSceneResources(root);
  assert.deepEqual([geometry.count,material.count,texture.count],[1,1,1]);
});
test('expiring bounce frees its own material without deleting shared circle geometry',()=>{
  const geometry=resource(),material=resource();
  disposeSceneResources({traverse(fn){fn({geometry,material});}},{geometries:false});
  assert.equal(geometry.count,0);assert.equal(material.count,1);
});

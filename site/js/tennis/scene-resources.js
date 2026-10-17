// Dispose resources owned by a removed subtree, once even when meshes share
// geometry/material. Shared geometry (bounce marks) stays alive until teardown.
export function disposeSceneResources(root, { geometries = true } = {}){
  const seen = new Set();
  const release = value => { if (value && !seen.has(value)){ seen.add(value); value.dispose?.(); } };
  root?.traverse?.(object => {
    if (geometries) release(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material){
      for (const value of Object.values(material)) if (value?.isTexture) release(value);
      release(material);
    }
  });
}

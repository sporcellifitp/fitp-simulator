// Dati sintetici in formato Overpass (out geom) per provare l'importatore senza rete.
// Riproducono lo schema di index.html ruotato di `turn` radianti: non sono il Foro reale.
import { projector } from '../osm-import.mjs';

export const BBOX = { s:41.9240, w:12.4480, n:41.9385, e:12.4700 };

export function makeFixture(turn = 12*Math.PI/180){
  const P = projector((BBOX.s + BBOX.n)/2, (BBOX.w + BBOX.e)/2);
  const c = Math.cos(turn), s = Math.sin(turn);
  const T = ([x, z]) => [x*c + z*s, -x*s + z*c];
  const geo = pts => pts.map(p => { const [lat, lon] = P.latlon(...T(p)); return { lat, lon }; });
  let id = 1000;
  const els = [];
  const way = (pts, tags, closed = false) => {
    const g = geo(closed ? pts.concat([pts[0]]) : pts), nodes = g.map(() => id++);
    if (closed) nodes[nodes.length-1] = nodes[0];
    els.push({ type:'way', id:id++, nodes, geometry:g, tags });
  };
  const node = (p, tags) => { const [g] = geo([p]); els.push({ type:'node', id:id++, lat:g.lat, lon:g.lon, tags }); };
  const rectAt = (x, z, hw, hd, rot = 0) => [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([a,b]) => [x + a*Math.cos(rot) + b*Math.sin(rot), z - a*Math.sin(rot) + b*Math.cos(rot)]);
  const ell = (x, z, a, b, n = 48) => Array.from({ length:n }, (_, i) => [x + Math.cos(i/n*2*Math.PI)*a, z + Math.sin(i/n*2*Math.PI)*b]);

  way(rectAt(-62, -88, 24, 33), { leisure:'stadium', name:'Campo Centrale' }, true);
  way(rectAt(-62, -88, 9.15, 18.3), { leisure:'pitch', sport:'tennis', surface:'clay' }, true);
  way(rectAt(5, -62, 15, 23), { leisure:'stadium', name:'Stadio Nicola Pietrangeli' }, true);
  way(rectAt(10, -128, 14.5, 23, -Math.PI/2), { leisure:'stadium', name:'SuperTennis Arena' }, true);
  way(ell(92, -16, 59, 43), { leisure:'stadium', name:'Stadio dei Marmi Pietro Mennea' }, true);
  way(ell(-150, 112, 62, 46), { leisure:'stadium', name:'Stadio Olimpico', sport:'soccer;athletics' }, true);
  way(rectAt(69, 40, 96, 7), { highway:'pedestrian', area:'yes', name:'Viale del Foro Italico' }, true);
  way([[172, 40], [200, 40]], { highway:'footway', bridge:'yes', layer:'1', name:"Ponte Duca d'Aosta" });
  way([[186, -120], [100, -60], [100, -50]], { highway:'footway' });
  way([[186, -320], [187, -100], [186, 120]], { waterway:'river', name:'Tevere' });
  way([[186, 120], [185, 330]], { waterway:'river', name:'Tevere' });
  node([-45, 40], { amenity:'fountain', name:'Fontana della Sfera' });
  node([162, 40], { man_made:'obelisk' });
  for (const x of [55, 80, 105, 130]) for (const z of [-115, -155]) way(rectAt(x, z, 9.15, 18.3), { leisure:'pitch', sport:'tennis' }, true);
  way(rectAt(0, 120, 15, 10), { leisure:'pitch', sport:'padel' }, true);
  way(rectAt(60, 100, 30, 12), { building:'yes', 'building:levels':'3' }, true);
  way(rectAt(-62, -88, 20, 30), { building:'stadium' }, true);
  way([[-100, 60], [-60, 60], [-20, 60], [20, 60]], { natural:'tree_row' });
  node([30, 90], { natural:'tree' });
  return { version:0.6, generator:'fixture', elements:els };
}

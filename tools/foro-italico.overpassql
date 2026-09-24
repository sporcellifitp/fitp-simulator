/*
  Foro Italico World: dati OpenStreetMap per la planimetria (v0.2).
  Si può incollare così com'è su https://overpass-turbo.eu, eseguire e poi
  Esporta > Dati grezzi da Overpass API (JSON), salvando il file come
  data/osm/foro-italico.overpass.json. In alternativa: node tools/osm-import.mjs --fetch
  Area: dal Ponte della Musica (sud) a viale dei Gladiatori (nord), dall'Olimpico al Tevere.
*/
[out:json][timeout:120][bbox:41.9240,12.4480,41.9385,12.4700];
(
  nwr["leisure"~"^(stadium|pitch|track|sports_centre)$"];
  way["building"];
  relation["building"]["type"="multipolygon"];
  way["highway"];
  way["area:highway"];
  way["waterway"~"^(river|canal)$"];
  way["natural"="water"];
  node["natural"="tree"];
  way["natural"="tree_row"];
  nwr["amenity"="fountain"];
  nwr["man_made"~"^(obelisk|bridge)$"];
  nwr["historic"];
  nwr["tourism"~"^(attraction|artwork)$"];
);
out geom;

const endpoint = 'https://overpass-api.de/api/interpreter';
const query = `
[out:json][timeout:180];
area["boundary"="administrative"]["name"="Provincia di Varese"]["admin_level"="6"]->.searchArea;
(
  node(area.searchArea)["leisure"="fitness_centre"];
  way(area.searchArea)["leisure"="fitness_centre"];
  relation(area.searchArea)["leisure"="fitness_centre"];
  node(area.searchArea)["amenity"="gym"];
  way(area.searchArea)["amenity"="gym"];
  relation(area.searchArea)["amenity"="gym"];
  node(area.searchArea)["sport"];
  way(area.searchArea)["sport"];
  relation(area.searchArea)["sport"];
);
out center tags;
`;
const r = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:query});
const j = await r.json();
const elements = j.elements||[];
const withName = elements.filter(e=>e.tags&&e.tags.name);
console.log('all', elements.length, 'named', withName.length);
console.log(withName.slice(0,15).map(e=>({name:e.tags.name, sport:e.tags.sport, leisure:e.tags.leisure, amenity:e.tags.amenity, city:e.tags['addr:city']||''})));

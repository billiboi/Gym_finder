const endpoint = 'https://overpass-api.de/api/interpreter';
const queries = [
`[out:json][timeout:120];area["boundary"="administrative"]["name"="Provincia di Varese"]["admin_level"="6"]->.a;(node(area.a)["leisure"="fitness_centre"];);out tags;`,
`[out:json][timeout:120];area["boundary"="administrative"]["name"="Varese"]["admin_level"="6"]->.a;(node(area.a)["leisure"="fitness_centre"];);out tags;`,
`[out:json][timeout:120];area["name"="Varese"]["boundary"="administrative"]["admin_level"="8"]->.a;(node(area.a)["leisure"="fitness_centre"];);out tags;`
];
for (const [i, q] of queries.entries()) {
  const r = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'text/plain'}, body:q });
  const t = await r.text();
  console.log('q', i+1, 'status', r.status, 'head', t.slice(0,120));
}

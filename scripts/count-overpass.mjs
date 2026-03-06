const endpoint = 'https://overpass-api.de/api/interpreter';
const queries = [
`[out:json][timeout:120];area["boundary"="administrative"]["name"="Provincia di Varese"]["admin_level"="6"]->.a;(node(area.a)["leisure"="fitness_centre"];);out tags;`,
`[out:json][timeout:120];area["boundary"="administrative"]["name"="Varese"]["admin_level"="6"]->.a;(node(area.a)["leisure"="fitness_centre"];);out tags;`
];
for (const [i,q] of queries.entries()) {
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:q});
 const j=await r.json();
 const elements=j.elements||[];
 console.log('q',i+1,'count',elements.length,'sample',elements.slice(0,5).map(e=>e.tags?.name||'-'));
}

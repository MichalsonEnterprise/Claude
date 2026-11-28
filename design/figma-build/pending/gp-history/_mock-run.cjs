const fs = require('fs');
function mk() { const fn = () => {}; return new Proxy(fn, {
  get(t, p) { if (p === 'then') return undefined; if (p === Symbol.iterator) return function* () {}; if (p === Symbol.toPrimitive) return () => 1; if (p === 'length') return 0; if (p === 'children' || p === 'modes' || p === 'variableIds') return []; if (p === 'find' || p === 'findOne') return () => mk(); if (p === 'findAll' || p === 'filter' || p === 'map' || p === 'slice') return () => []; if (p === 'characters' || p === 'name') return 'x'; if (p === 'split') return () => ['a=b']; return mk(); },
  apply() { return mk(); }, construct() { return mk(); }, ownKeys(t) { return Reflect.ownKeys(t); }, getOwnPropertyDescriptor(t, p) { return Object.getOwnPropertyDescriptor(t, p); }, set() { return true; } }); }
const figma = mk();
for (const f of process.argv.slice(2)) {
  let src = fs.readFileSync(f, 'utf8'); for (const k of ['VAR','TS','ES','PS','GS','__COLS']) src = src.replace('const '+k+' = {};', 'const '+k+' = new Proxy({}, {get: () => mk()});');
  const run = new Function('figma','mk', 'return (async () => {' + src + '\n})()');
  run(figma, mk).then(r => console.log(f, 'ran')).catch(e => console.log(f, 'ERR', e.message));
}

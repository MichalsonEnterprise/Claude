// node build.cjs <spec> <name> <cloneKeys|-> <wire:0|1> <first:0|1> [shotKey]
const fs = require('fs');
const [spec, name, keys, wire, first, shot] = process.argv.slice(2);
const helpers = fs.readFileSync('../../helpers.js', 'utf8');
const ch = n => fs.readFileSync('_lib_' + n + '.js', 'utf8');
const K = keys && keys !== '-' ? keys.split(',') : [];
let lib = '// ===== PROTO-B LIB v1 (chunked) =====\n' + ch('CORE') + ch('CORE2');
lib += first === '1' ? ch('HEADER') + ch('CARD') : "async function mainHeader(m) { return m.children.find(n => n.name === 'Header — PRO-06..10') || null; }\nasync function flowCard(sub) { const c = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id); if (!c) throw new Error('Flow card missing — run the first script of this flow'); return c; }\n";
lib += K.length ? ch('CLONE') : 'async function cloneSteps() { return {}; }\n';
if (wire === '1') lib += ch('WIRE');
lib += '// ===== END PROTO-B LIB =====\n';
const sp = fs.readFileSync(spec, 'utf8');
const action = `
const main = mainSection(); await mainHeader(main);
const sub = subSection(main); const card = await flowCard(sub);
const made = await cloneSteps(sub, ${JSON.stringify(K)});
let wired = null;
${wire === '1' ? 'wired = await wire(sub);' : ''}
fitSection(sub); restack(main); fitSection(main); const nFlows = syncFlows(main);
const frames = FLOW.frames.map(f => { const w = wrapOf(sub, f); return w ? f.step + ' ' + w.id + ' ' + Math.round(w.width) + 'x' + Math.round(w.height) + ' @' + Math.round(w.x) + ',' + Math.round(w.y) : f.step + ' -'; });
await sub.screenshot();
${shot ? `{ const sf = FLOW.frames.find(f => f.k === ${JSON.stringify(shot)}); const sw = sf && wrapOf(sub, sf); if (sw) await sw.screenshot({ scale: 0.4 }); }` : ''}
return { main: main.id, mainSize: [Math.round(main.width), Math.round(main.height), Math.round(main.y)], sub: sub.id, subSize: [Math.round(sub.width), Math.round(sub.height), Math.round(sub.y)], card: card.id, made, wired, frames, flows: nFlows, flowNames: P11.flowStartingPoints.map(p => p.name.slice(0, 12)), log: LOG };
`;
const out = helpers + '\n' + lib + '\n' + sp + '\n' + action;
fs.writeFileSync('out/' + name + '.js', out);
try { new Function('figma', '__x', 'return (async()=>{' + out + '})'); } catch (e) { console.error('SYNTAX', e.message); process.exit(1); }
console.log(name, out.length);

const src = require('fs').readFileSync(process.argv[2], 'utf8');
try { new Function('figma', 'return (async()=>{' + src + '})'); console.log(process.argv[2], src.length, 'ok'); } catch (e) { console.log(process.argv[2], 'ERR', e.message); }

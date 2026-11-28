// node build.cjs → out/<name>.js = helpers.js + src/lib.js + src/<name>.js
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(__dirname, '../../helpers.js'), 'utf8');
const L = fs.readFileSync(path.join(__dirname, 'src/lib.js'), 'utf8');
for (const f of fs.readdirSync(path.join(__dirname, 'src'))) {
  if (f === 'lib.js' || !f.endsWith('.js')) continue;
  const out = H + '\n' + L + '\n' + fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'out', f), out);
  console.log(f, out.length, out.length > 50000 ? 'TOO BIG' : 'ok');
}

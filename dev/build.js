const fs = require('fs');
let ui2 = fs.readFileSync('part-ui2.js', 'utf8');
// flavor fix: training constructs aren't hollowed
const oldSub = "${en.key === 'glasswright' ? '???' : 'hollowed'}";
const newSub = "${en.key === 'glasswright' ? '???' : (en.key.indexOf('construct')===0 ? 'construct' : 'hollowed')}";
if (!ui2.includes(oldSub)) throw new Error('patch target missing');
ui2 = ui2.replace(oldSub, newSub);
const parts = [
  fs.readFileSync('part-head.html', 'utf8'),
  fs.readFileSync('engine-dev.js', 'utf8'),
  fs.readFileSync('tests-dev.js', 'utf8'),
  fs.readFileSync('part-ui1.js', 'utf8'),
  ui2,
  '</' + 'script>\n</body>\n</html>\n'
];
fs.writeFileSync('hollowing-demo.html', parts.join('\n'));
console.log('assembled', fs.statSync('hollowing-demo.html').size, 'bytes');
const html = fs.readFileSync('hollowing-demo.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
fs.writeFileSync('/tmp/check.js', m[1]);

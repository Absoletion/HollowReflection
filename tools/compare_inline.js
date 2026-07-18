const fs = require('fs');
function scripts(path) {
  const html = fs.readFileSync(path, 'utf8');
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
}
const [a, b] = process.argv.slice(2).map(scripts);
const al = a[0].split(/\r?\n/)[6];
const bl = b[0].split(/\r?\n/)[6];
let i = 0;
while (i < al.length && i < bl.length && al[i] === bl[i]) i++;
console.log(JSON.stringify({ aLength: al.length, bLength: bl.length, firstDiff: i,
  a: al.slice(Math.max(0, i - 100), i + 200), b: bl.slice(Math.max(0, i - 100), i + 200) }, null, 2));

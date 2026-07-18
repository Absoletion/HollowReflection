const fs = require('fs');
let u2 = fs.readFileSync('part-ui2.js', 'utf8');
const anchor = `  pushLog(\`— Round 1 — \${S.title}\`, 'rounddiv');`;
if (!u2.includes(anchor)) throw new Error('anchor missing');
u2 = u2.replace(anchor, `  window.__battle = S; // read-only debug handle for automated playtesting\n` + anchor);
fs.writeFileSync('part-ui2.js', u2);
console.log('patched');

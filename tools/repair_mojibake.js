const fs = require('fs');

const path = process.argv[2];
if (!path) throw new Error('Usage: node repair_mojibake.js <html-file>');

const cp1252 = {
  '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,
  'ˆ':0x88,'‰':0x89,'Š':0x8a,'‹':0x8b,'Œ':0x8c,'Ž':0x8e,
  '‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,
  '˜':0x98,'™':0x99,'š':0x9a,'›':0x9b,'œ':0x9c,'ž':0x9e,'Ÿ':0x9f,
};
const decoder = new TextDecoder('utf-8', { fatal: true });

function decodeSequence(sequence) {
  const bytes = [];
  for (const ch of sequence) {
    if (cp1252[ch] !== undefined) bytes.push(cp1252[ch]);
    else if (ch.codePointAt(0) <= 0xff) bytes.push(ch.codePointAt(0));
    else return sequence;
  }
  try { return decoder.decode(Uint8Array.from(bytes)); }
  catch { return sequence; }
}

let html = fs.readFileSync(path, 'utf8');
let replacements = 0;
const examples = [];
const pattern = /[ÃÂ][^\r\n]|[âï][^\r\n]{2}|ð[^\r\n]{3}/g;
for (let pass = 0; pass < 3; pass++) {
  let passCount = 0;
  html = html.replace(pattern, match => {
    const repaired = decodeSequence(match);
    if (repaired !== match) {
      passCount++;
      replacements++;
      if (examples.length < 12) examples.push([match, repaired]);
    }
    return repaired;
  });
  if (!passCount) break;
}
fs.writeFileSync(path, html, 'utf8');
console.log(JSON.stringify({ replacements, examples }, null, 2));

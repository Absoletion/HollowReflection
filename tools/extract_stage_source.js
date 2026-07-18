const fs = require('fs');

const [htmlPath, stagePath] = process.argv.slice(2);
if (!htmlPath || !stagePath) throw new Error('Usage: node extract_stage_source.js <html> <mui3-stage.js>');
const html = fs.readFileSync(htmlPath).toString('latin1');
const stageToken = 'const Stage = (() => {';
const tokenAt = html.indexOf(stageToken);
if (tokenAt < 0) throw new Error('Stage start token not found');
const start = html.lastIndexOf('/* --------------------------------------------------------------- *', tokenAt);
const endToken = '/*EOF-STAGE*/';
const endAt = html.indexOf(endToken, tokenAt);
if (start < 0 || endAt < 0) throw new Error('Stage boundary not found');
const stage = html.slice(start, endAt + endToken.length) + '\r\n';
fs.writeFileSync(stagePath, Buffer.from(stage, 'latin1'));
console.log('Stage source synchronized:', stagePath, Buffer.byteLength(stage, 'latin1'));

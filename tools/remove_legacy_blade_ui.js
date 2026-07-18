const fs = require('fs');
const path = process.argv[2];
if (!path) throw new Error('Usage: node remove_legacy_blade_ui.js <mui2-live.js>');
let source = fs.readFileSync(path, 'utf8');

function replaceRegex(regex, replacement, label) {
  const matches = source.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches ? matches.length : 0}`);
  source = source.replace(regex, replacement);
}

replaceRegex(/(if \(b\.k === 'vuln'\)[^\r\n]+)/g,
  "$1\n      if (b.k === 'breakVuln') c.push(['BREAK WEAK', 'bad']);\n      if (b.k === 'radiationExposure') c.push(['RADIATION', 'bad']);",
  'status chips');
replaceRegex(/^\s*if \(u\.awakened\) return `<div class="live-blades"[^\r\n]+\r?\n/gm, '', 'legacy blade gauge');
replaceRegex(/const cost = u\.awakened \? `\$\{a\.cost\} blades` : `\$\{a\.cost \* 100\} Arts`;/g,
  'const cost = `${a.cost * 100} Arts`;', 'form badge costs');
replaceRegex(/\/Cross Slash\|Quick Bite\|Dampen\//g,
  '/Cross Slash|Flash-Fry|Diagnostic Crush|Dampen/', 'tutorial skill names');
replaceRegex(/\$\{u\.awakened \? u\.blades \+ '\/7 blades' : gaugeValue\(u\) \+ '\/300 Arts'\}/g,
  '${gaugeValue(u)}/300 Arts', 'command gauge');
replaceRegex(/class="ct \$\{u\.awakened \? 'blade' : ''\}"/g, 'class="ct"', 'command cost class');
replaceRegex(/if \(!a\.ok\) return u\.awakened \? \(a\.reason \|\| 'NOT READY'\) : `\$\{a\.cost \* 100\} Arts required`;/g,
  "if (!a.ok) return `${a.cost * 100} Arts required`;", 'not-ready copy');
replaceRegex(/if \(a\.tier === 'Skill'\) return u\.awakened \? '[^']+' : `READY[^`]+`;/g,
  "if (a.tier === 'Skill') return `READY - +${Math.round(Engine.liveSkillGain(u) * 100)} Arts`;", 'skill gain copy');
replaceRegex(/\s*if \(!u\.awakened\) return `\$\{a\.cost \* 100\} Arts`;\s*return `\$\{a\.cost\} blades`;/g,
  "\n    return `${a.cost * 100} Arts`;", 'special cost copy');
replaceRegex(/ready \? 'READY' : \(u\.awakened \? `\$\{a\.cost\} blades` : `\$\{a\.cost \* 100\} Arts`\)/g,
  "ready ? 'READY' : `${a.cost * 100} Arts`", 'button refresh costs');
replaceRegex(/selected\.awakened \? `\$\{selected\.blades\}\/7 blades` : `\$\{gaugeValue\(selected\)\}\/300 Arts`/g,
  '`${gaugeValue(selected)}/300 Arts`', 'selected gauge refresh');
replaceRegex(/toast\(starredUp \? '[^']+' : '[^']+'\);/g,
  "toast(starredUp ? 'HALE AWAKENS - 5-star form and true kit permanently unlocked.' : 'HALE AWAKENS - his Arts gauge surges to full.');", 'awakening toast');
replaceRegex(/else if \(!ready\) cue\.textContent = u\.awakened \? `[^`]+` : `\$\{tier\.toUpperCase\(\)\}[^`]+`;/g,
  "else if (!ready) cue.textContent = `${tier.toUpperCase()} - ${a.cost * 100} ARTS REQUIRED`;", 'gesture cost copy');
replaceRegex(/if \(command === 'gauge'\) S\.party\.forEach\(u => \{ u\.energy = 3; if \(u\.awakened\) u\.blades = 7; \}\);/g,
  "if (command === 'gauge') S.party.forEach(u => { u.energy = 3; });", 'training gauge');

fs.writeFileSync(path, source, 'utf8');
console.log('Removed legacy blade UI:', path);

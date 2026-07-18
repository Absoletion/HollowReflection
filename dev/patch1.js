const fs = require('fs');
let t = fs.readFileSync('engine-dev.js', 'utf8');
const oldB = `    for (const sp of specials) {
      const pool = u.awakened ? u.blades : u.energy;
      const cost = free ? 0 : sp.cost;
      list.push(Object.assign({}, sp, {
        cost, ok: pool >= cost,
        reason: pool >= cost ? '' : (u.awakened ? \`needs \${sp.cost} blades\` : \`needs \${sp.cost}⚡\`),
      }));
    }`;
const newB = `    for (const sp of specials) {
      const pool = u.awakened ? u.blades : u.energy;
      const cost = free ? 0 : sp.cost;
      let ok = pool >= cost;
      let reason = ok ? '' : (u.awakened ? \`needs \${sp.cost} blades\` : \`needs \${sp.cost}⚡\`);
      // Energy-gift specials need a living, non-awakened recipient (blades aren't Energy).
      if (ok && sp.target === 'ally_other' && !livingParty(s).some(x => x !== u && !x.awakened)) {
        ok = false; reason = 'no valid recipient';
      }
      list.push(Object.assign({}, sp, { cost, ok, reason }));
    }`;
if (!t.includes(oldB)) throw new Error('engine block not found');
t = t.split(oldB).join(newB);
fs.writeFileSync('engine-dev.js', t);

let u2 = fs.readFileSync('part-ui2.js', 'utf8');
const oldT = `!(pending.action.target === 'ally_other' && u.uid === pending.uid);`;
const newT = `!(pending.action.target === 'ally_other' && (u.uid === pending.uid || u.awakened));`;
if (!u2.includes(oldT)) throw new Error('ui isTarget not found');
u2 = u2.split(oldT).join(newT);
const oldW = `const allies = Engine.livingParty(S).filter(x => !(a.target === 'ally_other' && x.uid === uid));`;
const newW = `const allies = Engine.livingParty(S).filter(x => !(a.target === 'ally_other' && (x.uid === uid || x.awakened)));`;
if (!u2.includes(oldW)) throw new Error('ui wire not found');
u2 = u2.split(oldW).join(newW);
fs.writeFileSync('part-ui2.js', u2);
console.log('patched');

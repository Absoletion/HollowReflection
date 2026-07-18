const fs = require('fs');
const [sourcePath, targetPath] = process.argv.slice(2);
const source = fs.readFileSync(sourcePath, 'utf8');
let target = fs.readFileSync(targetPath, 'utf8');

for (const name of ['RIGPARTS']) {
  const pattern = new RegExp(`^var ${name} = .*?;$`, 'm');
  const pristine = source.match(pattern)?.[0];
  if (!pristine) throw new Error(`Could not find pristine ${name} declaration.`);
  if (!pattern.test(target)) throw new Error(`Could not find staged ${name} declaration.`);
  target = target.replace(pattern, pristine);
}

fs.writeFileSync(targetPath, target, 'utf8');
console.log('Restored pristine legacy RIGPARTS and SPRITES blocks.');

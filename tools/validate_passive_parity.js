'use strict';

const Engine = require('../dev/engine-dev.js');
const registry = require('../dev/passive-registry.js');
const allowed = new Set(['exact', 'approximate', 'cosmetic', 'not_implemented']);
const errors = [];
for (const [key, unit] of Object.entries(Engine.UNITS)) {
  const row = registry[key];
  if (!row) { errors.push(`${key}: missing passive registry entry`); continue; }
  if (!allowed.has(row.classification)) errors.push(`${key}: invalid classification`);
  if (row.classification === 'exact' && !row.test) errors.push(`${key}: exact passive has no test reference`);
  if (row.classification === 'not_implemented') errors.push(`${key}: not_implemented passive is not allowed in a release build`);
  if (!unit.passive || unit.passive.name !== row.name) errors.push(`${key}: registry name does not match unit passive`);
}
for (const key of Object.keys(registry)) if (!Engine.UNITS[key]) errors.push(`${key}: registry entry has no playable unit`);
if (errors.length) { for (const error of errors) console.error(`ERROR: ${error}`); process.exitCode = 1; }
else console.log(`Passive parity validated: ${Object.keys(Engine.UNITS).length} units.`);

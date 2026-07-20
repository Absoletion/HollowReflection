'use strict';

const assert = require('assert');
const registry = require('./story-registry.js');

const chapter4 = registry.chapters.find(chapter => chapter.id === 'chapter4');
assert(chapter4, 'Chapter 4 must exist.');
assert.strictEqual(chapter4.missions.length, 7, 'Chapter 4 must contain seven missions.');

for (const mission of chapter4.missions) {
  assert(Array.isArray(mission.pre) && mission.pre.length > 0, `${mission.id} needs pre-scene.`);
  assert(Array.isArray(mission.post) && mission.post.length > 0, `${mission.id} needs post-scene.`);
  assert(!/coming soon|placeholder|todo|tbd/i.test(JSON.stringify(mission)), `${mission.id} contains placeholder text.`);
}

console.log('Chapter 4 story registry tests passed.');

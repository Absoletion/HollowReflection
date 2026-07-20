'use strict';

const path = require('path');
const STORY_REGISTRY = require(path.join('..', 'dev', 'story-registry.js'));
const Engine = require(path.join('..', 'dev', 'engine-dev.js'));

const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

for (const chapter of STORY_REGISTRY.chapters || []) {
  for (const mission of chapter.missions || []) {
    if (!mission.id) fail(`Mission in ${chapter.id} has no id.`);
    if (!mission.title) fail(`${mission.id} has no title.`);
    if (!mission.lesson) fail(`${mission.id} has no lesson.`);

    if (mission.live !== false && mission.type === 'battle') {
      if (!mission.encounter) fail(`${mission.id} is a battle with no encounter.`);
      if (!Engine.BATTLES || !Engine.BATTLES[mission.encounter]) {
        fail(`${mission.id} references missing encounter ${mission.encounter}.`);
      }
      if (!Array.isArray(mission.pre) || mission.pre.length === 0) fail(`${mission.id} has no authored pre-scene.`);
      if (!Array.isArray(mission.post) || mission.post.length === 0) fail(`${mission.id} has no authored post-scene.`);
    }

    if (mission.partyMode === 'fixed' && (!Array.isArray(mission.fixedParty) || mission.fixedParty.length === 0)) {
      fail(`${mission.id} uses fixed party mode with no fixedParty.`);
    }
    if (mission.partyMode === 'player_plus_guests' && !Array.isArray(mission.guests)) {
      fail(`${mission.id} uses player_plus_guests without guests.`);
    }

    const serialized = JSON.stringify(mission);
    if (/coming soon|placeholder|todo|tbd/i.test(serialized)) fail(`${mission.id} contains placeholder copy.`);
  }
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Story quality validated: ${Object.keys(STORY_REGISTRY.missions || {}).length} missions.`);
}

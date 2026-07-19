'use strict';

// Canonical mission registry. Narrative source: design/CHAPTER-1..4-OUTLINE.md.
// Battle logic consumes encounter; the UI consumes scenes, lesson, party, and unlocks.
const STORY_REGISTRY = {
  version: 1,
  chapters: [
    {
      id: 'chapter1', code: '1', title: 'The Guild Charter', scene: 'sc-hall',
      missions: [
        { id: 'act1_1', code: '1-1', title: 'Guild Entrance Exam', type: 'battle', encounter: 'act1_1', lesson: 'Skills and cooldowns', party: ['hale'],
          pre: [{ ch: 'Chapter One — The Guild Charter' }, { sp: '', tx: 'The guild hall smells of ink, steel, and whatever Cinnia has on the stove.' }, { sp: 'Cinnia', tx: 'You are Hale, right? Good. I am showing you around before anyone important gets ideas.' }, { sp: 'Hale', tx: 'Are you not important?' }, { sp: 'Cinnia', tx: 'Not in the paperwork sense. Come on.' }],
          post: [{ sp: 'Cinnia', tx: 'Tap the Skill when it is ready. No waiting around for a basic attack to happen by itself.' }, { sp: 'Hale', tx: 'That was the exam?' }, { sp: 'Cinnia', tx: 'That was the part where the examiner checks whether you can hit the exam.' }] },
        { id: 'act1_2', code: '1-2', title: 'Second Construct', type: 'battle', encounter: 'act1_2', lesson: 'Arts at 200 Energy', party: ['hale', 'cinnia'],
          pre: [{ sp: 'Cinnia', tx: 'Skills restore Arts Energy. Two hundred opens your Arts.' }, { sp: 'Hale', tx: 'And you?' }, { sp: 'Cinnia', tx: 'I keep everyone fed enough to reach two hundred.' }],
          post: [{ sp: 'Cinnia', tx: 'See? Fire magic, field medicine, and a pan. Completely sensible profession.' }] },
        { id: 'act1_3', code: '1-3', title: 'Field Readiness', type: 'battle', encounter: 'act1_3', lesson: 'Burst at 300 Energy', party: ['hale', 'cinnia', 'tobin', 'hearthgar'], unlocks: { units: ['hearthgar'] },
          pre: [{ sp: 'Tobin', tx: 'The water says the next one is louder.' }, { sp: 'Hearthgar', tx: 'S-stay behind me. The armor means it, even if I do not sound like it.' }, { sp: 'Cinnia', tx: 'Three hundred Energy. Swipe upward and release in the Burst zone. Make the loud one regret volunteering.' }],
          post: [{ sp: 'Hale', tx: 'Does everyone here speak like that?' }, { sp: 'Cinnia', tx: 'No. Some of us are strange.' }] },
        { id: 'act1_4', code: '1-4', title: 'Meet the Garrison', type: 'story', lesson: 'Town and missions', party: ['hale', 'cinnia'],
          pre: [{ sp: '', tx: 'Cinnia leads Hale through the castle district and into the Adventurer’s Garrison.' }, { sp: 'Cinnia', tx: 'Castle for crown work. Inn for summons and the people you already regret meeting. Quest board for everything smaller.' }, { sp: 'Guildmaster', tx: 'Sign here. The crown pays you to read the blight reports nobody else will.' }, { sp: 'Hale', tx: 'I have not decided.' }, { sp: 'Tobin', tx: 'The water says you will stay.' }] },
        { id: 'act1_5', code: '1-5', title: 'The Quest Board', type: 'battle', encounter: 'act1_5', lesson: 'Side missions', party: ['hale', 'cinnia'],
          pre: [{ sp: 'Cinnia', tx: 'First contract: pests in a storehouse. Heroic posture is optional.' }],
          post: [{ sp: 'Hale', tx: 'That paid in actual gold.' }, { sp: 'Cinnia', tx: 'Try not to spend it all on being mysterious.' }] },
        { id: 'act1_6', code: '1-6', title: 'First Contract', type: 'battle', encounter: 'act1_6', lesson: 'Party formation and waves', party: ['hale', 'cinnia', 'tobin'],
          pre: [{ sp: 'Cinnia', tx: 'Real contracts come in waves. Set the party before we leave; changing your mind in the mud is less elegant.' }],
          post: [{ sp: 'Tobin', tx: 'The road is holding its breath.' }] },
        { id: 'act1_7', code: '1-7', title: 'Roadside Hollow', type: 'battle', encounter: 'act1_7', lesson: 'Elements and Hollow enemies', party: ['hale', 'cinnia', 'tobin'],
          pre: [{ sp: '', tx: 'Glass-bright fractures web through a creature at the roadside.' }, { sp: 'Tobin', tx: 'The water will not look at it.' }, { sp: 'Hale', tx: 'Then we will.' }],
          post: [{ sp: 'Cinnia', tx: 'That was not ordinary magic.' }, { sp: 'Hale', tx: 'No. It was not.' }] },
        { id: 'act1_8', code: '1-8', title: 'Return to the Guild', type: 'story', lesson: 'Experience and leveling', party: ['hale', 'cinnia'],
          pre: [{ sp: '', tx: 'Back at the guild, the report becomes ink, gold, and experience.' }, { sp: 'Cinnia', tx: 'Experience raises levels. Levels raise the odds of coming home. I am strongly in favor of both.' }, { sp: 'Guildmaster', tx: 'Your charter is provisional until the trial. Do not make me amend the form.' }] },
        { id: 'act1_9', code: '1-9', title: 'The Still Basin', type: 'story', lesson: 'First summon', party: ['hale', 'cinnia'], unlocks: { summon: true },
          pre: [{ sp: '', tx: 'Beneath the inn, a basin of perfectly still water reflects a room that is not there.' }, { sp: 'Cinnia', tx: 'This is where the guild finds people who are already looking back.' }, { sp: 'Hale', tx: 'That explanation made it worse.' }, { sp: 'Cinnia', tx: 'It usually does. Reach in.' }] },
        { id: 'act1_10', code: '1-10', title: 'Charter Day', type: 'battle', encounter: 'act1_10', lesson: 'Chapter trial', party: ['hale', 'cinnia', 'tobin', 'hearthgar'],
          pre: [{ sp: 'Guildmaster', tx: 'Mixed targets. Multiple waves. Use what you learned and try not to damage the courtyard.' }, { sp: 'Cinnia', tx: 'The courtyard knows what it did.' }],
          post: [{ sp: '', tx: 'Evening settles over the same warm guild hall.' }, { sp: 'Guildmaster', tx: 'Hale. Adventurer of the Garrison. The charter is yours if you still want it.' }, { sp: 'Hale', tx: 'I have decided.' }, { sp: 'Cinnia', tx: 'Good. Dinner was going to be awkward otherwise.' }] }
      ]
    },
    { id: 'chapter2', code: '2', title: 'The Waiting', scene: 'sc-road', missions: [
      ['2-1','The Departure'],['2-2','Business as Usual'],['2-3','The Ballad of the Unbroken'],['2-4','Wreck of the Cerulean Wake'],['2-5','Any Word?'],['2-6','Closer'],['2-7','Milla’s Run'],['2-8','The Gate']
    ].map((m,i) => ({ id:'act2_'+(i+1), code:m[0], title:m[1], type:i===0?'story':'battle', encounter:i===0?null:'act2_'+(i+1), lesson:i===3?'Marlowe and Brant join':i===7?'Milla joins':'' })) },
    { id: 'chapter3', code: '3', title: 'The Road', scene: 'sc-road', missions: [
      ['3-1','The March'],['3-2','Camp'],['3-3','The Waystation'],['3-4','The Opposite Direction'],['3-5','The Halfway Marker'],['3-6','The Last Inn'],['3-7','The Edge']
    ].map((m,i) => ({ id:'act3_'+(i+1), code:m[0], title:m[1], type:i===1||i===5?'story':'battle', encounter:i===1||i===5?null:'act3_'+(i+1), lesson:'' })) },
    { id: 'chapter4', code: '4', title: 'Greywick', scene: 'sc-fields', missions: [
      ['4-1','The Silence'],['4-2','The Advance Camp'],['4-3','Garrick'],['4-4','The Geologist'],['4-5','Following the Glass'],['4-6','The Center'],['4-7','The Crystallization']
    ].map((m,i) => ({ id:'act4_'+(i+1), code:m[0], title:m[1], type:'battle', encounter:'act4_'+(i+1), scriptedLoss:i===6, lesson:i===2?'Protect Garrick':i===3?'Break and stagger':i===6?'Scripted survival':'' })) }
  ]
};

// Runtime details for the revised Chapters 2–4 drafts. Keeping this enrichment
// separate from the compact title table makes the canonical mission sequence
// easy to scan while still giving the UI complete progression metadata.
const STORY_MISSION_DETAILS = {
  act2_1:{type:'story',encounter:null,lesson:'Aldric leaves for Greywick'},
  act2_2:{type:'battle',lesson:'Repeat contracts and rewards'},
  act2_3:{type:'story',encounter:null,lesson:'A song from the frontier'},
  act2_4:{type:'battle',lesson:'Marlowe and Brant join',unlocks:{units:['marlowe','brant']}},
  act2_5:{type:'story',encounter:null,lesson:'The silence grows'},
  act2_6:{type:'battle',lesson:'Escalating Hollow resistance'},
  act2_7:{type:'battle',lesson:'Escort Milla through the eastern road'},
  act2_8:{type:'story',encounter:null,lesson:'Milla joins; Greywick expedition begins',unlocks:{units:['milla']}},
  act3_1:{type:'battle',lesson:'Formation order'}, act3_2:{type:'story',encounter:null,lesson:'The party at rest'},
  act3_3:{type:'battle',lesson:'Proto-Hollowed terrain'}, act3_4:{type:'story',encounter:null,lesson:'Celia crosses the road'},
  act3_5:{type:'battle',lesson:'Hollowed behavior patterns'}, act3_6:{type:'battle',lesson:'Resource check before Greywick'},
  act3_7:{type:'battle',lesson:'Environmental Hollow hazards'},
  act4_1:{lesson:'True Hollowed enemies'}, act4_2:{lesson:'Mixed-enemy party composition'},
  act4_3:{lesson:'Protect the injured hunter'}, act4_4:{lesson:'Brigga joins; Break and stagger',unlocks:{units:['brigga']}},
  act4_5:{lesson:'Hollow terrain and elements'}, act4_6:{lesson:'Boss-tier Hollowed'},
  act4_7:{lesson:'Survive the Glasswright',scriptedLoss:true}
};
for (const chapter of STORY_REGISTRY.chapters) {
  for (const mission of chapter.missions) Object.assign(mission, STORY_MISSION_DETAILS[mission.id] || {});
}
for (const chapter of STORY_REGISTRY.chapters) {
  for (const mission of chapter.missions) if (!mission.partyMode) mission.partyMode = mission.party && mission.party.length ? 'fixed' : 'player';
}

// Mobile-paced adaptation of Claude's Chapter 1 draft. Each scene keeps one
// tutorial purpose while preserving the warm guild introductions the later
// chapters are designed to make the player miss.
Object.assign(STORY_REGISTRY.chapters[0].missions[0], {
  pre:[{ch:'Chapter One — The Guild Charter'},{sp:'',tx:'The guild door is propped open with a cook pot. Inside: ink, steel, dinner, and an argument about a bounty.'},{sp:'Aldric',tx:'Hale? I am Aldric. The construct in the yard is the entrance exam.'},{sp:'Hale',tx:'That is the whole introduction?'},{sp:'Aldric',tx:'Hit it first. Introductions are better over stew.'}],
  post:[{sp:'Aldric',tx:'Good. Come on. You have not eaten yet, and Cinnia will never forgive me if I let a new recruit leave hungry.'},{sp:'Cinnia',tx:'New face! Sit. You look half-starved.'},{sp:'Tobin',tx:'The water says he stays.'},{sp:'Cinnia',tx:'Tobin says that about everyone.'},{sp:'Hearthgar',tx:'I-I am Hearthgar. Sorry about the table.'},{sp:'',tx:'His armored elbow rattles every bowl. Cinnia simply refills his.'},{sp:'Hale',tx:'Thank you.'},{sp:'',tx:'Cinnia beams as if two words settled the matter.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[1], {
  pre:[{sp:'',tx:'The next morning, Aldric has a tougher construct waiting. Cinnia arrives carrying her pan-staff.'},{sp:'Aldric',tx:'Skills fill Arts Energy. At two hundred, you can spend it on something real.'},{sp:'Cinnia',tx:'Mine is more of a battlefield lunch break.'}],
  post:[{sp:'Cinnia',tx:'See? Cooking is combat-applicable.'},{sp:'Hale',tx:'I did not say it was not.'},{sp:'Cinnia',tx:'You thought it very loudly.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[2], {
  pre:[{sp:'Aldric',tx:'Three hundred Energy opens a Burst. This time, you take a full party.'},{sp:'Tobin',tx:'The water says the next one is louder.'},{sp:'Hearthgar',tx:'S-stay behind me. The armor means it, even if I do not sound like it.'}],
  post:[{sp:'Aldric',tx:'Field-ready. All four of you.'},{sp:'Cinnia',tx:'Celebration dinner. Hearthgar, you are not helping with the stove.'},{sp:'Tobin',tx:'The curtains remember.'},{sp:'',tx:'Even Aldric laughs. Hale almost does.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[3], {
  pre:[{sp:'',tx:'Cinnia leads Hale from the inn to the quest board, the market, and the castle garrison.'},{sp:'Cinnia',tx:'Inn for summons and party business. Board for local contracts. Castle for crown work.'},{sp:'',tx:'Tobin reads a merchant’s fortune nearby. Hearthgar apologizes while backing out of a doorway he completely fills.'},{sp:'Aldric',tx:'The frontier reports come through the garrison. We take the work other people call too small—until it is not.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[4], {
  party:['hale','cinnia','tobin'],
  pre:[{sp:'Cinnia',tx:'Pests on a supply road. Mundane, muddy, and probably full of teeth.'},{sp:'Tobin',tx:'I am coming.'},{sp:'Cinnia',tx:'Was anyone going to ask?'},{sp:'Tobin',tx:'The water already did.'}],
  post:[{sp:'Hale',tx:'That paid in actual gold.'},{sp:'Cinnia',tx:'Try not to spend it all on being mysterious.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[5], {
  pre:[{sp:'Aldric',tx:'Your first real contract. Set the formation before you leave. The road will not pause while you reconsider.'},{sp:'Cinnia',tx:'Pick whoever you trust. I am obviously available.'}],
  post:[{sp:'',tx:'The caravan merchant offers a tip. Cinnia refuses the coin and accepts a sack of flour.'},{sp:'Cinnia',tx:'Flour is worth more than coin in this kitchen.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[6], {
  pre:[{sp:'',tx:'A roadside creature turns. Glass-bright fractures move beneath its hide.'},{sp:'Tobin',tx:'The water will not look at it.'},{sp:'Cinnia',tx:'What does that mean?'},{sp:'Tobin',tx:'I do not know.'},{sp:'Hale',tx:'Then we find out.'}],
  post:[{sp:'Cinnia',tx:'That was not ordinary magic.'},{sp:'Hale',tx:'No.'},{sp:'Cinnia',tx:'Do you know what it was?'},{sp:'Hale',tx:'Not yet.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[7], {
  pre:[{sp:'',tx:'Back at the guild, the report becomes ink, gold, and experience. In the kitchen, Cinnia has cooked enough for twenty people.'},{sp:'Cinnia',tx:'I just want to make sure everyone is fed. That is all.'},{sp:'Hearthgar',tx:'I can take some to the garrison.'},{sp:'Aldric',tx:'Check your levels before the next contract. Coming home stronger is still coming home.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[8], {
  pre:[{sp:'',tx:'Beneath the inn, a basin of perfectly still water reflects a room that is not there.'},{sp:'Cinnia',tx:'I think it is showing you people.'},{sp:'Hale',tx:'People where?'},{sp:'Tobin',tx:'People looking back.'},{sp:'Aldric',tx:'Reach in. More hands for the guild means more people Cinnia gets to feed.'}]
});
Object.assign(STORY_REGISTRY.chapters[0].missions[9], {
  pre:[{sp:'Aldric',tx:'Greywick went quiet three days ago. This is your first frontier assignment, not a training exercise.'},{sp:'',tx:'He looks at Cinnia, Tobin, Hearthgar, then Hale.'},{sp:'Aldric',tx:'Read the field. Bring each other home.'},{sp:'Cinnia',tx:'I packed extra. Three days’ worth.'},{sp:'Hale',tx:'It is a one-day route.'},{sp:'Cinnia',tx:'I always pack extra.'}],
  post:[{sp:'',tx:'They return to the same warm hall at evening. Cinnia cooks. Tobin reads the water in a cup. Hearthgar cleans the suit’s joints.'},{sp:'Aldric',tx:'Every person through that door learns they are better than they thought. Cinnia was just a cook. Tobin was a kid everyone gave up on. Hearthgar could not look anyone in the eye.'},{sp:'Aldric',tx:'Hale. Adventurer of the Garrison. The charter is yours if you still want it.'},{sp:'Hale',tx:'I have decided.'},{sp:'Cinnia',tx:'Good. Dinner was going to be awkward otherwise.'}]
});

STORY_REGISTRY.missions = STORY_REGISTRY.chapters.reduce(function (all, chapter) {
  chapter.missions.forEach(function (mission) { mission.chapterId = chapter.id; mission.scene = mission.scene || chapter.scene; all[mission.id] = mission; });
  return all;
}, {});

if (typeof module !== 'undefined') module.exports = STORY_REGISTRY;

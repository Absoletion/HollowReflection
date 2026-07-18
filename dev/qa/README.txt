Headless QA drivers (need jsdom: npm i jsdom, then node <driver>.js):
- frontdoor.js: THE canonical test — completes ch1 via the real story path (title->dialogue->battle->victory->continue). Catches wiring bugs that engine-level tests miss.
- mqa3.js: party sheets + ch1 battle via __start hook
- mqa4.js: ch6 endgame chain (lockdown/finisher/victory/epilogue)
- fuzz.js <seed>: randomized ch1 playthrough
- headcheck.js: dialogue chat heads + unit sheet
- stagecheck.js: stage mount + slow-timer beats
LESSON (2026-07-09): every driver but frontdoor launches battles via the __start hook, which bypassed the story-flow callback wiring — a field bug lived there for 3 builds. Always run frontdoor.

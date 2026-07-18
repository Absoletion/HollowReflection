const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/sessions/stoic-amazing-wright/mnt/outputs/hollowing-demo.html','utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(window) { const st = window.setTimeout.bind(window); window.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms||0, 10), ...a); }
});
const w = dom.window;
w.addEventListener('error', e => errors.push(e.message));
const app = () => w.document.getElementById('app');
const vb = () => [...w.document.querySelectorAll('button')].filter(b=>!b.disabled);
const seen = { lockdown:false, finisher:false, victory:false, epilogue:false };
let steps = 0;
function tick() {
  steps++;
  const S = w.__battle;
  if (S && S !== w.__seen && !S.result) {
    w.__seen = S;
    const boss = S.enemies.find(e=>e.key==='lowingman');
    if (boss && !S.script.awakened) {
      S.enemies.filter(e=>e.key==='calf').forEach(c=>{c.hp=0;c.alive=false;});
      S.script.counting = S.script.countingDone = true; S.script.awakened = true;
      const hale = S.party.find(u=>u.key==='hale'); hale.awakened = true; hale.blades = 5; hale.energy = 0;
      S.party.forEach(u=>{u.atk=(u.atk||50)*2;});
      boss.hp = Math.round(boss.maxhp*0.13);
    }
  }
  const txt = app() ? app().textContent : '';
  if (/crook, unbroken/.test(txt)) { seen.epilogue = true; return finish('epilogue'); }
  if (S && S.result === 'victory') seen.victory = true;
  if (S && S.freeRound === S.round && S.round > 0) seen.finisher = true;
  if (steps > 2500) return finish('step cap');
  const abtns = [...w.document.querySelectorAll('.abtn:not([disabled])')];
  if (abtns.length && abtns.every(b=>/bulwark/i.test(b.textContent))) { seen.lockdown = true; abtns[0].click(); const t=w.document.querySelector('.targetable'); if(t)t.click(); return setTimeout(tick, 8); }
  if (!S || S.result) { const b = vb().find(x=>/continue|next|onward|bury|proceed/i.test(x.textContent)) || vb()[0]; if (b) b.click(); return setTimeout(tick, 8); }
  const u = S.party.find(x=>x.alive && !x.acted);
  if (u) {
    const sel = w.document.querySelector(`[data-uid="${u.uid}"].selectable`); if (sel) sel.click();
    const boss = S.enemies.find(e=>e.key==='lowingman');
    for (const p of ['shatterfall','keelhaul','anchor_drop','grand_opening','kegcracker','basic','guard']) {
      const b = w.document.querySelector(`.abtn[data-uid="${u.uid}"][data-act="${p}"]:not([disabled])`);
      if (b) { b.click(); const t = w.document.querySelector('.targetable'); if (t) t.click(); break; }
    }
  }
  setTimeout(tick, 8);
}
function finish(why) {
  console.log('finished:', why, '| steps:', steps, '|', JSON.stringify(seen), '| errors:', errors.length ? errors.slice(0,3).join(' | ') : 'none');
  console.log('screen:', (app()?app().textContent:'').replace(/\s+/g,' ').slice(0,140));
  process.exit(0);
}
setTimeout(() => { if (w.__stageFast) w.__stageFast(); w.__start('ch6', ['hale','cinnia','brant','brigga'], w.__afterCh6); setTimeout(tick, 40); }, 400);
setTimeout(()=>finish('wall clock'), 38000);

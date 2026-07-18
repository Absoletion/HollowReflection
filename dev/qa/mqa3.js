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
setTimeout(() => { if (w.__stageFast) w.__stageFast();
  const begin = vb().find(b=>/begin/i.test(b.textContent)); if (begin) begin.click();
  setTimeout(() => {
    for (let i=0;i<25;i++) { const skip = vb().find(b=>/skip/i.test(b.textContent)); const dc = w.document.querySelector('#dlgcard'); if (skip) skip.click(); else if (dc) dc.click(); else break; }
    // PARTY SHEETS
    const nav = w.document.getElementById('bottomnav');
    const tabs = [...nav.querySelectorAll('button, [data-nav], .navbtn')];
    tabs.find(t=>/party/i.test(t.textContent)).click();
    const cards = [...app().querySelectorAll('.ucard, [data-key]')].filter(c=>c.dataset && c.dataset.key);
    let sheets = 0, sheetFail = [];
    for (const c of cards) {
      c.click();
      const txt = app().textContent;
      if (/Burst|Passive/i.test(txt)) sheets++; else sheetFail.push(c.dataset.key);
      const back = vb().find(b=>/back|close|✕|×/i.test(b.textContent)); if (back) back.click();
    }
    console.log('party sheets opened:', sheets, '/', cards.length, sheetFail.length ? 'FAILED: '+sheetFail.join(',') : '');
    // BATTLE ch1 via QA hook
    w.__start('ch1', ['hale','cinnia','tobin'], () => { w.document.getElementById('app').innerHTML = '<div id="ch1done">CH1DONE</div>'; });
    let steps = 0;
    (function fight() {
      steps++;
      if (w.document.getElementById('ch1done')) {
        console.log('ch1 battle WON via mobile UI in', steps, 'steps | errors:', errors.length ? errors.slice(0,3).join(' | ') : 'none');
        return process.exit(0);
      }
      if (steps > 1200) { console.log('ch1 STALL | screen:', app().textContent.replace(/\s+/g,' ').slice(0,140), '| btns:', vb().map(b=>b.textContent.trim().slice(0,14)).join('/'), '| errors:', errors.slice(0,3).join('|')); return process.exit(1); }
      const S = w.__battle;
      if (S && S.result) { const b = vb().find(x=>/continue|victory|next/i.test(x.textContent)) || vb()[0]; if (b) b.click(); return setTimeout(fight, 8); }
      const abtn = w.document.querySelector('.abtn:not([disabled])');
      if (abtn) abtn.click();
      const t = w.document.querySelector('.ucard.targetable, .mini.targetable, [data-side="enemy"].targetable');
      if (t) t.click();
      const sel = w.document.querySelector('.ucard.selectable, .mini.selectable');
      if (sel) sel.click();
      setTimeout(fight, 8);
    })();
  }, 150);
}, 400);

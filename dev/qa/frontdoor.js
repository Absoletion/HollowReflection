/* THE MISSING TEST: complete ch1 through the real story path — title → begin →
   dialogue → battle → VICTORY → Continue — and verify the story advances. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/sessions/stoic-amazing-wright/mnt/outputs/hollowing-demo.html','utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) { const st = w.setTimeout.bind(w); w.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms||0, 20), ...a); }
});
const w = dom.window;
w.addEventListener('error', e => errors.push(e.message));
const vb = () => [...w.document.querySelectorAll('button')].filter(b=>!b.disabled);
const appText = () => { const a = w.document.getElementById('app'); return a ? a.textContent.replace(/\s+/g,' ') : ''; };
let steps = 0, sawVictory = false, clickedContinue = false;
setTimeout(() => {
  (function drive() {
    steps++;
    if (steps > 800) { console.log('FAIL: step cap. after-continue screen:', appText().slice(0,120), '| errors:', errors.join('|') || 'none'); return process.exit(1); }
    // success: after clicking Continue on victory, we should reach ch2 content or the hub — NOT a battle screen
    if (clickedContinue) {
      const t = appText();
      const stuckInBattle = /Round \d/.test(t) && /Guild Charter/.test(t);
      if (!stuckInBattle && (/Greywick|Chapter Two|Chapter One .*(cleared|done)|VESSIA|Guild Hall/i.test(t) || w.document.getElementById('bottomnav'))) {
        console.log('PASS: story advanced past ch1 victory. screen:', t.slice(0, 90), '| errors:', errors.join('|') || 'none');
        return process.exit(errors.length ? 1 : 0);
      }
      if (stuckInBattle) { console.log('FAIL: still on battle screen after Continue. errors:', errors.join('|') || 'none'); return process.exit(1); }
    }
    const ovBtn = [...w.document.querySelectorAll('.overlay button, .modal button')].find(b=>!b.disabled);
    if (ovBtn) { sawVictory = true; clickedContinue = true; ovBtn.click(); return setTimeout(drive, 30); }
    const dlg = w.document.getElementById('dlgcard');
    if (dlg) { dlg.click(); return setTimeout(drive, 15); }
    const S = w.__battle;
    if (S && !S.result) {
      const ab = w.document.querySelector('.abtn:not([disabled])');
      if (ab) ab.click();
      const t = w.document.querySelector('.ucard.targetable'); if (t) t.click();
      const sel = w.document.querySelector('.ucard.selectable'); if (sel) sel.click();
      return setTimeout(drive, 15);
    }
    const b = vb().find(x=>/begin the story|begin|continue/i.test(x.textContent)) || vb()[0];
    if (b) b.click();
    setTimeout(drive, 20);
  })();
}, 350);
setTimeout(() => { console.log('FAIL: wallclock. sawVictory:', sawVictory, '| errors:', errors.join('|') || 'none'); process.exit(1); }, 40000);

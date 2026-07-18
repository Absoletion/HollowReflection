const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/sessions/stoic-amazing-wright/mnt/outputs/hollowing-demo.html','utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window;
w.addEventListener('error', e => errors.push(e.message));
setTimeout(() => {
  const vb = () => [...w.document.querySelectorAll('button')].filter(b=>!b.disabled);
  const begin = vb().find(b=>/begin/i.test(b.textContent)); if (begin) begin.click();
  setTimeout(()=>{ const cs = vb().find(b=>/begin the story|continue story|chapter/i.test(b.textContent)); if (cs) cs.click(); }, 120);
  // walk dialogue, count chat heads seen per speaker line
  let heads = 0, speakerLines = 0, steps = 0;
  (function walk(){
    steps++;
    const card = w.document.getElementById('dlgcard');
    if (!card && steps < 30) return setTimeout(walk, 40); // wait for dialogue to open
    if (card && steps < 90) {
      const sp = w.document.querySelector('.dlg-speaker');
      const spName = sp ? sp.textContent.trim() : '';
      if (spName && spName !== ' ') {
        speakerLines++;
        if (w.document.querySelector('.chathead')) heads++;
      }
      card.click();
      return setTimeout(walk, 20);
    }
    console.log('dialogue lines w/ speaker:', speakerLines, '| with chat head:', heads);
    // unit sheet still works
    const nav = w.document.getElementById('bottomnav');
    if (nav) {
      [...nav.querySelectorAll('button, .navbtn')].find(t=>/party/i.test(t.textContent)).click();
      const c = w.document.querySelector('.pcard'); if (c) c.click();
      console.log('sheet hero present:', !!w.document.querySelector('.sheet .hero svg, .sheet .hero img'));
    }
    console.log('errors:', errors.length ? errors.slice(0,3).join(' | ') : 'none');
    process.exit(0);
  })();
}, 400);

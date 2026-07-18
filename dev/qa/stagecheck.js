const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/sessions/stoic-amazing-wright/mnt/outputs/hollowing-demo.html','utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window;
w.addEventListener('error', e => errors.push(e.message));
setTimeout(() => {
  w.__start('ch1', ['hale','cinnia','tobin'], ()=>{});
  setTimeout(() => {
    const host = w.document.getElementById('stagehost');
    console.log('stagehost:', !!host, '| canvas mounted:', !!(host && host.querySelector('canvas.stagecv')));
    console.log('bwrap stage-on:', !!w.document.querySelector('.bwrap.stage-on'));
    // take 3 real actions WITHOUT fast mode so beats/particles tick on real timers
    let acts = 0;
    (function act(){
      const b = w.document.querySelector('.abtn:not([disabled])');
      if (b) { b.click(); const t = w.document.querySelector('.targetable'); if (t) t.click(); acts++; }
      if (acts < 3) return setTimeout(act, 300);
      setTimeout(() => {
        console.log('3 slow actions done | page errors:', errors.length ? errors.slice(0,3).join(' | ') : 'none');
        process.exit(0);
      }, 1800); // let beats + particles run out
    })();
  }, 300);
}, 400);

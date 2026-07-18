const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/sessions/stoic-amazing-wright/mnt/outputs/hollowing-demo.html','utf8');
const seed = parseInt(process.argv[2] || '1');
let rs = seed; const rnd = () => (rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648;
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window;
w.addEventListener('error', e => errors.push('ERR: ' + e.message + ' @ ' + (e.filename||'') + ':' + (e.lineno||'')));
const vb = () => [...w.document.querySelectorAll('button')].filter(b=>!b.disabled);
let stuckMs = 0, acts = 0, lastAct = '';
setTimeout(() => {
  w.__start('ch1', ['hale','cinnia','tobin'], () => { w.document.getElementById('app').innerHTML = '<div id="done"></div>'; });
  (function play() {
    if (w.document.getElementById('done')) { console.log('seed', seed, ': completed OK after', acts, 'acts.', errors.length ? errors.join('|') : ''); return process.exit(0); }
    const S = w.__battle;
    const options = [];
    vb().forEach(b => options.push(['btn', b]));
    [...w.document.querySelectorAll('.ucard.targetable, .ucard.selectable')].forEach(c => options.push(['card', c]));
    if (!options.length) {
      stuckMs += 120;
      if (stuckMs >= 3000) {
        console.log('=== LOCKOUT seed', seed, '=== lastAct:', lastAct, '| acts:', acts);
        console.log('S.result:', S && S.result, 'round:', S && S.round, '| party:', S && S.party.map(u=>`${u.key}:${u.acted?'A':'-'}${u.alive?'':'(dead)'}e${u.energy}`).join(' '), '| enemies:', S && S.enemies.map(e=>`${e.key}:${e.hp}`).join(' '));
        console.log('buttons:', [...w.document.querySelectorAll('button')].map(b=>`${b.textContent.trim().slice(0,14)}${b.disabled?'[D]':''}`).join('/'));
        console.log('errors:', errors.join(' | ') || 'none');
        return process.exit(1);
      }
      return setTimeout(play, 120);
    }
    stuckMs = 0;
    const [kind, el] = options[Math.floor(rnd() * options.length)];
    lastAct = kind + ':' + (el.textContent || '').trim().slice(0, 16).replace(/\s+/g,' ') + (el.dataset ? ('#' + (el.dataset.act || el.dataset.uid || '')) : '');
    el.click(); acts++;
    setTimeout(play, 120);
  })();
}, 350);
setTimeout(() => { console.log('seed', seed, ': wallclock, acts:', acts, errors.length ? errors.join('|') : ''); process.exit(0); }, 38000);

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const demo = path.join(root, 'hollowing-demo.html');

function hp(text) {
  const value = Number(String(text).split('/')[0]);
  assert(Number.isFinite(value), `Invalid HP label: ${text}`);
  return value;
}

async function main() {
  assert(fs.existsSync(demo), 'Build hollowing-demo.html before running the browser smoke.');

  const server = http.createServer((request, response) => {
    if (request.url !== '/' && request.url !== '/hollowing-demo.html') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(demo).pipe(response);
  });
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));

  const browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/hollowing-demo.html`, { waitUntil: 'load' });
    await context.setOffline(true);

    await page.locator('#startbtn').click();
    await page.locator('#htown').click();
    await page.locator('[data-spot="quest"]').click();
    await page.locator('#traininggrounds').click();
    await page.locator('.livebattle').waitFor();

    const enemyHp = page.locator('.ucard.enemy [data-hp] span');
    const before = hp(await enemyHp.textContent());
    await page.locator('.liveunit .quickskill.ready').first().click();
    await page.waitForFunction(() => window.__stageDebug().some(b => b.side === 'party' && b.offX < -20 && b.anim === 'move'));
    await page.waitForFunction(
      ({ selector, previous }) => Number(document.querySelector(selector).textContent.split('/')[0]) < previous,
      { selector: '.ucard.enemy [data-hp] span', previous: before }
    );
    const after = hp(await enemyHp.textContent());

    await page.locator('#pausebattle').click();
    await page.locator('#requestbattleexit').click();
    await page.locator('#confirmbattleexit').click();
    await page.locator('h2').filter({ hasText: 'Party' }).waitFor();

    assert(after < before, `Skill did not reduce enemy HP (${before} -> ${after}).`);

    await context.setOffline(false);
    const seededSave = await page.evaluate(() => {
      const state = Engine.normalizeSaveState({ owned: ['hale', 'cinnia'], activeParty: ['hale', 'cinnia'], storyStep: 1, sigils: 200, gold: 2500, lastHub: 'town', unitProgress: { cinnia: { level: 70, stars: 4, xp: 0 } } });
      const now = new Date().toISOString();
      return JSON.stringify({ schemaVersion: Engine.SAVE_SCHEMA_VERSION, gameVersion: '0.46.0', saveId: 'browser-challenge', createdAt: now, updatedAt: now, revision: 1, accountLink: { linked: false, provider: null, accountId: null }, state });
    });
    const origin = `http://127.0.0.1:${port}`;
    await context.close();
    context = await browser.newContext({ storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: 'projectHollowing.singleSave', value: seededSave }] }] } });
    page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`${origin}/hollowing-demo.html`, { waitUntil: 'load' });
    await context.setOffline(true);
    await page.locator('#startbtn').click();
    await page.locator('[data-spot="castle"]').click();
    await page.locator('#townchallenge').click();

    async function clearChallenge(id) {
      await page.locator(`[data-challenge="${id}"]`).click();
      await page.locator('.livebattle').waitFor();
      await page.evaluate(() => { for (const enemy of window.__battle.enemies) enemy.hp = 1; });
      await page.locator('.liveunit .quickskill.ready').first().click();
      await page.locator('#ovnext').waitFor({ timeout: 15000 });
      await page.locator('#ovnext').click();
      await page.locator('#challengecontinue').click();
    }
    await clearChallenge('ember_trial');
    await clearChallenge('feastkeeper_trial');
    await clearChallenge('ember_trial');
    await clearChallenge('feastkeeper_trial');

    await context.setOffline(false);
    await page.reload({ waitUntil: 'load' });
    await context.setOffline(true);
    await page.locator('#startbtn').click();
    await page.locator('[data-spot="castle"]').click();
    await page.locator('#townchallenge').click();
    assert.match(await page.locator('[data-challenge="ember_trial"]').textContent(), /Clears: 2/);
    await page.locator('#challengeback').click();
    await page.locator('[data-tab="party"]').click();
    await page.locator('[data-key="cinnia"]').click();
    await page.locator('#evolveunit').click();
    assert.match(await page.locator('.sheet .rarity-stars').textContent(), /★★★★★/);

    await context.setOffline(false);
    await page.reload({ waitUntil: 'load' });
    const exported = await page.evaluate(() => localStorage.getItem('projectHollowing.singleSave'));
    const backupPath = path.join(os.tmpdir(), `hollow-reflections-${Date.now()}.json`);
    fs.writeFileSync(backupPath, exported);
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('projectHollowing.singleSave'));
      save.state = Engine.normalizeSaveState({}); save.revision++;
      localStorage.setItem('projectHollowing.singleSave', JSON.stringify(save));
    });
    await page.reload({ waitUntil: 'load' });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#savefile').setInputFiles(backupPath);
    await page.locator('#startbtn').waitFor();
    await page.locator('#startbtn').click();
    await page.locator('[data-tab="party"]').click();
    assert.match(await page.locator('[data-key="cinnia"] .rarity-stars').textContent(), /★★★★★/);
    fs.rmSync(backupPath, { force: true });

    await page.locator('[data-tab="town"]').click();
    await page.locator('[data-spot="market"]').click();
    await page.locator('[data-market-buy="essence_bundle"]').click();
    assert.strictEqual(await page.locator('[data-market-buy="essence_bundle"]').isDisabled(), true);
    await page.locator('[data-market-buy="training_manual"]').click();
    await context.setOffline(false);
    await page.reload({ waitUntil: 'load' });
    await context.setOffline(true);
    await page.locator('#startbtn').click();
    await page.locator('[data-spot="market"]').click();
    assert.match(await page.locator('#townpanel').textContent(), /market purchase/i);

    await page.locator('[data-tab="summon"]').click();
    await page.locator('#pull10').click();
    await page.locator('.pullcard').nth(9).waitFor();
    assert.strictEqual(await page.locator('.pullcard').count(), 10);
    await context.setOffline(false); await page.reload({ waitUntil: 'load' }); await context.setOffline(true);
    await page.locator('#startbtn').click(); await page.locator('[data-tab="summon"]').click();
    assert.doesNotMatch(await page.locator('.summon-history').textContent(), /None yet/);

    assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
    console.log(`Browser smoke: combat, Challenge, evolution, Market, and Summon persistence passed (${before} -> ${after} HP).`);
  } finally {
    await context.setOffline(false).catch(() => {});
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

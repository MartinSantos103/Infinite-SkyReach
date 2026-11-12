import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Martin Santos/.gemini/antigravity/brain/a1ff2626-9b48-49a9-830e-82b8eaeaeab1';

async function runDensityVerification() {
  console.log('1. Starting Vite server for wave density verification...');
  const server = await createServer({
    root: process.cwd(),
    server: { port: 5196, strictPort: true }
  });
  await server.listen();
  const url = 'http://localhost:5196';
  console.log(`Vite server listening at ${url}`);

  let browser;
  try {
    try {
      browser = await chromium.launch({ headless: true, channel: 'msedge' });
    } catch {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click to start game
    await page.mouse.click(640, 400);
    await page.waitForTimeout(1000);

    console.log('2. Monitoring active enemy density over 10 seconds of natural wave progression...');
    // Reposition player to bottom corner so player doesn't instantly wipe out incoming waves
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      if (gs && gs.player) {
        gs.player.setPosition(24, 690);
      }
    });

    const samples = [];
    let screenshotTaken = false;

    // Monitor for 10 seconds, polling every 500 ms
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);

      const status = await page.evaluate(() => {
        const gs = window.__GAME_SCENE__;
        if (!gs) return { activeCount: 0, archetypes: [] };
        const activeEnemies = gs.enemies.getChildren().filter((e) => e.active && !e.isDead);
        const archetypes = [...new Set(activeEnemies.map((e) => e.archetypeId))];
        return {
          activeCount: activeEnemies.length,
          archetypes
        };
      });

      samples.push(status.activeCount);
      console.log(`Sample ${i + 1}/20 (${(i + 1) * 0.5}s): ${status.activeCount} active enemies (Types: ${status.archetypes.join(', ')})`);

      // Take a nice screenshot when waves are active on screen (around 4-6s)
      if (i >= 8 && !screenshotTaken && status.activeCount >= 3) {
        const screenshotPath = path.join(ARTIFACT_DIR, 'balanced_wave_density.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot of balanced wave density: ${screenshotPath}`);
        screenshotTaken = true;
      }
    }

    const maxActive = Math.max(...samples);
    const minActive = Math.min(...samples.slice(3)); // After initial wave enters
    const avgActive = (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1);

    console.log(`\nDensity Summary:`);
    console.log(`- Peak active enemies simultaneously: ${maxActive}`);
    console.log(`- Average active enemies: ${avgActive}`);
    console.log(`- Min active (post-warmup): ${minActive}`);

    if (maxActive > 10) {
      throw new Error(`FAIL: Active enemy density exceeded soft-cap threshold! Max was ${maxActive} > 10`);
    } else {
      console.log(`PASS: Active enemy density strictly respected soft cap (Max: ${maxActive} <= 10)`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Direct Soft-Cap Postponement Check in Browser Runtime
    // -------------------------------------------------------------------------
    console.log('\n3. Testing soft-cap postponement behavior in live game runtime...');
    const softCapCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const wm = gs.waveManager;

      // Reset timer
      wm.waveTimer = 0;
      // Get current enemy count
      const preCount = gs.enemies.countActive(true);

      // Trigger spawnNextWave
      wm.spawnNextWave();
      const timerAfter1 = wm.waveTimer;
      const countAfter1 = gs.enemies.countActive(true);

      return {
        preCount,
        countAfter1,
        timerAfter1,
        postponed: preCount >= 10 ? timerAfter1 === 1200 : timerAfter1 >= 2200
      };
    });

    console.log('Soft-cap live check:', softCapCheck);
    if (!softCapCheck.postponed) {
      throw new Error(`FAIL: Wave postponement logic failed during live check`);
    }
    console.log('PASS: Wave postponement logic verified in live runtime');

    console.log('\n=== ALL DENSITY VERIFICATIONS PASSED ===');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

runDensityVerification().catch((err) => {
  console.error('\n*** VERIFICATION FAILED ***');
  console.error(err);
  process.exit(1);
});

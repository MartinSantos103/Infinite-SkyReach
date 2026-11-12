import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Martin Santos/.gemini/antigravity/brain/a1ff2626-9b48-49a9-830e-82b8eaeaeab1';

async function runBossEscortsVerification() {
  console.log('1. Starting Vite server for boss escort verification...');
  const server = await createServer({
    root: process.cwd(),
    server: { port: 5195, strictPort: true }
  });
  await server.listen();
  const url = 'http://localhost:5195';
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

    // Start game and park player away from center to avoid shooting down test escorts
    await page.mouse.click(640, 400);
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      if (gs.player) {
        gs.player.setPosition(20, 680);
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: Boss 1 (Valkiria) Escort Deployment and Non-Static Movement
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Valkiria Escort Movement ---');
    const valkiriaResult = await page.evaluate(async () => {
      const gs = window.__GAME_SCENE__;
      if (gs.activeBoss) {
        gs.activeBoss.destroy();
        gs.activeBoss = null;
      }
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      if (gs.player) gs.player.setPosition(20, 680);

      gs.waveManager.spawnBossInstance('VALKIRIA');
      const boss = gs.activeBoss;

      // Esperar 2.0s a que termine la animación de entrada
      await new Promise((r) => setTimeout(r, 2000));

      // Desplegar escolta de compuerta
      boss.deployEscort();
      // Esperar 650 ms a que finalice el tween de la compuerta y salgan los cazas
      await new Promise((r) => setTimeout(r, 650));

      const escorts = gs.enemies.getChildren().filter((e) => e.active && !e.isDead);
      escorts.forEach((e, idx) => {
        e.__escortTestId = `valkiria_escort_${idx}`;
      });

      const snapshotT0 = escorts.map((e) => ({
        testId: e.__escortTestId,
        id: e.archetypeId,
        x: Math.round(e.x),
        y: Math.round(e.y),
        vx: e.body.velocity.x,
        vy: e.body.velocity.y
      }));

      // Esperar 700 ms para medir el avance físico
      await new Promise((r) => setTimeout(r, 700));

      const snapshotT1 = escorts
        .filter((e) => e.active && !e.isDead)
        .map((e) => ({
          testId: e.__escortTestId,
          id: e.archetypeId,
          x: Math.round(e.x),
          y: Math.round(e.y),
          vx: e.body.velocity.x,
          vy: e.body.velocity.y
        }));

      // Verificar que todos los cazas rastreados avanzaron hacia abajo
      const allMoved = snapshotT0.every((e0) => {
        const matchingT1 = snapshotT1.find((e1) => e1.testId === e0.testId);
        return matchingT1 && matchingT1.y > e0.y + 35 && matchingT1.vy > 0;
      });

      return {
        ok: snapshotT0.length >= 2 && allMoved,
        bossId: boss.bossId,
        escortCountT0: snapshotT0.length,
        escortCountT1: snapshotT1.length,
        snapshotT0,
        snapshotT1
      };
    });

    console.log('Valkiria escorts result:', JSON.stringify(valkiriaResult, null, 2));
    if (!valkiriaResult.ok) {
      throw new Error(`Valkiria escort movement test failed: ${JSON.stringify(valkiriaResult)}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'valkiria_active_escorts.png') });

    // -------------------------------------------------------------------------
    // TEST 2: Boss 2 (Espectro) Escort Deployment and Movement
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Espectro Escort Movement ---');
    const espectroResult = await page.evaluate(async () => {
      const gs = window.__GAME_SCENE__;
      if (gs.activeBoss) {
        gs.activeBoss.destroy();
        gs.activeBoss = null;
      }
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      if (gs.player) gs.player.setPosition(20, 680);

      gs.waveManager.spawnBossInstance('ESPECTRO');
      const boss = gs.activeBoss;

      // Esperar a que termine la entrada y se activen las escoltas iniciales
      await new Promise((r) => setTimeout(r, 2000));

      // Desplegar escolta periódica adicional
      boss.deployEscort();

      const escorts = gs.enemies.getChildren().filter((e) => e.active && !e.isDead);
      escorts.forEach((e, idx) => {
        e.__escortTestId = `espectro_escort_${idx}`;
      });

      const snapshotT0 = escorts.map((e) => ({
        testId: e.__escortTestId,
        id: e.archetypeId,
        x: Math.round(e.x),
        y: Math.round(e.y),
        vx: e.body.velocity.x,
        vy: e.body.velocity.y
      }));

      await new Promise((r) => setTimeout(r, 650));

      const snapshotT1 = escorts
        .filter((e) => e.active && !e.isDead)
        .map((e) => ({
          testId: e.__escortTestId,
          id: e.archetypeId,
          x: Math.round(e.x),
          y: Math.round(e.y),
          vx: e.body.velocity.x,
          vy: e.body.velocity.y
        }));

      // Los interceptores furtivos deben haberse movido desde T0
      const moved = snapshotT0.every((e0) => {
        const matchingT1 = snapshotT1.find((e1) => e1.testId === e0.testId);
        return matchingT1 && matchingT1.y > e0.y + 20;
      });

      return {
        ok: snapshotT0.length >= 2 && moved,
        bossId: boss.bossId,
        escortCount: snapshotT0.length,
        snapshotT0,
        snapshotT1
      };
    });

    console.log('Espectro escorts result:', JSON.stringify(espectroResult, null, 2));
    if (!espectroResult.ok) {
      throw new Error(`Espectro escort movement test failed: ${JSON.stringify(espectroResult)}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'espectro_active_escorts.png') });

    // -------------------------------------------------------------------------
    // TEST 3: Boss 3 (Leviatán) Escort and Drones Deployment
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Leviatán Escort Movement ---');
    const leviatanResult = await page.evaluate(async () => {
      const gs = window.__GAME_SCENE__;
      if (gs.activeBoss) {
        gs.activeBoss.destroy();
        gs.activeBoss = null;
      }
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      if (gs.player) gs.player.setPosition(20, 680);

      gs.waveManager.spawnBossInstance('LEVIATAN');
      const boss = gs.activeBoss;

      // Esperar a que termine la entrada cinemática (2.0s)
      await new Promise((r) => setTimeout(r, 2000));

      // Invocar despliegue de escoltas
      boss.deployEscort();

      const escorts = gs.enemies.getChildren().filter((e) => e.active && !e.isDead);
      escorts.forEach((e, idx) => {
        e.__escortTestId = `leviatan_escort_${idx}`;
      });

      const snapshotT0 = escorts.map((e) => ({
        testId: e.__escortTestId,
        id: e.archetypeId,
        x: Math.round(e.x),
        y: Math.round(e.y),
        vy: e.body ? e.body.velocity.y : 0
      }));

      await new Promise((r) => setTimeout(r, 700));

      const snapshotT1 = escorts
        .filter((e) => e.active && !e.isDead)
        .map((e) => ({
          testId: e.__escortTestId,
          id: e.archetypeId,
          x: Math.round(e.x),
          y: Math.round(e.y),
          vy: e.body ? e.body.velocity.y : 0
        }));

      const drones = snapshotT1.filter((e) => e.id === 'ORBITAL_DRONE');
      const planes = snapshotT1.filter((e) => e.id !== 'ORBITAL_DRONE');

      const planesMoved = planes.every((p1) => {
        const p0 = snapshotT0.find((e) => e.testId === p1.testId);
        return p0 && p1.y > p0.y + 25;
      });

      return {
        ok: drones.length === 4 && planes.length >= 2 && planesMoved,
        bossId: boss.bossId,
        droneCount: drones.length,
        planeCount: planes.length,
        snapshotT0,
        snapshotT1
      };
    });

    console.log('Leviatán escorts result:', JSON.stringify(leviatanResult, null, 2));
    if (!leviatanResult.ok) {
      throw new Error(`Leviatán escort test failed: ${JSON.stringify(leviatanResult)}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'leviatan_active_escorts.png') });

    // -------------------------------------------------------------------------
    // TEST 4: Boss Defeat Clean-up (All escorts destroyed on victory)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Boss Defeat Clean-up ---');
    const defeatCleanupResult = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const countBefore = gs.enemies.countActive(true);
      gs.onBossDefeated(gs.activeBoss);
      const countAfter = gs.enemies.countActive(true);
      return {
        ok: countBefore > 0 && countAfter === 0,
        countBefore,
        countAfter
      };
    });

    console.log('Defeat clean-up result:', JSON.stringify(defeatCleanupResult, null, 2));
    if (!defeatCleanupResult.ok) {
      throw new Error(`Defeat clean-up test failed: ${JSON.stringify(defeatCleanupResult)}`);
    }

    console.log('\nALL BOSS ESCORT INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

runBossEscortsVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Martin Santos/.gemini/antigravity/brain/9d58765c-84c1-4758-af1f-7c9804a4afb4';

async function runVerification() {
  console.log('1. Starting Vite server...');
  const server = await createServer({
    root: process.cwd(),
    server: { port: 5179, strictPort: true }
  });
  await server.listen();
  const url = 'http://localhost:5179';
  console.log(`Vite server listening at ${url}`);

  let browser;
  try {
    try {
      browser = await chromium.launch({ headless: true, channel: 'msedge' });
    } catch {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (err) => {
      console.error('PAGE ERROR:', err);
      errors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
        errors.push(msg.text());
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Verify BootScene (Title Screen), procedural textures, and exact Desktop Centering (1280x800)
    const bootCheck = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      if (!game) return { ok: false, reason: 'No Phaser game instance' };
      const boot = game.scene.getScene('BootScene');
      const canvas = document.querySelector('#game-container canvas');
      const rect = canvas.getBoundingClientRect();
      const leftGap = rect.left;
      const rightGap = window.innerWidth - rect.right;
      const topGap = rect.top;
      const bottomGap = window.innerHeight - rect.bottom;
      const isCenteredDesktop =
        Math.abs(leftGap - rightGap) <= 2 && Math.abs(topGap - bottomGap) <= 2;

      const requiredTextures = [
        'player', 'player_flash', 'player_drone',
        'enemy_light', 'enemy_tactical', 'enemy_bomber', 'enemy_stealth', 'enemy_corvette',
        'boss_valkiria_hull', 'boss_valkiria_cannon', 'boss_espectro', 'boss_leviatan_body', 'boss_leviatan_ring', 'boss_leviatan_drone',
        'bullet_player_1', 'bullet_player_2', 'bullet_player_3', 'bullet_enemy_std', 'bullet_enemy_fan',
        'missile_corrosive', 'mine_magnetic', 'bullet_sonic_ring', 'bullet_acid_drop',
        'bg_stage1_far', 'bg_stage1_near', 'bg_stage2_far', 'bg_stage2_near', 'bg_stage3_far', 'bg_stage3_near'
      ];
      const missing = requiredTextures.filter((k) => !game.textures.exists(k));
      if (boot.promptText) boot.promptText.setVisible(true);
      return {
        ok: missing.length === 0 && boot.scene.isActive() && isCenteredDesktop,
        missing,
        isCenteredDesktop,
        desktopRect: { leftGap: Math.round(leftGap), rightGap: Math.round(rightGap), topGap: Math.round(topGap), bottomGap: Math.round(bottomGap) }
      };
    });
    console.log('BootScene & Desktop Centering check:', bootCheck);
    if (!bootCheck.ok) throw new Error(`BootScene check failed: ${JSON.stringify(bootCheck)}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_title_screen.png') });

    // 2. Verify iframe integration: preventDefault on Arrow keys & Space
    const preventDefaultCheck = await page.evaluate(() => {
      const evArrow = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      window.dispatchEvent(evArrow);
      const evSpace = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
      window.dispatchEvent(evSpace);
      return {
        arrowPrevented: evArrow.defaultPrevented,
        spacePrevented: evSpace.defaultPrevented
      };
    });
    console.log('Iframe preventDefault check:', preventDefaultCheck);
    if (!preventDefaultCheck.arrowPrevented || !preventDefaultCheck.spacePrevented) {
      throw new Error('Failed iframe preventDefault check');
    }

    // 3. Click centered canvas to start GameScene + UIScene
    await page.mouse.click(640, 400);
    await page.waitForTimeout(700);

    // 4. Verify 40% bottom vertical movement limit (y >= 432 to y <= 700) and Tonel ability
    const movementAndTonelCheck = await page.evaluate(async () => {
      const gs = window.__GAME_SCENE__;
      if (!gs || !gs.player) return { ok: false, reason: 'No GameScene or Player' };
      const p = gs.player;

      // Try forcing player above 432 via upward movement update
      p.cursors.up.isDown = true;
      for (let i = 0; i < 60; i++) {
        p.update(performance.now(), 16.67);
      }
      p.cursors.up.isDown = false;
      const topClampedY = p.y;

      // Try forcing player below 700 via downward movement update
      p.cursors.down.isDown = true;
      for (let i = 0; i < 90; i++) {
        p.update(performance.now(), 16.67);
      }
      p.cursors.down.isDown = false;
      const bottomClampedY = p.y;

      // Reset position to center of bottom 40%
      p.setPosition(240, 600);

      // Activate Tonel
      const tonelActivated = p.tryActivateTonel();
      const tonelDuration = p.tonelActiveTimer;
      const tonelCooldown = p.tonelCooldownTimer;
      const isInvulnDuringTonel = p.isInvulnerable();

      return {
        ok: topClampedY === 432 && bottomClampedY === 700 && tonelActivated,
        topClampedY,
        bottomClampedY,
        tonelActivated,
        tonelDuration,
        tonelCooldown,
        isInvulnDuringTonel,
        activePlayerBullets: gs.playerBullets.countActive(true)
      };
    });
    console.log('Movement & Tonel check:', movementAndTonelCheck);
    if (!movementAndTonelCheck.ok) {
      throw new Error(`Movement/Tonel check failed: ${JSON.stringify(movementAndTonelCheck)}`);
    }

    // 4b. Verify Physical Spacebar key press on keyboard triggers Tonel
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      gs.player.tonelActiveTimer = 0;
      gs.player.tonelCooldownTimer = 0;
    });
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const spacebarKeyCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      return {
        ok: gs.player.isTonelActive() && gs.player.tonelCooldownTimer > 0,
        tonelActive: gs.player.isTonelActive(),
        tonelActiveTimer: gs.player.tonelActiveTimer,
        tonelCooldownTimer: gs.player.tonelCooldownTimer
      };
    });
    console.log('Physical Spacebar press check:', spacebarKeyCheck);
    if (!spacebarKeyCheck.ok) {
      throw new Error(`Physical Spacebar key press failed to trigger Tonel: ${JSON.stringify(spacebarKeyCheck)}`);
    }

    // 5. Verify Multi-Wave Aligned Formations, Random Bestiary Selection (all 5 archetypes), and High Enemy Density
    const multiWaveCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      gs.player.tonelActiveTimer = 0;
      gs.player.tonelAura.setAlpha(0);
      gs.player.setScale(1, 1);

      // Verify random selection covers all 5 bestiary archetypes over 15 draws
      const seenArchetypes = new Set();
      for (let i = 0; i < 15; i++) {
        seenArchetypes.add(gs.waveManager.pickRandomArchetype());
      }

      // Apply upgrades for visual richness
      gs.player.applyUpgrade('MULTISHOT');
      gs.player.applyUpgrade('MULTISHOT');
      gs.player.applyUpgrade('REACTIVE_ARMOR');
      gs.player.applyUpgrade('WINGMAN_DRONE');
      gs.player.applyUpgrade('WINGMAN_DRONE');
      gs.player.applyUpgrade('FIREPOWER');

      // Clear existing and trigger multi-wave + aligned formations across archetypes
      gs.enemies.clear(true, true);
      gs.waveManager.spawnNextWave();
      gs.waveManager.spawnLightFighterWave(7, 'V_WEDGE', 120, 220);
      gs.waveManager.spawnTacticalSquadron(6, 'DOUBLE_COLUMN', 360, 240);
      gs.waveManager.spawnHeavyBomberWave(1, 'DIAMOND', 140, 115);
      gs.waveManager.spawnMineCorvetteWave(1, 'V_WEDGE', 340, 125);
      gs.waveManager.spawnStealthWave(4, 'LINE_ABREAST', 240, 165);

      return {
        ok:
          seenArchetypes.size === 5 &&
          gs.enemies.countActive(true) >= 20 &&
          gs.player.firepowerMultiplier === 1.1 &&
          gs.player.def === 6 && // Inicia con 3 DEF + 3 DEF de REACTIVE_ARMOR = 6 DEF
          gs.missionManager.currentMission.target === 25,
        seenArchetypes: Array.from(seenArchetypes),
        activeEnemyCount: gs.enemies.countActive(true),
        pendingSubWaves: gs.waveManager.pendingSubWaves.length,
        firepowerMultiplier: gs.player.firepowerMultiplier,
        playerDefAfterArmor: gs.player.def,
        firstMissionTarget: gs.missionManager.currentMission.target
      };
    });
    console.log('Multi-wave & Random Bestiary check:', multiWaveCheck);
    if (!multiWaveCheck.ok) {
      throw new Error(`Multi-wave check failed: ${JSON.stringify(multiWaveCheck)}`);
    }

    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_combat_all_archetypes.png') });

    // 5b. Verify Mobile Responsive Viewport (390x844), Exact Centering, and Touch Drag Movement
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const mobileCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      gs.player.xp = 0;

      const canvas = document.querySelector('#game-container canvas');
      const rect = canvas.getBoundingClientRect();
      const leftGap = rect.left;
      const rightGap = window.innerWidth - rect.right;
      const topGap = rect.top;
      const bottomGap = window.innerHeight - rect.bottom;
      const isCenteredMobile =
        Math.abs(leftGap - rightGap) <= 2 && Math.abs(topGap - bottomGap) <= 2;

      // Test touch drag logic clamping to 40% bottom area (432..700)
      const p = gs.player;
      p.isTouchDragging = true;
      p.touchOffsetX = 0;
      p.touchOffsetY = 0;
      gs.input.activePointer.isDown = true;
      gs.input.activePointer.x = 120;
      gs.input.activePointer.y = 200; // Above 432 limit
      for (let i = 0; i < 40; i++) {
        p.update(performance.now(), 16.67);
      }
      const touchClampedY = p.y;
      const touchMovedX = Math.round(p.x);
      gs.input.activePointer.isDown = false;
      p.isTouchDragging = false;
      p.setPosition(240, 610);

      return {
        ok:
          isCenteredMobile &&
          Math.round(rect.width) === 390 &&
          Math.round(rect.height) === 585 &&
          touchClampedY >= 432 &&
          Math.round(touchClampedY) <= 433 &&
          Math.abs(touchMovedX - 120) <= 5,
        isCenteredMobile,
        touchClampedY: Number(touchClampedY.toFixed(2)),
        touchMovedX,
        mobileRect: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          leftGap: Math.round(leftGap),
          rightGap: Math.round(rightGap),
          topGap: Math.round(topGap),
          bottomGap: Math.round(bottomGap)
        }
      };
    });
    console.log('Mobile Responsive & Touch check:', mobileCheck);
    if (!mobileCheck.ok) {
      throw new Error(`Mobile check failed: ${JSON.stringify(mobileCheck)}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_mobile_centered_combat.png') });

    // Restore Desktop Viewport
    await page.setViewportSize({ width: 800, height: 800 });
    await page.waitForTimeout(250);

    // 6. Test Level-Up Upgrade Modal (3 cards)
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      gs.player.xp = 0;
      gs.triggerLevelUpModal();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_upgrade_modal.png') });

    // Select upgrade card 1 via keyboard shortcut '1'
    await page.keyboard.press('1');
    await page.waitForTimeout(250);

    // 7. Test Pause Modal
    const pauseCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      gs.player.xp = 0;
      while (ui && ui.activeModal === 'UPGRADE') {
        ui.chooseUpgradeByIndex(0);
      }
      gs.requestPause();
      return {
        ok: ui.activeModal === 'PAUSE' && ui.pauseContainer.visible
      };
    });
    console.log('Pause modal check:', pauseCheck);
    if (!pauseCheck.ok) throw new Error('Pause modal did not open');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_pause_modal.png') });

    // Resume from pause
    await page.evaluate(() => {
      const ui = window.__UI_SCENE__;
      ui.closePauseAndResume();
    });
    await page.waitForTimeout(200);

    // 8. Test Boss 1: Valkiria (5,000 m) + Corrosive Missiles (-2 DEF) + Lateral Cannons
    const valkiriaSpawnedCannons = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      gs.player.xp = 0;
      if (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      if (ui && ui.activeModal === 'PAUSE') ui.closePauseAndResume();
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      gs.player.hp = 100;
      gs.waveManager.distance = 5000;
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.waveManager.spawnBossInstance('VALKIRIA');
      return gs.activeBoss.getActiveCannonCount();
    });
    await page.waitForTimeout(2000); // Wait for Valkiria entrance to complete
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      if (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      if (gs.activeBoss && gs.activeBoss.fireCorrosiveMissiles) {
        gs.activeBoss.fireCorrosiveMissiles();
        gs.activeBoss.fireCannons();
        gs.activeBoss.flashTimer = 0;
        gs.activeBoss.setTexture('boss_valkiria_hull');
      }
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      if (gs.activeBoss) {
        gs.activeBoss.flashTimer = 0;
        gs.activeBoss.setTexture('boss_valkiria_hull');
      }
    });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_boss1_valkiria.png') });

    // Verify Valkiria parts mechanic and corrosive missile DEF loss
    const valkiriaCheck = await page.evaluate((initialCount) => {
      const gs = window.__GAME_SCENE__;
      const boss = gs.activeBoss;
      boss.destroyCannonModule(boss.leftCannon);
      boss.destroyCannonModule(boss.rightCannon);
      const afterBothDestroyed = boss.getActiveCannonCount();

      // Test Corrosive Missile -2 DEF on player
      gs.player.def = 5;
      gs.player.invulnTimer = 0;
      gs.player.tonelActiveTimer = 0;
      gs.player.takeHit(18, { defLoss: 2 });
      const defAfterMissile = gs.player.def;

      return {
        ok: initialCount === 2 && afterBothDestroyed === 0 && defAfterMissile === 3,
        initialCannons: initialCount,
        afterBothDestroyed,
        defAfterMissile
      };
    }, valkiriaSpawnedCannons);
    console.log('Valkiria mechanics check:', valkiriaCheck);
    if (!valkiriaCheck.ok) {
      throw new Error(`Valkiria check failed: ${JSON.stringify(valkiriaCheck)}`);
    }

    // Defeat Valkiria and verify transition to Sector 2 + Stage 2
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      gs.activeBoss.takeDamage(999999);
    });
    await page.waitForTimeout(1600);
    await page.evaluate(() => {
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') {
        ui.chooseUpgradeByIndex(0);
      }
    });
    await page.waitForTimeout(700);

    const sector2Check = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      return {
        sector: gs.waveManager.sector,
        stage: gs.waveManager.stage,
        nextBossDistance: gs.waveManager.nextBossDistance
      };
    });
    console.log('Sector 2 progression check:', sector2Check);
    if (sector2Check.sector !== 2 || sector2Check.stage !== 2 || sector2Check.nextBossDistance !== 10000) {
      throw new Error(`Sector 2 transition failed: ${JSON.stringify(sector2Check)}`);
    }

    // 9. Test Boss 2: Espectro (10,000 m) + EMP Wave (-30% DEF & 1.5s fire disable) + Sonic Spiral
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      gs.player.hp = 100;
      gs.waveManager.distance = 10000;
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.waveManager.spawnBossInstance('ESPECTRO');
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      if (gs.activeBoss) {
        gs.activeBoss.fireSonicSpiral();
        gs.activeBoss.state = 'EMP_FIRE';
        gs.activeBoss.empTimer = 500;
      }
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_boss2_espectro.png') });

    // Verify Espectro EMP effect (-30% DEF and 1.5s fire disable)
    const espectroEmpCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const p = gs.player;
      p.hp = 100;
      p.def = 10;
      p.invulnTimer = 0;
      p.tonelActiveTimer = 0;
      p.takeHit(15, { defLossRatio: 0.30, disableFireMs: 1500 });
      return {
        ok: p.def === 7 && p.isFireDisabled() && p.empDisabledTimer === 1500,
        defAfterEmp: p.def,
        fireDisabled: p.isFireDisabled(),
        empDisabledTimer: p.empDisabledTimer
      };
    });
    console.log('Espectro EMP check:', espectroEmpCheck);
    if (!espectroEmpCheck.ok) {
      throw new Error(`Espectro EMP check failed: ${JSON.stringify(espectroEmpCheck)}`);
    }

    // Defeat Espectro -> Sector 3 (Stage 3 Orbit)
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      gs.activeBoss.takeDamage(999999);
    });
    await page.waitForTimeout(1600);
    await page.evaluate(() => {
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
    });
    await page.waitForTimeout(700);

    // 10. Test Boss 3: Leviatán (15,000 m) + Gravity Well + 4 Orbital Drones + Acid Plasma Rain
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      gs.enemies.clear(true, true);
      gs.clearAllEnemyBullets();
      gs.playerBullets.clear(true, true);
      gs.player.hp = 100;
      gs.waveManager.distance = 15000;
      gs.waveManager.isBossActive = true;
      gs.backgroundManager.setBossMode(true);
      gs.waveManager.spawnBossInstance('LEVIATAN');
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const ui = window.__UI_SCENE__;
      while (ui && ui.activeModal === 'UPGRADE') ui.chooseUpgradeByIndex(0);
      if (gs.activeBoss) {
        gs.activeBoss.spawnDroneBarrier();
        gs.activeBoss.gravityTimer = 3800;
        gs.activeBoss.fireAcidPlasmaCross();
        gs.activeBoss.updateBossBehavior(performance.now(), 16.67);
      }
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_boss3_leviatan.png') });

    // Verify Leviatán Gravity Well + 4 Orbital Drones + Boss Multiple Collision Rule (400ms micro-invuln, -1 DEF, bounce)
    const leviatanCheck = await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      const boss = gs.activeBoss;
      const droneCount = boss.orbitalDrones.filter((d) => d && d.active).length;
      const gravityActive = Boolean(gs.activeGravityPull);

      // Test boss body collision rule (Section 4.3)
      const p = gs.player;
      p.hp = 100;
      p.def = 5;
      p.invulnTimer = 0;
      p.tonelActiveTimer = 0;
      p.takeHit(boss.collisionDamage, {
        isBossCollision: true,
        defLoss: boss.collisionDefLoss,
        knockbackFromX: boss.x,
        knockbackFromY: boss.y
      });

      return {
        ok:
          droneCount === 4 &&
          gravityActive &&
          p.def === 4 &&
          p.invulnTimer === 400 &&
          p.knockbackTimer === 200,
        droneCount,
        gravityActive,
        defAfterBossCollision: p.def,
        microInvulnMs: p.invulnTimer,
        knockbackTimer: p.knockbackTimer
      };
    });
    console.log('Leviatán & Boss Collision check:', leviatanCheck);
    if (!leviatanCheck.ok) {
      throw new Error(`Leviatán check failed: ${JSON.stringify(leviatanCheck)}`);
    }

    // 11. Test Player Death -> GameOverScene & localStorage persistence
    await page.evaluate(() => {
      const gs = window.__GAME_SCENE__;
      gs.score = 18450;
      gs.waveManager.distance = 15420;
      gs.waveManager.sector = 4;
      gs.player.die();
    });
    await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_gameover_scene.png') });

    const gameOverCheck = await page.evaluate(() => {
      const goScene = window.__GAMEOVER_SCENE__;
      const raw = window.localStorage.getItem('shmup_1942_infinite_records_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        ok: Boolean(goScene && goScene.scene.isActive() && parsed && parsed.highScore === 18450),
        records: parsed
      };
    });
    console.log('GameOver & localStorage check:', gameOverCheck);
    if (!gameOverCheck.ok) {
      throw new Error(`GameOver check failed: ${JSON.stringify(gameOverCheck)}`);
    }

    if (errors.length > 0) {
      throw new Error(`Runtime console/page errors detected: ${errors.join('; ')}`);
    }

    console.log('ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

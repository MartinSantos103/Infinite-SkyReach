import Phaser from 'phaser';
import {
  GAME_WIDTH,
  PLAYER_BOUNDS,
  PLAYER_CONFIG,
  COMBAT_LIMITS,
  calculateMitigation,
  calculateMitigationPercent,
  calculateFinalDamage,
  getDefenseRingTier
} from '../config/constants.js';
import { soundManager } from '../systems/SoundManager.js';

/**
 * Entidad del Jugador ("1942 Infinite")
 * Implementa movimiento en 4 direcciones restringido al 40% inferior (y: 432..700),
 * disparo automático continuo, habilidad evasiva "Tonel" (1.5s invuln / 12s CD),
 * defensa logarítmica, rebote contra jefes, drones satélite y estados visuales.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = GAME_WIDTH / 2, y = 610) {
    super(scene, x, y, 'player');

    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(40);

    // Hitbox al 60% del tamaño visual (48x60 -> 28.8x36) centrada en el fuselaje (Sección 10.5)
    const hbW = Math.round(PLAYER_CONFIG.WIDTH * PLAYER_CONFIG.HITBOX_RATIO);
    const hbH = Math.round(PLAYER_CONFIG.HEIGHT * PLAYER_CONFIG.HITBOX_RATIO);
    this.body.setSize(hbW, hbH);
    this.body.setOffset((PLAYER_CONFIG.WIDTH - hbW) / 2, (PLAYER_CONFIG.HEIGHT - hbH) / 2);

    // Estadísticas principales (Sección 4 y 7)
    this.maxHp = PLAYER_CONFIG.MAX_HP;
    this.hp = PLAYER_CONFIG.MAX_HP;
    this.def = PLAYER_CONFIG.INITIAL_DEF;
    this.isDead = false;

    // Nivel y Experiencia
    this.level = 1;
    this.xp = 0;
    this.xpRequired = 100;

    // Niveles de mejora (Sección 7.3)
    this.upgradeLevels = {
      MULTISHOT: 0,
      TURBO_CADENCE: 0,
      REACTIVE_ARMOR: 0,
      FIREPOWER: 0,
      WINGMAN_DRONE: 0,
      REPAIR_KIT: 0
    };

    this.fireLines = 1; // 1 a 5 líneas de fuego
    this.fireRateMultiplier = 1.0;
    this.firepowerMultiplier = 1.0;
    this.droneCount = 0;

    // Temporizadores de combate (ms)
    this.fireCooldownTimer = 0;
    this.droneFireTimer = 0;
    this.invulnTimer = 0;
    this.invulnType = 'none'; // 'common' | 'boss' | 'tonel'
    this.blinkAccumulator = 0;

    this.tonelActiveTimer = 0;
    this.tonelCooldownTimer = 0;
    this.tonelGhostTimer = 0;

    this.empDisabledTimer = 0;
    this.empSparkTimer = 0;

    // Rebote físico contra jefes (Sección 4.3)
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackTimer = 0;

    // Elementos visuales acoplados a la nave (Sección 10.5)
    this.createVisualAttachments();
    this.updateDefenseVisuals();
    this.setupControls();
  }

  createVisualAttachments() {
    // Sombra bajo la nave ( desplazada 8 px, opacidad 0.25 - Sección 10.13)
    this.shadowSprite = this.scene.add
      .image(this.x + 8, this.y + 10, 'ship_shadow')
      .setDepth(35)
      .setAlpha(0.9);

    // Llama animada de la tobera (oscila escala vertical entre 0.8 y 1.3 cada 120 ms)
    this.flameSprite = this.scene.add
      .image(this.x, this.y + 34, 'player_flame')
      .setOrigin(0.5, 0)
      .setDepth(39);

    this.flameTimer = 0;
    this.flameHigh = false;

    // Anillos de Blindaje Reactivo (Defensa) - umbrales 1, 3, 7, 15 y segundo anillo en 31
    this.defRingInner = this.scene.add
      .image(this.x, this.y, 'fx_ring_violet')
      .setDepth(41)
      .setAlpha(0);

    this.defRingOuter = this.scene.add
      .image(this.x, this.y, 'fx_ring_violet_outer')
      .setDepth(41)
      .setAlpha(0);

    // Aura cian translúcida durante el Tonel
    this.tonelAura = this.scene.add
      .image(this.x, this.y, 'fx_aura_cyan')
      .setDepth(42)
      .setAlpha(0);

    // Módulos de cañón en las alas (Cañón Múltiple)
    this.cannonPods = [];
    const podOffsets = [
      { x: -11, y: -4 },
      { x: 11, y: -4 },
      { x: -18, y: 4 },
      { x: 18, y: 4 }
    ];
    for (const off of podOffsets) {
      const pod = this.scene.add
        .image(this.x + off.x, this.y + off.y, 'player_cannon_pod')
        .setDepth(39)
        .setVisible(false);
      pod.offsetX = off.x;
      pod.offsetY = off.y;
      this.cannonPods.push(pod);
    }

    // Drones Satélite laterales (hasta 2 a ±36 px)
    this.drones = [];
    const droneSides = [-36, 36];
    for (let i = 0; i < 2; i++) {
      const d = this.scene.add
        .image(this.x + droneSides[i], this.y + 6, 'player_drone')
        .setDepth(40)
        .setVisible(false);
      d.sideOffset = droneSides[i];
      this.drones.push(d);
    }
  }

  setupControls() {
    const kb = this.scene.input.keyboard;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Activar Tonel con evento nativo de teclado de Phaser (Barra Espaciadora)
    this.scene.input.keyboard.on('keydown-SPACE', () => {
      if (!this.isDead && !this.scene.isModalOpen) {
        this.tryActivateTonel();
      }
    });

    // Listener global de respaldo para Barra Espaciadora (Spacebar) en cualquier navegador/iframe
    this.onWindowKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        if (!this.isDead && !this.scene.isModalOpen) {
          this.tryActivateTonel();
        }
      }
    };
    window.addEventListener('keydown', this.onWindowKeyDown);

    if (this.scene && this.scene.events) {
      this.scene.events.once('shutdown', () => this.cleanupKeyboardListeners());
      this.scene.events.once('destroy', () => this.cleanupKeyboardListeners());
    }

    // Soporte táctil y puntero para celulares y pantallas táctiles
    this.isTouchDragging = false;
    this.touchOffsetX = 0;
    this.touchOffsetY = 0;
    this.lastTapTime = 0;

    this.scene.input.on('pointerdown', (pointer) => {
      if (this.isDead || this.scene.isModalOpen) return;
      // Ignorar zona del botón de pausa (arriba a la derecha) y del anillo de Tonel (abajo a la derecha)
      if (pointer.y < 60 && pointer.x > GAME_WIDTH - 55) return;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, GAME_WIDTH - 34, 720 - 34) < 30) {
        return;
      }

      // Doble toque rápido en pantalla activa el Tonel en móvil
      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        this.tryActivateTonel();
      }
      this.lastTapTime = now;

      this.isTouchDragging = true;
      const distToShip = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.x, this.y);
      if (distToShip <= 110) {
        this.touchOffsetX = this.x - pointer.x;
        this.touchOffsetY = this.y - pointer.y;
      } else {
        // Si toca lejos de la nave, se desplaza suavemente hacia el dedo (ligeramente por encima del dedo)
        this.touchOffsetX = 0;
        this.touchOffsetY = -28;
      }
    });

    this.scene.input.on('pointerup', () => {
      if (!this.scene.input.activePointer.isDown) {
        this.isTouchDragging = false;
      }
    });
  }

  /**
   * Devuelve si el jugador es actualmente invulnerable (por Tonel, impacto común o micro-invuln de jefe)
   */
  isInvulnerable() {
    return this.tonelActiveTimer > 0 || this.invulnTimer > 0 || this.isDead;
  }

  isTonelActive() {
    return this.tonelActiveTimer > 0;
  }

  isFireDisabled() {
    return this.empDisabledTimer > 0;
  }

  getMitigation() {
    return calculateMitigation(this.def);
  }

  getMitigationPercent() {
    return calculateMitigationPercent(this.def);
  }

  /**
   * Intenta activar la habilidad evasiva "Tonel" (Barra Espaciadora)
   * Otorga 1.5 s de invulnerabilidad total y entra en enfriamiento de 12 s (Sección 3 y 10.5).
   */
  tryActivateTonel() {
    if (this.isDead || this.tonelActiveTimer > 0 || this.tonelCooldownTimer > 0) {
      return false;
    }

    soundManager.playTonel();
    this.tonelActiveTimer = PLAYER_CONFIG.TONEL_DURATION_MS;
    this.tonelCooldownTimer = PLAYER_CONFIG.TONEL_COOLDOWN_MS;
    this.invulnType = 'tonel';
    this.tonelGhostTimer = 0;
    this.tonelAura.setAlpha(0.85);

    // Simulación de giro con escala horizontal de 1 a -1 en 0.25 s (Sección 10.5)
    this.scene.tweens.killTweensOf(this);
    this.setScale(1, 1);
    this.scene.tweens.add({
      targets: this,
      scaleX: -1,
      duration: 250,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.active) this.setScale(1, 1);
      }
    });

    if (this.scene.missionManager) {
      this.scene.missionManager.onTonelUsed();
    }

    return true;
  }

  spawnTonelGhost() {
    // Deja copias fantasma de opacidad 0.3 cada 60 ms (Sección 10.5)
    const ghost = this.scene.add
      .image(this.x, this.y, 'player')
      .setScale(this.scaleX, this.scaleY)
      .setAlpha(0.3)
      .setDepth(38);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      y: ghost.y + 12,
      duration: 180,
      onComplete: () => ghost.destroy()
    });
  }

  /**
   * Aplica daño al jugador mitigado por su Defensa logarítmica y escalado por el Sector actual.
   * @param {number} baseDamage Daño base porcentual del enemigo o proyectil
   * @param {object} options { isBossCollision, defLoss, knockbackFromX, knockbackFromY, disableFireMs }
   */
  takeHit(baseDamage, options = {}) {
    if (this.isDead) return false;

    const {
      isBossCollision = false,
      defLoss = 0,
      defLossRatio = 0,
      knockbackFromX = null,
      knockbackFromY = null,
      disableFireMs = 0
    } = options;

    // Si está en Tonel, es 100% invulnerable a todo
    if (this.tonelActiveTimer > 0) return false;

    // Si tiene invulnerabilidad activa, ignorar
    if (this.invulnTimer > 0) return false;

    const sector = this.scene.waveManager ? this.scene.waveManager.sector : 1;
    const finalDamage = calculateFinalDamage(baseDamage, this.def, sector);

    this.hp = Math.max(0, Number((this.hp - finalDamage).toFixed(2)));

    // Notificar sistema de misiones y FX
    if (this.scene.missionManager) {
      this.scene.missionManager.onPlayerHit();
    }
    if (this.scene.fxManager && finalDamage > 0) {
      this.scene.fxManager.onPlayerDamaged(this.x, this.y, finalDamage);
      this.scene.fxManager.setLowHpState(this.hp > 0 && this.hp < COMBAT_LIMITS.LOW_HP_THRESHOLD);
    }

    // Reducción de Defensa (Colisión de jefe, Misil corrosivo, Onda PEM, Lluvia ácida)
    let totalDefLost = defLoss;
    if (defLossRatio > 0 && this.def > 0) {
      totalDefLost += Math.max(1, Math.round(this.def * defLossRatio));
    }
    if (totalDefLost > 0 && this.def > 0) {
      const actualLost = Math.min(this.def, totalDefLost);
      this.def = Math.max(0, this.def - actualLost);
      this.updateDefenseVisuals();
      if (this.scene.fxManager) {
        this.scene.fxManager.onPlayerDefLost(this.x, this.y, actualLost);
      }
    }

    // Desactivación de disparo automático por Onda PEM (Sección 6 y 10.5)
    if (disableFireMs > 0) {
      this.empDisabledTimer = Math.max(this.empDisabledTimer, disableFireMs);
    }

    // Ventana de invulnerabilidad: 0.4s contra jefe (con rebote físico) o 1.5s contra enemigo común
    if (isBossCollision) {
      this.invulnTimer = PLAYER_CONFIG.BOSS_COLLISION_INVULN_MS;
      this.invulnType = 'boss';
      this.blinkAccumulator = 0;

      // Rebote físico (velocity inversa / alejamiento del jefe)
      const dx = knockbackFromX !== null ? this.x - knockbackFromX : 0;
      const dy = knockbackFromY !== null ? this.y - knockbackFromY : 1;
      const len = Math.max(1, Math.hypot(dx, dy));
      this.knockbackVx = (dx / len) * 280;
      this.knockbackVy = Math.max(180, (dy / len) * 320);
      this.knockbackTimer = 200;
    } else {
      this.invulnTimer = PLAYER_CONFIG.HIT_INVULN_MS;
      this.invulnType = 'common';
      this.blinkAccumulator = 0;
    }

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  /**
   * Cura un porcentaje de la barra de vida sin superar el 100%
   */
  heal(percentAmount) {
    if (this.isDead) return;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, Number((this.hp + percentAmount).toFixed(2)));
    const healed = this.hp - prevHp;

    if (this.scene.fxManager) {
      this.scene.fxManager.onPlayerHealed(this.x, this.y, percentAmount);
      this.scene.fxManager.setLowHpState(this.hp < COMBAT_LIMITS.LOW_HP_THRESHOLD);
    }
    return healed;
  }

  /**
   * Suma puntos de Defensa (DEF) y actualiza los anillos visuales
   */
  addDefense(amount) {
    if (this.isDead || amount <= 0) return;
    this.def += amount;
    this.updateDefenseVisuals();
    if (this.scene.fxManager) {
      this.scene.fxManager.onPlayerDefGained(this.x, this.y, amount);
    }
  }

  updateDefenseVisuals() {
    const tier = getDefenseRingTier(this.def);
    const tierAlphas = [0, 0.28, 0.45, 0.65, 0.85, 1.0];
    this.defRingInner.setAlpha(tierAlphas[tier] || 0);
    // Segundo anillo exterior al llegar a >= 31 DEF (Sección 10.5)
    this.defRingOuter.setAlpha(tier >= 5 ? 0.9 : 0);
  }

  /**
   * Aplica una de las 6 mejoras de subida de nivel (Sección 7.3 y 10.5)
   */
  applyUpgrade(upgradeId) {
    if (this.upgradeLevels[upgradeId] !== undefined) {
      this.upgradeLevels[upgradeId]++;
    }

    switch (upgradeId) {
      case 'MULTISHOT':
        this.fireLines = Math.min(PLAYER_CONFIG.MAX_FIRE_LINES, this.fireLines + 1);
        this.updateCannonPodVisuals();
        break;

      case 'TURBO_CADENCE':
        this.fireRateMultiplier = Number((this.fireRateMultiplier * 1.15).toFixed(4));
        break;

      case 'REACTIVE_ARMOR':
        this.addDefense(3);
        break;

      case 'FIREPOWER':
        this.firepowerMultiplier = Number(
          (this.firepowerMultiplier * (PLAYER_CONFIG.FIREPOWER_UPGRADE_MULT || 1.10)).toFixed(4)
        );
        break;

      case 'WINGMAN_DRONE':
        this.droneCount = Math.min(PLAYER_CONFIG.MAX_DRONES, this.droneCount + 1);
        this.updateDroneVisuals();
        break;

      case 'REPAIR_KIT':
        this.heal(35);
        break;
    }
  }

  updateCannonPodVisuals() {
    // Muestra pequeños rectángulos de cañón junto a las alas según las líneas de fuego
    const activePods = Math.max(0, this.fireLines - 1);
    for (let i = 0; i < this.cannonPods.length; i++) {
      this.cannonPods[i].setVisible(i < activePods);
    }
  }

  updateDroneVisuals() {
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].setVisible(i < this.droneCount);
    }
  }

  /**
   * Determina la textura de la bala del jugador según las mejoras de Potencia de Fuego (Sección 10.5)
   * De 4 a 6 y luego 8 px con el núcleo más blanco.
   */
  getBulletTextureKey() {
    const fpLevel = this.upgradeLevels.FIREPOWER || 0;
    if (fpLevel >= 2) return 'bullet_player_3';
    if (fpLevel === 1) return 'bullet_player_2';
    return 'bullet_player_1';
  }

  getBulletDamage() {
    return Number((PLAYER_CONFIG.BASE_BULLET_DAMAGE * this.firepowerMultiplier).toFixed(2));
  }

  getFireIntervalMs() {
    return Math.max(55, PLAYER_CONFIG.BASE_FIRE_INTERVAL_MS / this.fireRateMultiplier);
  }

  /**
   * Disparo automático de la nave (1 a 5 líneas de fuego)
   */
  fireWeapon() {
    if (!this.scene.spawnPlayerBullet) return;

    soundManager.playShoot();
    const tex = this.getBulletTextureKey();
    const dmg = this.getBulletDamage();
    const speed = PLAYER_CONFIG.BASE_BULLET_SPEED;

    // Configuraciones de disparo para 1..5 líneas (paralelas y angulares)
    const patterns = {
      1: [{ ox: 0, oy: -28, angleDeg: 0 }],
      2: [
        { ox: -10, oy: -22, angleDeg: 0 },
        { ox: 10, oy: -22, angleDeg: 0 }
      ],
      3: [
        { ox: 0, oy: -28, angleDeg: 0 },
        { ox: -13, oy: -20, angleDeg: -6 },
        { ox: 13, oy: -20, angleDeg: 6 }
      ],
      4: [
        { ox: -8, oy: -26, angleDeg: 0 },
        { ox: 8, oy: -26, angleDeg: 0 },
        { ox: -17, oy: -18, angleDeg: -9 },
        { ox: 17, oy: -18, angleDeg: 9 }
      ],
      5: [
        { ox: 0, oy: -28, angleDeg: 0 },
        { ox: -10, oy: -23, angleDeg: -6 },
        { ox: 10, oy: -23, angleDeg: 6 },
        { ox: -18, oy: -17, angleDeg: -13 },
        { ox: 18, oy: -17, angleDeg: 13 }
      ]
    };

    const lines = patterns[this.fireLines] || patterns[1];
    for (const line of lines) {
      const rad = Phaser.Math.DegToRad(-90 + line.angleDeg);
      const vx = Math.cos(rad) * speed;
      const vy = Math.sin(rad) * speed;
      this.scene.spawnPlayerBullet(
        this.x + line.ox,
        this.y + line.oy,
        vx,
        vy,
        dmg,
        tex,
        line.angleDeg
      );
    }
  }

  fireDrones() {
    if (this.droneCount <= 0 || !this.scene.spawnPlayerBullet) return;
    const droneDmg = Number(
      (this.getBulletDamage() * PLAYER_CONFIG.DRONE_BULLET_DAMAGE_RATIO).toFixed(2)
    );
    const speed = PLAYER_CONFIG.BASE_BULLET_SPEED;

    for (let i = 0; i < this.droneCount; i++) {
      const d = this.drones[i];
      if (d && d.visible) {
        this.scene.spawnPlayerBullet(d.x, d.y - 12, 0, -speed, droneDmg, 'bullet_drone', 0);
      }
    }
  }

  /**
   * Animación de muerte: gran explosión y la nave se parte en dos mitades que giran y se desvanecen (Sección 10.5)
   */
  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.cleanupKeyboardListeners();
    this.body.setVelocity(0, 0);
    this.setVisible(false);
    this.shadowSprite.setVisible(false);
    this.flameSprite.setVisible(false);
    this.defRingInner.setVisible(false);
    this.defRingOuter.setVisible(false);
    this.tonelAura.setVisible(false);
    this.cannonPods.forEach((p) => p.setVisible(false));
    this.drones.forEach((d) => d.setVisible(false));

    if (this.scene.fxManager) {
      this.scene.fxManager.setLowHpState(false);
      this.scene.fxManager.spawnExplosion(this.x, this.y, true);
    }

    const leftHalf = this.scene.add
      .image(this.x - 8, this.y, 'player_half_left')
      .setDepth(45);
    const rightHalf = this.scene.add
      .image(this.x + 8, this.y, 'player_half_right')
      .setDepth(45);

    this.scene.tweens.add({
      targets: leftHalf,
      x: this.x - 54,
      y: this.y + 32,
      angle: -140,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => leftHalf.destroy()
    });

    this.scene.tweens.add({
      targets: rightHalf,
      x: this.x + 54,
      y: this.y + 32,
      angle: 140,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => rightHalf.destroy()
    });

    if (this.scene.onPlayerDied) {
      this.scene.onPlayerDied();
    }
  }

  cleanupKeyboardListeners() {
    if (this.onWindowKeyDown) {
      window.removeEventListener('keydown', this.onWindowKeyDown);
      this.onWindowKeyDown = null;
    }
  }

  destroy(fromScene) {
    this.cleanupKeyboardListeners();
    super.destroy(fromScene);
  }

  update(time, delta) {
    if (this.isDead) return;

    const dtSeconds = delta / 1000;

    // 1. Habilidad Evasiva "Tonel" con Barra Espaciadora (polling adicional a eventos)
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space)
    ) {
      this.tryActivateTonel();
    }

    if (this.tonelCooldownTimer > 0) {
      this.tonelCooldownTimer = Math.max(0, this.tonelCooldownTimer - delta);
    }

    if (this.tonelActiveTimer > 0) {
      this.tonelActiveTimer = Math.max(0, this.tonelActiveTimer - delta);
      this.tonelGhostTimer += delta;
      if (this.tonelGhostTimer >= 60) {
        this.tonelGhostTimer = 0;
        this.spawnTonelGhost();
      }
      if (this.tonelActiveTimer === 0) {
        this.tonelAura.setAlpha(0);
        this.setScale(1, 1);
      }
    }

    // 2. Ventana de invulnerabilidad post-impacto (1.5 s común -> parpadeo cada 100 ms; 0.4 s jefe -> cada 60 ms)
    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - delta);
      this.blinkAccumulator += delta;
      const blinkInterval = this.invulnType === 'boss' ? 60 : 100;
      if (this.blinkAccumulator >= blinkInterval) {
        this.blinkAccumulator = 0;
        this.setAlpha(this.alpha < 0.6 ? 1.0 : 0.35);
      }
      if (this.invulnTimer === 0) {
        this.setAlpha(1.0);
        this.invulnType = 'none';
      }
    } else if (this.tonelActiveTimer <= 0 && this.alpha !== 1.0) {
      this.setAlpha(1.0);
    }

    // 3. Estado PEM (disparo deshabilitado por 1.5 s con chispas violetas sobre la nave)
    if (this.empDisabledTimer > 0) {
      this.empDisabledTimer = Math.max(0, this.empDisabledTimer - delta);
      this.empSparkTimer += delta;
      if (this.empSparkTimer >= 120) {
        this.empSparkTimer = 0;
        if (this.scene.fxManager) {
          this.scene.fxManager.spawnHitSparks(
            this.x + (Math.random() - 0.5) * 24,
            this.y + (Math.random() - 0.5) * 24,
            true
          );
        }
      }
    }

    // 4. Movimiento en 4 direcciones (WASD o Flechas) + atracción gravitatoria de Leviatán + rebote de Jefe
    let dirX = 0;
    let dirY = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dirX -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dirX += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dirY -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dirY += 1;

    if (dirX !== 0 && dirY !== 0) {
      const inv = 1 / Math.SQRT2;
      dirX *= inv;
      dirY *= inv;
    }

    let vx = dirX * PLAYER_CONFIG.SPEED;
    let vy = dirY * PLAYER_CONFIG.SPEED;

    // Control táctil / arrastre de puntero en celulares cuando no se pulsa teclado
    const pointer = this.scene.input.activePointer;
    if (dirX === 0 && dirY === 0 && this.isTouchDragging && pointer && pointer.isDown) {
      const targetX = Phaser.Math.Clamp(
        pointer.x + this.touchOffsetX,
        PLAYER_BOUNDS.MIN_X,
        PLAYER_BOUNDS.MAX_X
      );
      const targetY = Phaser.Math.Clamp(
        pointer.y + this.touchOffsetY,
        PLAYER_BOUNDS.MIN_Y,
        PLAYER_BOUNDS.MAX_Y
      );
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const maxTouchSpeed = PLAYER_CONFIG.SPEED * 1.35;
      vx = Phaser.Math.Clamp(dx * 14, -maxTouchSpeed, maxTouchSpeed);
      vy = Phaser.Math.Clamp(dy * 14, -maxTouchSpeed, maxTouchSpeed);
    } else if (!pointer || !pointer.isDown) {
      this.isTouchDragging = false;
    }

    // Atracción del Pozo Gravitatorio del Jefe 3 (Leviatán)
    if (this.scene.activeGravityPull) {
      const pull = this.scene.activeGravityPull;
      const gdx = pull.x - this.x;
      const gdy = pull.y - this.y;
      const dist = Math.max(10, Math.hypot(gdx, gdy));
      vx += (gdx / dist) * pull.force;
      vy += (gdy / dist) * pull.force;
    }

    // Si acaba de chocar contra el cuerpo de un Jefe, aplicar velocidad de rebote físico (Sección 4.3)
    if (this.knockbackTimer > 0) {
      this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);
      vx = this.knockbackVx;
      vy = this.knockbackVy;
    }

    this.body.setVelocity(vx, vy);

    // Aplicar desplazamiento y restringir estrictamente al 40% inferior (y >= 432 px hasta y <= 700 px)
    const nextX = Phaser.Math.Clamp(
      this.x + vx * dtSeconds,
      PLAYER_BOUNDS.MIN_X,
      PLAYER_BOUNDS.MAX_X
    );
    const nextY = Phaser.Math.Clamp(
      this.y + vy * dtSeconds,
      PLAYER_BOUNDS.MIN_Y,
      PLAYER_BOUNDS.MAX_Y
    );
    this.setPosition(nextX, nextY);

    // Si toca los bordes lógicos, anular la velocidad en ese eje para que Arcade Physics no lo desplace fuera
    if (
      (nextX <= PLAYER_BOUNDS.MIN_X && vx < 0) ||
      (nextX >= PLAYER_BOUNDS.MAX_X && vx > 0)
    ) {
      this.body.setVelocityX(0);
    }
    if (
      (nextY <= PLAYER_BOUNDS.MIN_Y && vy < 0) ||
      (nextY >= PLAYER_BOUNDS.MAX_Y && vy > 0)
    ) {
      this.body.setVelocityY(0);
    }

    // 5. Actualizar elementos visuales acoplados
    this.shadowSprite.setPosition(this.x + 8, this.y + 10);
    this.flameSprite.setPosition(this.x, this.y + 27);
    this.defRingInner.setPosition(this.x, this.y);
    this.defRingOuter.setPosition(this.x, this.y);
    this.tonelAura.setPosition(this.x, this.y);

    // Oscilación de la llama del motor cada 120 ms (y alargamiento por Cadencia Turbo - Sección 10.5)
    this.flameTimer += delta;
    if (this.flameTimer >= 120) {
      this.flameTimer = 0;
      this.flameHigh = !this.flameHigh;
      const turboBonus = (this.upgradeLevels.TURBO_CADENCE || 0) * 0.16;
      const baseScaleY = this.flameHigh ? 1.3 : 0.8;
      this.flameSprite.setScale(1.0, baseScaleY + turboBonus);
    }

    // Posición de cañones extra en las alas
    for (const pod of this.cannonPods) {
      if (pod.visible) {
        pod.setPosition(this.x + pod.offsetX * this.scaleX, this.y + pod.offsetY);
      }
    }

    // Vaivén suave de los Drones Satélite a ±36 px (Sección 10.5)
    const bobOffset = Math.sin(time * 0.006) * 4;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.visible) {
        d.setPosition(this.x + d.sideOffset, this.y + 6 + (i === 0 ? bobOffset : -bobOffset));
      }
    }

    // 6. Disparo automático continuo (mientras no esté desactivado por la PEM)
    if (this.empDisabledTimer <= 0) {
      this.fireCooldownTimer -= delta;
      if (this.fireCooldownTimer <= 0) {
        this.fireWeapon();
        this.fireCooldownTimer = this.getFireIntervalMs();
      }

      if (this.droneCount > 0) {
        this.droneFireTimer -= delta;
        if (this.droneFireTimer <= 0) {
          this.fireDrones();
          this.droneFireTimer = Math.max(
            140,
            PLAYER_CONFIG.DRONE_FIRE_INTERVAL_MS / this.fireRateMultiplier
          );
        }
      }
    }
  }
}

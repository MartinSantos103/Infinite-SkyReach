import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BOSS_STATS,
  getSectorMultipliers
} from '../config/constants.js';
import { PALETTE } from '../config/palette.js';
import { EnemyBase, LightFighter } from './EnemyBase.js';
import { soundManager } from '../systems/SoundManager.js';

/**
 * Misil Corrosivo Destructible disparado por el Jefe 1 (Valkiria).
 * Misil guiado lento (destructible) que, si impacta al jugador, inflige 18% de daño
 * y reduce -2 puntos de Defensa (Sección 6 y 10.7).
 */
export class CorrosiveMissile extends EnemyBase {
  constructor(scene, x, y, sector = 1) {
    super(
      scene,
      x,
      y,
      'missile_corrosive',
      'missile_corrosive_flash',
      {
        id: 'CORROSIVE_MISSILE',
        name: 'Misil Corrosivo',
        hp: BOSS_STATS.VALKIRIA.missileHp,
        collisionDamage: BOSS_STATS.VALKIRIA.missileDamage,
        bulletDamage: 0,
        score: 75,
        xp: 12
      },
      sector
    );

    this.defLossOnHit = BOSS_STATS.VALKIRIA.missileDefLoss; // -2 DEF
    const { bulletSpeed: speedMult } = getSectorMultipliers(sector);
    this.speed = BOSS_STATS.VALKIRIA.missileSpeed * speedMult;
    this.currentAngle = Math.PI / 2; // Hacia abajo (+Y)
    this.trailTimer = 0;
    this.lifetimeTimer = BOSS_STATS.VALKIRIA.missileLifetimeMs || 5000;

    this.body.setSize(10, 18);
    this.body.setOffset(1, 3);
  }

  updateBehavior(_time, delta) {
    this.lifetimeTimer -= delta;
    if (this.lifetimeTimer <= 0) {
      this.die(false);
      return;
    }

    // Guiado suave hacia la posición actual del jugador
    if (this.scene.player && !this.scene.player.isDead) {
      const targetAngle = Math.atan2(
        this.scene.player.y - this.y,
        this.scene.player.x - this.x
      );
      this.currentAngle = Phaser.Math.Angle.RotateTo(
        this.currentAngle,
        targetAngle,
        0.0012 * delta
      );
    }

    const vx = Math.cos(this.currentAngle) * this.speed;
    const vy = Math.sin(this.currentAngle) * this.speed;
    this.body.setVelocity(vx, vy);
    this.setAngle(Phaser.Math.RadToDeg(this.currentAngle) - 90);

    // Estela violeta clara (Sección 10.7)
    this.trailTimer += delta;
    if (this.trailTimer >= 70 && this.scene.fxManager) {
      this.trailTimer = 0;
      const trail = this.scene.add
        .image(this.x, this.y - 10, 'particle_violet')
        .setAlpha(0.7)
        .setDepth(28);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scale: 0.2,
        duration: 180,
        onComplete: () => trail.destroy()
      });
    }
  }
}

/**
 * Satélite Orbital Destructible de la Barrera de Drones del Jefe 3 (Leviatán).
 * Absorbe los disparos del jugador hasta ser eliminado (Sección 6 y 10.7).
 */
export class OrbitalDrone extends EnemyBase {
  constructor(scene, boss, orbitAngle, orbitRadius, sector = 1) {
    const startX = boss.x + Math.cos(orbitAngle) * orbitRadius;
    const startY = boss.y + Math.sin(orbitAngle) * orbitRadius;
    super(
      scene,
      startX,
      startY,
      'boss_leviatan_drone',
      'boss_leviatan_drone_flash',
      {
        id: 'ORBITAL_DRONE',
        name: 'Dron Orbital',
        hp: BOSS_STATS.LEVIATAN.droneHp,
        collisionDamage: 10,
        bulletDamage: 0,
        score: 120,
        xp: 18
      },
      sector
    );

    this.boss = boss;
    this.orbitAngle = orbitAngle;
    this.orbitRadius = orbitRadius;
    this.defLossOnHit = 1;
    this.body.setCircle(13, 3, 3);
    this.setDepth(34);
  }

  updateBehavior(_time, delta) {
    if (!this.boss || !this.boss.active || this.boss.isDead) {
      this.die(false);
      return;
    }

    this.orbitAngle += 0.0022 * delta;
    const nx = this.boss.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    const ny = this.boss.y + Math.sin(this.orbitAngle) * this.orbitRadius;
    this.setPosition(nx, ny);
    this.body.reset(nx, ny);
    this.angle += 0.15 * delta;
  }
}

/**
 * Clase padre de los 3 Jefes de Sector (Valkiria, Espectro, Leviatán).
 * Gestiona la entrada cinemática, colisiones físicas múltiples con rebote y pérdida de DEF,
 * barra de vida en el HUD y secuencia de muerte con 6 explosiones encadenadas.
 */
export class BossBase extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, flashKey, stats, sector = 1) {
    super(scene, x, y, textureKey);

    this.scene = scene;
    this.normalTexture = textureKey;
    this.flashTexture = flashKey;
    this.bossId = stats.id;
    this.bossName = stats.name;
    this.stats = stats;
    this.sector = sector;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const mults = getSectorMultipliers(sector);
    const rawHp = stats.hp || stats.coreHp + (stats.cannonHp || 0) * 2;
    this.maxHp = Math.round(rawHp * mults.hp);
    this.hp = this.maxHp;

    this.collisionDamage = stats.collisionDamage || 14;
    this.collisionDefLoss = stats.collisionDefLoss || 1;
    this.scoreValue = stats.score || 3000;
    this.xpValue = stats.xp || 200;

    this.isEntering = true;
    this.isDead = false;
    this.flashTimer = 0;
    this.ageMs = 0;
    this.entryTargetY = 128;

    const hbW = Math.round(stats.width * 0.72);
    const hbH = Math.round(stats.height * 0.68);
    this.body.setSize(hbW, hbH);
    this.body.setOffset((stats.width - hbW) / 2, (stats.height - hbH) / 2);
    this.body.setImmovable(true);

    this.setDepth(32);

    // Descenso suave desde la parte superior (Sección 10.7)
    this.scene.tweens.add({
      targets: this,
      y: this.entryTargetY,
      duration: 1800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.active && !this.isDead) {
          this.isEntering = false;
          this.onEntranceComplete();
        }
      }
    });
  }

  onEntranceComplete() {
    // Sobrescrito por cada jefe si es necesario
  }

  getHpRatio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  takeDamage(amount, hitX = this.x, hitY = this.y) {
    if (this.isDead || !this.active) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.setTexture(this.flashTexture);
    this.flashTimer = 60;

    if (this.scene.fxManager) {
      this.scene.fxManager.spawnHitSparks(hitX, hitY, false);
    }

    this.onDamaged(amount);

    if (this.hp <= 0) {
      this.triggerDeath();
      return true;
    }
    return false;
  }

  onDamaged(_amount) {
    // Sobrescrito por subclases (ej. Valkiria para sincronizar cañones laterales)
  }

  triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.cleanupActiveHazards();

    if (this.scene.fxManager) {
      this.scene.fxManager.playBossDeathSequence(
        this.x,
        this.y,
        this.stats.width,
        this.stats.height,
        () => {
          const sceneRef = this.scene;
          this.cleanupAttachments();
          this.setVisible(false);
          if (sceneRef && sceneRef.onBossDefeated) {
            sceneRef.onBossDefeated(this);
          }
          this.destroy();
        }
      );
    } else {
      const sceneRef = this.scene;
      this.cleanupAttachments();
      if (sceneRef && sceneRef.onBossDefeated) {
        sceneRef.onBossDefeated(this);
      }
      this.destroy();
    }
  }

  cleanupActiveHazards() {
    // Limpia efectos activos como el Pozo Gravitatorio o el rayo PEM al morir
  }

  cleanupAttachments() {
    // Limpia piezas secundarias
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.isDead || !this.active) return;

    this.ageMs += delta;

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setTexture(this.normalTexture);
      }
    }

    if (!this.isEntering) {
      this.updateBossBehavior(time, delta);
    } else {
      this.updateAttachments(time, delta);
    }
  }

  updateAttachments(_time, _delta) {}
  updateBossBehavior(_time, _delta) {}
}

/**
 * JEFE 1: Acorazado Aéreo "Valkiria" (5.000 m, 20.000 m...)
 * - Patrullaje horizontal lento en el tercio superior con breves avances hacia el centro.
 * - Posee 2 cañones laterales independientes y 1 núcleo central. Destruir los cañones laterales
 *   reduce su volumen de fuego a la mitad.
 * - Misiles Corrosivos: guiados lentos destructibles (18% daño y -2 DEF).
 * - Despliegue de Escolta: invoca parejas de Cazas Ligeros cada 8 s tras abrir su compuerta con destello amarillo.
 */
export class ValkiriaBoss extends BossBase {
  constructor(scene, sector = 1) {
    super(
      scene,
      GAME_WIDTH / 2,
      -90,
      'boss_valkiria_hull',
      'boss_valkiria_hull_flash',
      BOSS_STATS.VALKIRIA,
      sector
    );

    const mults = getSectorMultipliers(sector);
    const cannonMaxHp = Math.round(BOSS_STATS.VALKIRIA.cannonHp * mults.hp);

    // Núcleo central rojo que pulsa
    this.coreSprite = scene.add
      .image(this.x, this.y + 4, 'boss_valkiria_core')
      .setDepth(33);
    this.coreTween = scene.tweens.add({
      targets: this.coreSprite,
      scale: 1.16,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Compuerta inferior con destello amarillo antes de invocar escolta
    this.hatchGlow = scene.add
      .image(this.x, this.y + 26, 'boss_valkiria_hatch_glow')
      .setDepth(33)
      .setAlpha(0);

    // Dos cañones laterales como módulos independientes
    this.leftCannon = this.createCannonModule(-72, 18, cannonMaxHp);
    this.rightCannon = this.createCannonModule(72, 18, cannonMaxHp);

    this.patrolDir = 1;
    this.advanceTimer = 4500;
    this.isAdvancing = false;

    this.cannonFireTimer = 1100;
    this.missileTimer = 2600;
    this.escortTimer = BOSS_STATS.VALKIRIA.escortIntervalMs;
    this.smokeTimer = 0;
  }

  createCannonModule(offsetX, offsetY, maxHp) {
    const sprite = this.scene.physics.add
      .sprite(this.x + offsetX, this.y + offsetY, 'boss_valkiria_cannon')
      .setDepth(33);
    sprite.body.setSize(34, 42);
    sprite.body.setImmovable(true);
    sprite.offsetX = offsetX;
    sprite.offsetY = offsetY;
    sprite.hp = maxHp;
    sprite.maxHp = maxHp;
    sprite.destroyedState = false;
    sprite.flashTimer = 0;
    sprite.parentBoss = this;

    sprite.damagePart = (dmg, hx, hy) => {
      if (this.isDead || sprite.destroyedState) {
        this.takeDamage(dmg, hx, hy);
        return;
      }
      sprite.hp = Math.max(0, sprite.hp - dmg);
      sprite.setTexture('boss_valkiria_cannon_flash');
      sprite.flashTimer = 60;
      this.takeDamage(dmg, hx, hy);
      if (sprite.hp <= 0 && !sprite.destroyedState) {
        this.destroyCannonModule(sprite);
      }
    };

    if (this.scene.bossParts) {
      this.scene.bossParts.add(sprite);
    }
    return sprite;
  }

  destroyCannonModule(cannon) {
    if (cannon.destroyedState) return;
    cannon.destroyedState = true;
    cannon.flashTimer = 0;
    cannon.setTexture('boss_valkiria_cannon_dead');
    if (this.scene.fxManager) {
      this.scene.fxManager.spawnExplosion(cannon.x, cannon.y, true);
    }
  }

  onDamaged(_amount) {
    // Si la vida total del jefe cruza los umbrales de la barra (66% y 33%), asegurar caída de cañones
    const ratio = this.getHpRatio();
    if (ratio <= 0.66 && !this.leftCannon.destroyedState) {
      this.destroyCannonModule(this.leftCannon);
    }
    if (ratio <= 0.33 && !this.rightCannon.destroyedState) {
      this.destroyCannonModule(this.rightCannon);
    }
  }

  getActiveCannonCount() {
    let count = 0;
    if (this.leftCannon && !this.leftCannon.destroyedState) count++;
    if (this.rightCannon && !this.rightCannon.destroyedState) count++;
    return count;
  }

  updateAttachments(_time, delta) {
    if (this.coreSprite) {
      this.coreSprite.setPosition(this.x, this.y + 4);
    }
    if (this.hatchGlow) {
      this.hatchGlow.setPosition(this.x, this.y + 26);
    }

    for (const c of [this.leftCannon, this.rightCannon]) {
      if (!c || !c.active) continue;
      c.setPosition(this.x + c.offsetX, this.y + c.offsetY);
      c.body.reset(this.x + c.offsetX, this.y + c.offsetY);

      if (c.flashTimer > 0 && !c.destroyedState) {
        c.flashTimer -= delta;
        if (c.flashTimer <= 0) {
          c.setTexture('boss_valkiria_cannon');
        }
      }
    }

    // Humo y chispas en cañones destruidos (Sección 10.7)
    this.smokeTimer += delta;
    if (this.smokeTimer >= 180 && this.scene.fxManager) {
      this.smokeTimer = 0;
      for (const c of [this.leftCannon, this.rightCannon]) {
        if (c && c.destroyedState) {
          this.scene.fxManager.spawnSmokePuff(c.x, c.y);
        }
      }
    }
  }

  updateBossBehavior(time, delta) {
    // 1. Patrullaje horizontal lento con breves avances hacia el centro/jugador
    const speedX = 72;
    if (!this.isAdvancing) {
      this.body.setVelocityX(this.patrolDir * speedX);
      if (this.x > GAME_WIDTH - 125 && this.patrolDir > 0) this.patrolDir = -1;
      if (this.x < 125 && this.patrolDir < 0) this.patrolDir = 1;

      this.advanceTimer -= delta;
      if (this.advanceTimer <= 0) {
        this.isAdvancing = true;
        this.advanceTimer = 5500;
        this.scene.tweens.add({
          targets: this,
          y: 415, // Avanza hacia el centro/borde del jugador para amenazar colisión física
          duration: 1200,
          yoyo: true,
          hold: 450,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.isAdvancing = false;
          }
        });
      }
    }

    this.updateAttachments(time, delta);

    // 2. Fuego de cañones (se reduce a la mitad al destruir los dos cañones laterales)
    this.cannonFireTimer -= delta;
    if (this.cannonFireTimer <= 0) {
      this.fireCannons();
      this.cannonFireTimer = 1250;
    }

    // 3. Misiles Corrosivos guiados destructibles (-2 DEF y 18% daño)
    this.missileTimer -= delta;
    if (this.missileTimer <= 0) {
      this.fireCorrosiveMissiles();
      this.missileTimer = 3400;
    }

    // 4. Despliegue de Escolta (pareja de Cazas Ligeros cada 8 segundos)
    this.escortTimer -= delta;
    if (this.escortTimer <= 0) {
      this.deployEscort();
      this.escortTimer = BOSS_STATS.VALKIRIA.escortIntervalMs;
    }
  }

  fireCannons() {
    if (!this.scene.spawnEnemyBullet) return;
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = 195 * speedMult;
    const dmg = BOSS_STATS.VALKIRIA.bulletDamage;

    // Núcleo central siempre dispara 2 proyectiles (50% del volumen total de 4)
    const coreAngles = [80, 100];
    for (const deg of coreAngles) {
      const rad = Phaser.Math.DegToRad(deg);
      this.scene.spawnEnemyBullet(
        this.x,
        this.y + 28,
        Math.cos(rad) * speed,
        Math.sin(rad) * speed,
        dmg,
        'bullet_enemy_std'
      );
    }

    // Cada cañón lateral activo aporta su ráfaga (el otro 50% del volumen de fuego)
    if (this.leftCannon && !this.leftCannon.destroyedState) {
      this.scene.spawnEnemyBullet(
        this.leftCannon.x,
        this.leftCannon.y + 22,
        -25,
        speed,
        dmg,
        'bullet_enemy_std'
      );
    }
    if (this.rightCannon && !this.rightCannon.destroyedState) {
      this.scene.spawnEnemyBullet(
        this.rightCannon.x,
        this.rightCannon.y + 22,
        25,
        speed,
        dmg,
        'bullet_enemy_std'
      );
    }
  }

  fireCorrosiveMissiles() {
    if (!this.scene.enemies) return;
    const mLeft = new CorrosiveMissile(this.scene, this.x - 38, this.y + 30, this.sector);
    const mRight = new CorrosiveMissile(this.scene, this.x + 38, this.y + 30, this.sector);
    this.scene.enemies.add(mLeft);
    this.scene.enemies.add(mRight);
  }

  deployEscort() {
    if (!this.scene.enemies) return;
    // Compuerta inferior se abre con un destello amarillo antes de invocar la escolta (Sección 10.7)
    this.hatchGlow.setAlpha(1);
    this.scene.tweens.add({
      targets: this.hatchGlow,
      alpha: 0,
      duration: 550,
      onComplete: () => {
        if (this.isDead || !this.active || !this.scene.enemies) return;
        const f1 = new LightFighter(this.scene, this.x - 50, this.y + 32, this.sector);
        const f2 = new LightFighter(this.scene, this.x + 50, this.y + 32, this.sector);
        this.scene.enemies.add(f1);
        this.scene.enemies.add(f2);
      }
    });
  }

  cleanupAttachments() {
    if (this.coreTween) this.coreTween.stop();
    if (this.coreSprite) this.coreSprite.destroy();
    if (this.hatchGlow) this.hatchGlow.destroy();
    if (this.leftCannon) this.leftCannon.destroy();
    if (this.rightCannon) this.rightCannon.destroy();
  }
}

/**
 * JEFE 2: Crucero Fantasma "Espectro" (10.000 m, 25.000 m...)
 * - Se teletransporta (blink) entre 3 posiciones superiores y realiza embestidas verticales
 *   agresivas hasta el borde inferior para forzar múltiples choques físicos contra el jugador.
 * - Onda PEM Rompe-Escudos: Carga un rayo frontal telegrafiado (1 s de aviso visual magenta).
 *   Si golpea al jugador, elimina el 30% de sus puntos de Defensa actuales y deshabilita el disparo 1.5 s.
 * - Espiral Sónica: Ráfaga rotatoria de proyectiles en 360°.
 */
export class EspectroBoss extends BossBase {
  constructor(scene, sector = 1) {
    super(
      scene,
      GAME_WIDTH / 2,
      -90,
      'boss_espectro',
      'boss_espectro_flash',
      BOSS_STATS.ESPECTRO,
      sector
    );

    this.setAlpha(0.85);
    this.blinkPositions = [105, 240, 375];
    this.currentPosIndex = 1;

    this.state = 'IDLE'; // 'IDLE' | 'BLINKING' | 'LUNGING' | 'EMP_CHARGE' | 'EMP_FIRE'
    this.actionTimer = 1800;
    this.spiralTimer = 1600;
    this.spiralAngle = 0;
    this.ghostTrailTimer = 0;

    this.empTimer = 0;
    this.empHitApplied = false;
    this.empGraphics = scene.add.graphics().setDepth(35);
  }

  updateBossBehavior(_time, delta) {
    this.empGraphics.clear();

    // 1. Espiral Sónica rotatoria 360°
    if (this.state === 'IDLE') {
      this.spiralTimer -= delta;
      if (this.spiralTimer <= 0) {
        this.fireSonicSpiral();
        this.spiralTimer = 1350;
      }

      this.actionTimer -= delta;
      if (this.actionTimer <= 0) {
        this.chooseNextAction();
      }
    } else if (this.state === 'LUNGING') {
      // En las embestidas deja copias fantasma (Sección 10.7)
      this.ghostTrailTimer += delta;
      if (this.ghostTrailTimer >= 70) {
        this.ghostTrailTimer = 0;
        const ghost = this.scene.add
          .image(this.x, this.y, 'boss_espectro')
          .setAlpha(0.32)
          .setDepth(30);
        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 240,
          onComplete: () => ghost.destroy()
        });
      }
    } else if (this.state === 'EMP_CHARGE') {
      this.empTimer -= delta;
      // Línea magenta #FF4DA6 que parpadea 1 s como aviso visual (Sección 6 y 10.7)
      const blinkOn = Math.floor(this.empTimer / 90) % 2 === 0;
      this.empGraphics.lineStyle(blinkOn ? 4 : 2, PALETTE.EMP_MAGENTA, blinkOn ? 0.95 : 0.45);
      this.empGraphics.lineBetween(this.x, this.y + 42, this.x, GAME_HEIGHT);

      if (this.empTimer <= 0) {
        this.state = 'EMP_FIRE';
        this.empTimer = 550;
        this.empHitApplied = false;
        soundManager.playEmpWave();
      }
    } else if (this.state === 'EMP_FIRE') {
      this.empTimer -= delta;
      // Rayo blanco con un halo violeta de 60 px de ancho (Sección 10.7)
      this.empGraphics.fillStyle(PALETTE.DEF_VIOLET, 0.55);
      this.empGraphics.fillRect(this.x - 30, this.y + 42, 60, GAME_HEIGHT - this.y);
      this.empGraphics.fillStyle(PALETTE.WHITE, 0.95);
      this.empGraphics.fillRect(this.x - 14, this.y + 42, 28, GAME_HEIGHT - this.y);

      // Comprobar impacto con el jugador
      if (
        !this.empHitApplied &&
        this.scene.player &&
        !this.scene.player.isDead &&
        Math.abs(this.scene.player.x - this.x) <= 38 &&
        this.scene.player.y >= this.y
      ) {
        this.empHitApplied = true;
        this.scene.player.takeHit(BOSS_STATS.ESPECTRO.empDamage, {
          defLossRatio: BOSS_STATS.ESPECTRO.empDefLossRatio, // Elimina 30% de DEF actual
          disableFireMs: BOSS_STATS.ESPECTRO.empDisableMs  // Desactiva disparo 1.5 s
        });
      }

      if (this.empTimer <= 0) {
        this.empGraphics.clear();
        this.state = 'IDLE';
        this.actionTimer = 1600;
      }
    }
  }

  chooseNextAction() {
    const roll = Math.random();
    if (roll < 0.38) {
      this.performBlink();
    } else if (roll < 0.72) {
      this.performVerticalLunge();
    } else {
      this.startEmpCharge();
    }
  }

  performBlink() {
    this.state = 'BLINKING';
    const nextIdx = (this.currentPosIndex + 1 + Math.floor(Math.random() * 2)) % this.blinkPositions.length;
    this.currentPosIndex = nextIdx;

    // Si hay jugador, a veces se teletransporta sobre la columna del jugador
    const targetX =
      Math.random() < 0.5 && this.scene.player
        ? Phaser.Math.Clamp(this.scene.player.x, 95, GAME_WIDTH - 95)
        : this.blinkPositions[nextIdx];

    // Se desvanece con un destello y reaparece con un anillo expansivo (Sección 10.7)
    this.setTexture('boss_espectro_flash');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      duration: 220,
      onComplete: () => {
        if (this.isDead || !this.active) return;
        this.setTexture('boss_espectro');
        this.setPosition(targetX, this.entryTargetY);
        this.body.reset(targetX, this.entryTargetY);

        const ring = this.scene.add
          .image(targetX, this.entryTargetY, 'fx_ring_violet')
          .setScale(0.4)
          .setDepth(34);
        this.scene.tweens.add({
          targets: ring,
          scale: 1.9,
          alpha: 0,
          duration: 360,
          onComplete: () => ring.destroy()
        });

        this.scene.tweens.add({
          targets: this,
          alpha: 0.85,
          scaleX: 1,
          duration: 220,
          onComplete: () => {
            this.state = 'IDLE';
            this.actionTimer = 1100;
          }
        });
      }
    });
  }

  performVerticalLunge() {
    // Embestida vertical agresiva hasta el borde inferior (y = 660) para forzar múltiples choques
    this.state = 'LUNGING';
    this.scene.tweens.add({
      targets: this,
      y: GAME_HEIGHT - 60,
      duration: 780,
      ease: 'Cubic.easeIn',
      yoyo: true,
      hold: 180,
      onUpdate: () => {
        if (this.body) {
          this.body.reset(this.x, this.y);
        }
      },
      onComplete: () => {
        if (this.active && !this.isDead) {
          this.state = 'IDLE';
          this.actionTimer = 1400;
        }
      }
    });
  }

  startEmpCharge() {
    this.state = 'EMP_CHARGE';
    this.empTimer = BOSS_STATS.ESPECTRO.empTelegraphMs; // 1 s de aviso visual
  }

  fireSonicSpiral() {
    if (!this.scene.spawnEnemyBullet) return;
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = BOSS_STATS.ESPECTRO.spiralBulletSpeed * speedMult;
    const count = 10;
    this.spiralAngle += 0.35;

    for (let i = 0; i < count; i++) {
      const angle = this.spiralAngle + (Math.PI * 2 * i) / count;
      this.scene.spawnEnemyBullet(
        this.x,
        this.y + 12,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        BOSS_STATS.ESPECTRO.spiralDamage,
        'bullet_sonic_ring'
      );
    }
  }

  cleanupActiveHazards() {
    if (this.empGraphics) {
      this.empGraphics.clear();
    }
  }

  cleanupAttachments() {
    if (this.empGraphics) {
      this.empGraphics.destroy();
      this.empGraphics = null;
    }
  }
}

/**
 * JEFE 3: Fortaleza Orbital "Leviatán" (15.000 m, 30.000 m...)
 * - Se posiciona en el centro-superior y despliega un anillo blindado rotatorio.
 * - Pozo Gravitatorio: Activa un vórtice durante 4 segundos que atrae gradualmente la nave
 *   del jugador hacia el cuerpo del jefe, buscando provocar colisiones físicas repetidas
 *   (cada roce quita 10% de vida y -1 punto de Defensa).
 * - Lluvia ácida de plasma: Patrón Bullet Hell cruzado cuyos proyectiles morados restan -1 DEF al impactar.
 * - Barrera de Drones: Genera 4 satélites orbitales destructibles que absorben los disparos del jugador.
 */
export class LeviatanBoss extends BossBase {
  constructor(scene, sector = 1) {
    super(
      scene,
      GAME_WIDTH / 2,
      -110,
      'boss_leviatan_body',
      'boss_leviatan_body_flash',
      BOSS_STATS.LEVIATAN,
      sector
    );

    this.entryTargetY = 165;

    // Anillo exterior de 8 placas que rota (#4A4E69)
    this.ringSprite = scene.add
      .image(this.x, this.y, 'boss_leviatan_ring')
      .setDepth(31);

    // Gráficos para los círculos concéntricos violetas del Pozo Gravitatorio
    this.gravityGraphics = scene.add.graphics().setDepth(26);
    this.gravityTimer = 0;
    this.gravityCooldown = 4800;
    this.gravityPhase = 0;
    this.gravityParticleTimer = 0;

    this.acidTimer = 1350;
    this.acidPatternStep = 0;

    this.orbitalDrones = [];
    this.droneRespawnTimer = 9500;
  }

  onEntranceComplete() {
    this.spawnDroneBarrier();
  }

  spawnDroneBarrier() {
    if (!this.scene.enemies || this.isDead) return;
    // Limpiar drones previos si quedara alguno
    this.orbitalDrones = this.orbitalDrones.filter((d) => d && d.active && !d.isDead);
    if (this.orbitalDrones.length > 0) return;

    const count = BOSS_STATS.LEVIATAN.droneCount; // 4 satélites orbitales destructibles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const drone = new OrbitalDrone(this.scene, this, angle, 118, this.sector);
      this.scene.enemies.add(drone);
      this.orbitalDrones.push(drone);
    }
  }

  updateAttachments(_time, delta) {
    if (this.ringSprite) {
      this.ringSprite.setPosition(this.x, this.y);
      this.ringSprite.angle += 0.045 * delta;
    }
  }

  updateBossBehavior(time, delta) {
    this.updateAttachments(time, delta);
    this.gravityGraphics.clear();

    // Movimiento orbital suave o acercamiento al borde del jugador durante el Pozo Gravitatorio
    const targetX = GAME_WIDTH / 2 + Math.sin(this.ageMs * 0.0012) * 75;
    const targetY = this.gravityTimer > 0 ? 355 : this.entryTargetY;
    this.x += (targetX - this.x) * Math.min(1, delta * 0.004);
    this.y += (targetY - this.y) * Math.min(1, delta * 0.0035);
    this.body.reset(this.x, this.y);

    // 1. Pozo Gravitatorio (4 segundos activos)
    if (this.gravityTimer > 0) {
      this.gravityTimer -= delta;
      this.gravityPhase += delta * 0.006;

      // Activar fuerza de atracción sobre el jugador hacia el cuerpo del jefe
      this.scene.activeGravityPull = {
        x: this.x,
        y: this.y,
        force: BOSS_STATS.LEVIATAN.gravityPullForce
      };

      // Círculos concéntricos violetas de #3C096C a #9D4EDD que se contraen hacia el jefe (Sección 10.7)
      for (let i = 0; i < 4; i++) {
        const progress = ((this.gravityPhase + i * 0.25) % 1);
        const radius = (1 - progress) * 210 + 35;
        const color = i % 2 === 0 ? PALETTE.DEF_VIOLET : PALETTE.DEF_DARK;
        this.gravityGraphics.lineStyle(2.5, color, progress * 0.75);
        this.gravityGraphics.strokeCircle(this.x, this.y, radius);
      }

      // Partículas absorbidas hacia el jefe
      this.gravityParticleTimer += delta;
      if (this.gravityParticleTimer >= 95) {
        this.gravityParticleTimer = 0;
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = 175 + Math.random() * 45;
        const p = this.scene.add
          .image(
            this.x + Math.cos(pAngle) * pDist,
            this.y + Math.sin(pAngle) * pDist,
            'particle_violet'
          )
          .setDepth(27);
        this.scene.tweens.add({
          targets: p,
          x: this.x,
          y: this.y,
          alpha: 0,
          duration: 380,
          onComplete: () => p.destroy()
        });
      }

      if (this.gravityTimer <= 0) {
        this.scene.activeGravityPull = null;
        this.gravityCooldown = 6200;
      }
    } else {
      this.gravityCooldown -= delta;
      if (this.gravityCooldown <= 0) {
        this.gravityTimer = BOSS_STATS.LEVIATAN.gravityDurationMs; // 4000 ms
      }
    }

    // 2. Lluvia ácida de plasma (Patrón Bullet Hell cruzado cuyos proyectiles morados restan -1 DEF)
    this.acidTimer -= delta;
    if (this.acidTimer <= 0) {
      this.fireAcidPlasmaCross();
      this.acidTimer = 1250;
    }

    // 3. Reponer Barrera de Drones si todos fueron destruidos
    this.orbitalDrones = this.orbitalDrones.filter((d) => d && d.active && !d.isDead);
    if (this.orbitalDrones.length === 0) {
      this.droneRespawnTimer -= delta;
      if (this.droneRespawnTimer <= 0) {
        this.spawnDroneBarrier();
        this.droneRespawnTimer = 10000;
      }
    }
  }

  fireAcidPlasmaCross() {
    if (!this.scene.spawnEnemyBullet) return;
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = BOSS_STATS.LEVIATAN.acidBulletSpeed * speedMult;
    const dmg = BOSS_STATS.LEVIATAN.acidDamage;
    this.acidPatternStep++;

    // Dos abanicos cruzados desde los flancos de la fortaleza
    const baseOffsets = [-55, 55];
    const angleSets =
      this.acidPatternStep % 2 === 0
        ? [68, 84, 100, 116]
        : [62, 78, 94, 110];

    for (let s = 0; s < baseOffsets.length; s++) {
      const startX = this.x + baseOffsets[s];
      for (const deg of angleSets) {
        const rad = Phaser.Math.DegToRad(deg);
        this.scene.spawnEnemyBullet(
          startX,
          this.y + 42,
          Math.cos(rad) * speed,
          Math.sin(rad) * speed,
          dmg,
          'bullet_acid_drop',
          BOSS_STATS.LEVIATAN.acidDefLoss // -1 DEF al impactar
        );
      }
    }
  }

  cleanupActiveHazards() {
    this.scene.activeGravityPull = null;
    if (this.gravityGraphics) {
      this.gravityGraphics.clear();
    }
    if (this.orbitalDrones) {
      this.orbitalDrones.forEach((d) => {
        if (d && d.active && !d.isDead) d.die(false);
      });
      this.orbitalDrones = [];
    }
  }

  cleanupAttachments() {
    this.cleanupActiveHazards();
    if (this.ringSprite) {
      this.ringSprite.destroy();
      this.ringSprite = null;
    }
    if (this.gravityGraphics) {
      this.gravityGraphics.destroy();
      this.gravityGraphics = null;
    }
  }
}

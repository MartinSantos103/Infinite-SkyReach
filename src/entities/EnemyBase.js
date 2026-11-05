import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ENEMY_STATS,
  COMBAT_LIMITS,
  getSectorMultipliers
} from '../config/constants.js';
import { PALETTE } from '../config/palette.js';

/**
 * Clase padre de todos los enemigos comunes y minas destructibles.
 * Gestiona puntos de vida escalados por Sector, destello blanco de impacto (60 ms),
 * columna de humo (<30% HP), colisión y recompensas de puntaje/XP.
 */
export class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, flashKey, stats, sector = 1) {
    super(scene, x, y, textureKey);

    this.scene = scene;
    this.normalTexture = textureKey;
    this.flashTexture = flashKey;
    this.archetypeId = stats.id;
    this.stats = stats;
    this.sector = sector;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const mults = getSectorMultipliers(sector);
    this.maxHp = Math.round(stats.hp * mults.hp);
    this.hp = this.maxHp;
    this.collisionDamage = stats.collisionDamage;
    this.bulletDamage = stats.bulletDamage || 0;
    this.scoreValue = stats.score || 100;
    this.xpValue = stats.xp || 20;
    this.isLargeExplosion = false;
    this.isDead = false;

    this.flashTimer = 0;
    this.smokeTimer = 0;
    this.ageMs = 0;

    // Hitbox al 65% del tamaño visual para lectura justa
    const hbW = Math.max(12, Math.round(this.width * 0.68));
    const hbH = Math.max(12, Math.round(this.height * 0.68));
    this.body.setSize(hbW, hbH);
    this.body.setOffset((this.width - hbW) / 2, (this.height - hbH) / 2);

    this.setDepth(30);
  }

  /**
   * Recibe daño de un proyectil del jugador o dron
   */
  takeDamage(amount, hitX = this.x, hitY = this.y) {
    if (this.isDead || !this.active) return false;

    this.hp -= amount;

    // Mostrar textura blanca durante 60 ms y 3 chispas (Sección 10.6 y 10.8)
    this.setTexture(this.flashTexture);
    this.flashTimer = 60;

    if (this.scene.fxManager) {
      this.scene.fxManager.spawnHitSparks(hitX, hitY, false);
    }

    if (this.hp <= 0) {
      this.die(true);
      return true;
    }
    return false;
  }

  /**
   * Destruye la entidad (por disparos del jugador o al chocar contra el jugador)
   * @param {boolean} killedByPlayer Si fue destruido por disparos del jugador (otorga XP/Score)
   */
  die(killedByPlayer = true) {
    if (this.isDead) return;
    this.isDead = true;

    if (this.scene.fxManager) {
      this.scene.fxManager.spawnExplosion(this.x, this.y, this.isLargeExplosion);
    }

    if (killedByPlayer && this.scene.onEnemyKilled) {
      this.scene.onEnemyKilled(this);
    }

    this.cleanupAttachments();
    this.destroy();
  }

  cleanupAttachments() {
    // Sobrescrito por subclases con elementos gráficos adicionales
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.isDead || !this.active) return;

    this.ageMs += delta;

    // Restaurar textura tras los 60 ms del destello blanco
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setTexture(this.normalTexture);
      }
    }

    // Humo al bajar de un 30% de vida (Sección 10.6)
    if (this.hp > 0 && this.hp / this.maxHp < COMBAT_LIMITS.SMOKE_HP_THRESHOLD) {
      this.smokeTimer += delta;
      if (this.smokeTimer >= 130) {
        this.smokeTimer = 0;
        if (this.scene.fxManager) {
          this.scene.fxManager.spawnSmokePuff(this.x, this.y);
        }
      }
    }

    this.updateBehavior(time, delta);

    // Limpiar si sale completamente de la pantalla
    if (this.y > GAME_HEIGHT + 90 || this.x < -100 || this.x > GAME_WIDTH + 100) {
      this.isDead = true;
      this.cleanupAttachments();
      this.destroy();
    }
  }

  updateBehavior(_time, _delta) {
    // Implementado por cada arquetipo
  }
}

/**
 * 1. Caza Ligero (Kamikaze)
 * Desciende a alta velocidad en línea recta o diagonal hacia la posición inicial del jugador.
 * No dispara. Vida baja (20 HP), Daño por choque (12%).
 * Si está dentro del aura de una Corbeta Porta-Minas, acelera un +20% y muestra un pequeño aro ámbar.
 */
export class LightFighter extends EnemyBase {
  constructor(scene, x, y, sector = 1, targetX = null, targetY = null) {
    super(
      scene,
      x,
      y,
      'enemy_light',
      'enemy_light_flash',
      ENEMY_STATS.LIGHT_FIGHTER,
      sector
    );

    const tx = targetX !== null ? targetX : (scene.player ? scene.player.x : x);
    const ty = targetY !== null ? targetY : (scene.player ? scene.player.y : GAME_HEIGHT);

    // Limitar ángulo diagonal para que siempre descienda con claridad
    const dx = Phaser.Math.Clamp(tx - x, -190, 190);
    const dy = Math.max(240, ty - y);
    const len = Math.hypot(dx, dy);

    this.dirX = dx / len;
    this.dirY = dy / len;
    this.baseSpeed = ENEMY_STATS.LIGHT_FIGHTER.speed;
    this.isBoosted = false;
    this.trailTimer = 0;

    // Gira para apuntar hacia su dirección de avance (la textura apunta hacia +Y = 90°)
    const moveAngleDeg = Phaser.Math.RadToDeg(Math.atan2(this.dirY, this.dirX));
    this.setAngle(moveAngleDeg - 90);

    // Pequeño aro ámbar visible cuando es acelerado +20% por una Corbeta (Sección 10.6)
    this.boostRing = scene.add
      .image(x, y, 'fx_ring_amber_small')
      .setDepth(29)
      .setVisible(false);

    this.applyCurrentVelocity();
  }

  applyCurrentVelocity() {
    const mult = this.isBoosted ? ENEMY_STATS.MINE_CORVETTE.auraSpeedBoost : 1.0;
    const speed = this.baseSpeed * mult;
    this.body.setVelocity(this.dirX * speed, this.dirY * speed);
  }

  updateBehavior(_time, delta) {
    // Verificar si hay alguna Corbeta Porta-Minas cercana que lo acelere un +20%
    let nearCorvette = false;
    if (this.scene.enemies) {
      const children = this.scene.enemies.getChildren();
      for (let i = 0; i < children.length; i++) {
        const e = children[i];
        if (e.active && !e.isDead && e.archetypeId === 'MINE_CORVETTE') {
          const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
          if (d <= ENEMY_STATS.MINE_CORVETTE.auraRadius) {
            nearCorvette = true;
            break;
          }
        }
      }
    }

    if (nearCorvette !== this.isBoosted) {
      this.isBoosted = nearCorvette;
      this.applyCurrentVelocity();
    }

    if (this.boostRing) {
      this.boostRing.setVisible(this.isBoosted);
      this.boostRing.setPosition(this.x, this.y);
    }

    // Estela roja corta (Sección 10.6)
    this.trailTimer += delta;
    if (this.trailTimer >= 65) {
      this.trailTimer = 0;
      if (this.scene.fxManager) {
        this.scene.fxManager.spawnRedTrail(
          this.x - this.dirX * 14,
          this.y - this.dirY * 14
        );
      }
    }
  }

  cleanupAttachments() {
    if (this.boostRing) {
      this.boostRing.destroy();
      this.boostRing = null;
    }
  }
}

/**
 * 2. Caza Táctico (Escuadrón Zigzag)
 * Entra en formaciones de 3 a 5 naves describiendo ondas senoidales.
 * Dispara proyectiles simples hacia la última coordenada del jugador.
 * Vida media (45 HP), Daño de proyectil (10%).
 */
export class TacticalFighter extends EnemyBase {
  constructor(scene, x, y, sector = 1, phaseOffset = 0) {
    super(
      scene,
      x,
      y,
      'enemy_tactical',
      'enemy_tactical_flash',
      ENEMY_STATS.TACTICAL_FIGHTER,
      sector
    );

    this.baseX = Phaser.Math.Clamp(x, 56, GAME_WIDTH - 56);
    this.phaseOffset = phaseOffset;
    this.amplitude = 46;
    this.frequency = 0.0042;
    this.fireTimer = 700 + Math.random() * 600;

    this.body.setVelocityY(ENEMY_STATS.TACTICAL_FIGHTER.speed);
  }

  updateBehavior(_time, delta) {
    const waveArg = this.ageMs * this.frequency + this.phaseOffset;
    const targetX = this.baseX + Math.sin(waveArg) * this.amplitude;
    const vx = (targetX - this.x) * 8;
    this.body.setVelocityX(vx);

    // Se inclina unos 15 grados siguiendo su onda senoidal (Sección 10.6)
    const tilt = Math.cos(waveArg) * 15;
    this.setAngle(-tilt);

    this.fireTimer -= delta;
    if (this.fireTimer <= 0 && this.y > 20 && this.y < GAME_HEIGHT - 160) {
      this.fireAtPlayer();
      this.fireTimer = ENEMY_STATS.TACTICAL_FIGHTER.fireIntervalMs;
    }
  }

  fireAtPlayer() {
    if (!this.scene.spawnEnemyBullet || !this.scene.player) return;
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    const angle = Math.atan2(py - this.y, px - this.x);
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = ENEMY_STATS.TACTICAL_FIGHTER.bulletSpeed * speedMult;

    this.scene.spawnEnemyBullet(
      this.x,
      this.y + 16,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      this.bulletDamage,
      'bullet_enemy_std'
    );
  }
}

/**
 * 3. Bombardero Pesado (Tanque)
 * Avanza lentamente desde el borde superior. Dispara ráfagas en abanico de 5 proyectiles lentos.
 * Vida alta (180 HP), Daño de proyectil (15%).
 * Cada motor tiene un halo circular semitransparente que gira y los cañones se encienden 0.3 s antes.
 */
export class HeavyBomber extends EnemyBase {
  constructor(scene, x, y, sector = 1) {
    super(
      scene,
      x,
      y,
      'enemy_bomber',
      'enemy_bomber_flash',
      ENEMY_STATS.HEAVY_BOMBER,
      sector
    );

    this.isLargeExplosion = true;
    this.body.setVelocityY(ENEMY_STATS.HEAVY_BOMBER.speed);

    this.fireTimer = 1500;
    this.isTelegraphing = false;
    this.telegraphTimer = 0;

    // 4 halos circulares rotatorios en los motores (Sección 10.6)
    this.rotors = [];
    const rotorOffsets = [
      { x: -25, y: 10 },
      { x: -13, y: 10 },
      { x: 13, y: 10 },
      { x: 25, y: 10 }
    ];
    for (const ro of rotorOffsets) {
      const r = scene.add
        .image(this.x + ro.x, this.y + ro.y, 'bomber_rotor')
        .setDepth(31);
      r.ox = ro.x;
      r.oy = ro.y;
      this.rotors.push(r);
    }

    // 2 luces de aviso en los cañones (0.3 s antes de cada ráfaga)
    this.cannonGlows = [
      scene.add.image(this.x - 19, this.y + 16, 'bomber_cannon_glow').setDepth(32).setVisible(false),
      scene.add.image(this.x + 19, this.y + 16, 'bomber_cannon_glow').setDepth(32).setVisible(false)
    ];
  }

  updateBehavior(_time, delta) {
    // Actualizar posición y giro de hélices
    for (const r of this.rotors) {
      r.setPosition(this.x + r.ox, this.y + r.oy);
      r.angle += 0.45 * delta;
    }

    this.cannonGlows[0].setPosition(this.x - 19, this.y + 16);
    this.cannonGlows[1].setPosition(this.x + 19, this.y + 16);

    if (!this.isTelegraphing) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0 && this.y > 30 && this.y < GAME_HEIGHT - 180) {
        // Encender cañones 0.3 s antes de disparar (Sección 10.6)
        this.isTelegraphing = true;
        this.telegraphTimer = ENEMY_STATS.HEAVY_BOMBER.telegraphMs;
        this.cannonGlows[0].setVisible(true);
        this.cannonGlows[1].setVisible(true);
      }
    } else {
      this.telegraphTimer -= delta;
      if (this.telegraphTimer <= 0) {
        this.isTelegraphing = false;
        this.cannonGlows[0].setVisible(false);
        this.cannonGlows[1].setVisible(false);
        this.fireFanBurst();
        this.fireTimer = ENEMY_STATS.HEAVY_BOMBER.fireIntervalMs;
      }
    }
  }

  fireFanBurst() {
    if (!this.scene.spawnEnemyBullet) return;
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = ENEMY_STATS.HEAVY_BOMBER.bulletSpeed * speedMult;

    // Abanico de 5 proyectiles lentos (Sección 5.3 y 10.8)
    const anglesDeg = [62, 76, 90, 104, 118];
    for (const deg of anglesDeg) {
      const rad = Phaser.Math.DegToRad(deg);
      this.scene.spawnEnemyBullet(
        this.x,
        this.y + 24,
        Math.cos(rad) * speed,
        Math.sin(rad) * speed,
        this.bulletDamage,
        'bullet_enemy_fan'
      );
    }
  }

  cleanupAttachments() {
    if (this.rotors) {
      this.rotors.forEach((r) => r.destroy());
      this.rotors = [];
    }
    if (this.cannonGlows) {
      this.cannonGlows.forEach((g) => g.destroy());
      this.cannonGlows = [];
    }
  }
}

/**
 * 4. Interceptor Furtivo (Variante de Caza Ligero)
 * Aparece semi-transparente (alpha: 0.35), se frena en la mitad superior durante 0.8 s
 * apuntando con una línea guía láser roja (alpha sube a 0.9) y ejecuta una embestida
 * ultrarrápida (dash) hacia abajo mientras dispara una ráfaga doble.
 * Vida baja-media (35 HP), Daño de proyectil (14%), Daño de embestida (18%).
 */
export class StealthInterceptor extends EnemyBase {
  constructor(scene, x, y, sector = 1) {
    super(
      scene,
      x,
      y,
      'enemy_stealth',
      'enemy_stealth_flash',
      ENEMY_STATS.STEALTH_INTERCEPTOR,
      sector
    );

    this.setAlpha(ENEMY_STATS.STEALTH_INTERCEPTOR.stealthAlpha);
    this.state = 'APPROACH'; // 'APPROACH' -> 'BRAKE_AIM' -> 'DASH'
    this.brakeY = 120 + Math.random() * 95;
    this.brakeTimer = ENEMY_STATS.STEALTH_INTERCEPTOR.brakeDurationMs;
    this.dashDirX = 0;
    this.dashDirY = 1;
    this.speedLineTimer = 0;

    this.laserGraphics = scene.add.graphics().setDepth(27);
    this.body.setVelocityY(ENEMY_STATS.STEALTH_INTERCEPTOR.speed);
  }

  updateBehavior(_time, delta) {
    this.laserGraphics.clear();

    if (this.state === 'APPROACH') {
      if (this.y >= this.brakeY) {
        this.state = 'BRAKE_AIM';
        this.body.setVelocity(0, 0);
        this.setAlpha(ENEMY_STATS.STEALTH_INTERCEPTOR.activeAlpha);
      }
    } else if (this.state === 'BRAKE_AIM') {
      this.brakeTimer -= delta;

      // Apuntar al jugador con una línea guía láser roja fina durante 0.8 s (Sección 5.4 y 10.6)
      const px = this.scene.player ? this.scene.player.x : this.x;
      const py = this.scene.player ? this.scene.player.y : GAME_HEIGHT;
      const dx = Phaser.Math.Clamp(px - this.x, -210, 210);
      const dy = Math.max(180, py - this.y);
      const len = Math.hypot(dx, dy);
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;

      const aimAngleDeg = Phaser.Math.RadToDeg(Math.atan2(this.dashDirY, this.dashDirX));
      this.setAngle(aimAngleDeg - 90);

      this.laserGraphics.lineStyle(1.5, PALETTE.ALERT_RED, 0.85);
      this.laserGraphics.lineBetween(
        this.x,
        this.y + 12,
        this.x + this.dashDirX * 650,
        this.y + this.dashDirY * 650
      );

      if (this.brakeTimer <= 0) {
        this.state = 'DASH';
        this.laserGraphics.clear();
        const dashSpeed = ENEMY_STATS.STEALTH_INTERCEPTOR.dashSpeed;
        this.body.setVelocity(this.dashDirX * dashSpeed, this.dashDirY * dashSpeed);
        this.fireDoubleBurst();
      }
    } else if (this.state === 'DASH') {
      // Al embestir deja líneas de velocidad (Sección 10.6)
      this.speedLineTimer += delta;
      if (this.speedLineTimer >= 55) {
        this.speedLineTimer = 0;
        if (this.scene.fxManager) {
          this.scene.fxManager.spawnSpeedLine(this.x, this.y);
        }
      }
    }
  }

  fireDoubleBurst() {
    if (!this.scene.spawnEnemyBullet) return;
    const { bulletSpeed: speedMult } = getSectorMultipliers(this.sector);
    const speed = ENEMY_STATS.STEALTH_INTERCEPTOR.bulletSpeed * speedMult;
    const vx = this.dashDirX * speed;
    const vy = this.dashDirY * speed;

    this.scene.spawnEnemyBullet(
      this.x - 7,
      this.y + 14,
      vx,
      vy,
      this.bulletDamage,
      'bullet_enemy_std'
    );
    this.scene.spawnEnemyBullet(
      this.x + 7,
      this.y + 14,
      vx,
      vy,
      this.bulletDamage,
      'bullet_enemy_std'
    );
  }

  cleanupAttachments() {
    if (this.laserGraphics) {
      this.laserGraphics.destroy();
      this.laserGraphics = null;
    }
  }
}

/**
 * Mina Magnética Destructible desplegada por la Corbeta Porta-Minas.
 * Flota hacia abajo y se desvía ligeramente hacia el jugador.
 * Estadísticas base: 15 HP, 20% daño (Sección 5.5 y 10.6).
 */
export class MagneticMine extends EnemyBase {
  constructor(scene, x, y, sector = 1) {
    super(
      scene,
      x,
      y,
      'mine_magnetic',
      'mine_magnetic_flash',
      {
        id: 'MAGNETIC_MINE',
        name: 'Mina Magnética',
        hp: ENEMY_STATS.MINE_CORVETTE.mineHp,
        collisionDamage: ENEMY_STATS.MINE_CORVETTE.mineDamage,
        bulletDamage: 0,
        score: ENEMY_STATS.MINE_CORVETTE.mineScore,
        xp: ENEMY_STATS.MINE_CORVETTE.mineXp
      },
      sector
    );

    this.blinkTimer = 0;
    this.blinkState = false;
    this.body.setCircle(8, 5, 5);
    this.body.setVelocityY(ENEMY_STATS.MINE_CORVETTE.mineSpeed);
  }

  updateBehavior(_time, delta) {
    this.angle += 0.08 * delta;

    // Desviación magnética suave hacia la coordenada X del jugador
    if (this.scene.player && !this.scene.player.isDead) {
      const dx = this.scene.player.x - this.x;
      const pullVx = Phaser.Math.Clamp(dx * 0.65, -ENEMY_STATS.MINE_CORVETTE.minePullSpeed, ENEMY_STATS.MINE_CORVETTE.minePullSpeed);
      this.body.setVelocityX(pullVx);
    }

    // Luz roja central que parpadea (mientras no esté en flash blanco de impacto)
    if (this.flashTimer <= 0) {
      this.blinkTimer += delta;
      if (this.blinkTimer >= 260) {
        this.blinkTimer = 0;
        this.blinkState = !this.blinkState;
        this.setTexture(this.blinkState ? 'mine_magnetic_blink' : 'mine_magnetic');
        this.normalTexture = this.blinkState ? 'mine_magnetic_blink' : 'mine_magnetic';
      }
    }
  }
}

/**
 * 5. Corbeta Porta-Minas (Variante de Bombardero de Apoyo)
 * Se desplaza en diagonal lenta. Despliega minas magnéticas destructibles (15 HP, 20% daño)
 * y emite un aura ámbar (#F4A261, opacidad 0.18) que acelera un +20% a los Cazas Ligeros cercanos.
 * Nave: 140 HP.
 */
export class MineLayerCorvette extends EnemyBase {
  constructor(scene, x, y, sector = 1) {
    super(
      scene,
      x,
      y,
      'enemy_corvette',
      'enemy_corvette_flash',
      ENEMY_STATS.MINE_CORVETTE,
      sector
    );

    this.isLargeExplosion = true;
    const dirX = x < GAME_WIDTH / 2 ? 1 : -1;
    this.vx = dirX * 48;
    this.vy = ENEMY_STATS.MINE_CORVETTE.speed;
    this.body.setVelocity(this.vx, this.vy);

    this.mineTimer = 1100;

    // Aura ámbar #F4A261 de opacidad 0.18 que pulsa (Sección 10.6)
    this.auraSprite = scene.add
      .image(x, y, 'fx_aura_corvette')
      .setDepth(26)
      .setAlpha(0.75);

    this.auraTween = scene.tweens.add({
      targets: this.auraSprite,
      scale: 1.12,
      alpha: 1.0,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  updateBehavior(_time, delta) {
    if (this.auraSprite) {
      this.auraSprite.setPosition(this.x, this.y);
    }

    // Rebote horizontal suave dentro del lienzo para mantener su diagonal
    if (this.x < 55 && this.body.velocity.x < 0) {
      this.body.setVelocityX(Math.abs(this.vx));
    } else if (this.x > GAME_WIDTH - 55 && this.body.velocity.x > 0) {
      this.body.setVelocityX(-Math.abs(this.vx));
    }

    this.mineTimer -= delta;
    if (this.mineTimer <= 0 && this.y > 30 && this.y < GAME_HEIGHT - 190) {
      this.deployMagneticMine();
      this.mineTimer = ENEMY_STATS.MINE_CORVETTE.mineDropIntervalMs;
    }
  }

  deployMagneticMine() {
    if (!this.scene.enemies) return;
    const mine = new MagneticMine(this.scene, this.x, this.y + 24, this.sector);
    this.scene.enemies.add(mine);
  }

  cleanupAttachments() {
    if (this.auraTween) {
      this.auraTween.stop();
      this.auraTween = null;
    }
    if (this.auraSprite) {
      this.auraSprite.destroy();
      this.auraSprite = null;
    }
  }
}

import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COMBAT_LIMITS,
  PROGRESSION,
  UPGRADES
} from '../config/constants.js';
import { BackgroundManager } from '../systems/BackgroundManager.js';
import { FxManager } from '../systems/FxManager.js';
import { WaveManager } from '../systems/WaveManager.js';
import { MissionManager } from '../systems/MissionManager.js';
import { Player } from '../entities/Player.js';
import { soundManager } from '../systems/SoundManager.js';

/**
 * Escena Principal de Juego ("GameScene")
 * Coordina el bucle principal, Object Pooling de proyectiles, los 5 arquetipos de enemigos,
 * los 3 Jefes de Sector, colisiones físicas con Defensa logarítmica, misiones y mejoras.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Exponer referencia para inspección y pruebas E2E
    window.__GAME_SCENE__ = this;

    this.score = 0;
    this.isGameOver = false;
    this.isModalOpen = false;
    this.activeBoss = null;
    this.activeGravityPull = null;

    // 1. Gestores de Fondo y Efectos Visuales
    this.backgroundManager = new BackgroundManager(this);
    this.fxManager = new FxManager(this);

    // 2. Grupos de físicas y Object Pooling de proyectiles (Sección 2 y 10.8)
    this.playerBullets = this.physics.add.group({
      maxSize: COMBAT_LIMITS.MAX_PLAYER_BULLETS,
      runChildUpdate: false
    });

    this.enemyBullets = this.physics.add.group({
      maxSize: COMBAT_LIMITS.MAX_ENEMY_BULLETS, // Tope de 250 balas enemigas simultáneas
      runChildUpdate: false
    });

    this.enemies = this.physics.add.group({
      runChildUpdate: false
    });
    this.enemies.defaults = {};

    this.bossParts = this.physics.add.group({
      runChildUpdate: false
    });
    this.bossParts.defaults = {};

    this.bossGroup = this.physics.add.group({
      runChildUpdate: false
    });
    this.bossGroup.defaults = {};

    this.events.on('boss-spawned', (boss) => {
      if (this.bossGroup && boss) {
        this.bossGroup.add(boss);
      }
    });

    // 3. Instanciar Jugador en el 40% inferior
    this.player = new Player(this, GAME_WIDTH / 2, 610);

    // 4. Sistemas de Oleadas y Misiones con Recompensa Alternada
    this.missionManager = new MissionManager(this);
    this.waveManager = new WaveManager(this);

    // Mostrar cartel inicial "SECTOR 1" durante 2 segundos (Sección 10.4)
    this.backgroundManager.setSector(1, true);
    soundManager.setBossMode(false);

    // 5. Configurar colisiones de Arcade Physics
    this.setupCollisions();

    // 6. Teclas de Pausa (P y ESC - Sección 8.1 y 8.2)
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.pauseKeyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  setupCollisions() {
    // Proyectiles del jugador contra el cuerpo principal del Jefe de Sector
    this.physics.add.overlap(
      this.playerBullets,
      this.bossGroup,
      (bullet, boss) => {
        if (!bullet.active || !boss.active || boss.isDead) return;
        const dmg = bullet.damage || 16;
        const bx = bullet.x;
        const by = bullet.y;
        this.deactivateBullet(bullet);
        boss.takeDamage(dmg, bx, by);
      },
      null,
      this
    );

    // A. Proyectiles del jugador contra enemigos comunes, minas, misiles corrosivos y drones orbitales
    this.physics.add.overlap(
      this.playerBullets,
      this.enemies,
      (bullet, enemy) => {
        if (!bullet.active || !enemy.active || enemy.isDead) return;
        const dmg = bullet.damage || 16;
        const bx = bullet.x;
        const by = bullet.y;
        this.deactivateBullet(bullet);
        enemy.takeDamage(dmg, bx, by);
      },
      null,
      this
    );

    // B. Proyectiles del jugador contra módulos de Jefe (ej. cañones laterales de Valkiria)
    this.physics.add.overlap(
      this.playerBullets,
      this.bossParts,
      (bullet, part) => {
        if (!bullet.active || !part.active || part.destroyedState) return;
        const dmg = bullet.damage || 16;
        const bx = bullet.x;
        const by = bullet.y;
        this.deactivateBullet(bullet);
        if (part.damagePart) {
          part.damagePart(dmg, bx, by);
        }
      },
      null,
      this
    );

    // C. Proyectiles enemigos contra el jugador
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      (player, bullet) => {
        if (!bullet.active || player.isDead) return;
        if (player.isInvulnerable()) return;

        const dmg = bullet.damage || 10;
        const defLoss = bullet.defLoss || 0;
        const isBoss = Boolean(bullet.isBoss);
        this.deactivateBullet(bullet);
        player.takeHit(dmg, {
          isBossCollision: false,
          isBoss,
          defLoss
        });
      },
      null,
      this
    );

    // D. Colisión física del jugador contra enemigos comunes, minas, misiles corrosivos o drones
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (player, enemy) => {
        if (!enemy.active || enemy.isDead || player.isDead) return;
        if (player.isInvulnerable()) return;

        // Sección 4.3: El enemigo menor explota al instante; el jugador recibe daño de impacto
        // (mitigado por su DEF) y obtiene 1.5 s de invulnerabilidad post-impacto.
        const dmg = enemy.collisionDamage || 12;
        const defLoss = enemy.defLossOnHit || 0;
        const isBoss = Boolean(
          enemy.archetypeId === 'CORROSIVE_MISSILE' ||
          enemy.archetypeId === 'ORBITAL_DRONE' ||
          enemy.isBoss
        );
        enemy.die(false);
        player.takeHit(dmg, {
          isBossCollision: false,
          isBoss,
          defLoss
        });
      },
      null,
      this
    );
  }

  /**
   * Object Pooling para proyectiles del jugador y drones
   */
  spawnPlayerBullet(x, y, vx, vy, damage, textureKey = 'bullet_player_1', angleDeg = 0) {
    let b = this.playerBullets.getFirstDead(false);
    if (!b) {
      if (this.playerBullets.getLength() >= COMBAT_LIMITS.MAX_PLAYER_BULLETS) {
        return null;
      }
      b = this.physics.add.sprite(x, y, textureKey);
      this.playerBullets.add(b);
    } else {
      b.setTexture(textureKey);
      b.setPosition(x, y);
      b.setActive(true);
      b.setVisible(true);
      b.body.enable = true;
    }

    b.damage = damage;
    b.setAngle(angleDeg);
    b.setDepth(44);

    // Hitbox al 60% del tamaño visual (Sección 10.8)
    const hbW = Math.max(2, Math.round(b.width * COMBAT_LIMITS.BULLET_HITBOX_RATIO));
    const hbH = Math.max(4, Math.round(b.height * COMBAT_LIMITS.BULLET_HITBOX_RATIO));
    b.body.setSize(hbW, hbH);
    b.body.setOffset((b.width - hbW) / 2, (b.height - hbH) / 2);
    b.body.reset(x, y);
    b.body.setVelocity(vx, vy);
    return b;
  }

  /**
   * Object Pooling para proyectiles enemigos (con tope de 250 simultáneos - Sección 10.8)
   */
  spawnEnemyBullet(x, y, vx, vy, damage, textureKey = 'bullet_enemy_std', defLoss = 0, isBoss = false) {
    // Respetar tope de 250 balas enemigas activas simultáneas
    if (this.enemyBullets.countActive(true) >= COMBAT_LIMITS.MAX_ENEMY_BULLETS) {
      return null;
    }

    let b = this.enemyBullets.getFirstDead(false);
    if (!b) {
      b = this.physics.add.sprite(x, y, textureKey);
      this.enemyBullets.add(b);
    } else {
      b.setTexture(textureKey);
      b.setPosition(x, y);
      b.setActive(true);
      b.setVisible(true);
      b.body.enable = true;
    }

    b.damage = damage;
    b.defLoss = defLoss;
    b.isBoss = Boolean(isBoss);
    // Las balas enemigas se dibujan por encima de las naves y efectos, y solo debajo del HUD (Sección 10.8)
    b.setDepth(65);

    // Hitbox al 60% del tamaño visual
    const hbW = Math.max(4, Math.round(b.width * COMBAT_LIMITS.BULLET_HITBOX_RATIO));
    const hbH = Math.max(4, Math.round(b.height * COMBAT_LIMITS.BULLET_HITBOX_RATIO));
    b.body.setSize(hbW, hbH);
    b.body.setOffset((b.width - hbW) / 2, (b.height - hbH) / 2);
    b.body.reset(x, y);
    b.body.setVelocity(vx, vy);
    return b;
  }

  deactivateBullet(bullet) {
    if (!bullet) return;
    bullet.body.setVelocity(0, 0);
    bullet.body.enable = false;
    bullet.setActive(false);
    bullet.setVisible(false);
  }

  cleanupOffscreenBullets(group) {
    const children = group.getChildren();
    for (let i = 0; i < children.length; i++) {
      const b = children[i];
      if (!b.active) continue;
      if (
        b.y < -40 ||
        b.y > GAME_HEIGHT + 40 ||
        b.x < -40 ||
        b.x > GAME_WIDTH + 40
      ) {
        this.deactivateBullet(b);
      }
    }
  }

  /**
   * Limpia todas las balas enemigas activas (por ejemplo, al derrotar a un jefe)
   */
  clearAllEnemyBullets() {
    const children = this.enemyBullets.getChildren();
    for (let i = 0; i < children.length; i++) {
      if (children[i].active) {
        this.deactivateBullet(children[i]);
      }
    }
  }

  /**
   * Llamado cuando un enemigo común o amenaza destructible es eliminado por el jugador
   */
  onEnemyKilled(enemy) {
    if (this.isGameOver) return;
    this.score += enemy.scoreValue || 100;
    this.addPlayerXp(enemy.xpValue || 20);
    if (this.missionManager) {
      this.missionManager.onEnemyKilled(enemy);
    }
  }

  /**
   * Llamado cuando el Jefe de Sector activo es derrotado
   */
  onBossDefeated(boss) {
    if (this.isGameOver) return;
    this.score += boss.scoreValue || 3000;
    this.clearAllEnemyBullets();

    // Destruir con explosiones las escoltas y amenazas menores activas en pantalla
    if (this.enemies) {
      const remainingEnemies = this.enemies.getChildren().slice();
      for (let i = 0; i < remainingEnemies.length; i++) {
        const e = remainingEnemies[i];
        if (e && e.active && !e.isDead) {
          e.die(false);
        }
      }
    }

    this.activeBoss = null;
    this.activeGravityPull = null;
    if (this.bossGroup) {
      this.bossGroup.clear();
    }
    soundManager.setBossMode(false);

    // Primero actualizar progresión de Sector y Etapa en WaveManager
    this.waveManager.onBossDefeated();

    if (this.missionManager) {
      this.missionManager.onEnemyKilled({ archetypeId: boss.bossId, isBoss: true });
    }

    this.events.emit('boss-defeated', boss);
    this.addPlayerXp(boss.xpValue || 200);
  }

  /**
   * Suma experiencia al jugador y dispara el modal de Subida de Nivel si llena la barra (Sección 7.3)
   */
  addPlayerXp(amount, fromMission = false) {
    if (this.isGameOver || !this.player || this.player.isDead) return;

    this.player.xp += amount;
    if (fromMission && this.fxManager) {
      this.fxManager.spawnFloatingText(this.player.x, this.player.y - 28, '+50% XP', '#FFD166');
    }

    // Si un jefe está en plena animación de muerte (1.2 s), esperar a que termine antes de pausar con el modal
    if (this.activeBoss && this.activeBoss.isDead) {
      return;
    }

    if (this.player.xp >= this.player.xpRequired && !this.isModalOpen) {
      this.player.xp -= this.player.xpRequired;
      this.player.level++;
      this.player.xpRequired = Math.round(
        this.player.xpRequired * PROGRESSION.XP_GROWTH_FACTOR
      );
      this.triggerLevelUpModal();
    }
  }

  /**
   * Selecciona 3 tarjetas aleatorias de mejora y pausa la escena (Sección 7.3)
   */
  triggerLevelUpModal() {
    if (this.isGameOver || this.isModalOpen) return;
    this.isModalOpen = true;
    soundManager.playLevelUp();

    // Filtrar mejoras que aún no alcanzaron su tope (ej. máx 5 líneas de fuego o máx 2 drones)
    const available = UPGRADES.filter((u) => {
      const currentLvl = this.player.upgradeLevels[u.id] || 0;
      return currentLvl < u.maxLevel;
    });

    // Mezclar aleatoriamente y tomar 3 opciones
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    this.events.emit('open-upgrade-modal', choices);
    this.scene.pause('GameScene');
  }

  /**
   * Aplica la mejora elegida desde UIScene y reanuda la partida
   */
  selectUpgrade(upgradeId) {
    if (!this.player) return;
    this.player.applyUpgrade(upgradeId);
    this.isModalOpen = false;
    this.scene.resume('GameScene');

    // Si aún tenía XP acumulada suficiente para otro nivel, abrir el siguiente tras un breve instante
    if (this.player.xp >= this.player.xpRequired) {
      this.time.delayedCall(120, () => {
        this.addPlayerXp(0);
      });
    }
  }

  /**
   * Abre el modal de Pausa (Sección 8.2)
   */
  requestPause() {
    if (this.isGameOver || this.isModalOpen) return;
    this.isModalOpen = true;
    this.events.emit('open-pause-modal');
    this.scene.pause('GameScene');
  }

  resumeFromPause() {
    if (!this.isModalOpen) return;
    this.isModalOpen = false;
    this.scene.resume('GameScene');
  }

  onPlayerDied() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.activeGravityPull = null;
    soundManager.setBossMode(false);

    // Esperar a que termine la animación de muerte de la nave (950 ms) antes de abrir GameOverScene
    this.time.delayedCall(950, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score: Math.floor(this.score),
        distance: Math.floor(this.waveManager.distance),
        sector: this.waveManager.sector,
        level: this.player.level
      });
    });
  }

  update(time, delta) {
    if (this.isGameOver) return;

    // Comprobar teclas P o ESC para pausar
    if (
      Phaser.Input.Keyboard.JustDown(this.pauseKeyP) ||
      Phaser.Input.Keyboard.JustDown(this.pauseKeyEsc)
    ) {
      this.requestPause();
      return;
    }

    const dtSeconds = delta / 1000;

    // 1. Actualizar fondo multicapa
    this.backgroundManager.update(dtSeconds, delta);

    // 2. Actualizar jugador
    this.player.update(time, delta);

    // 3. Actualizar sistema de oleadas y distancia
    this.waveManager.update(dtSeconds, delta);

    // 4. Comprobar colisiones con el Jefe activo (choque físico múltiple)
    if (this.activeBoss && this.activeBoss.active && !this.activeBoss.isDead) {
      soundManager.setBossMode(true);
      if (this.bossGroup && !this.bossGroup.contains(this.activeBoss)) {
        this.bossGroup.add(this.activeBoss);
      }

      // Sección 4.3: Colisión física del jugador contra el cuerpo del Jefe:
      // Los jefes no mueren al chocar. El jugador sufre un rebote físico, recibe daño porcentual,
      // pierde -1 punto de Defensa y solo recibe una micro-invulnerabilidad de 0.4 s.
      if (!this.player.isDead && !this.player.isInvulnerable()) {
        this.physics.overlap(
          this.player,
          this.activeBoss,
          () => {
            if (!this.activeBoss || this.activeBoss.isDead) return;
            this.player.takeHit(this.activeBoss.collisionDamage, {
              isBossCollision: true,
              isBoss: true,
              defLoss: this.activeBoss.collisionDefLoss, // -1 DEF
              knockbackFromX: this.activeBoss.x,
              knockbackFromY: this.activeBoss.y
            });
          },
          null,
          this
        );
      }
    }

    // 5. Limpiar proyectiles fuera de pantalla
    this.cleanupOffscreenBullets(this.playerBullets);
    this.cleanupOffscreenBullets(this.enemyBullets);
  }
}

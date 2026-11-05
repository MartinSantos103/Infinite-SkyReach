import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { PALETTE, HEX } from '../config/palette.js';
import { soundManager } from './SoundManager.js';

/**
 * Gestor de efectos visuales de combate:
 * Explosiones por niveles, chispas de impacto, humo de daño (<30% HP),
 * destellos de pantalla (daño, curación, muerte de jefe), textos flotantes,
 * alerta de jefe y viñeta roja de vida baja (<25% HP).
 * Cumple con el Principio 5 (sin shaders, tintes ni FX incompatibles).
 */
export class FxManager {
  constructor(scene) {
    this.scene = scene;

    // Capa de destello de pantalla (rojo para daño, verde para curación, blanco para muerte de jefe)
    this.screenFlash = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.ALERT_RED, 0)
      .setOrigin(0, 0)
      .setDepth(85);

    // Viñeta roja en los bordes para vida menor al 25% (Sección 10.8)
    this.lowHpVignette = this.createVignetteGraphics();
    this.lowHpActive = false;
    this.lowHpTween = null;

    // Bandas y borde de alerta de entrada de Jefe (Sección 10.7)
    this.bossAlertContainer = this.createBossAlertGraphics();
  }

  createVignetteGraphics() {
    const g = this.scene.add.graphics().setDepth(84).setAlpha(0);
    const borderThickness = 22;
    g.fillStyle(PALETTE.ALERT_RED, 0.55);
    g.fillRect(0, 0, GAME_WIDTH, borderThickness);
    g.fillRect(0, GAME_HEIGHT - borderThickness, GAME_WIDTH, borderThickness);
    g.fillRect(0, borderThickness, borderThickness, GAME_HEIGHT - borderThickness * 2);
    g.fillRect(
      GAME_WIDTH - borderThickness,
      borderThickness,
      borderThickness,
      GAME_HEIGHT - borderThickness * 2
    );
    g.lineStyle(4, PALETTE.ALERT_RED, 1);
    g.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
    return g;
  }

  createBossAlertGraphics() {
    const container = this.scene.add.container(0, 0).setDepth(86).setAlpha(0);

    const topBand = this.scene.add
      .rectangle(0, 74, GAME_WIDTH, 34, PALETTE.ALERT_RED, 0.45)
      .setOrigin(0, 0);
    const bottomBand = this.scene.add
      .rectangle(0, GAME_HEIGHT - 108, GAME_WIDTH, 34, PALETTE.ALERT_RED, 0.45)
      .setOrigin(0, 0);

    const border = this.scene.add.graphics();
    border.lineStyle(4, PALETTE.ALERT_RED, 0.85);
    border.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);

    const alertText = this.scene.add
      .text(GAME_WIDTH / 2, 91, '¡ALERTA DE JEFE!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: HEX.WHITE,
        stroke: HEX.ALERT_RED,
        strokeThickness: 3
      })
      .setOrigin(0.5);

    container.add([topBand, bottomBand, border, alertText]);
    return container;
  }

  /**
   * Tres chispas rápidas cuando un disparo impacta a un enemigo o jefe (Sección 10.8)
   */
  spawnHitSparks(x, y, isViolet = false) {
    soundManager.playHit();
    const tex = isViolet ? 'particle_violet' : 'particle_yellow';
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 14;
      const spark = this.scene.add
        .image(x, y, tex)
        .setScale(0.75)
        .setDepth(55);

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 130,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  /**
   * Explosión pequeña (8 partículas, para cazas, interceptores, minas y misiles)
   * o grande (20 partículas + anillo blanco expansivo + sacudida leve, para bombarderos y corbetas).
   * Las partículas van de amarillo #FFD60A -> naranja #FF6B35 -> marrón #7A1F00 (Sección 10.6 y 10.8).
   */
  spawnExplosion(x, y, isLarge = false) {
    soundManager.playExplosion(isLarge);
    const count = isLarge ? 20 : 8;

    if (isLarge) {
      const ring = this.scene.add
        .image(x, y, 'fx_ring_white')
        .setScale(0.25)
        .setAlpha(0.95)
        .setDepth(54);

      this.scene.tweens.add({
        targets: ring,
        scale: 1.55,
        alpha: 0,
        duration: 340,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      this.scene.cameras.main.shake(110, 0.006);
    }

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (isLarge ? 28 : 16) + Math.random() * (isLarge ? 48 : 26);
      const duration = (isLarge ? 320 : 220) + Math.random() * 140;

      const p = this.scene.add
        .image(x, y, 'particle_yellow')
        .setScale(isLarge ? 1.25 : 0.95)
        .setDepth(55);

      // Cambio progresivo de textura: amarillo -> naranja -> marrón
      this.scene.time.delayedCall(duration * 0.32, () => {
        if (p && p.active) p.setTexture('particle_orange');
      });
      this.scene.time.delayedCall(duration * 0.65, () => {
        if (p && p.active) p.setTexture('particle_brown');
      });

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.25,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  /**
   * Muerte espectacular de un jefe:
   * 6 explosiones encadenadas dentro de su área durante 1.2 s y un destello blanco
   * de pantalla que va de opacidad 0.7 a 0 en 400 ms (Sección 10.7).
   */
  playBossDeathSequence(x, y, width, height, onComplete) {
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const ox = x + (Math.random() - 0.5) * (width * 0.7);
        const oy = y + (Math.random() - 0.5) * (height * 0.7);
        this.spawnExplosion(ox, oy, true);
      });
    }

    this.scene.time.delayedCall(1200, () => {
      this.triggerScreenFlash(PALETTE.WHITE, 0.7, 400);
      this.spawnExplosion(x, y, true);
      if (onComplete) onComplete();
    });
  }

  /**
   * Columna fina de partículas grises cuando un enemigo baja del 30% de vida (Sección 10.6)
   */
  spawnSmokePuff(x, y) {
    const puff = this.scene.add
      .image(x + (Math.random() - 0.5) * 8, y - 6, 'particle_smoke')
      .setScale(0.6)
      .setAlpha(0.65)
      .setDepth(28);

    this.scene.tweens.add({
      targets: puff,
      y: puff.y - 24,
      x: puff.x + (Math.random() - 0.5) * 10,
      scale: 1.25,
      alpha: 0,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => puff.destroy()
    });
  }

  /**
   * Estela corta roja para Cazas Ligeros (Sección 10.6)
   */
  spawnRedTrail(x, y) {
    const dot = this.scene.add
      .image(x, y, 'particle_red')
      .setScale(0.75)
      .setAlpha(0.65)
      .setDepth(25);

    this.scene.tweens.add({
      targets: dot,
      alpha: 0,
      scale: 0.2,
      duration: 160,
      onComplete: () => dot.destroy()
    });
  }

  /**
   * Líneas de velocidad cuando el Interceptor Furtivo embiste (Sección 10.6)
   */
  spawnSpeedLine(x, y) {
    const line = this.scene.add
      .rectangle(x + (Math.random() - 0.5) * 18, y - 10, 2, 22, PALETTE.WHITE, 0.65)
      .setDepth(25);

    this.scene.tweens.add({
      targets: line,
      y: line.y - 26,
      alpha: 0,
      duration: 180,
      onComplete: () => line.destroy()
    });
  }

  /**
   * Texto flotante ascendente (ej. "-12%", "-1 DEF", "+3 DEF", "+25%", "+35%")
   */
  spawnFloatingText(x, y, text, colorHex = HEX.WHITE) {
    const clampedX = Math.max(48, Math.min(GAME_WIDTH - 48, x));
    const clampedY = Math.max(60, Math.min(GAME_HEIGHT - 40, y));

    const label = this.scene.add
      .text(clampedX, clampedY, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: colorHex,
        stroke: HEX.UI_PANEL,
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(88);

    this.scene.tweens.add({
      targets: label,
      y: clampedY - 34,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  /**
   * Destello de pantalla configurable
   */
  triggerScreenFlash(color, startAlpha, durationMs) {
    this.screenFlash.setFillStyle(color, 1);
    this.screenFlash.setAlpha(startAlpha);
    this.scene.tweens.killTweensOf(this.screenFlash);
    this.scene.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut'
    });
  }

  /**
   * Daño recibido por el jugador:
   * Destello rojo #E63946 con opacidad 0.25 que baja a 0 en 150 ms,
   * sacudida de cámara de 120 ms y texto flotante rojo "-X%" (Sección 10.8).
   */
  onPlayerDamaged(x, y, damagePercent) {
    soundManager.playPlayerDamage();
    this.triggerScreenFlash(PALETTE.ALERT_RED, 0.25, 150);
    this.scene.cameras.main.shake(120, 0.009);
    const rounded = Math.max(1, Math.round(damagePercent));
    this.spawnFloatingText(x, y - 20, `-${rounded}%`, HEX.ALERT_RED);
  }

  /**
   * Pérdida de DEF:
   * El anillo violeta se rompe, se expande y se desvanece, y sube el texto violeta "-X DEF" (Sección 10.8).
   */
  onPlayerDefLost(x, y, amountLost) {
    if (amountLost <= 0) return;
    soundManager.playDefLost();
    const ring = this.scene.add
      .image(x, y, 'fx_ring_violet')
      .setScale(0.9)
      .setAlpha(0.95)
      .setDepth(60);

    this.scene.tweens.add({
      targets: ring,
      scale: 1.85,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    this.spawnFloatingText(x, y - 36, `-${amountLost} DEF`, HEX.DEF_LIGHT);
  }

  /**
   * Ganancia de DEF:
   * El anillo aparece con un pulso y sube el texto violeta "+3 DEF" (Sección 10.8).
   */
  onPlayerDefGained(x, y, amountGained) {
    soundManager.playDefGain();
    const ring = this.scene.add
      .image(x, y, 'fx_ring_violet')
      .setScale(1.5)
      .setAlpha(0.9)
      .setDepth(60);

    this.scene.tweens.add({
      targets: ring,
      scale: 0.95,
      alpha: 0,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => ring.destroy()
    });

    this.spawnFloatingText(x, y - 30, `+${amountGained} DEF`, HEX.DEF_LIGHT);
  }

  /**
   * Curación:
   * Destello verde de opacidad 0.2 y texto verde "+25%" o "+35%" (Sección 10.8).
   */
  onPlayerHealed(x, y, healPercent) {
    soundManager.playHeal();
    this.triggerScreenFlash(PALETTE.HEAL_GREEN, 0.20, 260);
    this.spawnFloatingText(x, y - 24, `+${Math.round(healPercent)}%`, HEX.HEAL_GREEN);
  }

  /**
   * Activa o desactiva la viñeta roja pulsante cuando la vida es menor al 25% (Sección 10.8)
   */
  setLowHpState(isLow) {
    if (isLow === this.lowHpActive) return;
    this.lowHpActive = isLow;

    if (this.lowHpTween) {
      this.lowHpTween.stop();
      this.lowHpTween = null;
    }

    if (isLow) {
      this.lowHpVignette.setAlpha(0.15);
      this.lowHpTween = this.scene.tweens.add({
        targets: this.lowHpVignette,
        alpha: 0.35,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.lowHpVignette.setAlpha(0);
    }
  }

  /**
   * Alerta de 2 segundos de entrada de Jefe con franjas rojas translúcidas y borde pulsante (Sección 10.7)
   */
  playBossEntranceAlert(onComplete) {
    soundManager.playBossWarning();
    soundManager.setBgmBossAlert(true);
    this.bossAlertContainer.setAlpha(0.2);

    this.scene.tweens.add({
      targets: this.bossAlertContainer,
      alpha: 1,
      duration: 250,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.bossAlertContainer.setAlpha(0);
        soundManager.setBgmBossAlert(false);
        if (onComplete) onComplete();
      }
    });
  }
}

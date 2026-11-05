import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { PALETTE, HEX, getSectorOverlayConfig } from '../config/palette.js';

/**
 * Genera las texturas sin costuras (seamless) para las 3 etapas del fondo
 * y el limbo planetario de la Etapa 3.
 * Se invoca una sola vez en BootScene.
 */
export function generateBackgroundTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // =========================================================================
  // ETAPA 1: Océano al amanecer (0 - 5.000 m)
  // =========================================================================
  // Capa lejana: Mar #0E4A7B con olas #2A8FBD (480x720 sin costuras)
  g.fillStyle(PALETTE.STAGE_1.SEA, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.fillStyle(PALETTE.STAGE_1.WAVES, 0.65);
  for (let y = 12; y < GAME_HEIGHT; y += 36) {
    const offset = ((y / 36) % 2) * 30;
    for (let x = offset; x < GAME_WIDTH; x += 64) {
      g.fillRoundedRect(x, y, 28, 3, 1.5);
      g.fillRoundedRect((x + 18) % GAME_WIDTH, y + 14, 16, 2, 1);
    }
  }
  g.generateTexture('bg_stage1_far', GAME_WIDTH, GAME_HEIGHT);

  // Capa cercana: Islas verdes #6A994E con arena #E9C46A y nubes #F2F7FA (opacidad 0.8)
  g.clear();
  const islands = [
    { x: 95, y: 140, rx: 46, ry: 30 },
    { x: 370, y: 340, rx: 56, ry: 38 },
    { x: 140, y: 560, rx: 38, ry: 26 }
  ];
  for (const isl of islands) {
    // Playa de arena
    g.fillStyle(PALETTE.STAGE_1.SAND, 0.95);
    g.fillEllipse(isl.x, isl.y, isl.rx * 2, isl.ry * 2);
    // Vegetación verde
    g.fillStyle(PALETTE.STAGE_1.ISLAND, 1);
    g.fillEllipse(isl.x - 3, isl.y - 2, isl.rx * 1.55, isl.ry * 1.5);
    g.fillStyle(0x527936, 0.8);
    g.fillEllipse(isl.x + 6, isl.y + 3, isl.rx * 0.8, isl.ry * 0.75);
  }
  // Nubes blancas suaves con opacidad 0.8
  const clouds1 = [
    { x: 320, y: 90, w: 110, h: 46 },
    { x: 80, y: 290, w: 120, h: 50 },
    { x: 340, y: 510, w: 95, h: 42 },
    { x: 210, y: 660, w: 115, h: 44 }
  ];
  g.fillStyle(PALETTE.STAGE_1.CLOUD, 0.8);
  for (const c of clouds1) {
    g.fillEllipse(c.x, c.y, c.w, c.h);
    g.fillEllipse(c.x - c.w * 0.28, c.y + 8, c.w * 0.65, c.h * 0.75);
    g.fillEllipse(c.x + c.w * 0.28, c.y + 6, c.w * 0.6, c.h * 0.7);
  }
  g.generateTexture('bg_stage1_near', GAME_WIDTH, GAME_HEIGHT);

  // =========================================================================
  // ETAPA 2: Tormenta (5.000 - 10.000 m)
  // =========================================================================
  // Capa lejana: Base #2B2D42, nubes oscuras #4A4E69
  g.clear();
  g.fillStyle(PALETTE.STAGE_2.BASE, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.fillStyle(PALETTE.STAGE_2.CLOUD_DARK, 0.75);
  for (let y = 40; y < GAME_HEIGHT; y += 120) {
    const cx = ((y * 3) % 360) + 60;
    g.fillEllipse(cx, y, 220, 76);
    g.fillEllipse((cx + 180) % GAME_WIDTH, y + 50, 180, 64);
  }
  g.generateTexture('bg_stage2_far', GAME_WIDTH, GAME_HEIGHT);

  // Capa cercana: Jirones de nube #8D99AE y lluvia fina en diagonal
  g.clear();
  g.fillStyle(PALETTE.STAGE_2.CLOUD_LIGHT, 0.32);
  const wisps = [
    { x: 110, y: 100, w: 150, h: 52 },
    { x: 360, y: 240, w: 170, h: 56 },
    { x: 150, y: 420, w: 140, h: 48 },
    { x: 330, y: 600, w: 165, h: 54 }
  ];
  for (const w of wisps) {
    g.fillEllipse(w.x, w.y, w.w, w.h);
    g.fillEllipse(w.x + 35, w.y + 14, w.w * 0.7, w.h * 0.65);
  }
  // Lluvia fina en diagonal
  g.lineStyle(1, PALETTE.STAGE_2.CLOUD_LIGHT, 0.45);
  for (let y = 10; y < GAME_HEIGHT; y += 45) {
    for (let x = 15; x < GAME_WIDTH; x += 55) {
      const rx = (x + (y % 90)) % (GAME_WIDTH - 12);
      g.lineBetween(rx, y, rx - 8, y + 22);
    }
  }
  g.generateTexture('bg_stage2_near', GAME_WIDTH, GAME_HEIGHT);

  // =========================================================================
  // ETAPA 3: Órbita (10.000 - 15.000 m)
  // =========================================================================
  // Capa lejana: Base #05060F, estrellas de 1 px (#FFFFFF y #9FB8FF)
  g.clear();
  g.fillStyle(PALETTE.STAGE_3.BASE, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (let i = 0; i < 120; i++) {
    const sx = (i * 73 + 19) % GAME_WIDTH;
    const sy = (i * 137 + 31) % GAME_HEIGHT;
    const color = i % 3 === 0 ? PALETTE.STAGE_3.STAR_BLUE : PALETTE.STAGE_3.STAR_WHITE;
    g.fillStyle(color, 0.75);
    g.fillRect(sx, sy, 1, 1);
  }
  g.generateTexture('bg_stage3_far', GAME_WIDTH, GAME_HEIGHT);

  // Capa cercana: Estrellas de 2 px y nebulosa azul #1A2238 con opacidad 0.35
  g.clear();
  g.fillStyle(PALETTE.STAGE_3.NEBULA, 0.35);
  g.fillEllipse(140, 180, 260, 160);
  g.fillEllipse(340, 440, 280, 180);
  g.fillEllipse(180, 620, 220, 120);
  for (let i = 0; i < 55; i++) {
    const sx = (i * 97 + 43) % (GAME_WIDTH - 4);
    const sy = (i * 163 + 17) % (GAME_HEIGHT - 4);
    const color = i % 2 === 0 ? PALETTE.STAGE_3.STAR_WHITE : PALETTE.STAGE_3.STAR_BLUE;
    g.fillStyle(color, 0.9);
    g.fillRect(sx, sy, 2, 2);
  }
  g.generateTexture('bg_stage3_near', GAME_WIDTH, GAME_HEIGHT);

  // Limbo del planeta azul #1B3A6B con atmósfera #4CC9F0 de opacidad 0.3 (480x220)
  g.clear();
  g.fillStyle(PALETTE.STAGE_3.ATMOSPHERE, 0.3);
  g.fillEllipse(GAME_WIDTH / 2, 260, 680, 380);
  g.fillStyle(PALETTE.STAGE_3.PLANET, 1);
  g.fillEllipse(GAME_WIDTH / 2, 285, 650, 360);
  g.generateTexture('bg_stage3_planet_limb', GAME_WIDTH, 220);

  g.destroy();
}

const STAGE_CONFIGS = {
  1: {
    farKey: 'bg_stage1_far',
    nearKey: 'bg_stage1_near',
    farSpeed: 40,
    nearSpeed: 90
  },
  2: {
    farKey: 'bg_stage2_far',
    nearKey: 'bg_stage2_near',
    farSpeed: 60,
    nearSpeed: 130
  },
  3: {
    farKey: 'bg_stage3_far',
    nearKey: 'bg_stage3_near',
    farSpeed: 50,
    nearSpeed: 120
  }
};

export class BackgroundManager {
  constructor(scene) {
    this.scene = scene;
    this.currentStage = 1;
    this.currentSector = 1;
    this.speedMultiplier = 1.0;

    // Capas principales de TileSprite
    this.farLayer = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_far')
      .setOrigin(0, 0)
      .setDepth(0);

    this.nearLayer = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_near')
      .setOrigin(0, 0)
      .setDepth(1);

    // Capas de transición para fundido de 2 segundos entre etapas
    this.transitionFar = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_far')
      .setOrigin(0, 0)
      .setAlpha(0)
      .setDepth(2);

    this.transitionNear = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_near')
      .setOrigin(0, 0)
      .setAlpha(0)
      .setDepth(3);

    // Limbo planetario de Etapa 3 (se aleja y desaparece al comenzar la etapa 3)
    this.planetLimb = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT + 120, 'bg_stage3_planet_limb')
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setDepth(2.5);

    // Capa de color por Sector (Sección 10.4)
    this.sectorOverlay = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(4);

    // Capa de oscurecimiento durante pelea de Jefe (Sección 10.3: negra opacidad 0.25)
    this.bossDarkOverlay = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.BLACK, 0)
      .setOrigin(0, 0)
      .setDepth(5);

    // Relámpago de Etapa 2 (Sección 10.3: capa blanca opacidad 0.25 que se desvanece en 150 ms)
    this.lightningOverlay = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.STAGE_2.LIGHTNING, 0)
      .setOrigin(0, 0)
      .setDepth(6);

    this.nextLightningTimer = this.getRandomLightningDelay();
    this.isTransitioning = false;
    this.targetStage = 1;
  }

  getRandomLightningDelay() {
    // Entre 6 y 10 segundos aleatorios
    return 6000 + Math.random() * 4000;
  }

  /**
   * Activa o desactiva el modo jefe:
   * Durante un jefe, el desplazamiento baja al 50% y una capa negra de opacidad 0.25 oscurece el fondo.
   */
  setBossMode(isActive) {
    const targetSpeed = isActive ? 0.5 : 1.0;
    const targetAlpha = isActive ? 0.25 : 0;

    this.scene.tweens.add({
      targets: this,
      speedMultiplier: targetSpeed,
      duration: 600,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: this.bossDarkOverlay,
      alpha: targetAlpha,
      duration: 600,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Realiza una pausa breve del desplazamiento (al morir un jefe) y luego inicia el fundido a la siguiente etapa.
   */
  transitionToStage(nextStage) {
    const validStage = ((nextStage - 1) % 3) + 1;
    if (validStage === this.currentStage && !this.isTransitioning) return;

    this.targetStage = validStage;
    this.isTransitioning = true;
    const cfg = STAGE_CONFIGS[validStage];

    this.transitionFar.setTexture(cfg.farKey).setAlpha(0);
    this.transitionNear.setTexture(cfg.nearKey).setAlpha(0);

    // Si entramos en la Etapa 3 (Órbita), mostramos el limbo del planeta azul alejándose hacia abajo
    if (validStage === 3) {
      this.planetLimb.setPosition(GAME_WIDTH / 2, GAME_HEIGHT + 20).setAlpha(0.95);
      this.scene.tweens.add({
        targets: this.planetLimb,
        y: GAME_HEIGHT + 240,
        alpha: 0,
        duration: 6500,
        ease: 'Sine.easeIn'
      });
    }

    // Fundido de opacidad de 2 segundos sobre el fondo anterior (Sección 10.3)
    this.scene.tweens.add({
      targets: [this.transitionFar, this.transitionNear],
      alpha: 1,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        this.currentStage = validStage;
        this.farLayer.setTexture(cfg.farKey);
        this.nearLayer.setTexture(cfg.nearKey);
        this.farLayer.tilePositionY = this.transitionFar.tilePositionY;
        this.nearLayer.tilePositionY = this.transitionNear.tilePositionY;
        this.transitionFar.setAlpha(0);
        this.transitionNear.setAlpha(0);
        this.isTransitioning = false;
      }
    });
  }

  /**
   * Aplica la capa de color del Sector actual y muestra el cartel centrado "SECTOR N" durante 2 segundos.
   */
  setSector(sector, showBanner = true) {
    this.currentSector = sector;
    const { color, alpha } = getSectorOverlayConfig(sector);
    this.sectorOverlay.setFillStyle(color, 1);

    this.scene.tweens.add({
      targets: this.sectorOverlay,
      alpha,
      duration: 1000,
      ease: 'Sine.easeInOut'
    });

    if (showBanner) {
      this.showSectorBanner(sector);
    }
  }

  showSectorBanner(sector) {
    const banner = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, `SECTOR ${sector}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '20px',
        color: HEX.UI_TEXT,
        stroke: HEX.UI_PANEL,
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(90);

    // Desvanecimiento de entrada y salida durante 2 segundos totales (Sección 10.4)
    this.scene.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 400,
      hold: 1200,
      yoyo: true,
      onComplete: () => banner.destroy()
    });
  }

  triggerLightning() {
    this.lightningOverlay.setAlpha(0.25);
    this.scene.tweens.add({
      targets: this.lightningOverlay,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut'
    });
  }

  update(dtSeconds, dtMs) {
    const cfg = STAGE_CONFIGS[this.currentStage];
    const mult = this.speedMultiplier;

    this.farLayer.tilePositionY -= cfg.farSpeed * mult * dtSeconds;
    this.nearLayer.tilePositionY -= cfg.nearSpeed * mult * dtSeconds;

    if (this.isTransitioning) {
      const tCfg = STAGE_CONFIGS[this.targetStage];
      this.transitionFar.tilePositionY -= tCfg.farSpeed * mult * dtSeconds;
      this.transitionNear.tilePositionY -= tCfg.nearSpeed * mult * dtSeconds;
    }

    // Relámpagos en Etapa 2 cada 6 a 10 segundos aleatorios
    const activeStage = this.isTransitioning ? this.targetStage : this.currentStage;
    if (activeStage === 2) {
      this.nextLightningTimer -= dtMs;
      if (this.nextLightningTimer <= 0) {
        this.triggerLightning();
        this.nextLightningTimer = this.getRandomLightningDelay();
      }
    }
  }
}

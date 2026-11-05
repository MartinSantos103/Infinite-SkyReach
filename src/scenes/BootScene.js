import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_KEY } from '../config/constants.js';
import { PALETTE, HEX } from '../config/palette.js';
import { generateBackgroundTextures } from '../systems/BackgroundManager.js';
import { generateShipTextures } from '../art/ships.js';
import { generateBossTextures } from '../art/bosses.js';
import { generateProjectileTextures } from '../art/projectiles.js';
import { generateIconTextures } from '../art/icons.js';
import { soundManager } from '../systems/SoundManager.js';

/**
 * BootScene:
 * 1. Asegura la carga de la fuente Press Start 2P (con document.fonts.load).
 * 2. Genera todas las texturas procedurales por código (sin imágenes externas).
 * 3. Presenta la Pantalla de Título (Sección 10.9):
 *    - Fondo de Etapa 1 en movimiento con la nave del jugador
 *    - Título "1942 INFINITE" en blanco con sombra cian
 *    - "HAZ CLIC PARA JUGAR" parpadeando cada 800 ms
 *    - El clic da foco al iframe (window.focus()), desbloquea el audio y lanza GameScene + UIScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
    this.texturesGenerated = false;
  }

  async create() {
    // 1. Asegurar carga de fuente de píxeles Press Start 2P antes de crear textos (Sección 10.9)
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.race([
          document.fonts.load('10px "Press Start 2P"'),
          new Promise((resolve) => setTimeout(resolve, 600))
        ]);
      }
    } catch {
      // Continuar con fuente monoespaciada de respaldo
    }

    // 2. Generar todas las texturas procedurales una sola vez
    if (!this.texturesGenerated) {
      generateBackgroundTextures(this);
      generateShipTextures(this);
      generateBossTextures(this);
      generateProjectileTextures(this);
      generateIconTextures(this);
      this.texturesGenerated = true;
    }

    // 3. Construir la Pantalla de Título (Sección 10.9)
    this.farBg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_far')
      .setOrigin(0, 0);
    this.nearBg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage1_near')
      .setOrigin(0, 0);

    // Panel decorativo superior para el título
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.UI_PANEL, 0.82);
    panel.fillRect(34, 108, GAME_WIDTH - 68, 175);
    panel.lineStyle(2, PALETTE.UI_BORDER, 1);
    panel.strokeRect(34, 108, GAME_WIDTH - 68, 175);

    // Sombra cian del título y título blanco "1942 INFINITE" (Sección 10.9)
    this.add
      .text(GAME_WIDTH / 2 + 3, 165 + 3, '1942\nINFINITE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '30px',
        color: HEX.PLAYER_CYAN,
        align: 'center',
        lineSpacing: 12
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 165, '1942\nINFINITE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '30px',
        color: HEX.WHITE,
        align: 'center',
        lineSpacing: 12
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 245, 'RETRO-FUTURISTIC SHMUP', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: HEX.PLAYER_COCKPIT,
        align: 'center'
      })
      .setOrigin(0.5);

    // Silueta / Nave del jugador en vuelo sobre la Etapa 1
    this.shipShadow = this.add
      .image(GAME_WIDTH / 2 + 8, 410 + 10, 'ship_shadow')
      .setAlpha(0.9);
    this.shipFlame = this.add
      .image(GAME_WIDTH / 2, 410 + 27, 'player_flame')
      .setOrigin(0.5, 0);
    this.shipSprite = this.add
      .image(GAME_WIDTH / 2, 410, 'player')
      .setScale(1.25);

    // Récords guardados en localStorage
    const records = this.loadRecords();
    const recordPanel = this.add.graphics();
    recordPanel.fillStyle(PALETTE.UI_PANEL, 0.78);
    recordPanel.fillRect(54, 488, GAME_WIDTH - 108, 86);
    recordPanel.lineStyle(1, PALETTE.UI_BORDER, 1);
    recordPanel.strokeRect(54, 488, GAME_WIDTH - 108, 86);

    this.add
      .text(
        GAME_WIDTH / 2,
        531,
        `MEJOR PUNTAJE: ${String(records.highScore).padStart(6, '0')}\n` +
          `DISTANCIA MÁX: ${String(records.maxDistance).padStart(5, '0')} m\n` +
          `SECTOR MÁXIMO: SECTOR ${records.maxSector}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: HEX.XP_GOLD,
          align: 'center',
          lineSpacing: 8
        }
      )
      .setOrigin(0.5);

    // Texto "HAZ CLIC PARA JUGAR" que parpadea cada 800 ms (Sección 10.9)
    this.promptText = this.add
      .text(GAME_WIDTH / 2, 625, 'HAZ CLIC PARA JUGAR', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: HEX.WHITE,
        stroke: HEX.UI_PANEL,
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5);

    const hintBg = this.add.graphics();
    hintBg.fillStyle(PALETTE.UI_PANEL, 0.8);
    hintBg.fillRect(36, 654, GAME_WIDTH - 72, 38);
    hintBg.lineStyle(1, PALETTE.UI_BORDER, 0.85);
    hintBg.strokeRect(36, 654, GAME_WIDTH - 72, 38);

    this.add
      .text(
        GAME_WIDTH / 2,
        673,
        'PC: WASD/FLECHAS + ESPACIO (TONEL)\nCELULAR: ARRASTRAR NAVE + BOTON TONEL',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: HEX.UI_TEXT,
          align: 'center',
          lineSpacing: 6
        }
      )
      .setOrigin(0.5);

    this.blinkTimer = 0;
    this.starting = false;

    // Captura de clic o tecla para dar foco al iframe, desbloquear audio y arrancar partida
    this.input.on('pointerdown', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
  }

  loadRecords() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          highScore: Number(parsed.highScore) || 0,
          maxDistance: Number(parsed.maxDistance) || 0,
          maxSector: Number(parsed.maxSector) || 1
        };
      }
    } catch {
      // Ignorar errores de localStorage
    }
    return { highScore: 0, maxDistance: 0, maxSector: 1 };
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;

    try {
      window.focus();
    } catch {
      // Ignorar
    }

    soundManager.unlock();
    soundManager.startBgm(false);

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (this.farBg) this.farBg.tilePositionY -= 40 * dt;
    if (this.nearBg) this.nearBg.tilePositionY -= 90 * dt;

    if (this.shipSprite) {
      const offsetY = Math.sin(time * 0.004) * 5;
      this.shipSprite.y = 410 + offsetY;
      this.shipShadow.y = 420 + offsetY;
      this.shipFlame.y = 442 + offsetY;
      this.shipFlame.scaleY = 1.0 + Math.sin(time * 0.03) * 0.25;
    }

    // Parpadeo cada 800 ms
    this.blinkTimer += delta;
    if (this.blinkTimer >= 800) {
      this.blinkTimer = 0;
      if (this.promptText) {
        this.promptText.setVisible(!this.promptText.visible);
      }
    }
  }
}

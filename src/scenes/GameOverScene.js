import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_KEY } from '../config/constants.js';
import { PALETTE, HEX } from '../config/palette.js';

/**
 * Guarda y compara los récords de la partida en localStorage (Sección 2 y 10.9)
 * @param {{ score: number, distance: number, sector: number }} current
 * @param {Storage} storage Instancia de almacenamiento (por defecto window.localStorage)
 */
export function saveAndCompareRecords(current, storage = window.localStorage) {
  let prev = { highScore: 0, maxDistance: 0, maxSector: 1 };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      prev = {
        highScore: Number(parsed.highScore) || 0,
        maxDistance: Number(parsed.maxDistance) || 0,
        maxSector: Number(parsed.maxSector) || 1
      };
    }
  } catch {
    // Ignorar errores de lectura
  }

  const score = Math.floor(Number(current.score) || 0);
  const distance = Math.floor(Number(current.distance) || 0);
  const sector = Math.max(1, Math.floor(Number(current.sector) || 1));

  const isNewRecord =
    score > prev.highScore ||
    distance > prev.maxDistance ||
    sector > prev.maxSector;

  const updated = {
    highScore: Math.max(prev.highScore, score),
    maxDistance: Math.max(prev.maxDistance, distance),
    maxSector: Math.max(prev.maxSector, sector)
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignorar errores de escritura
  }

  return {
    isNewRecord,
    records: updated
  };
}

/**
 * Escena Final ("GameOverScene")
 * Muestra tarjeta con distancia, puntaje, sector alcanzado y mejor registro.
 * Si hubo récord, destaca la etiqueta dorada "NUEVO RÉCORD" y el botón "JUGAR DE NUEVO".
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data?.score || 0;
    this.finalDistance = data?.distance || 0;
    this.finalSector = data?.sector || 1;
    this.finalLevel = data?.level || 1;
  }

  create() {
    window.__GAMEOVER_SCENE__ = this;

    // Fondo estrellado / órbita en movimiento suave
    this.farBg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage3_far')
      .setOrigin(0, 0);
    this.nearBg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_stage3_near')
      .setOrigin(0, 0);

    // Guardar en localStorage y verificar si hubo récord
    const { isNewRecord, records } = saveAndCompareRecords({
      score: this.finalScore,
      distance: this.finalDistance,
      sector: this.finalSector
    });

    // Tarjeta principal de Game Over (Sección 10.9)
    const cardW = 360;
    const cardH = 420;
    const cx = (GAME_WIDTH - cardW) / 2;
    const cy = (GAME_HEIGHT - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(PALETTE.UI_PANEL, 0.94);
    card.fillRect(cx, cy, cardW, cardH);
    card.lineStyle(2, PALETTE.UI_BORDER, 1);
    card.strokeRect(cx, cy, cardW, cardH);

    this.add
      .text(GAME_WIDTH / 2, cy + 44, 'NAVE DESTRUIDA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '20px',
        color: HEX.ALERT_RED
      })
      .setOrigin(0.5);

    // Etiqueta dorada "NUEVO RÉCORD" si superó marcas previas (Sección 10.9)
    if (isNewRecord) {
      const badgeBg = this.add
        .rectangle(GAME_WIDTH / 2, cy + 84, 210, 26, PALETTE.XP_GOLD, 0.2)
        .setStrokeStyle(1.5, PALETTE.XP_GOLD, 1);

      const badgeTxt = this.add
        .text(GAME_WIDTH / 2, cy + 84, '¡NUEVO RÉCORD!', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: HEX.XP_GOLD
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: [badgeBg, badgeTxt],
        scale: 1.06,
        duration: 450,
        yoyo: true,
        repeat: -1
      });
    }

    // Estadísticas de la partida
    this.add
      .text(
        GAME_WIDTH / 2,
        cy + 162,
        `DISTANCIA: ${String(this.finalDistance).padStart(5, '0')} m\n` +
          `PUNTAJE:   ${String(this.finalScore).padStart(6, '0')}\n` +
          `SECTOR:    SECTOR ${this.finalSector}\n` +
          `NIVEL:     NV. ${this.finalLevel}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: HEX.WHITE,
          align: 'left',
          lineSpacing: 12
        }
      )
      .setOrigin(0.5);

    // Separador y Mejor Registro histórico
    const sep = this.add.graphics();
    sep.lineStyle(1, PALETTE.UI_BORDER, 0.8);
    sep.lineBetween(cx + 28, cy + 232, cx + cardW - 28, cy + 232);

    this.add
      .text(GAME_WIDTH / 2, cy + 252, 'MEJOR REGISTRO', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: HEX.XP_GOLD
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        cy + 298,
        `RÉCORD PTS:  ${String(records.highScore).padStart(6, '0')}\n` +
          `MÁX DIST:    ${String(records.maxDistance).padStart(5, '0')} m\n` +
          `MÁX SECTOR:  SECTOR ${records.maxSector}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '9px',
          color: HEX.UI_TEXT,
          align: 'left',
          lineSpacing: 9
        }
      )
      .setOrigin(0.5);

    // Botón principal: JUGAR DE NUEVO (Sección 10.9)
    const playAgainBtn = this.add
      .rectangle(GAME_WIDTH / 2, cy + 370, 240, 40, PALETTE.PLAYER_CYAN, 1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, cy + 370, 'JUGAR DE NUEVO', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: HEX.UI_PANEL
      })
      .setOrigin(0.5);

    playAgainBtn.on('pointerover', () => playAgainBtn.setScale(1.04));
    playAgainBtn.on('pointerout', () => playAgainBtn.setScale(1.0));
    playAgainBtn.on('pointerdown', () => this.playAgain());

    this.input.keyboard.on('keydown-SPACE', () => this.playAgain());
    this.input.keyboard.on('keydown-ENTER', () => this.playAgain());
  }

  playAgain() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  update(_time, delta) {
    const dt = delta / 1000;
    if (this.farBg) this.farBg.tilePositionY -= 30 * dt;
    if (this.nearBg) this.nearBg.tilePositionY -= 70 * dt;
  }
}

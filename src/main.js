import '@fontsource/press-start-2p';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { HEX } from './config/palette.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

/**
 * Sección 3: Integración en iframe y soporte responsive Escritorio / Móvil
 * 1. Captura automática de foco al hacer clic o tocar (window.focus()).
 * 2. Bloqueo del desplazamiento de la página padre mediante event.preventDefault()
 *    en las teclas de dirección y barra espaciadora.
 */
export function setupIframeIntegration(win = window) {
  const focusWindow = () => {
    try {
      win.focus();
    } catch {
      // Ignorar en entornos restringidos
    }
  };

  win.addEventListener('pointerdown', focusWindow, { passive: true });
  win.addEventListener('touchstart', focusWindow, { passive: true });
  win.addEventListener('click', focusWindow, { passive: true });

  const blockedKeys = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    ' ',
    'Space',
    'Spacebar'
  ]);

  win.addEventListener(
    'keydown',
    (event) => {
      if (blockedKeys.has(event.key) || blockedKeys.has(event.code)) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: HEX.BASE_BG,
  pixelArt: false,
  antialias: true,
  input: {
    activePointers: 3,
    keyboard: {
      target: window,
      capture: [32, 37, 38, 39, 40] // SPACE (32), Flechas (37, 38, 39, 40)
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UIScene, GameOverScene]
};

export const game = new Phaser.Game(config);
window.__PHASER_GAME__ = game;

setupIframeIntegration(window);

// Refrescar escalado inmediatamente ante cambios de orientación o redimensionamiento en móvil y escritorio
const refreshScale = () => {
  if (game && game.scale) {
    game.scale.setParentSize(window.innerWidth, window.innerHeight);
    game.scale.refresh();
  }
};
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => {
  setTimeout(refreshScale, 120);
});

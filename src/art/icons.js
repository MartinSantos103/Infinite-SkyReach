import { PALETTE } from '../config/palette.js';

/**
 * Genera todos los iconos del HUD y los iconos grandes para las 6 tarjetas de mejora.
 * Cumple con las secciones 10.9 y 10.12.
 */
export function generateIconTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 1. Icono de escudo violeta para DEF en el HUD (16x16)
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillPoints([
    { x: 8, y: 1 },
    { x: 15, y: 3 },
    { x: 14, y: 10 },
    { x: 8, y: 15 },
    { x: 2, y: 10 },
    { x: 1, y: 3 }
  ], true);
  g.lineStyle(1.5, PALETTE.DEF_LIGHT, 1);
  g.strokePoints([
    { x: 8, y: 1 },
    { x: 15, y: 3 },
    { x: 14, y: 10 },
    { x: 8, y: 15 },
    { x: 2, y: 10 },
    { x: 1, y: 3 }
  ], true);
  g.generateTexture('icon_shield_def', 16, 16);

  // 2. Icono de corazón verde para recompensa +VIDA (16x16)
  g.clear();
  g.fillStyle(PALETTE.HEAL_GREEN, 1);
  g.fillCircle(5, 5, 4);
  g.fillCircle(11, 5, 4);
  g.fillTriangle(1, 6, 15, 6, 8, 15);
  g.fillStyle(PALETTE.WHITE, 0.7);
  g.fillCircle(4, 4, 1.2);
  g.generateTexture('icon_heart_heal', 16, 16);

  // 3. Icono de estrella dorada para recompensa +XP (16x16)
  g.clear();
  const starPts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 7.5 : 3.2;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    starPts.push({
      x: 8 + Math.cos(angle) * r,
      y: 8 + Math.sin(angle) * r
    });
  }
  g.fillStyle(PALETTE.XP_GOLD, 1);
  g.fillPoints(starPts, true);
  g.fillStyle(PALETTE.WHITE, 0.7);
  g.fillCircle(8, 8, 2);
  g.generateTexture('icon_star_xp', 16, 16);

  // 4. Botón de Pausa || (28x28 px)
  g.clear();
  g.fillStyle(PALETTE.UI_PANEL, 0.9);
  g.fillRect(0, 0, 28, 28);
  g.lineStyle(1.5, PALETTE.UI_BORDER, 1);
  g.strokeRect(1, 1, 26, 26);
  g.fillStyle(PALETTE.UI_TEXT, 1);
  g.fillRect(8, 7, 4, 14);
  g.fillRect(16, 7, 4, 14);
  g.generateTexture('icon_pause_btn', 28, 28);

  // 5. Icono de disparo tachado por PEM (28x28 px)
  g.clear();
  g.fillStyle(PALETTE.UI_PANEL, 0.9);
  g.fillCircle(14, 14, 13);
  g.lineStyle(2, PALETTE.DEF_VIOLET, 1);
  g.strokeCircle(14, 14, 12);
  // Bala en el centro
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 0.8);
  g.fillRoundedRect(11, 6, 6, 16, 3);
  // Línea roja/magenta de tachado
  g.lineStyle(3, PALETTE.ALERT_RED, 1);
  g.lineBetween(5, 23, 23, 5);
  g.generateTexture('icon_fire_disabled', 28, 28);

  // 6. Iconos grandes para las 6 tarjetas de mejora (44x44 px)
  // 6.1 MULTISHOT (Cañón Múltiple)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 0.2);
  g.fillCircle(22, 22, 20);
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillRoundedRect(9, 12, 5, 22, 2);
  g.fillRoundedRect(19.5, 6, 5, 28, 2);
  g.fillRoundedRect(30, 12, 5, 22, 2);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(11.5, 10, 2.5);
  g.fillCircle(22, 5, 2.5);
  g.fillCircle(32.5, 10, 2.5);
  g.generateTexture('upgrade_icon_MULTISHOT', 44, 44);

  // 6.2 TURBO_CADENCE (Cadencia Turbo)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 0.2);
  g.fillCircle(22, 22, 20);
  g.lineStyle(3, PALETTE.PLAYER_CYAN, 1);
  for (let i = 0; i < 3; i++) {
    const yOff = 12 + i * 9;
    g.beginPath();
    g.moveTo(11, yOff + 6);
    g.lineTo(22, yOff - 2);
    g.lineTo(33, yOff + 6);
    g.strokePath();
  }
  g.generateTexture('upgrade_icon_TURBO_CADENCE', 44, 44);

  // 6.3 REACTIVE_ARMOR (Blindaje Reactivo +DEF)
  g.clear();
  g.fillStyle(PALETTE.DEF_VIOLET, 0.2);
  g.fillCircle(22, 22, 20);
  const bigShield = [
    { x: 22, y: 6 },
    { x: 36, y: 11 },
    { x: 34, y: 27 },
    { x: 22, y: 38 },
    { x: 10, y: 27 },
    { x: 8, y: 11 }
  ];
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillPoints(bigShield, true);
  g.lineStyle(2, PALETTE.DEF_LIGHT, 1);
  g.strokePoints(bigShield, true);
  g.fillStyle(PALETTE.WHITE, 0.9);
  g.fillCircle(22, 21, 5);
  g.generateTexture('upgrade_icon_REACTIVE_ARMOR', 44, 44);

  // 6.4 FIREPOWER (Potencia de Fuego)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 0.2);
  g.fillCircle(22, 22, 20);
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillRoundedRect(15, 7, 14, 30, 7);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRoundedRect(18, 10, 8, 24, 4);
  g.lineStyle(2, PALETTE.PLAYER_COCKPIT, 1);
  g.strokeCircle(22, 22, 18);
  g.generateTexture('upgrade_icon_FIREPOWER', 44, 44);

  // 6.5 WINGMAN_DRONE (Dron Satélite)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 0.2);
  g.fillCircle(22, 22, 20);
  // Dron izquierdo y derecho
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillTriangle(13, 10, 20, 30, 6, 30);
  g.fillTriangle(31, 10, 38, 30, 24, 30);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(13, 22, 3);
  g.fillCircle(31, 22, 3);
  g.generateTexture('upgrade_icon_WINGMAN_DRONE', 44, 44);

  // 6.6 REPAIR_KIT (Kit de Reparación)
  g.clear();
  g.fillStyle(PALETTE.HEAL_GREEN, 0.2);
  g.fillCircle(22, 22, 20);
  g.fillStyle(PALETTE.HEAL_GREEN, 1);
  g.fillRoundedRect(18, 8, 8, 28, 2);
  g.fillRoundedRect(8, 18, 28, 8, 2);
  g.fillStyle(PALETTE.WHITE, 0.85);
  g.fillRect(20, 12, 4, 20);
  g.fillRect(12, 20, 20, 4);
  g.generateTexture('upgrade_icon_REPAIR_KIT', 44, 44);

  g.destroy();
}

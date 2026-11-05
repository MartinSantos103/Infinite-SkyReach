import { PALETTE } from '../config/palette.js';

/**
 * Genera todas las texturas del jugador, sus drones, mejoras visuales
 * y los 5 arquetipos de enemigos comunes (con sus versiones blancas _flash).
 * Cumple con las secciones 10.5, 10.6 y 10.11.
 */
export function generateShipTextures(scene) {
  makePlayerTexture(scene);
  makeDroneTextures(scene);
  makeLightFighterTextures(scene);
  makeTacticalFighterTextures(scene);
  makeHeavyBomberTextures(scene);
  makeStealthInterceptorTextures(scene);
  makeMineCorvetteTextures(scene);
}

export function makePlayerTexture(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 1. Nave del jugador: 48x60 px
  // Alas en delta (#CED4DA) con borde cian (#00B4D8)
  g.fillStyle(PALETTE.PLAYER_WING, 1);
  g.fillTriangle(24, 10, 46, 48, 2, 48);
  g.lineStyle(2, PALETTE.PLAYER_CYAN, 1);
  g.strokeTriangle(24, 10, 46, 48, 2, 48);

  // Alerones traseros
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillTriangle(24, 38, 38, 54, 10, 54);

  // Fuselaje central blanco (#E9ECEF)
  g.fillStyle(PALETTE.PLAYER_WHITE, 1);
  g.fillRoundedRect(18, 4, 12, 48, 5);
  g.fillTriangle(24, 0, 30, 10, 18, 10);

  // Detalles de ala cian
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillRect(10, 34, 4, 12);
  g.fillRect(34, 34, 4, 12);

  // Cabina óvalo cian claro (#48CAE4)
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillEllipse(24, 22, 8, 16);
  g.fillStyle(PALETTE.WHITE, 0.8);
  g.fillEllipse(23, 19, 3, 6);

  // Tobera naranja (#F4A261)
  g.fillStyle(PALETTE.PLAYER_THRUSTER, 1);
  g.fillRect(20, 52, 8, 6);

  g.generateTexture('player', 48, 60);

  // Versión blanca para flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(24, 10, 46, 48, 2, 48);
  g.fillTriangle(24, 38, 38, 54, 10, 54);
  g.fillRoundedRect(18, 4, 12, 48, 5);
  g.fillTriangle(24, 0, 30, 10, 18, 10);
  g.fillRect(20, 52, 8, 6);
  g.generateTexture('player_flash', 48, 60);

  // Mitades de la nave para animación de muerte (Sección 10.5)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_WING, 1);
  g.fillTriangle(24, 10, 24, 48, 2, 48);
  g.fillStyle(PALETTE.PLAYER_WHITE, 1);
  g.fillRect(18, 4, 6, 48);
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRect(20, 15, 4, 14);
  g.generateTexture('player_half_left', 26, 60);

  g.clear();
  g.fillStyle(PALETTE.PLAYER_WING, 1);
  g.fillTriangle(0, 10, 22, 48, 0, 48);
  g.fillStyle(PALETTE.PLAYER_WHITE, 1);
  g.fillRect(0, 4, 6, 48);
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRect(0, 15, 4, 14);
  g.generateTexture('player_half_right', 26, 60);

  // Llama animada de la tobera
  g.clear();
  g.fillStyle(PALETTE.PLAYER_THRUSTER, 0.95);
  g.fillTriangle(6, 16, 0, 0, 12, 0);
  g.fillStyle(PALETTE.HAZARD_YELLOW, 1);
  g.fillTriangle(6, 11, 2, 0, 10, 0);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(6, 6, 4, 0, 8, 0);
  g.generateTexture('player_flame', 12, 16);

  // Módulo visual de cañón adicional junto a las alas (Cañón Múltiple)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillRect(0, 2, 4, 10);
  g.fillStyle(PALETTE.PLAYER_WHITE, 1);
  g.fillRect(1, 0, 2, 4);
  g.generateTexture('player_cannon_pod', 4, 12);

  // Sombra ovalada bajo las naves (Nivel C, Sección 10.13)
  g.clear();
  g.fillStyle(PALETTE.BLACK, 0.25);
  g.fillEllipse(20, 12, 36, 20);
  g.generateTexture('ship_shadow', 40, 24);

  g.destroy();
}

function makeDroneTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Mini nave cian de 16x20 px (Dron Satélite)
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillTriangle(8, 0, 16, 16, 0, 16);
  g.fillStyle(PALETTE.PLAYER_WHITE, 1);
  g.fillRect(6, 4, 4, 12);
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillEllipse(8, 9, 4, 6);
  g.fillStyle(PALETTE.PLAYER_THRUSTER, 1);
  g.fillRect(6, 16, 4, 3);
  g.generateTexture('player_drone', 16, 20);

  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(8, 0, 16, 16, 0, 16);
  g.fillRect(6, 16, 4, 3);
  g.generateTexture('player_drone_flash', 16, 20);

  g.destroy();
}

function makeLightFighterTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 1. Caza Ligero (Kamikaze): 28x30 px
  // Triángulo agudo apuntando hacia abajo, alas cortas, casco #3D405B, franja roja #E63946
  g.fillStyle(PALETTE.ENEMY.FIGHTER_HULL, 1);
  g.fillTriangle(14, 29, 27, 4, 1, 4);
  g.fillRect(10, 0, 8, 8);

  // Franja roja central y en puntas de ala
  g.fillStyle(PALETTE.ENEMY.RED_ACCENT, 1);
  g.fillTriangle(14, 26, 18, 6, 10, 6);
  g.fillRect(2, 5, 4, 5);
  g.fillRect(22, 5, 4, 5);

  // Cabina oscura/roja
  g.fillStyle(PALETTE.WHITE, 0.7);
  g.fillEllipse(14, 14, 4, 7);

  g.generateTexture('enemy_light', 28, 30);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(14, 29, 27, 4, 1, 4);
  g.fillRect(10, 0, 8, 8);
  g.generateTexture('enemy_light_flash', 28, 30);

  g.destroy();
}

function makeTacticalFighterTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 2. Caza Táctico (Escuadrón Zigzag): 36x36 px
  // Flecha con alas en V y dos motores, casco #3D405B, franjas ámbar #F4A261
  // Dos motores traseros
  g.fillStyle(PALETTE.ENEMY.AMBER_ACCENT, 1);
  g.fillRect(9, 0, 5, 6);
  g.fillRect(22, 0, 5, 6);

  // Alas en V y fuselaje
  g.fillStyle(PALETTE.ENEMY.FIGHTER_HULL, 1);
  g.fillTriangle(18, 35, 35, 8, 1, 8);
  g.fillRect(13, 3, 10, 24);

  // Franjas ámbar (#F4A261)
  g.fillStyle(PALETTE.ENEMY.AMBER_ACCENT, 1);
  g.fillRect(5, 10, 26, 3);
  g.fillRect(16, 6, 4, 22);

  // Cabina
  g.fillStyle(PALETTE.STAGE_1.CLOUD, 0.85);
  g.fillEllipse(18, 19, 5, 8);

  g.generateTexture('enemy_tactical', 36, 36);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRect(9, 0, 5, 6);
  g.fillRect(22, 0, 5, 6);
  g.fillTriangle(18, 35, 35, 8, 1, 8);
  g.fillRect(13, 3, 10, 24);
  g.generateTexture('enemy_tactical_flash', 36, 36);

  g.destroy();
}

function makeHeavyBomberTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 3. Bombardero Pesado (Tanque): 72x64 px
  // Fuselaje largo con alas rectas y anchas, cuatro motores, casco #6D6875, cañones rojos #E63946
  // Alas rectas y anchas
  g.fillStyle(PALETTE.ENEMY.BOMBER_HULL, 1);
  g.fillRoundedRect(2, 18, 68, 22, 4);
  // Cola horizontal
  g.fillRoundedRect(18, 2, 36, 10, 3);
  // Fuselaje central largo
  g.fillRoundedRect(26, 4, 20, 54, 6);

  // Cuatro góndolas de motores
  const engineXs = [8, 20, 46, 58];
  for (const ex of engineXs) {
    g.fillStyle(0x4a4e69, 1);
    g.fillRect(ex, 14, 6, 28);
  }

  // Detalles blindados y cabina
  g.lineStyle(2, 0x4a4e69, 1);
  g.strokeRoundedRect(26, 4, 20, 54, 6);
  g.fillStyle(PALETTE.STAGE_1.CLOUD, 0.8);
  g.fillRoundedRect(30, 42, 12, 8, 2);

  // Cañones rojos frontales (#E63946)
  g.fillStyle(PALETTE.ENEMY.RED_ACCENT, 1);
  g.fillRect(14, 38, 6, 10);
  g.fillRect(52, 38, 6, 10);
  g.fillRect(33, 55, 6, 8);

  g.generateTexture('enemy_bomber', 72, 64);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRoundedRect(2, 18, 68, 22, 4);
  g.fillRoundedRect(18, 2, 36, 10, 3);
  g.fillRoundedRect(26, 4, 20, 54, 6);
  g.fillRect(14, 38, 6, 10);
  g.fillRect(52, 38, 6, 10);
  g.fillRect(33, 55, 6, 8);
  g.generateTexture('enemy_bomber_flash', 72, 64);

  // Halo circular semitransparente que gira en cada motor (Sección 10.6)
  g.clear();
  g.lineStyle(1.5, PALETTE.WHITE, 0.45);
  g.strokeCircle(8, 8, 7);
  g.fillStyle(PALETTE.WHITE, 0.35);
  g.fillRect(1, 7, 14, 2);
  g.fillRect(7, 1, 2, 14);
  g.generateTexture('bomber_rotor', 16, 16);

  // Destello de aviso en los cañones 0.3 s antes de cada ráfaga
  g.clear();
  g.fillStyle(PALETTE.ENEMY.RED_ACCENT, 0.9);
  g.fillCircle(8, 8, 7);
  g.fillStyle(PALETTE.HAZARD_YELLOW, 1);
  g.fillCircle(8, 8, 4);
  g.generateTexture('bomber_cannon_glow', 16, 16);

  g.destroy();
}

function makeStealthInterceptorTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 4. Interceptor Furtivo: 34x40 px
  // Aguja fina con alas hacia atrás, gris claro #CED4DA
  g.fillStyle(PALETTE.ENEMY.STEALTH_HULL, 1);
  // Aguja central
  g.fillTriangle(17, 39, 23, 4, 11, 4);
  // Alas hacia atrás
  g.fillTriangle(17, 26, 33, 2, 21, 12);
  g.fillTriangle(17, 26, 1, 2, 13, 12);

  // Visor láser rojo en la nariz
  g.fillStyle(PALETTE.ENEMY.RED_ACCENT, 1);
  g.fillEllipse(17, 25, 4, 10);

  g.generateTexture('enemy_stealth', 34, 40);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(17, 39, 23, 4, 11, 4);
  g.fillTriangle(17, 26, 33, 2, 21, 12);
  g.fillTriangle(17, 26, 1, 2, 13, 12);
  g.generateTexture('enemy_stealth_flash', 34, 40);

  g.destroy();
}

function makeMineCorvetteTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 5. Corbeta Porta-Minas: 80x56 px
  // Casco ovalado con bahías de despliegue, casco bronce #A47148, bahías amarillas #FFD60A
  g.fillStyle(PALETTE.ENEMY.CORVETTE_HULL, 1);
  g.fillEllipse(40, 28, 76, 48);
  g.lineStyle(2, 0x6f4e37, 1);
  g.strokeEllipse(40, 28, 76, 48);

  // Bahías de despliegue amarillas (#FFD60A)
  g.fillStyle(PALETTE.ENEMY.YELLOW_ACCENT, 1);
  g.fillRoundedRect(14, 18, 16, 20, 3);
  g.fillRoundedRect(50, 18, 16, 20, 3);

  // Interior oscuro de bahías
  g.fillStyle(PALETTE.UI_PANEL, 0.85);
  g.fillRect(17, 22, 10, 12);
  g.fillRect(53, 22, 10, 12);

  // Puente central y emisor de aura ámbar
  g.fillStyle(PALETTE.ENEMY.AMBER_ACCENT, 1);
  g.fillCircle(40, 28, 8);
  g.fillStyle(PALETTE.WHITE, 0.8);
  g.fillCircle(40, 28, 4);

  g.generateTexture('enemy_corvette', 80, 56);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillEllipse(40, 28, 76, 48);
  g.generateTexture('enemy_corvette_flash', 80, 56);

  g.destroy();
}

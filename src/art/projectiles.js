import { PALETTE } from '../config/palette.js';

/**
 * Genera todas las texturas de proyectiles, misiles, minas, anillos y partículas
 * según las especificaciones exactas de las secciones 10.5 y 10.8.
 */
export function generateProjectileTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // 1. Bala del jugador Nivel 1: 4x14 px (Cápsula cian #48CAE4 con núcleo blanco)
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRoundedRect(0, 0, 4, 14, 2);
  g.fillStyle(PALETTE.WHITE, 0.9);
  g.fillRect(1, 2, 2, 10);
  g.generateTexture('bullet_player_1', 4, 14);

  // Bala del jugador Nivel 2 (Potencia de Fuego): 6x16 px
  g.clear();
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRoundedRect(0, 0, 6, 16, 3);
  g.fillStyle(PALETTE.WHITE, 0.95);
  g.fillRoundedRect(1, 2, 4, 12, 2);
  g.generateTexture('bullet_player_2', 6, 16);

  // Bala del jugador Nivel 3+ (Potencia de Fuego alta): 8x18 px
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 1);
  g.fillRoundedRect(0, 0, 8, 18, 4);
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRoundedRect(1, 1, 6, 16, 3);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRoundedRect(2, 2, 4, 14, 2);
  g.generateTexture('bullet_player_3', 8, 18);

  // 2. Bala del dron: 3x10 px (Cápsula cian más claro)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_COCKPIT, 1);
  g.fillRoundedRect(0, 0, 3, 10, 1.5);
  g.fillStyle(PALETTE.WHITE, 0.95);
  g.fillRect(1, 1, 1, 8);
  g.generateTexture('bullet_drone', 3, 10);

  // 3. Bala enemiga estándar: Círculo 10 px (Naranja #FF6B35, núcleo #FFD6A5, borde #7A1F00)
  g.clear();
  g.fillStyle(PALETTE.DAMAGE_BORDER, 1);
  g.fillCircle(5, 5, 5);
  g.fillStyle(PALETTE.DAMAGE_ORANGE, 1);
  g.fillCircle(5, 5, 4);
  g.fillStyle(PALETTE.DAMAGE_CORE, 1);
  g.fillCircle(5, 5, 2);
  g.generateTexture('bullet_enemy_std', 10, 10);

  // 4. Ráfaga en abanico del Bombardero: Círculo 12 px
  g.clear();
  g.fillStyle(PALETTE.DAMAGE_BORDER, 1);
  g.fillCircle(6, 6, 6);
  g.fillStyle(PALETTE.DAMAGE_ORANGE, 1);
  g.fillCircle(6, 6, 4.8);
  g.fillStyle(PALETTE.DAMAGE_CORE, 1);
  g.fillCircle(6, 6, 2.5);
  g.generateTexture('bullet_enemy_fan', 12, 12);

  // 5. Misil corrosivo (Valkiria): Cápsula con aleta y estela, Violeta #9D4EDD, 12x24 px (cuerpo 8x22)
  g.clear();
  // Estela superior
  g.fillStyle(PALETTE.DEF_LIGHT, 0.65);
  g.fillTriangle(6, 0, 9, 6, 3, 6);
  // Aletas laterales
  g.fillStyle(PALETTE.DEF_DARK, 1);
  g.fillTriangle(6, 10, 12, 18, 0, 18);
  // Cápsula principal 8x18
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillRoundedRect(2, 5, 8, 18, 4);
  // Ojiva clara
  g.fillStyle(PALETTE.DEF_LIGHT, 1);
  g.fillEllipse(6, 18, 4, 6);
  g.generateTexture('missile_corrosive', 12, 24);

  // Flash blanco del misil corrosivo
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillTriangle(6, 10, 12, 18, 0, 18);
  g.fillRoundedRect(2, 5, 8, 18, 4);
  g.generateTexture('missile_corrosive_flash', 12, 24);

  // 6. Mina magnética (Corbeta): Círculo amarillo #FFD60A de 20 px con 6 púas y luz roja (26x26 total)
  const makeMineTexture = (key, lightColor) => {
    g.clear();
    const cx = 13;
    const cy = 13;
    // 6 púas
    g.fillStyle(PALETTE.HAZARD_YELLOW, 1);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const tipX = cx + Math.cos(angle) * 12.5;
      const tipY = cy + Math.sin(angle) * 12.5;
      const b1x = cx + Math.cos(angle - 0.3) * 7;
      const b1y = cy + Math.sin(angle - 0.3) * 7;
      const b2x = cx + Math.cos(angle + 0.3) * 7;
      const b2y = cy + Math.sin(angle + 0.3) * 7;
      g.fillTriangle(tipX, tipY, b1x, b1y, b2x, b2y);
    }
    // Cuerpo circular 20 px (radio 9)
    g.fillStyle(0xb58900, 1);
    g.fillCircle(cx, cy, 9);
    g.fillStyle(PALETTE.HAZARD_YELLOW, 1);
    g.fillCircle(cx, cy, 7.5);
    // Luz central que parpadea
    g.fillStyle(lightColor, 1);
    g.fillCircle(cx, cy, 3.5);
    g.generateTexture(key, 26, 26);
  };

  makeMineTexture('mine_magnetic', PALETTE.ALERT_RED);
  makeMineTexture('mine_magnetic_blink', PALETTE.WHITE);

  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(13, 13, 11);
  g.generateTexture('mine_magnetic_flash', 26, 26);

  // 7. Espiral Sónica (Espectro): Anillo 14 px, Blanco con borde violeta #9D4EDD
  g.clear();
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillCircle(7, 7, 7);
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(7, 7, 5);
  g.fillStyle(PALETTE.DEF_DARK, 1);
  g.fillCircle(7, 7, 2.5);
  g.generateTexture('bullet_sonic_ring', 14, 14);

  // 8. Lluvia ácida (Leviatán): Gota 8x14 px, Violeta #9D4EDD con borde claro #C77DFF
  g.clear();
  g.fillStyle(PALETTE.DEF_LIGHT, 1);
  g.fillTriangle(4, 0, 8, 9, 0, 9);
  g.fillCircle(4, 9, 4);
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillTriangle(4, 2, 6.5, 9, 1.5, 9);
  g.fillCircle(4, 9, 2.8);
  g.generateTexture('bullet_acid_drop', 8, 14);

  // 9. Partículas y anillos auxiliares para FxManager y Escudos
  // Partícula circular básica (8x8)
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle_white', 8, 8);

  g.clear();
  g.fillStyle(PALETTE.HAZARD_YELLOW, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle_yellow', 8, 8);

  g.clear();
  g.fillStyle(PALETTE.DAMAGE_ORANGE, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle_orange', 8, 8);

  g.clear();
  g.fillStyle(PALETTE.DAMAGE_BORDER, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle_brown', 8, 8);

  g.clear();
  g.fillStyle(PALETTE.ENEMY.SMOKE_GRAY, 0.75);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle_smoke', 8, 8);

  g.clear();
  g.fillStyle(PALETTE.DEF_LIGHT, 1);
  g.fillCircle(3, 3, 3);
  g.generateTexture('particle_violet', 6, 6);

  g.clear();
  g.fillStyle(PALETTE.ALERT_RED, 0.9);
  g.fillCircle(3, 3, 3);
  g.generateTexture('particle_red', 6, 6);

  // Anillo blanco expansivo para explosiones grandes (64x64)
  g.clear();
  g.lineStyle(3, PALETTE.WHITE, 0.9);
  g.strokeCircle(32, 32, 28);
  g.generateTexture('fx_ring_white', 64, 64);

  // Anillo violeta de Defensa / Espectro / Leviatán (68x68)
  g.clear();
  g.lineStyle(2.5, PALETTE.DEF_VIOLET, 0.95);
  g.strokeCircle(34, 34, 30);
  g.lineStyle(1, PALETTE.DEF_LIGHT, 0.7);
  g.strokeCircle(34, 34, 27);
  g.generateTexture('fx_ring_violet', 68, 68);

  // Segundo anillo exterior violeta para DEF >= 31 (78x78)
  g.clear();
  g.lineStyle(2, PALETTE.DEF_LIGHT, 0.9);
  g.strokeCircle(39, 39, 36);
  g.generateTexture('fx_ring_violet_outer', 78, 78);

  // Aura cian para el Tonel (68x68)
  g.clear();
  g.fillStyle(PALETTE.PLAYER_CYAN, 0.25);
  g.fillCircle(34, 34, 30);
  g.lineStyle(2, PALETTE.PLAYER_COCKPIT, 0.85);
  g.strokeCircle(34, 34, 30);
  g.generateTexture('fx_aura_cyan', 68, 68);

  // Aro ámbar para Cazas Ligeros acelerados por la Corbeta (36x36)
  g.clear();
  g.lineStyle(2, PALETTE.ENEMY.AMBER_ACCENT, 0.85);
  g.strokeCircle(18, 18, 15);
  g.generateTexture('fx_ring_amber_small', 36, 36);

  // Aura ámbar de la Corbeta Porta-Minas (160x160)
  g.clear();
  g.fillStyle(PALETTE.ENEMY.AMBER_ACCENT, 0.14);
  g.fillCircle(80, 80, 76);
  g.lineStyle(1.5, PALETTE.ENEMY.AMBER_ACCENT, 0.4);
  g.strokeCircle(80, 80, 76);
  g.generateTexture('fx_aura_corvette', 160, 160);

  g.destroy();
}

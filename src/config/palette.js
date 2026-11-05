/**
 * Lenguaje visual y paleta de colores de "1942 Infinite"
 * Basado estrictamente en las secciones 10.2, 10.3, 10.4, 10.5, 10.6 y 10.7
 */

export const PALETTE = {
  // 10.2 Lenguaje de color principal
  PLAYER_CYAN: 0x00b4d8,
  PLAYER_WHITE: 0xe9ecef,
  PLAYER_WING: 0xced4da,
  PLAYER_COCKPIT: 0x48cae4,
  PLAYER_THRUSTER: 0xf4a261,

  DAMAGE_ORANGE: 0xff6b35,
  DAMAGE_CORE: 0xffd6a5,
  DAMAGE_BORDER: 0x7a1f00,

  DEF_VIOLET: 0x9d4edd,
  DEF_LIGHT: 0xc77dff,
  DEF_DARK: 0x3c096c,
  EMP_MAGENTA: 0xff4da6,

  HEAL_GREEN: 0x52b788,
  XP_GOLD: 0xffd166,
  HAZARD_YELLOW: 0xffd60a,
  ALERT_RED: 0xe63946,

  UI_PANEL: 0x0d1b2a,
  UI_BORDER: 0x415a77,
  UI_TEXT: 0xe0e1dd,
  PAUSE_OVERLAY: 0x1b1b1b,
  BASE_BG: 0x05060f,
  WHITE: 0xffffff,
  BLACK: 0x000000,

  // 10.3 Fondos por etapa del ciclo
  STAGE_1: {
    SEA: 0x0e4a7b,
    WAVES: 0x2a8fbd,
    ISLAND: 0x6a994e,
    SAND: 0xe9c46a,
    CLOUD: 0xf2f7fa
  },
  STAGE_2: {
    BASE: 0x2b2d42,
    CLOUD_LIGHT: 0x8d99ae,
    CLOUD_DARK: 0x4a4e69,
    LIGHTNING: 0xffffff
  },
  STAGE_3: {
    BASE: 0x05060f,
    STAR_WHITE: 0xffffff,
    STAR_BLUE: 0x9fb8ff,
    NEBULA: 0x1a2238,
    PLANET: 0x1b3a6b,
    ATMOSPHERE: 0x4cc9f0
  },

  // 10.4 Capas de color por sector
  SECTOR_TINTS: [
    0xe76f51, // Sector 2 (y 5, 8...)
    0x2a9d8f, // Sector 3 (y 6, 9...)
    0xe9c46a  // Sector 4 (y 7, 10...)
  ],

  // 10.6 Enemigos comunes
  ENEMY: {
    FIGHTER_HULL: 0x3d405b,
    BOMBER_HULL: 0x6d6875,
    STEALTH_HULL: 0xced4da,
    CORVETTE_HULL: 0xa47148,
    AMBER_ACCENT: 0xf4a261,
    RED_ACCENT: 0xe63946,
    YELLOW_ACCENT: 0xffd60a,
    SMOKE_GRAY: 0x8d99ae
  },

  // 10.7 Jefes
  BOSS: {
    VALKIRIA_HULL: 0x4a5568,
    VALKIRIA_DETAIL: 0xa0aec0,
    VALKIRIA_CORE: 0xe63946,
    VALKIRIA_DEAD_PART: 0x2d3748,

    ESPECTRO_HULL: 0xb8b8d1,
    ESPECTRO_BORDER: 0x9d4edd,
    ESPECTRO_CORE: 0xffffff,

    LEVIATAN_BODY: 0x22223b,
    LEVIATAN_RING: 0x4a4e69,
    LEVIATAN_LIGHT: 0xf4a261,
    LEVIATAN_DRONE: 0x778da9
  }
};

export const HEX = {
  PLAYER_CYAN: '#00B4D8',
  PLAYER_WHITE: '#E9ECEF',
  PLAYER_COCKPIT: '#48CAE4',
  PLAYER_THRUSTER: '#F4A261',
  DAMAGE_ORANGE: '#FF6B35',
  DAMAGE_CORE: '#FFD6A5',
  DAMAGE_BORDER: '#7A1F00',
  DEF_VIOLET: '#9D4EDD',
  DEF_LIGHT: '#C77DFF',
  EMP_MAGENTA: '#FF4DA6',
  HEAL_GREEN: '#52B788',
  XP_GOLD: '#FFD166',
  HAZARD_YELLOW: '#FFD60A',
  ALERT_RED: '#E63946',
  UI_PANEL: '#0D1B2A',
  UI_BORDER: '#415A77',
  UI_TEXT: '#E0E1DD',
  PAUSE_OVERLAY: '#1B1B1B',
  BASE_BG: '#05060F',
  WHITE: '#FFFFFF'
};

/**
 * Devuelve el color y la opacidad de la capa de Sector según la sección 10.4
 * @param {number} sector Nivel de sector (1, 2, 3...)
 */
export function getSectorOverlayConfig(sector) {
  if (!sector || sector <= 1) {
    return { color: 0x000000, alpha: 0 };
  }
  const index = (sector - 2) % PALETTE.SECTOR_TINTS.length;
  return {
    color: PALETTE.SECTOR_TINTS[index],
    alpha: 0.12
  };
}

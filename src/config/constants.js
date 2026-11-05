/**
 * Constantes globales, fórmulas matemáticas de defensa logarítmica,
 * escalado por sector, límites de movimiento y tablas de estadísticas.
 */

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

// Sección 3: Límites de movimiento del jugador (40% inferior de la pantalla)
export const PLAYER_BOUNDS = {
  MIN_X: 24,
  MAX_X: GAME_WIDTH - 24,
  MIN_Y: 432, // 60% de 720 = 432 px (restringido al 40% inferior)
  MAX_Y: 700
};

export const PLAYER_CONFIG = {
  WIDTH: 48,
  HEIGHT: 60,
  HITBOX_RATIO: 0.6,
  SPEED: 250,
  MAX_HP: 100,
  INITIAL_DEF: 3, // Inicia con 3 unidades de defensa (30% de mitigación inicial)
  BASE_FIRE_INTERVAL_MS: 190,
  BASE_BULLET_DAMAGE: 14,
  FIREPOWER_UPGRADE_MULT: 1.10, // +10% de daño por nivel (reducido desde +20%)
  BASE_BULLET_SPEED: 540,
  DRONE_FIRE_INTERVAL_MS: 340,
  DRONE_BULLET_DAMAGE_RATIO: 0.50,
  TONEL_DURATION_MS: 1500,
  TONEL_COOLDOWN_MS: 12000,
  HIT_INVULN_MS: 1500,
  BOSS_COLLISION_INVULN_MS: 400,
  EMP_DISABLE_MS: 1500,
  MAX_FIRE_LINES: 5,
  MAX_DRONES: 2
};

export const COMBAT_LIMITS = {
  MAX_ENEMY_BULLETS: 320,
  MAX_PLAYER_BULLETS: 180,
  BULLET_HITBOX_RATIO: 0.6,
  SMOKE_HP_THRESHOLD: 0.30,
  LOW_HP_THRESHOLD: 25
};

// Sección 6 y 7: Distancia y progresión
export const PROGRESSION = {
  BOSS_DISTANCE_INTERVAL: 5000,
  CYCLE_DISTANCE: 15000,
  METERS_PER_SECOND: 125, // ~40 segundos de acción intensa por cada 5.000 m
  BASE_XP_REQUIRED: 145,
  XP_GROWTH_FACTOR: 1.35,
  MISSION_ODD_HEAL_PERCENT: 15, // Recompensa reducida: +15% de Vida en misiones impares
  MISSION_EVEN_XP_RATIO: 0.35   // Recompensa reducida: +35% de XP en misiones pares
};

/**
 * Sección 4.2: Defensa con Rendimiento Decreciente (Función Logarítmica)
 * Mitigación = min(0.75, 0.15 * log2(1 + DEF))
 * @param {number} def Puntos de Defensa actuales (>= 0)
 * @returns {number} Fracción de mitigación entre 0 y 0.75
 */
export function calculateMitigation(def) {
  const safeDef = Math.max(0, Number(def) || 0);
  const raw = 0.15 * Math.log2(1 + safeDef);
  return Math.min(0.75, Math.max(0, raw));
}

/**
 * Devuelve el porcentaje entero de mitigación (0% a 75%) para mostrar en HUD
 * @param {number} def Puntos de Defensa actuales
 * @returns {number} Porcentaje redondeado (ej. 15, 30, 45, 60, 75)
 */
export function calculateMitigationPercent(def) {
  return Math.round(calculateMitigation(def) * 100);
}

/**
 * Sección 7.1: Multiplicadores acumulativos por Sector (S >= 1)
 * - Vida de Enemigos y Jefes: +15% por sector adicional
 * - Velocidad de Proyectiles Enemigos: +10% por sector (tope +60%)
 * - Daño Enemigo: +4% por sector
 * @param {number} sector Nivel de sector actual (inicia en 1)
 */
export function getSectorMultipliers(sector = 1) {
  const steps = Math.max(0, (Number(sector) || 1) - 1);
  return {
    hp: Number((1 + 0.15 * steps).toFixed(4)),
    bulletSpeed: Number(Math.min(1.60, 1 + 0.10 * steps).toFixed(4)),
    damage: Number((1 + 0.04 * steps).toFixed(4))
  };
}

/**
 * Sección 4.2 y 7.1: Calcula el daño final recibido por el jugador
 * Daño Final = (Daño Base Enemigo * Multiplicador Sector) * (1 - Mitigación)
 * @param {number} baseDamage Daño porcentual base del enemigo
 * @param {number} def Puntos de Defensa actuales del jugador
 * @param {number} sector Nivel de sector actual (1+)
 * @returns {number} Daño final porcentual
 */
export function calculateFinalDamage(baseDamage, def, sector = 1) {
  const { damage: sectorDamageMult } = getSectorMultipliers(sector);
  const mitigation = calculateMitigation(def);
  const scaledBase = Math.max(0, Number(baseDamage) || 0) * sectorDamageMult;
  return Number((scaledBase * (1 - mitigation)).toFixed(2));
}

/**
 * Determina el umbral visual del anillo de Defensa según la sección 10.5
 * Umbrales: 0 (sin anillo), 1, 3, 7, 15, 31 (doble anillo)
 * @param {number} def Puntos de Defensa actuales
 */
export function getDefenseRingTier(def) {
  const safeDef = Math.max(0, Number(def) || 0);
  if (safeDef >= 31) return 5;
  if (safeDef >= 15) return 4;
  if (safeDef >= 7) return 3;
  if (safeDef >= 3) return 2;
  if (safeDef >= 1) return 1;
  return 0;
}

// Sección 5: Estadísticas base de los 5 Arquetipos de Enemigos Comunes (Incrementadas)
export const ENEMY_STATS = {
  LIGHT_FIGHTER: {
    id: 'LIGHT_FIGHTER',
    name: 'Caza Ligero',
    hp: 35,
    collisionDamage: 16,
    bulletDamage: 0,
    speed: 255,
    width: 28,
    height: 30,
    score: 100,
    xp: 15
  },
  TACTICAL_FIGHTER: {
    id: 'TACTICAL_FIGHTER',
    name: 'Caza Táctico',
    hp: 75,
    collisionDamage: 16,
    bulletDamage: 14,
    speed: 145,
    bulletSpeed: 250,
    fireIntervalMs: 1350,
    width: 36,
    height: 36,
    score: 180,
    xp: 24
  },
  HEAVY_BOMBER: {
    id: 'HEAVY_BOMBER',
    name: 'Bombardero Pesado',
    hp: 320,
    collisionDamage: 24,
    bulletDamage: 20,
    speed: 68,
    bulletSpeed: 175,
    fireIntervalMs: 2100,
    telegraphMs: 300,
    fanCount: 5,
    width: 72,
    height: 64,
    score: 450,
    xp: 60
  },
  STEALTH_INTERCEPTOR: {
    id: 'STEALTH_INTERCEPTOR',
    name: 'Interceptor Furtivo',
    hp: 65,
    collisionDamage: 22,
    dashDamage: 22,
    bulletDamage: 18,
    speed: 190,
    dashSpeed: 500,
    bulletSpeed: 320,
    brakeDurationMs: 800,
    stealthAlpha: 0.35,
    activeAlpha: 0.90,
    width: 34,
    height: 40,
    score: 260,
    xp: 35
  },
  MINE_CORVETTE: {
    id: 'MINE_CORVETTE',
    name: 'Corbeta Porta-Minas',
    hp: 260,
    collisionDamage: 22,
    mineHp: 30,
    mineDamage: 25,
    speed: 78,
    mineSpeed: 105,
    minePullSpeed: 48,
    mineDropIntervalMs: 1800,
    auraRadius: 165,
    auraSpeedBoost: 1.25,
    width: 80,
    height: 56,
    score: 400,
    xp: 50,
    mineScore: 60,
    mineXp: 10
  }
};

// Sección 6: Estadísticas base de los 3 Jefes de Sector (Vida incrementada en gran medida)
export const BOSS_STATS = {
  VALKIRIA: {
    id: 'VALKIRIA',
    name: 'ACORAZADO AÉREO "VALKIRIA"',
    shortName: 'VALKIRIA',
    stage: 1,
    width: 240,
    height: 110,
    coreHp: 4200,
    cannonHp: 1150, // 2 cañones laterales independientes (total = 6500 HP)
    collisionDamage: 16,
    collisionDefLoss: 1,
    bulletDamage: 15,
    missileHp: 45,
    missileDamage: 18,
    missileDefLoss: 2,
    missileSpeed: 145,
    escortIntervalMs: 7000,
    score: 3000,
    xp: 180
  },
  ESPECTRO: {
    id: 'ESPECTRO',
    name: 'CRUCERO FANTASMA "ESPECTRO"',
    shortName: 'ESPECTRO',
    stage: 2,
    width: 180,
    height: 120,
    hp: 7500,
    collisionDamage: 18,
    collisionDefLoss: 1,
    empTelegraphMs: 1000,
    empDisableMs: 1500,
    empDefLossRatio: 0.30, // Elimina el 30% de los puntos de Defensa actuales
    empDamage: 18,
    spiralDamage: 15,
    spiralBulletSpeed: 195,
    score: 4500,
    xp: 240
  },
  LEVIATAN: {
    id: 'LEVIATAN',
    name: 'FORTALEZA ORBITAL "LEVIATÁN"',
    shortName: 'LEVIATÁN',
    stage: 3,
    width: 220,
    height: 220,
    hp: 9800,
    collisionDamage: 12, // Cada roce quita 12% de vida y -1 DEF
    collisionDefLoss: 1,
    gravityDurationMs: 4000,
    gravityPullForce: 155,
    acidDamage: 15,
    acidDefLoss: 1,
    acidBulletSpeed: 180,
    droneCount: 4,
    droneHp: 260,
    score: 6000,
    xp: 320
  }
};

// Sección 7.3: Definición de las 6 Mejoras de la Nave
export const UPGRADES = [
  {
    id: 'MULTISHOT',
    name: 'CAÑÓN MÚLTIPLE',
    desc: 'Añade líneas de fuego',
    valueText: '+1 CAÑÓN',
    category: 'attack',
    maxLevel: 4 // Base 1 + 4 mejoras = 5 líneas de fuego
  },
  {
    id: 'TURBO_CADENCE',
    name: 'CADENCIA TURBO',
    desc: 'Velocidad de disparo',
    valueText: '+15% VEL',
    category: 'attack',
    maxLevel: 10
  },
  {
    id: 'REACTIVE_ARMOR',
    name: 'BLINDAJE REACTIVO',
    desc: 'Mitigación logarítmica',
    valueText: '+3 DEF',
    category: 'defense',
    maxLevel: 99
  },
  {
    id: 'FIREPOWER',
    name: 'POTENCIA DE FUEGO',
    desc: 'Daño por proyectil',
    valueText: '+10% DAÑO',
    category: 'attack',
    maxLevel: 10
  },
  {
    id: 'WINGMAN_DRONE',
    name: 'DRON SATÉLITE',
    desc: 'Dron lateral automático',
    valueText: '+1 DRON',
    category: 'attack',
    maxLevel: 2 // Hasta 2 drones laterales
  },
  {
    id: 'REPAIR_KIT',
    name: 'KIT DE REPARACIÓN',
    desc: 'Reparación de emergencia',
    valueText: '+35% VIDA',
    category: 'heal',
    maxLevel: 99
  }
];

export const STORAGE_KEY = 'shmup_1942_infinite_records_v1';

export const ALL_ENEMY_ARCHETYPES = [
  'LIGHT_FIGHTER',
  'TACTICAL_FIGHTER',
  'HEAVY_BOMBER',
  'STEALTH_INTERCEPTOR',
  'MINE_CORVETTE'
];

export const FORMATION_ALIGNMENTS = [
  'V_WEDGE',
  'INVERTED_V',
  'LINE_ABREAST',
  'ECHELON_LEFT',
  'ECHELON_RIGHT',
  'DOUBLE_COLUMN',
  'DIAMOND',
  'PINCER'
];

/**
 * Calcula las coordenadas geométricas (x, y) de una alineación de enemigos.
 */
export function computeAlignmentPositions(
  alignment,
  count,
  centerX = GAME_WIDTH / 2,
  startY = -36,
  spacingX = 48,
  spacingY = 36
) {
  const safeCount = Math.max(1, Math.floor(count));
  const minX = 36;
  const maxX = GAME_WIDTH - 36;
  const clampX = (x) => Math.max(minX, Math.min(maxX, Math.round(x)));
  const positions = [];

  switch (alignment) {
    case 'V_WEDGE': {
      for (let i = 0; i < safeCount; i++) {
        if (i === 0) {
          positions.push({ x: clampX(centerX), y: startY, row: 0, side: 0 });
        } else {
          const rank = Math.ceil(i / 2);
          const side = i % 2 === 1 ? -1 : 1;
          positions.push({
            x: clampX(centerX + side * rank * spacingX),
            y: startY - rank * spacingY,
            row: rank,
            side
          });
        }
      }
      break;
    }

    case 'INVERTED_V': {
      const maxRank = Math.ceil((safeCount - 1) / 2);
      for (let i = 0; i < safeCount; i++) {
        if (i === 0) {
          positions.push({
            x: clampX(centerX),
            y: startY - maxRank * spacingY,
            row: maxRank,
            side: 0
          });
        } else {
          const rank = Math.ceil(i / 2);
          const side = i % 2 === 1 ? -1 : 1;
          positions.push({
            x: clampX(centerX + side * rank * spacingX),
            y: startY - (maxRank - rank) * spacingY,
            row: maxRank - rank,
            side
          });
        }
      }
      break;
    }

    case 'LINE_ABREAST': {
      const totalSpan = (safeCount - 1) * spacingX;
      const clampedCenter = Math.max(
        minX + totalSpan / 2,
        Math.min(maxX - totalSpan / 2, centerX)
      );
      for (let i = 0; i < safeCount; i++) {
        const offset = (i - (safeCount - 1) / 2) * spacingX;
        positions.push({
          x: clampX(clampedCenter + offset),
          y: startY - (i % 2) * 8,
          row: 0,
          side: Math.sign(offset)
        });
      }
      break;
    }

    case 'ECHELON_LEFT': {
      const startX = Math.max(
        minX + 10,
        Math.min(maxX - safeCount * spacingX, centerX - (safeCount * spacingX) / 2)
      );
      for (let i = 0; i < safeCount; i++) {
        positions.push({
          x: clampX(startX + i * spacingX),
          y: startY - i * spacingY,
          row: i,
          side: -1
        });
      }
      break;
    }

    case 'ECHELON_RIGHT': {
      const startX = Math.min(
        maxX - 10,
        Math.max(minX + safeCount * spacingX, centerX + (safeCount * spacingX) / 2)
      );
      for (let i = 0; i < safeCount; i++) {
        positions.push({
          x: clampX(startX - i * spacingX),
          y: startY - i * spacingY,
          row: i,
          side: 1
        });
      }
      break;
    }

    case 'DOUBLE_COLUMN': {
      const halfSpan = Math.max(28, spacingX * 0.75);
      for (let i = 0; i < safeCount; i++) {
        const col = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        positions.push({
          x: clampX(centerX + col * halfSpan),
          y: startY - row * spacingY,
          row,
          side: col
        });
      }
      break;
    }

    case 'DIAMOND': {
      const diamondOffsets = [
        { dx: 0, dy: 0, side: 0 },
        { dx: -spacingX, dy: -spacingY, side: -1 },
        { dx: spacingX, dy: -spacingY, side: 1 },
        { dx: 0, dy: -spacingY * 2, side: 0 },
        { dx: 0, dy: -spacingY, side: 0 },
        { dx: -spacingX * 1.6, dy: -spacingY * 2, side: -1 },
        { dx: spacingX * 1.6, dy: -spacingY * 2, side: 1 }
      ];
      for (let i = 0; i < safeCount; i++) {
        const pat = diamondOffsets[i % diamondOffsets.length];
        const extraY = Math.floor(i / diamondOffsets.length) * spacingY * 2.5;
        positions.push({
          x: clampX(centerX + pat.dx),
          y: startY + pat.dy - extraY,
          row: i,
          side: pat.side
        });
      }
      break;
    }

    case 'PINCER':
    default: {
      for (let i = 0; i < safeCount; i++) {
        const isLeft = i % 2 === 0;
        const rank = Math.floor(i / 2);
        const x = isLeft
          ? minX + 18 + rank * (spacingX * 0.65)
          : maxX - 18 - rank * (spacingX * 0.65);
        positions.push({
          x: clampX(x),
          y: startY - rank * spacingY,
          row: rank,
          side: isLeft ? -1 : 1
        });
      }
      break;
    }
  }

  return positions;
}

/**
 * Devuelve qué jefe corresponde según el índice de jefe (0 -> VALKIRIA, 1 -> ESPECTRO, 2 -> LEVIATAN, 3 -> VALKIRIA...)
 * @param {number} bossCount Cantidad de jefes previos derrotados (0, 1, 2, 3...)
 * @returns {'VALKIRIA' | 'ESPECTRO' | 'LEVIATAN'}
 */
export function getBossIdForIndex(bossCount) {
  const cycle = ['VALKIRIA', 'ESPECTRO', 'LEVIATAN'];
  return cycle[Math.max(0, Number(bossCount) || 0) % cycle.length];
}

/**
 * Guarda y compara los récords de la partida en localStorage (Sección 2 y 10.9)
 * @param {{ score: number, distance: number, sector: number }} current
 * @param {Storage} storage Instancia de almacenamiento
 */
export function saveAndCompareRecords(current, storage = globalThis.localStorage) {
  let prev = { highScore: 0, maxDistance: 0, maxSector: 1 };
  try {
    if (storage) {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        prev = {
          highScore: Number(parsed.highScore) || 0,
          maxDistance: Number(parsed.maxDistance) || 0,
          maxSector: Number(parsed.maxSector) || 1
        };
      }
    }
  } catch {
    // Ignorar errores de lectura
  }

  const score = Math.floor(Number(current?.score) || 0);
  const distance = Math.floor(Number(current?.distance) || 0);
  const sector = Math.max(1, Math.floor(Number(current?.sector) || 1));

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
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignorar errores de escritura
  }

  return {
    isNewRecord,
    records: updated
  };
}


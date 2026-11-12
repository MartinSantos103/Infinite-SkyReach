import { describe, it, expect } from 'vitest';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_BOUNDS,
  PLAYER_CONFIG,
  PROGRESSION,
  ENEMY_STATS,
  BOSS_STATS,
  UPGRADES,
  calculateMitigation,
  calculateMitigationPercent,
  getSectorMultipliers,
  calculateFinalDamage,
  getDefenseRingTier,
  getBossIdForIndex,
  saveAndCompareRecords,
  ALL_ENEMY_ARCHETYPES,
  FORMATION_ALIGNMENTS,
  computeAlignmentPositions
} from '../src/config/constants.js';
import { getSectorOverlayConfig, PALETTE } from '../src/config/palette.js';
import { MissionManager } from '../src/systems/MissionManager.js';

describe('1942 Infinite — Especificación Técnica y Fórmulas Matemáticas', () => {
  it('verifica resolución base 480x720 y restricción vertical al 40% inferior (432..700 px)', () => {
    expect(GAME_WIDTH).toBe(480);
    expect(GAME_HEIGHT).toBe(720);
    expect(PLAYER_BOUNDS.MIN_Y).toBe(432); // 720 * 0.60 = 432 (40% inferior)
    expect(PLAYER_BOUNDS.MAX_Y).toBe(700);
    expect(PLAYER_CONFIG.INITIAL_DEF).toBe(3);
    expect(PLAYER_CONFIG.TONEL_DURATION_MS).toBe(1500);
    expect(PLAYER_CONFIG.TONEL_COOLDOWN_MS).toBe(12000);
    expect(PLAYER_CONFIG.HIT_INVULN_MS).toBe(1500);
    expect(PLAYER_CONFIG.BOSS_COLLISION_INVULN_MS).toBe(400);
  });

  it('verifica la tabla de referencia de Defensa Logarítmica (Sección 4.2)', () => {
    // Tabla exacta de la especificación:
    // 0 DEF = 0%, 1 DEF = 15%, 3 DEF = 30%, 7 DEF = 45%, 15 DEF = 60%, >= 31 DEF = 75%
    expect(calculateMitigationPercent(0)).toBe(0);
    expect(calculateMitigationPercent(1)).toBe(15);
    expect(calculateMitigationPercent(3)).toBe(30);
    expect(calculateMitigationPercent(7)).toBe(45);
    expect(calculateMitigationPercent(15)).toBe(60);
    expect(calculateMitigationPercent(31)).toBe(75);
    expect(calculateMitigationPercent(63)).toBe(75); // Tope máximo 75%
    expect(calculateMitigation(-5)).toBe(0);
  });

  it('verifica umbrales visuales del anillo de Defensa (Sección 10.5)', () => {
    expect(getDefenseRingTier(0)).toBe(0);
    expect(getDefenseRingTier(1)).toBe(1);
    expect(getDefenseRingTier(3)).toBe(2);
    expect(getDefenseRingTier(7)).toBe(3);
    expect(getDefenseRingTier(15)).toBe(4);
    expect(getDefenseRingTier(31)).toBe(5);
  });

  it('verifica escalado infinito por Sector (Sección 7.1)', () => {
    // Sector 1: multiplicadores base (1.0)
    expect(getSectorMultipliers(1)).toEqual({
      hp: 1,
      bulletSpeed: 1,
      damage: 1
    });

    // Sector 2: +15% HP, +10% vel proyectil, +4% daño
    expect(getSectorMultipliers(2)).toEqual({
      hp: 1.15,
      bulletSpeed: 1.1,
      damage: 1.04
    });

    // Sector 3: +30% HP, +20% vel proyectil, +8% daño
    expect(getSectorMultipliers(3)).toEqual({
      hp: 1.3,
      bulletSpeed: 1.2,
      damage: 1.08
    });

    // Sector 8 (7 pasos): vel proyectil topada en +60% (1.60)
    const s8 = getSectorMultipliers(8);
    expect(s8.bulletSpeed).toBe(1.6);
    expect(s8.hp).toBeCloseTo(2.05, 4);
    expect(s8.damage).toBeCloseTo(1.28, 4);
  });

  it('calcula correctamente el Daño Final con Mitigación y Sector', () => {
    // 20% daño base con 3 DEF (30% mitigación) en Sector 1 => 20 * 0.70 = 14%
    expect(calculateFinalDamage(20, 3, 1)).toBe(14);
    // 20% daño base con 31 DEF (75% mitigación) en Sector 1 => 20 * 0.25 = 5%
    expect(calculateFinalDamage(20, 31, 1)).toBe(5);
  });

  it('verifica estadísticas base incrementadas de los 5 Arquetipos, vida masiva de los 3 Jefes y mejora de daño reducida', () => {
    expect(ENEMY_STATS.LIGHT_FIGHTER.hp).toBe(35);
    expect(ENEMY_STATS.LIGHT_FIGHTER.collisionDamage).toBe(16);
    expect(ENEMY_STATS.LIGHT_FIGHTER.speed).toBe(255);

    expect(ENEMY_STATS.TACTICAL_FIGHTER.hp).toBe(75);
    expect(ENEMY_STATS.TACTICAL_FIGHTER.bulletDamage).toBe(14);
    expect(ENEMY_STATS.TACTICAL_FIGHTER.speed).toBe(145);

    expect(ENEMY_STATS.HEAVY_BOMBER.hp).toBe(320);
    expect(ENEMY_STATS.HEAVY_BOMBER.bulletDamage).toBe(20);
    expect(ENEMY_STATS.HEAVY_BOMBER.fanCount).toBe(5);

    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.hp).toBe(65);
    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.bulletDamage).toBe(18);
    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.dashDamage).toBe(22);
    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.stealthAlpha).toBe(0.35);
    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.brakeDurationMs).toBe(800);

    expect(ENEMY_STATS.MINE_CORVETTE.hp).toBe(260);
    expect(ENEMY_STATS.MINE_CORVETTE.mineHp).toBe(30);
    expect(ENEMY_STATS.MINE_CORVETTE.mineDamage).toBe(25);
    expect(ENEMY_STATS.MINE_CORVETTE.auraSpeedBoost).toBe(1.25);

    // Vida de jefes incrementada en gran medida
    expect(BOSS_STATS.VALKIRIA.coreHp).toBe(4200);
    expect(BOSS_STATS.VALKIRIA.cannonHp).toBe(1150);
    expect(BOSS_STATS.VALKIRIA.missileDamage).toBe(18);
    expect(BOSS_STATS.VALKIRIA.missileDefLoss).toBe(2);
    expect(BOSS_STATS.VALKIRIA.missileLifetimeMs).toBe(5000);

    expect(BOSS_STATS.ESPECTRO.hp).toBe(7500);
    expect(BOSS_STATS.ESPECTRO.empTelegraphMs).toBe(1000);
    expect(BOSS_STATS.ESPECTRO.empDisableMs).toBe(1500);
    expect(BOSS_STATS.ESPECTRO.empDefLossRatio).toBe(0.3);

    expect(BOSS_STATS.LEVIATAN.hp).toBe(9800);
    expect(BOSS_STATS.LEVIATAN.droneHp).toBe(260);
    expect(BOSS_STATS.LEVIATAN.gravityDurationMs).toBe(4000);
    expect(BOSS_STATS.LEVIATAN.collisionDefLoss).toBe(1);
    expect(BOSS_STATS.LEVIATAN.acidDefLoss).toBe(1);
    expect(BOSS_STATS.LEVIATAN.droneCount).toBe(4);

    // Mejora de daño reducida a +10% DAÑO
    expect(PLAYER_CONFIG.FIREPOWER_UPGRADE_MULT).toBe(1.10);
    const fpUpgrade = UPGRADES.find((u) => u.id === 'FIREPOWER');
    expect(fpUpgrade.valueText).toBe('+10% DAÑO');
    expect(UPGRADES.length).toBe(6);
  });

  it('verifica dificultad moderada de misiones, escalado por ciclo (+15%) y recompensas reducidas en MissionManager', () => {
    expect(PROGRESSION.MISSION_ODD_HEAL_PERCENT).toBe(15);
    expect(PROGRESSION.MISSION_EVEN_XP_RATIO).toBe(0.35);

    const mm = new MissionManager(null);

    // Misión 1 (Impar): Recompensa +VIDA (15%) y objetivo 25
    expect(mm.missionNumber).toBe(1);
    expect(mm.currentMission.target).toBe(25);
    expect(mm.getRewardType()).toBe('HEAL');
    expect(mm.getRewardLabel()).toBe('+VIDA (15%)');

    // Completar misión 1 -> pasa a Misión 2 (Par): Recompensa +XP (35%) y objetivo 7 Bombarderos
    mm.advanceProgress(mm.currentMission.target);
    expect(mm.missionNumber).toBe(2);
    expect(mm.currentMission.target).toBe(7);
    expect(mm.getRewardType()).toBe('XP');
    expect(mm.getRewardLabel()).toBe('+XP (35%)');

    // Completar misiones 2, 3, 4 y 5 -> Misión 6 inicia el segundo ciclo con +15% dificultad (25 * 1.15 = 29)
    mm.advanceProgress(mm.currentMission.target); // -> 3
    expect(mm.missionNumber).toBe(3);
    expect(mm.getRewardType()).toBe('HEAL');
    mm.advanceProgress(mm.currentMission.target); // -> 4
    mm.advanceProgress(mm.currentMission.target); // -> 5
    mm.advanceProgress(mm.currentMission.target); // -> 6
    expect(mm.missionNumber).toBe(6);
    expect(mm.currentMission.target).toBe(Math.round(25 * 1.15));
  });

  it('verifica el ciclo de Jefes y capas visuales de Sector (Secciones 6 y 10.4)', () => {
    expect(getBossIdForIndex(0)).toBe('VALKIRIA');
    expect(getBossIdForIndex(1)).toBe('ESPECTRO');
    expect(getBossIdForIndex(2)).toBe('LEVIATAN');
    expect(getBossIdForIndex(3)).toBe('VALKIRIA');

    expect(getSectorOverlayConfig(1)).toEqual({ color: 0x000000, alpha: 0 });
    expect(getSectorOverlayConfig(2)).toEqual({ color: PALETTE.SECTOR_TINTS[0], alpha: 0.12 });
    expect(getSectorOverlayConfig(3)).toEqual({ color: PALETTE.SECTOR_TINTS[1], alpha: 0.12 });
    expect(getSectorOverlayConfig(4)).toEqual({ color: PALETTE.SECTOR_TINTS[2], alpha: 0.12 });
    expect(getSectorOverlayConfig(5)).toEqual({ color: PALETTE.SECTOR_TINTS[0], alpha: 0.12 });
  });

  it('verifica el guardado y comparación de récords en localStorage', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v)
    };

    const first = saveAndCompareRecords({ score: 1500, distance: 5200, sector: 2 }, mockStorage);
    expect(first.isNewRecord).toBe(true);
    expect(first.records).toEqual({ highScore: 1500, maxDistance: 5200, maxSector: 2 });

    const second = saveAndCompareRecords({ score: 900, distance: 3100, sector: 1 }, mockStorage);
    expect(second.isNewRecord).toBe(false);
    expect(second.records).toEqual({ highScore: 1500, maxDistance: 5200, maxSector: 2 });
  });

  it('verifica las 8 alineaciones de formación de enemigos y los 5 arquetipos del bestiario', () => {
    expect(ALL_ENEMY_ARCHETYPES).toEqual([
      'LIGHT_FIGHTER',
      'TACTICAL_FIGHTER',
      'HEAVY_BOMBER',
      'STEALTH_INTERCEPTOR',
      'MINE_CORVETTE'
    ]);

    for (const align of FORMATION_ALIGNMENTS) {
      const pts = computeAlignmentPositions(align, 5, 240, -36, 44, 34);
      expect(pts.length).toBe(5);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(36);
        expect(p.x).toBeLessThanOrEqual(GAME_WIDTH - 36);
        expect(p.y).toBeLessThanOrEqual(-36);
      }
    }

    // Verificar simetría de V_WEDGE con 5 naves centradas en 240
    const vWedge = computeAlignmentPositions('V_WEDGE', 5, 240, -36, 40, 30);
    expect(vWedge[0].x).toBe(240);
    expect(vWedge[1].x).toBe(200);
    expect(vWedge[2].x).toBe(280);
    expect(vWedge[3].x).toBe(160);
    expect(vWedge[4].x).toBe(320);
  });
});

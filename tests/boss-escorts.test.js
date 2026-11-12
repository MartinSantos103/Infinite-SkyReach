import { describe, it, expect } from 'vitest';
import { BOSS_STATS, ENEMY_STATS, GAME_WIDTH, GAME_HEIGHT } from '../src/config/constants.js';

describe('Jefes de Sector — Configuración y Escoltas de Aviones Acompañantes', () => {
  it('verifica que los tres jefes tienen intervalos de despliegue de escoltas configurados correctamente', () => {
    // 1. Valkiria (Acorazado Aéreo - Sector 1)
    expect(BOSS_STATS.VALKIRIA.escortIntervalMs).toBeDefined();
    expect(BOSS_STATS.VALKIRIA.escortIntervalMs).toBe(7000);

    // 2. Espectro (Crucero Fantasma - Sector 2)
    expect(BOSS_STATS.ESPECTRO.escortIntervalMs).toBeDefined();
    expect(BOSS_STATS.ESPECTRO.escortIntervalMs).toBe(8000);

    // 3. Leviatán (Fortaleza Orbital - Sector 3)
    expect(BOSS_STATS.LEVIATAN.escortIntervalMs).toBeDefined();
    expect(BOSS_STATS.LEVIATAN.escortIntervalMs).toBe(9000);
  });

  it('verifica que las velocidades de los arquetipos de escolta sean positivas y suficientes para descender activamente', () => {
    expect(ENEMY_STATS.LIGHT_FIGHTER.speed).toBeGreaterThanOrEqual(200);
    expect(ENEMY_STATS.TACTICAL_FIGHTER.speed).toBeGreaterThanOrEqual(120);
    expect(ENEMY_STATS.STEALTH_INTERCEPTOR.speed).toBeGreaterThanOrEqual(180);
    expect(ENEMY_STATS.HEAVY_BOMBER.speed).toBeGreaterThanOrEqual(65);
  });

  it('calcula la trayectoria diagonal y descendente de los cazas ligeros de escolta', () => {
    // Simular el cálculo de vector de LightFighter desde el centro superior
    const startX = 240;
    const startY = 100;
    const targetX = 180;
    const targetY = 620;

    const dx = Math.max(-190, Math.min(190, targetX - startX));
    const dy = Math.max(240, targetY - startY);
    const len = Math.hypot(dx, dy);

    const dirX = dx / len;
    const dirY = dy / len;

    expect(dirY).toBeGreaterThan(0.7); // Componente vertical dominante
    expect(dirX).toBeLessThan(0); // Se dirige hacia la izquierda (targetX < startX)
    expect(Math.hypot(dirX, dirY)).toBeCloseTo(1, 4); // Vector unitario
  });
});

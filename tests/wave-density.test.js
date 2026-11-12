import { describe, it, expect, vi } from 'vitest';

// Simular entorno mínimo de ventana y Phaser para pruebas unitarias de WaveManager en Node
globalThis.window = globalThis.window || {
  addEventListener: () => {},
  removeEventListener: () => {},
  navigator: { userAgent: 'node' }
};
globalThis.document = globalThis.document || {
  createElement: () => ({ getContext: () => null })
};

vi.mock('phaser', () => {
  class MockSprite {
    constructor(scene, x, y) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.width = 32;
      this.height = 32;
      this.body = {
        setVelocity: vi.fn(),
        setVelocityX: vi.fn(),
        setVelocityY: vi.fn(),
        setSize: vi.fn(),
        setOffset: vi.fn(),
        velocity: { x: 0, y: 0 }
      };
    }
    setDepth() { return this; }
    play() { return this; }
    setTint() { return this; }
    clearTint() { return this; }
    setAlpha() { return this; }
    setAngle() { return this; }
    on() { return this; }
    destroy() {}
  }
  return {
    default: {
      Physics: {
        Arcade: {
          Sprite: MockSprite
        }
      },
      Math: {
        Distance: { Between: () => 100 },
        Between: (a, b) => a,
        Clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
        RadToDeg: (r) => (r * 180) / Math.PI,
        DegToRad: (d) => (d * Math.PI) / 180
      }
    }
  };
});

import { computeAlignmentPositions, ALL_ENEMY_ARCHETYPES } from '../src/config/constants.js';
import { WaveManager } from '../src/systems/WaveManager.js';

function createMockScene(activeCount = 0) {
  const addedList = [];
  const mockEnemies = {
    countActive: vi.fn(() => activeCount),
    add: vi.fn((e) => addedList.push(e))
  };
  const mockGfx = {
    setDepth: () => mockGfx,
    clear: () => mockGfx,
    lineStyle: () => mockGfx,
    strokeLineShape: () => mockGfx,
    destroy: () => {}
  };
  const mockImg = {
    setDepth: () => mockImg,
    setVisible: () => mockImg,
    setPosition: () => mockImg,
    setAlpha: () => mockImg,
    setScale: () => mockImg,
    destroy: () => {}
  };
  return {
    scene: {
      add: {
        existing: vi.fn(),
        graphics: vi.fn(() => mockGfx),
        image: vi.fn(() => mockImg)
      },
      physics: { add: { existing: vi.fn() } },
      tweens: { add: vi.fn(() => ({ stop: vi.fn() })) },
      enemies: mockEnemies,
      player: { x: 240, y: 600 },
      time: { delayedCall: vi.fn() }
    },
    mockEnemies,
    addedList
  };
}

describe('Rebalanceo de Densidad de Oleadas y Formaciones', () => {
  it('contiene los 5 arquetipos en ALL_ENEMY_ARCHETYPES', () => {
    expect(ALL_ENEMY_ARCHETYPES).toHaveLength(5);
    expect(ALL_ENEMY_ARCHETYPES).toContain('LIGHT_FIGHTER');
    expect(ALL_ENEMY_ARCHETYPES).toContain('TACTICAL_FIGHTER');
    expect(ALL_ENEMY_ARCHETYPES).toContain('HEAVY_BOMBER');
    expect(ALL_ENEMY_ARCHETYPES).toContain('STEALTH_INTERCEPTOR');
    expect(ALL_ENEMY_ARCHETYPES).toContain('MINE_CORVETTE');
  });

  it('calcula posiciones para formación V_WEDGE con conteo moderado (3 a 5 unidades)', () => {
    const coords3 = computeAlignmentPositions('V_WEDGE', 3, 240, -34, 42, 32);
    expect(coords3).toHaveLength(3);
    expect(coords3[0].x).toBe(240);
    expect(coords3[0].y).toBe(-34);
    expect(coords3[1].x).toBe(240 - 42);
    expect(coords3[2].x).toBe(240 + 42);

    const coords5 = computeAlignmentPositions('V_WEDGE', 5, 240, -34, 42, 32);
    expect(coords5).toHaveLength(5);
  });

  it('calcula posiciones para formación LINE_ABREAST con 2 unidades (furtivos nivelados)', () => {
    const coords = computeAlignmentPositions('LINE_ABREAST', 2, 240, -38, 68, 36);
    expect(coords).toHaveLength(2);
    expect(coords[0].x).toBeLessThan(coords[1].x);
    // Micro-desfase vertical de 8 px para evitar superposición
    expect(Math.abs(coords[0].y - coords[1].y)).toBe(8);
  });

  it('verifica que los límites horizontales nunca desborden la pantalla (480px)', () => {
    const coordsRight = computeAlignmentPositions('LINE_ABREAST', 4, 460, -30, 50, 30);
    for (const pt of coordsRight) {
      expect(pt.x).toBeLessThanOrEqual(444); // 480 - 36
      expect(pt.x).toBeGreaterThanOrEqual(36);
    }
  });

  it('WaveManager: no genera nueva oleada si el soft cap de 10 enemigos activos está alcanzado', () => {
    const { scene, mockEnemies } = createMockScene(10);
    const wm = new WaveManager(scene);
    wm.waveTimer = 0;

    wm.spawnNextWave();

    // Se debe posponer la oleada 1200 ms sin añadir enemigos
    expect(wm.waveTimer).toBe(1200);
    expect(mockEnemies.add).not.toHaveBeenCalled();
    expect(wm.pendingSubWaves).toHaveLength(0);
  });

  it('WaveManager: cadencia de oleadas rebalanceada entre 2200 y 3450 ms', () => {
    const { scene } = createMockScene(2);
    const wm = new WaveManager(scene);

    wm.spawnNextWave();

    // Comprobar que el temporizador asignado está en el rango rebalanceado >= 2200 ms
    expect(wm.waveTimer).toBeGreaterThanOrEqual(2200);
    expect(wm.waveTimer).toBeLessThanOrEqual(3450);

    // Debe haber generado exactamente 1 sub-oleada secundaria en cola (no 3 o 4)
    expect(wm.pendingSubWaves).toHaveLength(1);
    expect(wm.pendingSubWaves[0].delayMs).toBeGreaterThanOrEqual(650);
    expect(wm.pendingSubWaves[0].delayMs).toBeLessThanOrEqual(850);
  });

  it('WaveManager: spawnSingleArchetypeFormation genera cantidades moderadas y niveladas', () => {
    const { scene } = createMockScene(0);
    const wm = new WaveManager(scene);

    // 1. Caza Ligero: entre 3 y 5
    const fighters = wm.spawnSingleArchetypeFormation('LIGHT_FIGHTER');
    expect(fighters.length).toBeGreaterThanOrEqual(3);
    expect(fighters.length).toBeLessThanOrEqual(5);

    // 2. Caza Táctico: entre 2 y 4
    const tacticals = wm.spawnSingleArchetypeFormation('TACTICAL_FIGHTER');
    expect(tacticals.length).toBeGreaterThanOrEqual(2);
    expect(tacticals.length).toBeLessThanOrEqual(4);

    // 3. Interceptor Furtivo: entre 2 y 3
    const stealths = wm.spawnSingleArchetypeFormation('STEALTH_INTERCEPTOR');
    expect(stealths.length).toBeGreaterThanOrEqual(2);
    expect(stealths.length).toBeLessThanOrEqual(3);

    // 4. Bombardero Pesado: 1 bombardero + 2 escoltas = 3 unidades
    const bombers = wm.spawnSingleArchetypeFormation('HEAVY_BOMBER');
    expect(bombers.length).toBe(3);

    // 5. Corbeta Porta-Minas: 1 corbeta + 2 escoltas = 3 unidades
    const corvettes = wm.spawnSingleArchetypeFormation('MINE_CORVETTE');
    expect(corvettes.length).toBe(3);
  });
});

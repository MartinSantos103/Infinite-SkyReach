import {
  GAME_WIDTH,
  PROGRESSION,
  getSectorMultipliers,
  getBossIdForIndex
} from '../config/constants.js';
import {
  LightFighter,
  TacticalFighter,
  HeavyBomber,
  StealthInterceptor,
  MineLayerCorvette
} from '../entities/EnemyBase.js';
import {
  ValkiriaBoss,
  EspectroBoss,
  LeviatanBoss
} from '../entities/BossBase.js';

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
 * Pura y determinista para pruebas unitarias y de formación.
 * @param {string} alignment Tipo de alineación (V_WEDGE, LINE_ABREAST, ECHELON_LEFT, etc.)
 * @param {number} count Cantidad de naves en la formación
 * @param {number} centerX Coordenada X central o base de la formación
 * @param {number} startY Coordenada Y frontal de entrada (ej. -34)
 * @param {number} spacingX Separación horizontal entre naves
 * @param {number} spacingY Separación vertical entre filas
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
      // Líder al frente y escoltas escalonadas simétricamente hacia atrás formando una "V"
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
      // Flancos adelantados y centro retrasado (tenaza envolvente)
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
      // Línea horizontal (Falange) centrada en centerX
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
      // Escalón diagonal de izquierda a derecha (/)
      const startX = Math.max(minX + 10, Math.min(maxX - safeCount * spacingX, centerX - (safeCount * spacingX) / 2));
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
      // Escalón diagonal de derecha a izquierda (\)
      const startX = Math.min(maxX - 10, Math.max(minX + safeCount * spacingX, centerX + (safeCount * spacingX) / 2));
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
      // Dos columnas paralelas descendiendo sincronizadas
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
      // Formación en Rombo / Diamante (líder, flancos izquierdo/derecho, escolta trasera y centro)
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
      // Pinza doble desde ambos bordes laterales hacia el centro
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
 * Controla el odómetro de distancia (m), la generación aleatoria y alineada de múltiples
 * oleadas combinando los 5 arquetipos del bestiario, la aparición de los 3 Jefes de Sector
 * cada 5.000 m y el escalado infinito por Sector (S).
 */
export class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.distance = 0;
    this.nextMilestone = 1000;
    this.nextBossDistance = PROGRESSION.BOSS_DISTANCE_INTERVAL; // 5000 m
    this.bossesDefeated = 0;
    this.sector = 1; // Sector inicial S = 1
    this.stage = 1;  // Etapa visual 1..3

    this.isBossActive = false;
    this.isBossTransitioning = false;
    this.waveTimer = 1000; // Inicio fluido y controlado
    this.waveCounter = 0;

    // Bolsa barajada y registro para garantizar que los 5 arquetipos aparezcan aleatoriamente sin sequías
    this.archetypeBag = [];
    this.lastArchetype = null;
    this.pendingSubWaves = [];
  }

  static getBossIdForIndex(bossCount) {
    return getBossIdForIndex(bossCount);
  }

  getMultipliers() {
    return getSectorMultipliers(this.sector);
  }

  /**
   * Calcula el nivel de intensidad (0.0 a 1.0+) a medida que se avanza en distancia y sector
   */
  getIntensityProgress() {
    const cycleDist = this.distance % PROGRESSION.BOSS_DISTANCE_INTERVAL;
    const distFactor = cycleDist / PROGRESSION.BOSS_DISTANCE_INTERVAL; // 0..1 dentro de los 5.000 m
    const sectorBonus = (this.sector - 1) * 0.25;
    return Number((distFactor + sectorBonus).toFixed(3));
  }

  refillArchetypeBag() {
    // Incluye los 5 arquetipos del bestiario + 2 comodines aleatorios ponderados y los baraja
    const intensity = this.getIntensityProgress();
    const bonusPool =
      intensity > 0.5
        ? ['LIGHT_FIGHTER', 'TACTICAL_FIGHTER', 'STEALTH_INTERCEPTOR', 'HEAVY_BOMBER', 'MINE_CORVETTE']
        : ['LIGHT_FIGHTER', 'TACTICAL_FIGHTER', 'STEALTH_INTERCEPTOR'];

    const bonus1 = bonusPool[Math.floor(Math.random() * bonusPool.length)];
    const bonus2 = ALL_ENEMY_ARCHETYPES[Math.floor(Math.random() * ALL_ENEMY_ARCHETYPES.length)];
    const deck = [...ALL_ENEMY_ARCHETYPES, bonus1, bonus2];

    // Barajado Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }

    this.archetypeBag = deck;
  }

  /**
   * Selecciona aleatoriamente un arquetipo del bestiario considerando los 5 tipos
   * y asegurando que todos aparezcan aleatoriamente a medida que se avanza.
   * @param {string[]} exclude Lista opcional de arquetipos a excluir (para combinar tipos distintos en multi-oleada)
   */
  pickRandomArchetype(exclude = []) {
    const excludedSet = new Set(exclude);

    if (this.archetypeBag.length === 0) {
      this.refillArchetypeBag();
    }

    let bagIndex = this.archetypeBag.findIndex((a) => !excludedSet.has(a));
    if (bagIndex === -1) {
      this.refillArchetypeBag();
      bagIndex = this.archetypeBag.findIndex((a) => !excludedSet.has(a));
    }

    if (bagIndex !== -1) {
      const [chosen] = this.archetypeBag.splice(bagIndex, 1);
      this.lastArchetype = chosen;
      return chosen;
    }

    const fallback = ALL_ENEMY_ARCHETYPES[Math.floor(Math.random() * ALL_ENEMY_ARCHETYPES.length)];
    this.lastArchetype = fallback;
    return fallback;
  }

  /**
   * Elige una alineación geométrica apropiada para un arquetipo de forma aleatoria
   */
  pickRandomAlignmentForArchetype(archetypeId) {
    const alignmentsByType = {
      LIGHT_FIGHTER: ['V_WEDGE', 'INVERTED_V', 'LINE_ABREAST', 'ECHELON_LEFT', 'ECHELON_RIGHT', 'PINCER', 'DIAMOND'],
      TACTICAL_FIGHTER: ['DOUBLE_COLUMN', 'V_WEDGE', 'ECHELON_LEFT', 'ECHELON_RIGHT', 'LINE_ABREAST'],
      STEALTH_INTERCEPTOR: ['LINE_ABREAST', 'V_WEDGE', 'PINCER', 'INVERTED_V', 'DOUBLE_COLUMN'],
      HEAVY_BOMBER: ['LINE_ABREAST', 'DIAMOND', 'V_WEDGE'],
      MINE_CORVETTE: ['PINCER', 'LINE_ABREAST', 'V_WEDGE']
    };
    const list = alignmentsByType[archetypeId] || FORMATION_ALIGNMENTS;
    return list[Math.floor(Math.random() * list.length)];
  }

  update(dtSeconds, dtMs) {
    if (this.isBossActive || this.isBossTransitioning) {
      this.pendingSubWaves = [];
      return;
    }

    // 1. Avanzar el odómetro de distancia (se pausa durante combates de jefe - Sección 6)
    const prevDistance = this.distance;
    const rawAdv = PROGRESSION.METERS_PER_SECOND * dtSeconds;
    this.distance = Math.min(this.nextBossDistance, this.distance + rawAdv);
    const actualDelta = this.distance - prevDistance;

    if (this.scene && this.scene.missionManager && actualDelta > 0) {
      this.scene.missionManager.onDistanceAdvanced(actualDelta);
    }

    // Destello del odómetro cada 1.000 m (Sección 10.9)
    if (this.distance >= this.nextMilestone) {
      this.nextMilestone += 1000;
      if (this.scene && this.scene.events) {
        this.scene.events.emit('distance-milestone', Math.floor(this.distance));
      }
    }

    // 2. Comprobar llegada a cada 5.000 m para invocar Jefe de Sector
    if (this.distance >= this.nextBossDistance) {
      this.pendingSubWaves = [];
      this.triggerBossEncounter();
      return;
    }

    // 3. Procesar sub-oleadas escalonadas en curso (multi-oleadas de distintos arquetipos)
    for (let i = this.pendingSubWaves.length - 1; i >= 0; i--) {
      const sub = this.pendingSubWaves[i];
      sub.delayMs -= dtMs;
      if (sub.delayMs <= 0) {
        this.pendingSubWaves.splice(i, 1);
        const currentActive = this.scene.enemies && this.scene.enemies.countActive ? this.scene.enemies.countActive(true) : 0;
        if (currentActive < 10) {
          this.spawnSingleArchetypeFormation(sub.archetype, sub.alignment, sub.centerX, sub.startY);
        }
      }
    }

    // 4. Generación continua de eventos multi-oleada
    this.waveTimer -= dtMs;
    if (this.waveTimer <= 0) {
      this.spawnNextWave();
    }
  }

  /**
   * Lanza un evento de oleada nivelado: 1 formación principal inmediata y 1 sub-oleada secundaria
   * escalonada en el tiempo (650-850 ms), con soft-cap de concurrencia y cadencia de 2.2 a 3.2 s.
   */
  spawnNextWave() {
    if (!this.scene || !this.scene.enemies) return;

    // Límite de concurrencia (soft-cap): si ya hay 10 o más enemigos activos en pantalla,
    // posponer la nueva oleada 1200 ms para dar respiro al jugador.
    const currentActive = this.scene.enemies.countActive ? this.scene.enemies.countActive(true) : 0;
    if (currentActive >= 10) {
      this.waveTimer = 1200;
      return;
    }

    this.waveCounter++;
    const intensity = this.getIntensityProgress();

    // Elegir 1 arquetipo principal y 1 secundario complementario
    const primaryType = this.pickRandomArchetype(this.lastArchetype ? [this.lastArchetype] : []);
    const secondaryType = this.pickRandomArchetype([primaryType]);

    const primaryAlign = this.pickRandomAlignmentForArchetype(primaryType);
    const secondaryAlign = this.pickRandomAlignmentForArchetype(secondaryType);

    // Distribuir carriles horizontales equilibrados
    const laneLeft = 110 + Math.random() * 50;
    const laneRight = GAME_WIDTH - 110 - Math.random() * 50;
    const laneCenter = GAME_WIDTH / 2 + (Math.random() - 0.5) * 60;

    // 1ª Oleada inmediata (formación principal moderada)
    this.spawnSingleArchetypeFormation(primaryType, primaryAlign, laneCenter, -34);

    // 2ª Sub-oleada secundaria escalonada en el tiempo (650 a 850 ms) en el flanco alterno
    const secondCenterX = Math.random() < 0.5 ? laneLeft : laneRight;
    const secondaryDelay = 650 + Math.random() * 200;
    this.pendingSubWaves.push({
      delayMs: secondaryDelay,
      archetype: secondaryType,
      alignment: secondaryAlign,
      centerX: secondCenterX,
      startY: -38
    });

    // Cadencia balanceada entre eventos de oleada (2200 - 3200 ms)
    const baseCooldown = Math.max(2200, 3200 - intensity * 800);
    this.waveTimer = baseCooldown + Math.random() * 250;
  }

  /**
   * Despliega una formación balanceada de un arquetipo específico del bestiario
   * con conteos moderados y legibles en pantalla.
   */
  spawnSingleArchetypeFormation(
    archetypeId,
    alignment = 'V_WEDGE',
    centerX = GAME_WIDTH / 2,
    startY = -36
  ) {
    if (!this.scene || !this.scene.enemies) return [];

    const intensity = this.getIntensityProgress();

    switch (archetypeId) {
      case 'LIGHT_FIGHTER': {
        const count = 3 + (this.waveCounter % 2) + (intensity >= 0.6 ? 1 : 0); // 3 a 5 Cazas Ligeros
        return this.spawnLightFighterWave(count, alignment, centerX, startY);
      }

      case 'TACTICAL_FIGHTER': {
        const count = 2 + (this.waveCounter % 2) + (intensity >= 0.5 ? 1 : 0); // 2 a 4 Cazas Tácticos
        return this.spawnTacticalSquadron(count, alignment, centerX, startY);
      }

      case 'STEALTH_INTERCEPTOR': {
        const count = 2 + (this.waveCounter % 2); // 2 a 3 Interceptores Furtivos
        return this.spawnStealthWave(count, alignment, centerX, startY);
      }

      case 'HEAVY_BOMBER': {
        const bomberCount = intensity >= 0.85 && Math.random() < 0.35 ? 2 : 1; // 1 (o raramente 2 al final)
        return this.spawnHeavyBomberWave(bomberCount, alignment, centerX, startY);
      }

      case 'MINE_CORVETTE':
      default: {
        const corvetteCount = 1; // Siempre 1 corbeta por oleada
        return this.spawnMineCorvetteWave(corvetteCount, alignment, centerX, startY);
      }
    }
  }

  /**
   * 1. Escuadrón alineado de Cazas Ligeros (Kamikaze)
   */
  spawnLightFighterWave(
    count = 5,
    alignment = 'V_WEDGE',
    centerX = GAME_WIDTH / 2,
    startY = -34
  ) {
    const coords = computeAlignmentPositions(alignment, count, centerX, startY, 42, 32);
    const targetX = this.scene.player ? this.scene.player.x : centerX;
    const targetY = this.scene.player ? this.scene.player.y : 620;
    const spawned = [];

    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      // Mantener coherencia de alineación dirigiendo cada nave con su offset relativo de formación
      const formationOffsetX = (pt.x - centerX) * 0.65;
      const fighter = new LightFighter(
        this.scene,
        pt.x,
        pt.y,
        this.sector,
        targetX + formationOffsetX,
        targetY
      );
      this.scene.enemies.add(fighter);
      spawned.push(fighter);
    }
    return spawned;
  }

  /**
   * 2. Escuadrón Zigzag de Cazas Tácticos con alineación de entrada
   */
  spawnTacticalSquadron(
    count = 4,
    alignment = 'DOUBLE_COLUMN',
    centerX = GAME_WIDTH / 2,
    startY = -36
  ) {
    const coords = computeAlignmentPositions(alignment, count, centerX, startY, 54, 42);
    const phaseBase = Math.random() * Math.PI * 2;
    const spawned = [];

    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      const tf = new TacticalFighter(
        this.scene,
        pt.x,
        pt.y,
        this.sector,
        phaseBase + pt.row * 0.55 + (pt.side * 0.35)
      );
      this.scene.enemies.add(tf);
      spawned.push(tf);
    }
    return spawned;
  }

  /**
   * 3. Bombarderos Pesados (Tanques) con escolta opcional en alineación
   */
  spawnHeavyBomberWave(
    count = 1,
    alignment = 'DIAMOND',
    centerX = GAME_WIDTH / 2,
    startY = -48
  ) {
    const coords = computeAlignmentPositions(alignment, count, centerX, startY, 130, 56);
    const spawned = [];

    for (const pt of coords) {
      const bomber = new HeavyBomber(this.scene, pt.x, pt.y, this.sector);
      this.scene.enemies.add(bomber);
      spawned.push(bomber);

      // Escolta balanceada de 2 Cazas Ligeros flanqueando al Bombardero
      const escortLeft = new LightFighter(this.scene, Math.max(32, pt.x - 48), pt.y - 20, this.sector);
      const escortRight = new LightFighter(
        this.scene,
        Math.min(GAME_WIDTH - 32, pt.x + 48),
        pt.y - 20,
        this.sector
      );
      this.scene.enemies.add(escortLeft);
      this.scene.enemies.add(escortRight);
      spawned.push(escortLeft, escortRight);
    }
    return spawned;
  }

  /**
   * 4. Escuadrón alineado de Interceptores Furtivos
   */
  spawnStealthWave(
    count = 2,
    alignment = 'LINE_ABREAST',
    centerX = GAME_WIDTH / 2,
    startY = -38
  ) {
    const coords = computeAlignmentPositions(alignment, count, centerX, startY, 68, 36);
    const spawned = [];

    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      const stealth = new StealthInterceptor(this.scene, pt.x, pt.y, this.sector);
      // Escalonar la altura de frenado según su fila de formación para conservar la alineación visual
      stealth.brakeY = Math.min(250, 115 + pt.row * 34 + (i % 2) * 16);
      this.scene.enemies.add(stealth);
      spawned.push(stealth);
    }
    return spawned;
  }

  /**
   * 5. Corbeta Porta-Minas acompañada de escolta reducida y controlada
   */
  spawnMineCorvetteWave(
    count = 1,
    alignment = 'V_WEDGE',
    centerX = GAME_WIDTH / 2,
    startY = -45
  ) {
    const coords = computeAlignmentPositions(alignment, count, centerX, startY, 150, 54);
    const spawned = [];

    for (const pt of coords) {
      const corvette = new MineLayerCorvette(this.scene, pt.x, pt.y, this.sector);
      this.scene.enemies.add(corvette);
      spawned.push(corvette);

      // Escolta moderada de 2 Cazas Ligeros
      const escortLeft = new LightFighter(this.scene, Math.max(32, pt.x - 42), pt.y - 24, this.sector);
      const escortRight = new LightFighter(
        this.scene,
        Math.min(GAME_WIDTH - 32, pt.x + 42),
        pt.y - 24,
        this.sector
      );
      this.scene.enemies.add(escortLeft);
      this.scene.enemies.add(escortRight);
      spawned.push(escortLeft, escortRight);
    }
    return spawned;
  }

  /**
   * Detiene la generación de enemigos comunes, pausa el odómetro y lanza la alerta de 2 s del Jefe.
   */
  triggerBossEncounter() {
    if (this.isBossActive) return;
    this.isBossActive = true;
    this.pendingSubWaves = [];

    const bossId = WaveManager.getBossIdForIndex(this.bossesDefeated);

    if (this.scene.backgroundManager) {
      this.scene.backgroundManager.setBossMode(true);
    }

    if (this.scene.fxManager) {
      this.scene.fxManager.playBossEntranceAlert(() => {
        this.spawnBossInstance(bossId);
      });
    } else {
      this.spawnBossInstance(bossId);
    }
  }

  spawnBossInstance(bossId) {
    if (!this.scene || this.scene.isGameOver) return;
    if (this.scene.activeBoss && this.scene.activeBoss.active && !this.scene.activeBoss.isDead) {
      return;
    }

    let boss = null;
    if (bossId === 'VALKIRIA') {
      boss = new ValkiriaBoss(this.scene, this.sector);
    } else if (bossId === 'ESPECTRO') {
      boss = new EspectroBoss(this.scene, this.sector);
    } else {
      boss = new LeviatanBoss(this.scene, this.sector);
    }

    this.scene.activeBoss = boss;
    if (this.scene.events) {
      this.scene.events.emit('boss-spawned', boss);
    }
  }

  /**
   * Llamado cuando un Jefe de Sector es derrotado (Sección 6, 7.1, 10.3 y 10.4)
   */
  onBossDefeated() {
    this.bossesDefeated++;
    this.sector++; // Cada jefe derrotado incrementa el nivel de Sector (S)
    this.stage = (this.bossesDefeated % 3) + 1;
    this.nextBossDistance += PROGRESSION.BOSS_DISTANCE_INTERVAL;
    this.isBossTransitioning = true;
    this.pendingSubWaves = [];

    if (this.scene && this.scene.backgroundManager) {
      this.scene.backgroundManager.setBossMode(false);
    }

    // Pausa breve del desplazamiento antes de iniciar el fundido a la etapa siguiente (Sección 10.7)
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(500, () => {
        if (this.scene.backgroundManager) {
          this.scene.backgroundManager.transitionToStage(this.stage);
          this.scene.backgroundManager.setSector(this.sector, true);
        }
        this.isBossActive = false;
        this.isBossTransitioning = false;
        this.waveTimer = 1100;
      });
    } else {
      this.isBossActive = false;
      this.isBossTransitioning = false;
    }
  }
}

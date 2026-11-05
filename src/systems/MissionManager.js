import { PROGRESSION } from '../config/constants.js';
import { soundManager } from './SoundManager.js';

/**
 * Catálogo de plantillas de misiones dinámicas (dificultad moderada, recompensas ajustadas)
 */
export const MISSION_TEMPLATES = [
  {
    type: 'KILLS_NO_HIT',
    target: 25,
    formatTitle: (t) => `Elimina ${t} enemigos sin recibir impactos`,
    formatShort: (t) => `${t} bajas sin daño`,
    title: 'Elimina 25 enemigos sin recibir impactos',
    shortTitle: '25 bajas sin daño'
  },
  {
    type: 'KILL_BOMBERS',
    target: 7,
    formatTitle: (t) => `Destruye ${t} Bombarderos o Corbetas`,
    formatShort: (t) => `Destruye ${t} Bombarderos`,
    title: 'Destruye 7 Bombarderos o Corbetas',
    shortTitle: 'Destruye 7 Bombarderos'
  },
  {
    type: 'DISTANCE_NO_TONEL',
    target: 1800,
    formatTitle: (t) => `Recorre ${t} m sin usar el Tonel`,
    formatShort: (t) => `${t} m sin Tonel`,
    title: 'Recorre 1.800 m sin usar el Tonel',
    shortTitle: '1.800 m sin Tonel'
  },
  {
    type: 'TOTAL_KILLS',
    target: 32,
    formatTitle: (t) => `Elimina ${t} amenazas enemigas`,
    formatShort: (t) => `Elimina ${t} enemigos`,
    title: 'Elimina 32 amenazas enemigas',
    shortTitle: 'Elimina 32 enemigos'
  },
  {
    type: 'DISTANCE_NO_HIT',
    target: 1600,
    formatTitle: (t) => `Recorre ${t} m sin recibir impactos`,
    formatShort: (t) => `${t} m sin daño`,
    title: 'Recorre 1.600 m sin recibir impactos',
    shortTitle: '1.600 m sin daño'
  }
];

/**
 * Sistema de Misiones con Recompensa Alternada (Sección 7.2)
 * - Misión Impar (1, 3, 5...): Recupera +15% de Vida (sin superar el 100%)
 * - Misión Par (2, 4, 6...): Otorga +35% de la XP total requerida para el siguiente nivel
 */
export class MissionManager {
  constructor(scene = null) {
    this.scene = scene;
    this.missionNumber = 1; // Inicia en 1 (Impar -> +VIDA)
    this.templateIndex = 0;
    this.currentMission = null;
    this.startNextMission(true);
  }

  /**
   * Determina el tipo de recompensa según el número de misión (Sección 7.2)
   * @param {number} num Número de misión (1-indexed)
   * @returns {'HEAL' | 'XP'}
   */
  static getRewardTypeForMission(num) {
    return num % 2 === 1 ? 'HEAL' : 'XP';
  }

  getRewardType() {
    return MissionManager.getRewardTypeForMission(this.missionNumber);
  }

  getRewardLabel() {
    const healPct = PROGRESSION.MISSION_ODD_HEAL_PERCENT;
    const xpPct = Math.round(PROGRESSION.MISSION_EVEN_XP_RATIO * 100);
    return this.getRewardType() === 'HEAL' ? `+VIDA (${healPct}%)` : `+XP (${xpPct}%)`;
  }

  startNextMission(isFirst = false) {
    if (!isFirst) {
      this.missionNumber++;
      this.templateIndex = (this.templateIndex + 1) % MISSION_TEMPLATES.length;
    }

    const tpl = MISSION_TEMPLATES[this.templateIndex];
    const rewardType = this.getRewardType();

    // Escalar la dificultad un +15% adicional por cada ciclo completo de las 5 misiones
    const cycleCount = Math.floor((this.missionNumber - 1) / MISSION_TEMPLATES.length);
    const difficultyMultiplier = 1 + cycleCount * 0.15;
    const scaledTarget = Math.round(tpl.target * difficultyMultiplier);

    this.currentMission = {
      number: this.missionNumber,
      type: tpl.type,
      title: tpl.formatTitle ? tpl.formatTitle(scaledTarget) : tpl.title,
      shortTitle: tpl.formatShort ? tpl.formatShort(scaledTarget) : tpl.shortTitle,
      target: scaledTarget,
      progress: 0,
      rewardType, // 'HEAL' (Impar) o 'XP' (Par)
      rewardIconKey: rewardType === 'HEAL' ? 'icon_heart_heal' : 'icon_star_xp'
    };
  }

  getProgressRatio() {
    if (!this.currentMission || this.currentMission.target <= 0) return 0;
    return Math.min(1, this.currentMission.progress / this.currentMission.target);
  }

  /**
   * Notifica muerte de un enemigo o amenaza destructible
   */
  onEnemyKilled(enemy) {
    if (!this.currentMission) return;
    const m = this.currentMission;

    if (m.type === 'KILLS_NO_HIT' || m.type === 'TOTAL_KILLS') {
      this.advanceProgress(1);
    } else if (m.type === 'KILL_BOMBERS') {
      const id = enemy?.archetypeId || '';
      if (id === 'HEAVY_BOMBER' || id === 'MINE_CORVETTE' || enemy?.isBoss) {
        this.advanceProgress(1);
      }
    }
  }

  /**
   * Notifica avance de distancia en metros
   */
  onDistanceAdvanced(deltaMeters) {
    if (!this.currentMission || deltaMeters <= 0) return;
    const m = this.currentMission;

    if (m.type === 'DISTANCE_NO_TONEL' || m.type === 'DISTANCE_NO_HIT') {
      this.advanceProgress(deltaMeters);
    }
  }

  /**
   * Notifica que el jugador recibió daño (reinicia rachas sin impacto)
   */
  onPlayerHit() {
    if (!this.currentMission) return;
    if (
      this.currentMission.type === 'KILLS_NO_HIT' ||
      this.currentMission.type === 'DISTANCE_NO_HIT'
    ) {
      this.currentMission.progress = 0;
    }
  }

  /**
   * Notifica que el jugador usó el Tonel (reinicia racha de distancia sin Tonel)
   */
  onTonelUsed() {
    if (!this.currentMission) return;
    if (this.currentMission.type === 'DISTANCE_NO_TONEL') {
      this.currentMission.progress = 0;
    }
  }

  advanceProgress(amount) {
    if (!this.currentMission) return;
    this.currentMission.progress = Math.min(
      this.currentMission.target,
      this.currentMission.progress + amount
    );

    if (this.currentMission.progress >= this.currentMission.target) {
      this.completeCurrentMission();
    }
  }

  completeCurrentMission() {
    const completed = this.currentMission;
    soundManager.playMissionComplete();

    if (this.scene) {
      // Aplicar recompensa alternada estricta (Sección 7.2)
      if (completed.rewardType === 'HEAL') {
        // Misión Impar: Recupera +25% de Vida (sin superar el 100%)
        if (this.scene.player) {
          this.scene.player.heal(PROGRESSION.MISSION_ODD_HEAL_PERCENT);
        }
      } else {
        // Misión Par: Otorga un bono de +50% de la XP total requerida para el siguiente nivel
        if (this.scene.addPlayerXp && this.scene.player) {
          const bonusXp = Math.ceil(
            this.scene.player.xpRequired * PROGRESSION.MISSION_EVEN_XP_RATIO
          );
          this.scene.addPlayerXp(bonusXp, true);
        }
      }

      if (this.scene.events) {
        this.scene.events.emit('mission-completed', completed);
      }
    }

    this.startNextMission(false);
  }
}

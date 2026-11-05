import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_CONFIG,
  COMBAT_LIMITS
} from '../config/constants.js';
import { PALETTE, HEX } from '../config/palette.js';

/**
 * Escena Superpuesta de Interfaz ("UIScene")
 * Renderiza el HUD retro-futurista, barra de vida segmentada cada 10%,
 * indicador de Defensa logarítmica, barra de XP, odómetro, barra de jefe,
 * panel de misión alternada (+VIDA / +XP), indicador circular de Tonel,
 * modal de 3 tarjetas de mejora y modal de Pausa.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    window.__UI_SCENE__ = this;
    this.gameScene = this.scene.get('GameScene');

    this.activeModal = 'NONE'; // 'NONE' | 'PAUSE' | 'UPGRADE'
    this.currentUpgradeChoices = [];
    this.lowHpBlinkTimer = 0;
    this.lowHpBlinkVisible = true;
    this.missionFlashAlpha = 0;

    // 1. Crear HUD en partida
    this.createTopLeftHud();
    this.createTopCenterHud();
    this.createTopRightHud();
    this.createBossHud();
    this.createBottomRightHud();

    // 2. Contenedores de Modales (Pausa y Mejoras)
    this.createPauseModal();
    this.createUpgradeModal();

    // 3. Suscribir eventos de GameScene
    this.bindGameEvents();

    // 4. Teclas rápidas para Modales (1, 2, 3 para mejoras; P / ESC para reanudar pausa)
    this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  createTopLeftHud() {
    // Panel Esquina Superior Izquierda: Vida (0-100% segmentada cada 10%), DEF + Mitigación y XP + Nivel
    this.leftPanel = this.add.graphics().setDepth(100);
    this.leftPanel.fillStyle(PALETTE.UI_PANEL, 0.72);
    this.leftPanel.fillRect(6, 6, 162, 64);
    this.leftPanel.lineStyle(1, PALETTE.UI_BORDER, 1);
    this.leftPanel.strokeRect(6, 6, 162, 64);

    this.hpLabel = this.add
      .text(12, 11, 'VIDA 100%', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.UI_TEXT
      })
      .setDepth(101);

    // Barra de vida segmentada cada 10% (10 segmentos)
    this.hpBarGraphics = this.add.graphics().setDepth(101);

    // Icono de escudo violeta e indicador numérico de Defensa y Mitigación
    this.defIcon = this.add
      .image(18, 39, 'icon_shield_def')
      .setScale(0.85)
      .setDepth(101);

    this.defText = this.add
      .text(28, 34, 'DEF:3 (Mit:30%)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.DEF_LIGHT
      })
      .setDepth(101);

    // Barra de XP dorada y Nivel actual (NV. X)
    this.levelText = this.add
      .text(12, 53, 'NV.1', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.XP_GOLD
      })
      .setDepth(101);

    this.xpBarGraphics = this.add.graphics().setDepth(101);
  }

  createTopCenterHud() {
    // Panel Centro Superior: Odómetro de distancia (00000 m) y Puntaje (SCORE)
    this.centerPanel = this.add.graphics().setDepth(100);
    this.centerPanel.fillStyle(PALETTE.UI_PANEL, 0.72);
    this.centerPanel.fillRect(172, 6, 136, 52);
    this.centerPanel.lineStyle(1, PALETTE.UI_BORDER, 1);
    this.centerPanel.strokeRect(172, 6, 136, 52);

    this.distanceText = this.add
      .text(240, 20, '00000 m', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '13px',
        color: HEX.WHITE
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.scoreText = this.add
      .text(240, 42, 'PTS 000000', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: HEX.XP_GOLD
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  createTopRightHud() {
    // Panel Esquina Superior Derecha: Misión Activa (+VIDA / +XP) y Botón de Pausa (||)
    this.rightPanel = this.add.graphics().setDepth(100);
    this.rightPanel.fillStyle(PALETTE.UI_PANEL, 0.72);
    this.rightPanel.fillRect(312, 6, 124, 64);
    this.rightPanel.lineStyle(1, PALETTE.UI_BORDER, 1);
    this.rightPanel.strokeRect(312, 6, 124, 64);

    // Destello del panel de misión al completarse
    this.missionFlashRect = this.add
      .rectangle(312, 6, 124, 64, PALETTE.WHITE, 0)
      .setOrigin(0, 0)
      .setDepth(102);

    this.missionRewardIcon = this.add
      .image(324, 17, 'icon_heart_heal')
      .setScale(0.9)
      .setDepth(101);

    this.missionRewardText = this.add
      .text(335, 12, '+VIDA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.HEAL_GREEN
      })
      .setDepth(101);

    this.missionCountText = this.add
      .text(430, 12, '0/25', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: HEX.UI_TEXT
      })
      .setOrigin(1, 0)
      .setDepth(101);

    this.missionTitleText = this.add
      .text(317, 27, '25 bajas sin daño', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: HEX.UI_TEXT,
        wordWrap: { width: 114 }
      })
      .setDepth(101);

    this.missionBarGraphics = this.add.graphics().setDepth(101);

    // Botón de Pausa (||) con icono de 28 px y área táctil de 40x40 px (Sección 8.1 y 10.9)
    this.pauseHitZone = this.add
      .rectangle(456, 26, 40, 40, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);

    this.pauseBtnIcon = this.add
      .image(456, 26, 'icon_pause_btn')
      .setDepth(101);

    this.pauseHitZone.on('pointerdown', () => {
      if (this.gameScene && this.activeModal === 'NONE') {
        this.gameScene.requestPause();
      }
    });
  }

  createBossHud() {
    // Barra del Jefe: ocupa el 70% del ancho (336 px), bajo el odómetro, en rojo #E63946 (Sección 10.9)
    this.bossHudContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

    const barWidth = Math.round(GAME_WIDTH * 0.7); // 336 px
    const barX = Math.round((GAME_WIDTH - barWidth) / 2); // 72 px
    const barY = 92;

    const bgPanel = this.add.graphics();
    bgPanel.fillStyle(PALETTE.UI_PANEL, 0.85);
    bgPanel.fillRect(barX - 4, barY - 18, barWidth + 8, 34);
    bgPanel.lineStyle(1, PALETTE.ALERT_RED, 0.9);
    bgPanel.strokeRect(barX - 4, barY - 18, barWidth + 8, 34);

    this.bossNameText = this.add
      .text(GAME_WIDTH / 2, barY - 10, 'VALKIRIA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.WHITE
      })
      .setOrigin(0.5);

    this.bossBarGraphics = this.add.graphics();

    this.bossHudContainer.add([bgPanel, this.bossNameText, this.bossBarGraphics]);
  }

  createBottomRightHud() {
    // Indicador del Tonel: anillo de 36 px en la esquina inferior derecha (Sección 10.9)
    this.tonelX = GAME_WIDTH - 34;
    this.tonelY = GAME_HEIGHT - 34;

    this.tonelGraphics = this.add.graphics().setDepth(100);
    this.tonelLabel = this.add
      .text(this.tonelX, this.tonelY, 'TONEL', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: HEX.WHITE
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Permitir activar el Tonel también tocando el indicador
    const tonelZone = this.add
      .circle(this.tonelX, this.tonelY, 22, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    tonelZone.on('pointerdown', () => {
      if (this.gameScene && this.gameScene.player && this.activeModal === 'NONE') {
        this.gameScene.player.tryActivateTonel();
      }
    });

    // Icono de disparo desactivado junto al indicador del Tonel durante los 1.5 s de la PEM (Sección 10.9)
    this.empDisabledIcon = this.add
      .image(this.tonelX - 42, this.tonelY, 'icon_fire_disabled')
      .setDepth(101)
      .setVisible(false);
  }

  createPauseModal() {
    // Sección 8.2 y 10.9: Capa #1B1B1B con opacidad 0.65 + Modal centrado de 300x260 px
    this.pauseContainer = this.add.container(0, 0).setDepth(200).setVisible(false);

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.PAUSE_OVERLAY, 0.65)
      .setOrigin(0, 0)
      .setInteractive();

    const modalW = 300;
    const modalH = 260;
    const mx = (GAME_WIDTH - modalW) / 2;
    const my = (GAME_HEIGHT - modalH) / 2;

    const box = this.add.graphics();
    box.fillStyle(PALETTE.UI_PANEL, 0.96);
    box.fillRect(mx, my, modalW, modalH);
    box.lineStyle(2, PALETTE.UI_BORDER, 1);
    box.strokeRect(mx, my, modalW, modalH);

    const title = this.add
      .text(GAME_WIDTH / 2, my + 32, 'JUEGO EN PAUSA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: HEX.WHITE
      })
      .setOrigin(0.5);

    this.pauseStatsText = this.add
      .text(GAME_WIDTH / 2, my + 105, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: HEX.UI_TEXT,
        align: 'center',
        lineSpacing: 10
      })
      .setOrigin(0.5);

    // Botón principal: CONTINUAR (relleno cian #00B4D8 con texto oscuro - Sección 8.2 y 10.9)
    const continueBtnBg = this.add
      .rectangle(GAME_WIDTH / 2, my + 182, 220, 34, PALETTE.PLAYER_CYAN, 1)
      .setInteractive({ useHandCursor: true });

    const continueBtnText = this.add
      .text(GAME_WIDTH / 2, my + 182, 'CONTINUAR / PLAY', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: HEX.UI_PANEL
      })
      .setOrigin(0.5);

    continueBtnBg.on('pointerover', () => continueBtnBg.setScale(1.04));
    continueBtnBg.on('pointerout', () => continueBtnBg.setScale(1.0));
    continueBtnBg.on('pointerdown', () => this.closePauseAndResume());

    // Botón secundario: REINICIAR PARTIDA (solo con contorno - Sección 8.2 y 10.9)
    const restartBtnBg = this.add
      .rectangle(GAME_WIDTH / 2, my + 226, 220, 32, PALETTE.UI_PANEL, 1)
      .setStrokeStyle(1.5, PALETTE.UI_BORDER, 1)
      .setInteractive({ useHandCursor: true });

    const restartBtnText = this.add
      .text(GAME_WIDTH / 2, my + 226, 'REINICIAR PARTIDA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: HEX.UI_TEXT
      })
      .setOrigin(0.5);

    restartBtnBg.on('pointerover', () => restartBtnBg.setScale(1.04));
    restartBtnBg.on('pointerout', () => restartBtnBg.setScale(1.0));
    restartBtnBg.on('pointerdown', () => this.restartFullMatch());

    this.pauseContainer.add([
      overlay,
      box,
      title,
      this.pauseStatsText,
      continueBtnBg,
      continueBtnText,
      restartBtnBg,
      restartBtnText
    ]);
  }

  createUpgradeModal() {
    // Sección 7.3 y 10.9: Tres tarjetas de 130x190 px con icono grande, nombre, descripción y valor
    this.upgradeContainer = this.add.container(0, 0).setDepth(210).setVisible(false);

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.PAUSE_OVERLAY, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    const title = this.add
      .text(GAME_WIDTH / 2, 175, '¡SUBIDA DE NIVEL!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '18px',
        color: HEX.XP_GOLD,
        stroke: HEX.UI_PANEL,
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 208, 'ELIGE UNA MEJORA (CLIC O TECLAS 1, 2, 3)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: HEX.UI_TEXT
      })
      .setOrigin(0.5);

    this.upgradeContainer.add([overlay, title, subtitle]);

    this.upgradeCards = [];
    const cardCentersX = [85, 240, 395];
    const cardCenterY = 355;
    const cardW = 130;
    const cardH = 190;

    for (let i = 0; i < 3; i++) {
      const cardCont = this.add.container(cardCentersX[i], cardCenterY);

      const bg = this.add
        .rectangle(0, 0, cardW, cardH, PALETTE.UI_PANEL, 0.96)
        .setStrokeStyle(2, PALETTE.PLAYER_CYAN, 1)
        .setInteractive({ useHandCursor: true });

      const icon = this.add.image(0, -48, 'upgrade_icon_MULTISHOT');

      const nameTxt = this.add
        .text(0, 2, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: HEX.WHITE,
          align: 'center',
          wordWrap: { width: 116 }
        })
        .setOrigin(0.5);

      const descTxt = this.add
        .text(0, 34, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: HEX.UI_TEXT,
          align: 'center',
          wordWrap: { width: 116 }
        })
        .setOrigin(0.5);

      const valueTxt = this.add
        .text(0, 64, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '9px',
          color: HEX.XP_GOLD,
          align: 'center'
        })
        .setOrigin(0.5);

      const keyHint = this.add
        .text(0, 84, `[${i + 1}]`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: HEX.UI_TEXT
        })
        .setOrigin(0.5)
        .setAlpha(0.75);

      // La tarjeta bajo el cursor crece un 5% (Sección 10.9)
      bg.on('pointerover', () => cardCont.setScale(1.05));
      bg.on('pointerout', () => cardCont.setScale(1.0));
      bg.on('pointerdown', () => this.chooseUpgradeByIndex(i));

      cardCont.add([bg, icon, nameTxt, descTxt, valueTxt, keyHint]);
      this.upgradeContainer.add(cardCont);

      this.upgradeCards.push({
        container: cardCont,
        bg,
        icon,
        nameTxt,
        descTxt,
        valueTxt
      });
    }
  }

  bindGameEvents() {
    if (!this.gameScene || !this.gameScene.events) return;

    this.gameScene.events.off('open-pause-modal');
    this.gameScene.events.off('open-upgrade-modal');
    this.gameScene.events.off('distance-milestone');
    this.gameScene.events.off('mission-completed');

    this.gameScene.events.on('open-pause-modal', () => this.showPauseModal());
    this.gameScene.events.on('open-upgrade-modal', (choices) => this.showUpgradeModal(choices));

    // Destello breve del odómetro cada 1.000 m (Sección 10.9)
    this.gameScene.events.on('distance-milestone', () => {
      this.distanceText.setColor(HEX.XP_GOLD);
      this.tweens.add({
        targets: this.distanceText,
        scale: 1.22,
        duration: 160,
        yoyo: true,
        onComplete: () => {
          if (this.distanceText) this.distanceText.setColor(HEX.WHITE);
        }
      });
    });

    // Destello del panel de misión al completarse (Sección 10.9)
    this.gameScene.events.on('mission-completed', () => {
      this.missionFlashRect.setAlpha(0.75);
      this.tweens.add({
        targets: this.missionFlashRect,
        alpha: 0,
        duration: 380
      });
    });
  }

  showPauseModal() {
    if (!this.gameScene || !this.gameScene.player) return;
    this.activeModal = 'PAUSE';
    const p = this.gameScene.player;
    const dist = Math.floor(this.gameScene.waveManager.distance);
    const sector = this.gameScene.waveManager.sector;

    this.pauseStatsText.setText(
      `DISTANCIA: ${String(dist).padStart(5, '0')} m\n` +
        `SECTOR ACTUAL: ${sector}\n` +
        `NIVEL DE NAVE: NV. ${p.level}\n` +
        `DEFENSA: ${p.def} PTS\n` +
        `MITIGACIÓN: ${p.getMitigationPercent()}%`
    );

    this.pauseContainer.setVisible(true);
  }

  closePauseAndResume() {
    if (this.activeModal !== 'PAUSE') return;
    this.activeModal = 'NONE';
    this.pauseContainer.setVisible(false);
    if (this.gameScene) {
      this.gameScene.resumeFromPause();
    }
  }

  restartFullMatch() {
    this.activeModal = 'NONE';
    this.pauseContainer.setVisible(false);
    this.upgradeContainer.setVisible(false);
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
    this.scene.restart();
  }

  showUpgradeModal(choices) {
    this.activeModal = 'UPGRADE';
    this.currentUpgradeChoices = choices || [];

    const categoryColors = {
      attack: PALETTE.PLAYER_CYAN,
      defense: PALETTE.DEF_VIOLET,
      heal: PALETTE.HEAL_GREEN
    };

    const categoryHex = {
      attack: HEX.PLAYER_CYAN,
      defense: HEX.DEF_LIGHT,
      heal: HEX.HEAL_GREEN
    };

    for (let i = 0; i < 3; i++) {
      const card = this.upgradeCards[i];
      const upg = this.currentUpgradeChoices[i];
      if (!upg) {
        card.container.setVisible(false);
        continue;
      }

      card.container.setVisible(true);
      card.container.setScale(1.0);
      const borderColor = categoryColors[upg.category] || PALETTE.PLAYER_CYAN;
      card.bg.setStrokeStyle(2, borderColor, 1);
      card.icon.setTexture(`upgrade_icon_${upg.id}`);
      card.nameTxt.setText(upg.name);
      card.descTxt.setText(upg.desc);
      card.valueTxt.setText(upg.valueText);
      card.valueTxt.setColor(categoryHex[upg.category] || HEX.XP_GOLD);
    }

    this.upgradeContainer.setVisible(true);
  }

  chooseUpgradeByIndex(index) {
    if (this.activeModal !== 'UPGRADE') return;
    const chosen = this.currentUpgradeChoices[index];
    if (!chosen) return;

    this.activeModal = 'NONE';
    this.upgradeContainer.setVisible(false);
    if (this.gameScene) {
      this.gameScene.selectUpgrade(chosen.id);
    }
  }

  update(_time, delta) {
    // Atajos de teclado en modales
    if (this.activeModal === 'UPGRADE') {
      if (Phaser.Input.Keyboard.JustDown(this.key1)) this.chooseUpgradeByIndex(0);
      else if (Phaser.Input.Keyboard.JustDown(this.key2)) this.chooseUpgradeByIndex(1);
      else if (Phaser.Input.Keyboard.JustDown(this.key3)) this.chooseUpgradeByIndex(2);
      return;
    }

    if (this.activeModal === 'PAUSE') {
      if (
        Phaser.Input.Keyboard.JustDown(this.keyP) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.closePauseAndResume();
      }
      return;
    }

    if (!this.gameScene || !this.gameScene.player) return;
    const player = this.gameScene.player;
    const waveMgr = this.gameScene.waveManager;
    const missionMgr = this.gameScene.missionManager;

    // 1. Actualizar Barra de Vida segmentada cada 10% (Sección 10.9)
    const hpPercent = Math.max(0, Math.round(player.hp));
    this.hpLabel.setText(`VIDA ${hpPercent}%`);

    let hpColor = PALETTE.HEAL_GREEN;
    if (hpPercent < 25) hpColor = PALETTE.ALERT_RED;
    else if (hpPercent < 50) hpColor = PALETTE.XP_GOLD;

    if (hpPercent < COMBAT_LIMITS.LOW_HP_THRESHOLD && hpPercent > 0) {
      this.lowHpBlinkTimer += delta;
      if (this.lowHpBlinkTimer >= 220) {
        this.lowHpBlinkTimer = 0;
        this.lowHpBlinkVisible = !this.lowHpBlinkVisible;
      }
    } else {
      this.lowHpBlinkVisible = true;
    }

    this.hpBarGraphics.clear();
    const segCount = 10;
    const segW = 12;
    const segGap = 2;
    const startX = 12;
    const startY = 22;

    for (let i = 0; i < segCount; i++) {
      const segThreshold = i * 10;
      const sx = startX + i * (segW + segGap);
      this.hpBarGraphics.fillStyle(0x1b263b, 0.9);
      this.hpBarGraphics.fillRect(sx, startY, segW, 7);

      if (hpPercent > segThreshold && this.lowHpBlinkVisible) {
        const fillRatio = Math.min(1, (hpPercent - segThreshold) / 10);
        this.hpBarGraphics.fillStyle(hpColor, 1);
        this.hpBarGraphics.fillRect(sx, startY, Math.ceil(segW * fillRatio), 7);
      }
    }

    // 2. Actualizar Indicador de Defensa Logarítmica
    this.defText.setText(`DEF:${player.def} (Mit:${player.getMitigationPercent()}%)`);

    // 3. Actualizar Barra de XP y Nivel
    this.levelText.setText(`NV.${player.level}`);
    this.xpBarGraphics.clear();
    const xpBarX = 52;
    const xpBarY = 54;
    const xpBarW = 108;
    const xpRatio = Math.min(1, player.xp / Math.max(1, player.xpRequired));
    this.xpBarGraphics.fillStyle(0x1b263b, 0.9);
    this.xpBarGraphics.fillRect(xpBarX, xpBarY, xpBarW, 7);
    this.xpBarGraphics.fillStyle(PALETTE.XP_GOLD, 1);
    this.xpBarGraphics.fillRect(xpBarX, xpBarY, Math.round(xpBarW * xpRatio), 7);

    // 4. Actualizar Odómetro y Puntaje
    const dist = Math.floor(waveMgr ? waveMgr.distance : 0);
    this.distanceText.setText(`${String(dist).padStart(5, '0')} m`);
    this.scoreText.setText(`PTS ${String(Math.floor(this.gameScene.score)).padStart(6, '0')}`);

    // 5. Actualizar Recuadro de Misión Activa
    if (missionMgr && missionMgr.currentMission) {
      const m = missionMgr.currentMission;
      const isHeal = m.rewardType === 'HEAL';
      this.missionRewardIcon.setTexture(m.rewardIconKey);
      this.missionRewardText.setText(isHeal ? '+VIDA' : '+XP');
      this.missionRewardText.setColor(isHeal ? HEX.HEAL_GREEN : HEX.XP_GOLD);
      this.missionCountText.setText(`${Math.floor(m.progress)}/${m.target}`);
      this.missionTitleText.setText(m.shortTitle);

      this.missionBarGraphics.clear();
      const mbX = 317;
      const mbY = 58;
      const mbW = 113;
      this.missionBarGraphics.fillStyle(0x1b263b, 0.9);
      this.missionBarGraphics.fillRect(mbX, mbY, mbW, 5);
      this.missionBarGraphics.fillStyle(isHeal ? PALETTE.HEAL_GREEN : PALETTE.XP_GOLD, 1);
      this.missionBarGraphics.fillRect(
        mbX,
        mbY,
        Math.round(mbW * missionMgr.getProgressRatio()),
        5
      );
    }

    // 6. Actualizar Barra de Vida del Jefe (solo visible durante combates de jefe - Sección 8.1 y 10.9)
    const boss = this.gameScene.activeBoss;
    if (boss && boss.active && !boss.isDead) {
      this.bossHudContainer.setVisible(true);
      this.bossNameText.setText(boss.bossName);

      const barW = Math.round(GAME_WIDTH * 0.7);
      const barX = Math.round((GAME_WIDTH - barW) / 2);
      const barY = 98;
      const ratio = boss.getHpRatio();

      this.bossBarGraphics.clear();
      this.bossBarGraphics.fillStyle(0x1b263b, 0.95);
      this.bossBarGraphics.fillRect(barX, barY, barW, 10);
      this.bossBarGraphics.fillStyle(PALETTE.ALERT_RED, 1);
      this.bossBarGraphics.fillRect(barX, barY, Math.round(barW * ratio), 10);

      // En Valkiria se marcan los puntos donde caen los cañones (33% y 66% - Sección 10.9)
      if (boss.bossId === 'VALKIRIA') {
        this.bossBarGraphics.fillStyle(PALETTE.WHITE, 0.9);
        this.bossBarGraphics.fillRect(barX + Math.round(barW * 0.33), barY - 1, 2, 12);
        this.bossBarGraphics.fillRect(barX + Math.round(barW * 0.66), barY - 1, 2, 12);
      }
    } else {
      this.bossHudContainer.setVisible(false);
    }

    // 7. Actualizar Indicador del Tonel (36 px en esquina inferior derecha) e Icono PEM
    this.tonelGraphics.clear();
    this.tonelGraphics.fillStyle(PALETTE.UI_PANEL, 0.8);
    this.tonelGraphics.fillCircle(this.tonelX, this.tonelY, 18);

    if (player.isTonelActive()) {
      // En uso, se ve blanco (Sección 10.9)
      this.tonelGraphics.lineStyle(3.5, PALETTE.WHITE, 1);
      this.tonelGraphics.strokeCircle(this.tonelX, this.tonelY, 18);
      this.tonelLabel.setColor(HEX.WHITE);
    } else if (player.tonelCooldownTimer <= 0) {
      // Listo, brilla en cian (Sección 10.9)
      this.tonelGraphics.lineStyle(3.5, PALETTE.PLAYER_CYAN, 1);
      this.tonelGraphics.strokeCircle(this.tonelX, this.tonelY, 18);
      this.tonelLabel.setColor(HEX.PLAYER_CYAN);
    } else {
      // En enfriamiento de 12 s: se llena gradualmente
      const cdRatio = 1 - player.tonelCooldownTimer / PLAYER_CONFIG.TONEL_COOLDOWN_MS;
      this.tonelGraphics.lineStyle(2, PALETTE.UI_BORDER, 0.7);
      this.tonelGraphics.strokeCircle(this.tonelX, this.tonelY, 18);

      this.tonelGraphics.lineStyle(3, PALETTE.PLAYER_CYAN, 0.85);
      this.tonelGraphics.beginPath();
      this.tonelGraphics.arc(
        this.tonelX,
        this.tonelY,
        18,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * cdRatio,
        false
      );
      this.tonelGraphics.strokePath();
      this.tonelLabel.setColor(HEX.UI_TEXT);
    }

    // Icono de disparo desactivado junto al Tonel durante los 1.5 s de la PEM (Sección 10.9)
    this.empDisabledIcon.setVisible(player.isFireDisabled());
  }
}

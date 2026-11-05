/**
 * Sintetizador de audio retro 100% procedural mediante Web Audio API.
 * Sin archivos externos. Se desbloquea en el primer clic del jugador.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bossMode = false;
    this.bgmVolume = 0.035;
    this.lastShootTime = 0;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {
      // Ignorar en entornos sin soporte de Web Audio
    }
  }

  playTone(freq, duration = 0.08, type = 'square', volume = 0.05, slideTo = null) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignorar errores de audio
    }
  }

  playShoot() {
    const now = performance.now();
    if (now - this.lastShootTime < 55) return;
    this.lastShootTime = now;
    this.playTone(720, 0.045, 'square', 0.025, 280);
  }

  playHit() {
    this.playTone(210, 0.035, 'triangle', 0.03, 110);
  }

  playExplosion(large = false) {
    if (large) {
      this.playTone(130, 0.28, 'sawtooth', 0.07, 32);
      setTimeout(() => this.playTone(90, 0.22, 'square', 0.05, 25), 50);
    } else {
      this.playTone(170, 0.12, 'sawtooth', 0.045, 45);
    }
  }

  playPlayerDamage() {
    this.playTone(150, 0.22, 'sawtooth', 0.08, 45);
  }

  playDefLost() {
    this.playTone(440, 0.18, 'sawtooth', 0.06, 140);
  }

  playDefGain() {
    this.playTone(330, 0.12, 'triangle', 0.06, 660);
  }

  playHeal() {
    this.playTone(440, 0.09, 'sine', 0.06, 587);
    setTimeout(() => this.playTone(587, 0.14, 'sine', 0.06, 880), 80);
  }

  playTonel() {
    this.playTone(300, 0.22, 'sine', 0.055, 760);
  }

  playBossWarning() {
    this.playTone(220, 0.35, 'sawtooth', 0.07, 180);
    setTimeout(() => this.playTone(220, 0.35, 'sawtooth', 0.07, 180), 450);
  }

  playEmpWave() {
    this.playTone(680, 0.35, 'sawtooth', 0.075, 95);
  }

  playLevelUp() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.11, 'triangle', 0.06), idx * 65);
    });
  }

  playMissionComplete() {
    this.playTone(523.25, 0.1, 'square', 0.05, 659.25);
    setTimeout(() => this.playTone(659.25, 0.15, 'square', 0.05, 783.99), 90);
  }

  startBgm(boss = false) {
    this.bossMode = boss;
    if (this.bgmTimer) return;
    const bassNormal = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const bassBoss = [82.41, 87.31, 82.41, 98.0, 82.41, 87.31, 110.0, 73.42];
    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const seq = this.bossMode ? bassBoss : bassNormal;
      const note = seq[this.bgmStep % seq.length];
      this.bgmStep++;
      this.playTone(note, 0.12, 'triangle', this.bgmVolume);
    }, 220);
  }

  setBgmBossAlert(isAlert) {
    this.bgmVolume = isAlert ? 0.015 : 0.035;
  }

  setBossMode(isBoss) {
    this.bossMode = isBoss;
    this.bgmVolume = 0.035;
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeaponType } from './types';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.15, this.ctx.currentTime); // keep default soft
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API is not supported in this browser', e);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx.currentTime);
    }
  }

  getMuted() {
    return this.isMuted;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot(type: WeaponType) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    const now = this.ctx.currentTime;

    switch (type) {
      case 'BLASTER':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
        break;

      case 'LASER':
        // Short high-pitched pulse or chirp
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.06);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        break;

      case 'ROCKET':
        // Low frequency whoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
        break;

      case 'RAILGUN':
        // Double pulse electric whip crack
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.setValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.36);
        break;
    }
  }

  playExplosion(intensity: 'small' | 'medium' | 'boss') {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // Create white-noise-like buffer for authentic retro crunch
    const bufferSize = this.ctx.sampleRate * (intensity === 'boss' ? 1.5 : intensity === 'medium' ? 0.4 : 0.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to make it sound muffled or bassy
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    
    const gain = this.ctx.createGain();

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    if (intensity === 'small') {
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    } else if (intensity === 'medium') {
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.38);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    } else {
      // Boss explosion - extremely heavy rumble and pitch sliding down
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 1.4);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

      // Add a low frequency oscillator to shake the speakers
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(80, now);
      subOsc.frequency.linearRampToValueAtTime(20, now + 1.2);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      
      subOsc.connect(subGain);
      subGain.connect(this.masterVolume || this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.2);
    }

    noiseNode.start(now);
    noiseNode.stop(now + (intensity === 'boss' ? 1.5 : intensity === 'medium' ? 0.4 : 0.2));
  }

  playHit() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    const now = this.ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(80, now + 0.04);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playPowerup() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(330, now);
    osc1.frequency.setValueAtTime(440, now + 0.08);
    osc1.frequency.setValueAtTime(554, now + 0.16);
    osc1.frequency.setValueAtTime(659, now + 0.24);
    osc1.frequency.setValueAtTime(880, now + 0.32);

    osc2.frequency.setValueAtTime(333, now);
    osc2.frequency.setValueAtTime(443, now + 0.08);
    osc2.frequency.setValueAtTime(557, now + 0.16);
    osc2.frequency.setValueAtTime(662, now + 0.24);
    osc2.frequency.setValueAtTime(883, now + 0.32);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.15, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  }

  playBossAlert() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const time = now + i * 0.45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterVolume || this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.linearRampToValueAtTime(280, time + 0.2);
      osc.frequency.linearRampToValueAtTime(180, time + 0.4);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

      osc.start(time);
      osc.stop(time + 0.41);
    }
  }

  playVictoryTheme() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Energetic synth triumphant chords
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C5 to C6
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterVolume || this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.3);

      osc.start(noteTime);
      osc.stop(noteTime + 0.31);
    });
  }

  playGameOverTheme() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 277.18, 261.63, 220.00]; // D4, C#4, C4, A3 sad descent
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterVolume || this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.linearRampToValueAtTime(freq - 10, noteTime + 0.3);
      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.4);

      osc.start(noteTime);
      osc.stop(noteTime + 0.41);
    });
  }
}

export const sfx = new SoundSynthesizer();

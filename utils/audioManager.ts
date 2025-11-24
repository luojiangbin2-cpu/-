
import { Settings } from '../types';

// Simple Procedural Audio System to avoid external assets
class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: Settings;
  private isPlayingMusic: boolean = false;
  private musicTimerId: number | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateSettings(newSettings: Settings) {
    this.settings = newSettings;
    // Restart music if volume changed from 0 to something else, or strictly to apply volume
    if (this.isPlayingMusic && this.settings.masterVolume > 0 && this.settings.musicVolume > 0) {
        // Logic handled in loop
    }
  }

  private getGain(type: 'music' | 'sfx') {
    if (!this.ctx) return null;
    const gain = this.ctx.createGain();
    const vol = type === 'music' ? this.settings.musicVolume : this.settings.sfxVolume;
    gain.gain.value = vol * this.settings.masterVolume;
    gain.connect(this.ctx.destination);
    return gain;
  }

  // --- SFX Generators ---

  playShoot() {
    if (!this.ctx) return;
    const gain = this.getGain('sfx');
    if (!gain || gain.gain.value <= 0.01) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHit(isHeavy: boolean = false) {
    if (!this.ctx) return;
    const gain = this.getGain('sfx');
    if (!gain || gain.gain.value <= 0.01) return;

    // Noise burst for hit
    const bufferSize = this.ctx.sampleRate * (isHeavy ? 0.2 : 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like a thud or slash
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isHeavy ? 300 : 800;

    noise.connect(filter);
    filter.connect(gain);
    
    noise.start();
  }

  playSFX(type: string) {
    if (!this.ctx) return;
    const gain = this.getGain('sfx');
    if (!gain || gain.gain.value <= 0.01) return;

    // Generic whoosh/slide sound for dash
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
    
    // Add some noise/wind for texture
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);

    osc.start();
    noise.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playLevelUp() {
    if (!this.ctx) return;
    const gain = this.getGain('sfx');
    if (!gain || gain.gain.value <= 0.01) return;

    // Arpeggio
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        
        const localGain = this.ctx.createGain();
        localGain.gain.setValueAtTime(gain.gain.value, now + i * 0.1);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
        
        osc.connect(localGain);
        localGain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
    });
  }

  playUI(type: 'click' | 'hover' | 'trash') {
    if (!this.ctx) return;
    const gain = this.getGain('sfx');
    if (!gain || gain.gain.value <= 0.01) return;

    const osc = this.ctx.createOscillator();
    
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    } else if (type === 'hover') {
        gain.gain.value *= 0.3; // quieter
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    } else if (type === 'trash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
    
    osc.connect(gain);
  }

  // --- BGM System ---
  // Darker, dungeon ambient style
  startMusic() {
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.init();
    this.scheduleNote();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimerId) window.clearTimeout(this.musicTimerId);
  }

  private scheduleNote() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const gain = this.getGain('music');
    if (gain && gain.gain.value > 0.01) {
        // Deep Ambient Drones
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        // Very low frequencies for dungeon vibe (D1, F1, A1)
        const root = 36.71; // D1
        const notes = [root, root * 1.2, root * 1.5]; // Minor Interval
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.01; // Detune
        
        osc1.type = 'sawtooth'; // Gritty texture
        osc2.type = 'square';

        filter.type = 'lowpass';
        filter.frequency.value = 200 + Math.random() * 200; // Muffled sound
        filter.Q.value = 1;

        const dur = 6;
        const now = this.ctx.currentTime;

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(gain.gain.value * 0.4, now + 2); // Slow fade in
        env.gain.linearRampToValueAtTime(0, now + dur); // Slow fade out

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + dur);
        osc2.stop(now + dur);
    }

    // Longer intervals between drones
    this.musicTimerId = window.setTimeout(() => this.scheduleNote(), 4000 + Math.random() * 2000);
  }
}

export const audioManager = new AudioManager({
    language: 'en', // dummy default, overwritten on load
    masterVolume: 0.5,
    musicVolume: 0.5,
    sfxVolume: 0.5
});

/**
 * 篝火：被遗忘的土地 - 沉浸式国风音效系统
 * Immersive Chinese Traditional Audio System
 * 
 * Uses Web Audio API to generate:
 * - Day: 古琴-style pentatonic melodies (宫商角徵羽)
 * - Night: Tense atmospheric drones
 * - Dynamic transitions
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.4;
        this.initialized = false;
        this.isPlayingMusic = false;
        this.currentMusicType = null; // 'day' or 'night'
        this.musicGain = null;
        this.musicOscillators = [];
        this.nextNoteTime = 0;
        this.musicTimer = null;
        
        // 五声音阶 (Pentatonic) frequencies - 宫(C) 商(D) 角(E) 徵(G) 羽(A)
        this.pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 D4 E4 G4 A4
        this.pentatonicHigh = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5 D5 E5 G5 A5
        
        // Night dissonant scale
        this.nightScale = [130.81, 155.56, 196.00, 207.65, 246.94]; // Low dark notes
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.ctx.destination);
            
            // Music gain node for fade in/out
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0;
            this.musicGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio API 不可用:', e);
            this.enabled = false;
        }
    }

    ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ==================== Music System ====================
    
    startMusic(type) {
        if (!this.enabled || !this.ctx) return;
        this.ensureResumed();
        
        if (this.currentMusicType === type && this.isPlayingMusic) return;
        
        // Fade out current music
        this.stopMusic(() => {
            this.currentMusicType = type;
            this.isPlayingMusic = true;
            
            // Fade in new music
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 2);
            
            if (type === 'day') {
                this.playDayMusic();
            } else {
                this.playNightMusic();
            }
        });
    }
    
    stopMusic(callback) {
        if (!this.isPlayingMusic) {
            if (callback) callback();
            return;
        }
        
        // Fade out over 1 second
        if (this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        }
        
        // Clear all music oscillators after fade
        setTimeout(() => {
            this.musicOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            this.musicOscillators = [];
            
            if (this.musicTimer) {
                clearTimeout(this.musicTimer);
                this.musicTimer = null;
            }
            
            this.isPlayingMusic = false;
            if (callback) callback();
        }, 1000);
    }
    
    playDayMusic() {
        if (!this.isPlayingMusic || this.currentMusicType !== 'day') return;
        
        const now = this.ctx.currentTime;
        const noteDuration = 2 + Math.random() * 1.5; // Slow, peaceful notes
        
        // Play a pentatonic melody note
        const useHigh = Math.random() > 0.6;
        const scale = useHigh ? this.pentatonicHigh : this.pentatonic;
        const noteIndex = Math.floor(Math.random() * scale.length);
        const freq = scale[noteIndex];
        
        // Main melody oscillator (sine wave for Guqin-like tone)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        // Subtle vibrato
        const vibrato = this.ctx.createOscillator();
        const vibratoGain = this.ctx.createGain();
        vibrato.frequency.value = 3 + Math.random() * 2;
        vibratoGain.gain.value = 2;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(now);
        vibrato.stop(now + noteDuration);
        
        // Envelope - soft attack and release (Guqin style)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.06, now + noteDuration * 0.7);
        gain.gain.linearRampToValueAtTime(0, now + noteDuration);
        
        osc.connect(gain);
        gain.connect(this.musicGain);
        
        osc.start(now);
        osc.stop(now + noteDuration);
        this.musicOscillators.push(osc);
        
        // Occasional harmony note
        if (Math.random() > 0.5) {
            const harmonyFreq = scale[(noteIndex + 2) % scale.length];
            const harmonyOsc = this.ctx.createOscillator();
            const harmonyGain = this.ctx.createGain();
            
            harmonyOsc.type = 'triangle';
            harmonyOsc.frequency.setValueAtTime(harmonyFreq, now + 0.3);
            
            harmonyGain.gain.setValueAtTime(0, now + 0.3);
            harmonyGain.gain.linearRampToValueAtTime(0.04, now + 0.8);
            harmonyGain.gain.linearRampToValueAtTime(0, now + noteDuration);
            
            harmonyOsc.connect(harmonyGain);
            harmonyGain.connect(this.musicGain);
            
            harmonyOsc.start(now + 0.3);
            harmonyOsc.stop(now + noteDuration);
            this.musicOscillators.push(harmonyOsc);
        }
        
        // Background ambience - wind/breeze
        if (Math.random() > 0.7) {
            this.playWindTone(now, noteDuration);
        }
        
        // Schedule next note
        this.musicTimer = setTimeout(() => {
            if (this.isPlayingMusic && this.currentMusicType === 'day') {
                this.playDayMusic();
            }
        }, (noteDuration + 0.5 + Math.random()) * 1000);
    }
    
    playNightMusic() {
        if (!this.isPlayingMusic || this.currentMusicType !== 'night') return;
        
        const now = this.ctx.currentTime;
        const segmentDuration = 3 + Math.random() * 2;
        
        // Low drone - ominous bass
        const droneFreq = this.nightScale[Math.floor(Math.random() * this.nightScale.length)];
        const drone = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        const droneFilter = this.ctx.createBiquadFilter();
        
        drone.type = 'sawtooth';
        drone.frequency.setValueAtTime(droneFreq, now);
        
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 300 + Math.random() * 200;
        droneFilter.Q.value = 5;
        
        droneGain.gain.setValueAtTime(0, now);
        droneGain.gain.linearRampToValueAtTime(0.06, now + 1);
        droneGain.gain.linearRampToValueAtTime(0, now + segmentDuration);
        
        drone.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.musicGain);
        
        drone.start(now);
        drone.stop(now + segmentDuration);
        this.musicOscillators.push(drone);
        
        // Occasional high dissonant note (like a scream or warning)
        if (Math.random() > 0.6) {
            const warningFreq = 600 + Math.random() * 400;
            const warning = this.ctx.createOscillator();
            const warningGain = this.ctx.createGain();
            
            warning.type = 'sine';
            warning.frequency.setValueAtTime(warningFreq, now + 1);
            warning.frequency.exponentialRampToValueAtTime(warningFreq * 0.5, now + segmentDuration * 0.5);
            
            warningGain.gain.setValueAtTime(0, now + 1);
            warningGain.gain.linearRampToValueAtTime(0.03, now + 1.5);
            warningGain.gain.linearRampToValueAtTime(0, now + segmentDuration * 0.8);
            
            warning.connect(warningGain);
            warningGain.connect(this.musicGain);
            
            warning.start(now + 1);
            warning.stop(now + segmentDuration * 0.8);
            this.musicOscillators.push(warning);
        }
        
        // Occasional heartbeat-like low thump
        if (Math.random() > 0.5) {
            this.playHeartbeat(now, segmentDuration);
        }
        
        this.musicTimer = setTimeout(() => {
            if (this.isPlayingMusic && this.currentMusicType === 'night') {
                this.playNightMusic();
            }
        }, segmentDuration * 1000);
    }
    
    playWindTone(startTime, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400 + Math.random() * 200, startTime);
        osc.frequency.linearRampToValueAtTime(300 + Math.random() * 100, startTime + duration);
        
        filter.type = 'bandpass';
        filter.frequency.value = 500;
        filter.Q.value = 1;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.02, startTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        this.musicOscillators.push(osc);
    }
    
    playHeartbeat(startTime, duration) {
        // Two quick low pulses
        for (let i = 0; i < 2; i++) {
            const t = startTime + i * 0.3;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            
            osc.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(t);
            osc.stop(t + 0.2);
            this.musicOscillators.push(osc);
        }
    }
    
    // Public API to switch music based on day/night
    setDayNight(isDay) {
        if (!this.enabled) return;
        const type = isDay ? 'day' : 'night';
        this.startMusic(type);
    }

    // ==================== SFX (Polished) ====================

    playBuild() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Wood knock + chisel sound
        this.playTone(200, 0.06, 'triangle', 0.35);
        setTimeout(() => this.playTone(280, 0.05, 'triangle', 0.25), 60);
        setTimeout(() => this.playNoise(0.04, 0.08), 80);
    }

    playChop() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Sharp wood crack
        this.playNoise(0.03, 0.12);
        this.playTone(180, 0.03, 'sawtooth', 0.2);
        setTimeout(() => this.playNoise(0.02, 0.06), 50);
    }

    playCraft() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Bell/chime sound
        this.playTone(880, 0.2, 'sine', 0.4);
        setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.3), 120);
        setTimeout(() => this.playTone(1320, 0.25, 'sine', 0.25), 240);
    }

    playRecruit() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Warm welcoming chord
        this.playTone(440, 0.25, 'sine', 0.25);
        setTimeout(() => this.playTone(554, 0.25, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(659, 0.35, 'sine', 0.18), 200);
    }

    playAttack() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Sword slash - sweeping frequency
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playArrow() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Bow string + whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playEnemyDeath() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Demonic dissipation
        this.playTone(300, 0.08, 'sawtooth', 0.25);
        setTimeout(() => this.playTone(180, 0.1, 'sawtooth', 0.2), 60);
        setTimeout(() => this.playTone(80, 0.15, 'sawtooth', 0.15), 120);
        setTimeout(() => this.playNoise(0.06, 0.15), 100);
    }

    playNightfall() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Deep ominous chord
        this.playTone(80, 1.0, 'sine', 0.3);
        this.playTone(100, 0.8, 'sine', 0.25);
        setTimeout(() => this.playTone(65, 1.2, 'sine', 0.35), 200);
    }

    playDawn() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Gentle morning bird-like notes
        this.playTone(800, 0.1, 'sine', 0.12);
        setTimeout(() => this.playTone(1000, 0.08, 'sine', 0.1), 200);
        setTimeout(() => this.playTone(1200, 0.06, 'sine', 0.08), 400);
    }

    playEvent() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Mysterious discovery chord
        this.playTone(523, 0.15, 'triangle', 0.25);
        setTimeout(() => this.playTone(659, 0.15, 'triangle', 0.2), 150);
        setTimeout(() => this.playTone(784, 0.2, 'triangle', 0.25), 300);
        setTimeout(() => this.playTone(1047, 0.3, 'triangle', 0.18), 450);
    }

    playSave() {
        if (!this.enabled) return;
        this.ensureResumed();
        this.playTone(660, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(880, 0.15, 'sine', 0.2), 100);
    }

    playError() {
        if (!this.enabled) return;
        this.ensureResumed();
        // Low warning
        this.playTone(180, 0.15, 'triangle', 0.18);
        setTimeout(() => this.playTone(140, 0.2, 'triangle', 0.12), 120);
    }

    playWoodCollect() {
        if (!this.enabled) return;
        this.ensureResumed();
        this.playTone(400, 0.05, 'triangle', 0.18);
        setTimeout(() => this.playTone(500, 0.04, 'triangle', 0.12), 50);
    }

    playFoodCollect() {
        if (!this.enabled) return;
        this.ensureResumed();
        this.playTone(600, 0.06, 'sine', 0.18);
        setTimeout(() => this.playTone(700, 0.08, 'sine', 0.12), 70);
    }

    // ==================== Ambience ====================

    startBonfireAmbience() {
        if (!this.enabled || !this.ctx) return;
        this.ensureResumed();
        if (this.bonfireInterval) return;

        this.bonfireInterval = setInterval(() => {
            if (!this.enabled) return;
            const delay = 500 + Math.random() * 3000;
            setTimeout(() => {
                // Softer crackle
                this.playNoise(0.015 + Math.random() * 0.025, 0.04 + Math.random() * 0.03);
            }, delay);
        }, 800);
    }

    stopBonfireAmbience() {
        if (this.bonfireInterval) {
            clearInterval(this.bonfireInterval);
            this.bonfireInterval = null;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopMusic();
            this.stopBonfireAmbience();
        } else {
            this.startBonfireAmbience();
        }
        return this.enabled;
    }

    // ==================== Helpers ====================

    playTone(freq, duration, type, volume) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume || 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volume) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }
}

const SFX = new AudioManager();

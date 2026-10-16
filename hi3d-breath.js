"use strict";

(() => {
  class BirthdayBreathDetector {
    constructor(mode = "gentle") {
      this.mode = mode;
      this.reset();
    }

    reset() {
      this.samples = [];
      this.elapsed = 0;
      this.floor = 0.001;
      this.progress = 0;
      this.quietFor = 0;
      this.activeFor = 0;
      this.level = 0;
      this.peak = 0;
    }

    update({ rms, flatness = 0, lowShare = 0, peakShare = 1 }, seconds) {
      const delta = Math.max(0, Math.min(seconds, 0.1));
      const amplitude = Number.isFinite(rms) ? Math.max(0, rms) : 0;
      this.elapsed += delta;
      this.peak = Math.max(this.peak, amplitude);
      const presets = {
        gentle: { minimum: 0.004, rise: 0.65, duration: 0.52 },
        normal: { minimum: 0.007, rise: 0.9, duration: 0.66 },
        steady: { minimum: 0.012, rise: 1.25, duration: 0.78 },
      };
      const preset = presets[this.mode] || presets.gentle;
      const calibrating = this.elapsed < 0.65;
      if (calibrating) {
        this.samples.push(amplitude);
        const ordered = this.samples.slice().sort((first, second) => first - second);
        this.floor = Math.max(0.0004, ordered[Math.floor((ordered.length - 1) * 0.2)] || 0.0004);
      }
      const threshold = Math.max(preset.minimum, this.floor + Math.max(0.0025, this.floor * preset.rise));
      const relative = Math.max(0, amplitude - this.floor) / Math.max(threshold - this.floor, 0.001);
      this.level += (Math.min(1, relative / 2.2) - this.level) * Math.min(1, delta * 15);
      const broad = flatness > 0.09 && peakShare < 0.55;
      const wind = lowShare > 0.55 && peakShare < 0.40;
      const audible = !calibrating && relative > 1 && (broad || wind);
      if (audible) {
        this.activeFor += delta;
        this.quietFor = 0;
        if (this.activeFor > 0.08) this.progress = Math.min(1, this.progress + delta / preset.duration);
      } else {
        this.quietFor += delta;
        if (this.quietFor > 0.18) {
          this.progress = Math.max(0, this.progress - delta * 0.42);
          this.activeFor = Math.max(0, this.activeFor - delta * 2);
        }
        if (!calibrating && amplitude < threshold && this.progress === 0) {
          this.floor += (amplitude - this.floor) * Math.min(1, delta * 0.12);
        }
      }
      return {
        calibrating,
        audible,
        progress: this.progress,
        level: this.level,
        threshold,
        silent: this.elapsed > 4 && this.peak < 0.0002,
        complete: this.progress >= 1,
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = BirthdayBreathDetector;
  else window.BirthdayBreathDetector = BirthdayBreathDetector;
})();

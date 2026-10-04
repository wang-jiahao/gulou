export type WeatherMode = 'clear' | 'rain' | 'random';

/** Simulation time, independent of wall-clock timers so pause and tests are deterministic. */
export class EnvironmentState {
  hour = 15;
  autoTime = true;
  cycleMinutes = 12;
  weatherMode: WeatherMode = 'random';
  rain = 0;
  wetness = 0;
  targetRain = 0;
  nextWeatherIn = 140;
  weatherTransitions = 0;
  private seed: number;
  constructor(seed = Math.floor(Math.random() * 2147483647)) { this.seed = seed; this.nextWeatherIn = 100 + this.random() * 100; }
  /** A fresh visit starts clear in the afternoon; keep the preferred cycle speed. */
  resetForEntry() {
    this.hour = 15;
    this.autoTime = true;
    this.weatherMode = 'random';
    this.rain = this.wetness = this.targetRain = 0;
    this.nextWeatherIn = 100 + this.random() * 100;
    this.weatherTransitions = 0;
  }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  setHour(hour: number, manual = true) {
    if (!Number.isFinite(hour)) return;
    this.hour = ((hour % 24) + 24) % 24;
    if (manual) this.autoTime = false;
  }
  setWeather(mode: WeatherMode) {
    this.weatherMode = mode;
    if (mode !== 'random') this.targetRain = mode === 'rain' ? 1 : 0;
    else this.nextWeatherIn = 75 + this.random() * 100;
  }
  update(dt: number, active: boolean) {
    if (active && this.autoTime) this.hour = (this.hour + dt * 24 / (Math.max(2, this.cycleMinutes) * 60)) % 24;
    if (active && this.weatherMode === 'random') {
      this.nextWeatherIn -= dt;
      while (this.nextWeatherIn <= 0) {
        this.targetRain = this.targetRain > .5 ? 0 : (this.random() < .75 ? 1 : 0);
        this.nextWeatherIn += this.targetRain ? 45 + this.random() * 75 : 90 + this.random() * 150;
        this.weatherTransitions++;
      }
    }
    this.rain += (this.targetRain - this.rain) * (1 - Math.exp(-dt / 2.5));
    this.wetness += (this.targetRain - this.wetness) * (1 - Math.exp(-dt / (this.targetRain ? 7 : 90)));
  }
  get clock() { const minutes = Math.floor(this.hour * 60) % 1440; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  get weatherLabel() { return this.rain > .15 || this.targetRain > .5 ? '阵雨' : '晴'; }
}

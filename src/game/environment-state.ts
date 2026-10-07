export type WeatherMode = 'clear' | 'rain' | 'random';
export const DEFAULT_CYCLE_MINUTES = 64;
export const CYCLE_MINUTES = [32, DEFAULT_CYCLE_MINUTES, 128];
/** Preserve fast/normal/slow preferences across both previous sets of presets. */
export function restoreCycleMinutes(value: unknown) {
  if (typeof value !== 'number') return DEFAULT_CYCLE_MINUTES;
  if ([6, 12, 24].includes(value)) return value * 16 / 3;
  if ([48, 96, 192].includes(value)) return value * 2 / 3;
  return CYCLE_MINUTES.includes(value) ? value : DEFAULT_CYCLE_MINUTES;
}

/** Simulation time, independent of wall-clock timers so pause and tests are deterministic. */
export class EnvironmentState {
  hour = 15;
  autoTime = true;
  cycleMinutes = DEFAULT_CYCLE_MINUTES;
  weatherMode: WeatherMode = 'random';
  rain = 0;
  wetness = 0;
  targetRain = 0;
  nextWeatherIn = 420;
  weatherTransitions = 0;
  private seed: number;
  constructor(seed = Math.floor(Math.random() * 2147483647)) { this.seed = seed; this.nextWeatherIn = 300 + this.random() * 240; }
  /** A fresh visit starts clear in the afternoon; keep the preferred cycle speed. */
  resetForEntry() {
    this.hour = 15;
    this.autoTime = true;
    this.weatherMode = 'random';
    this.rain = this.wetness = this.targetRain = 0;
    this.nextWeatherIn = 300 + this.random() * 240;
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
    else this.nextWeatherIn = this.targetRain > .5 ? 45 + this.random() * 60 : 240 + this.random() * 180;
  }
  update(dt: number, active: boolean) {
    if (active && this.autoTime) this.hour = (this.hour + dt * 24 / (Math.max(2, this.cycleMinutes) * 60)) % 24;
    if (active && this.weatherMode === 'random') {
      this.nextWeatherIn -= dt;
      while (this.nextWeatherIn <= 0) {
        this.targetRain = this.targetRain > .5 ? 0 : (this.random() < .4 ? 1 : 0);
        this.nextWeatherIn += this.targetRain ? 45 + this.random() * 60 : 240 + this.random() * 180;
        this.weatherTransitions++;
      }
    }
    this.rain += (this.targetRain - this.rain) * (1 - Math.exp(-dt / 2.5));
    this.wetness += (this.targetRain - this.wetness) * (1 - Math.exp(-dt / (this.targetRain ? 7 : 90)));
  }
  get clock() { const minutes = Math.floor(this.hour * 60) % 1440; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  get weatherLabel() { return this.rain > .15 || this.targetRain > .5 ? '阵雨' : '晴'; }
}

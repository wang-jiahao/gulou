import assert from 'node:assert/strict';
import { EnvironmentState } from '../src/game/environment-state.ts';
const state = new EnvironmentState(123);
state.hour = 23.9; state.cycleMinutes = 6; state.update(3, true);
assert.ok(state.hour < 1, 'clock wraps through midnight');
state.autoTime = false; const hour = state.hour; state.update(20, true); assert.equal(state.hour, hour, 'manual clock stays fixed');
state.autoTime = true; state.update(20, false); assert.equal(state.hour, hour, 'menu pauses clock');
state.setWeather('rain'); state.update(20, true); assert.ok(state.rain > .99 && state.wetness > .9);
state.setWeather('clear'); state.update(6, true); assert.ok(state.rain < .1 && state.wetness > .7, 'ground dries more slowly than rain stops');
state.setWeather('random'); let rainy = false, clear = false;
for (let second = 0; second < 1800; second++) { state.update(1, true); if (state.targetRain === 1) rainy = true; else clear = true; }
assert.ok(rainy && clear && state.weatherTransitions > 5, 'seeded random weather reaches rain and clear states');
console.log('PASS: midnight rollover, manual time, paused clock, rain, gradual drying, random weather.');

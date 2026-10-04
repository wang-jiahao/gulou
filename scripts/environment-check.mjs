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
state.setHour(23); state.setWeather('rain'); state.update(20, true); state.cycleMinutes = 24;
state.resetForEntry();
assert.equal(state.hour, 15); assert.equal(state.autoTime, true); assert.equal(state.weatherMode, 'random');
assert.equal(state.cycleMinutes, 24, 'entry preserves cycle speed preference');
assert.equal(state.rain + state.wetness + state.targetRain, 0, 'entry clears rain and wet ground immediately');
assert.equal(state.weatherTransitions, 0); assert.ok(state.nextWeatherIn >= 100 && state.nextWeatherIn < 200);
const countdown = state.nextWeatherIn; state.update(40, false);
assert.equal(state.hour, 15); assert.equal(state.nextWeatherIn, countdown, 'menu does not consume initial clear spell');
state.update(99, true); assert.equal(state.targetRain, 0); assert.ok(state.hour > 15, 'time advances during initial clear weather');
state.cycleMinutes = 6; state.update(90, true); assert.ok(state.hour >= 21 && state.hour < 24, 'automatic cycle reaches night from entry');
let entryRain = false;
for (let second = 0; second < 1800; second++) { state.update(1, true); entryRain ||= state.rain > .5; }
assert.ok(entryRain && state.weatherTransitions > 5, 'entry resumes random weather');
console.log('PASS: day/clear entry, preserved speed, midnight, manual controls, pause, rain, drying and random weather.');

import assert from 'node:assert/strict';
import { EnvironmentState, restoreCycleMinutes } from '../src/game/environment-state.ts';
const state = new EnvironmentState(123);
assert.equal(state.cycleMinutes, 96);
for (const [saved, expected] of [[6,48],[12,96],[24,192],[48,48],[96,96],[192,192],[undefined,96],['12',96],[NaN,96]]) {
  assert.equal(restoreCycleMinutes(saved), expected, `saved speed ${saved}`);
}
state.update(90, true); assert.ok(state.hour < 15.4, '90 seconds no longer turns afternoon into night');
state.resetForEntry(); state.update(720, true); assert.ok(Math.abs(state.hour - 18) < .001, 'default afternoon lasts 12 real minutes before sunset');
state.hour = 23.99; state.update(3, true);
assert.ok(state.hour < 1, 'clock wraps through midnight');
state.autoTime = false; const hour = state.hour; state.update(20, true); assert.equal(state.hour, hour, 'manual clock stays fixed');
state.autoTime = true; state.update(20, false); assert.equal(state.hour, hour, 'menu pauses clock');
state.setWeather('rain'); state.update(20, true); assert.ok(state.rain > .99 && state.wetness > .9);
state.setWeather('clear'); state.update(6, true); assert.ok(state.rain < .1 && state.wetness > .7, 'ground dries more slowly than rain stops');
state.cycleMinutes = 192; state.resetForEntry();
assert.equal(state.hour, 15); assert.equal(state.autoTime, true); assert.equal(state.weatherMode, 'random');
assert.equal(state.cycleMinutes, 192, 'entry preserves cycle speed preference');
assert.equal(state.rain + state.wetness + state.targetRain, 0, 'entry clears rain and wet ground immediately');
assert.equal(state.weatherTransitions, 0); assert.ok(state.nextWeatherIn >= 300 && state.nextWeatherIn < 540);
const countdown = state.nextWeatherIn; state.update(40, false);
assert.equal(state.hour, 15); assert.equal(state.nextWeatherIn, countdown, 'menu does not consume initial clear spell');
state.update(299, true); assert.equal(state.targetRain, 0);
let clearSeconds = 0, totalSeconds = 0;
for (let seed = 1; seed <= 24; seed++) {
  const weather = new EnvironmentState(seed); weather.autoTime = false;
  let rainy = false;
  for (let second = 0; second < 86400; second++) {
    weather.update(1, true); rainy ||= weather.rain > .5;
    if (weather.weatherLabel === '晴') clearSeconds++;
    totalSeconds++;
  }
  assert.ok(rainy, 'occasional rain remains possible for every sampled seed');
}
const clearShare = clearSeconds / totalSeconds;
assert.ok(clearShare > .85 && clearShare < .96, `long-run clear share ${clearShare}`);
console.log(`PASS: slower default, all saved speeds migrated, entry, midnight, pause, manual rain, drying; ${ (clearShare * 100).toFixed(1)}% clear across 24 simulated days.`);

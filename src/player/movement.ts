// Speeds in metres per second. Shared by gameplay, verification and filming.
export const movementSpeeds = {
  walk: 3, run: 9,
  bicycle: 8, bicycleBoost: 15,
  flightIdle: 14, flight: 24, flightBoost: 40,
  flightUp: 10, flightDown: 14,
  car: 16, carBoost: 28, carReverse: 4,
} as const;

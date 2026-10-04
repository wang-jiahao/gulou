// Reuse the entrance regression with a separately persisted ground-detail baseline.
process.env.TANG_GROUND_DETAILS='1';
await import('./tang-access-check.mjs');

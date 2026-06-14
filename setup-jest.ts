import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();

// jsdom does not implement crypto.randomUUID — required by services that generate aggregate IDs
import { randomUUID } from 'node:crypto';
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID },
  configurable: true,
  writable: true,
});

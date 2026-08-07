import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();

// jsdom does not implement crypto.randomUUID — required by services that generate aggregate IDs
import { randomUUID } from 'node:crypto';
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID },
  configurable: true,
  writable: true,
});

// jsdom does not implement IntersectionObserver — Angular's `@defer (on viewport)` polls for
// it on every change-detection cycle regardless of which defer block a test cares about, and
// throws a ReferenceError without this stub. Tests resolve defer blocks explicitly via
// fixture.getDeferBlocks()/.render(), so this stub only needs to exist, not actually observe.
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: IntersectionObserverStub,
  configurable: true,
  writable: true,
});

# Refactoring: `@defer` for the device list

**Where:** `BuildingDetailComponent`

## Before

```html
@if (hasDevices()) {
  <app-device-list [devices]="b.devices" (removeDevice)="onRemoveDevice($event)" />
} @else {
  <p>No devices yet.</p>
}
```

## After

```html
@if (hasDevices()) {
  @defer (on viewport) {
    <app-device-list [devices]="b.devices" (removeDevice)="onRemoveDevice($event)" />
  } @placeholder {
    <div class="building-detail-page__devices-placeholder"></div>
  } @loading (minimum 100ms) {
    <p>Loading devices…</p>
  }
} @else {
  <p>No devices yet.</p>
}
```

## Why it matters

`@defer` splits a template fragment into its own separately-downloaded JS chunk, only
fetched once a trigger condition is met — here, when the element is about to enter the
viewport. Confirmed via the production build that `DeviceListComponent` is now a genuinely
separate chunk (3.16 kB) instead of being folded into `building-detail-component`'s eager
bundle. First use of `@defer` in this codebase.

This one also surfaced a real test-environment gap: jsdom doesn't implement
`IntersectionObserver` at all, which `on viewport` polls for on every change-detection
cycle — needed a stub in `setup-jest.ts` plus explicit defer-block resolution
(`fixture.getDeferBlocks()` / `.render()`) in the one test asserting on rendered device-list
content.

## ADR

**ADR-0031** — full reasoning, including why `on viewport` was chosen over `on idle`, and
the `IntersectionObserver` test-environment fix.

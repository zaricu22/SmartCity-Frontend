import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, EMPTY, switchMap, tap, catchError, filter } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LucideTriangleAlert, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { ApplicationException } from '../../../application/exception/application.exception';
import { DeviceListComponent } from '../../component/device-list/device-list.component';
import { EnergyDisplayComponent } from '../../component/energy-display/energy-display.component';
import { AddDeviceDialogComponent } from '../../dialog/add-device-dialog/add-device-dialog.component';
import { ChangeConsumptionDialogComponent } from '../../dialog/change-consumption-dialog/change-consumption-dialog.component';
import { AddDeviceCommand } from '../../../application/command/add-device.command';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import { ToastService } from '../../../../shared/presentation/service/toast.service';
import { ConfirmDialogService } from '../../../../shared/presentation/service/confirm-dialog.service';
import type { AddDeviceDialogResult } from '../../dialog/add-device-dialog/add-device-dialog.component';
import type { ChangeConsumptionDialogResult } from '../../dialog/change-consumption-dialog/change-consumption-dialog.component';
import type { HasUnsavedChanges } from '../../../../shared/infrastructure/guard/unsaved-changes.guard';
import type { DeviceAddedEvent } from '../../../domain/event/device-added.event';
import type { DeviceRemovedEvent } from '../../../domain/event/device-removed.event';
import type { ConsumptionChangedEvent } from '../../../domain/event/consumption-changed.event';
import type { ProductionChangedEvent } from '../../../domain/event/production-changed.event';
import { toKW } from '../../../domain/shared/enums/energy-unit.enum';

@Component({
  selector: 'app-building-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DeviceListComponent,
    EnergyDisplayComponent,
    AddDeviceDialogComponent,
    ChangeConsumptionDialogComponent,
    LucideTriangleAlert,
    LucidePencil,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './building-detail.component.html',
  styleUrl: './building-detail.component.css',
})
export class BuildingDetailComponent implements OnInit, HasUnsavedChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventBus = inject(EventBusService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  // TODO: plain booleans with OnPush — Angular does not detect these changes automatically; migrate to signal<boolean>(false)
  showAddDeviceDialog = false;
  showChangeConsumptionDialog = false;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  private readonly reload$ = new Subject<void>();

  private readonly building$ = this.reload$.pipe(
    switchMap(() =>
      this.facade.getById(this.buildingId).pipe(
        tap(() => this.isLoading.set(false)),
        catchError((err: ApplicationException) => {
          this.errorMessage.set(err.message);
          this.isLoading.set(false);
          return EMPTY;
        }),
      ),
    ),
  );

  readonly building = toSignal(this.building$, { initialValue: null });
  readonly hasDevices = computed(() => (this.building()?.devices.length ?? 0) > 0);

  // Sum of all device rated capacities in kW — same total-capacity figure the domain
  // aggregate itself enforces (PublicBuilding.calculateTotalCapacity(), the check behind
  // BuildingTotalCapacityExceededException) — so the ring genuinely shows "how close to
  // the limit," not an arbitrary number.
  private readonly totalCapacityKw = computed(() =>
    (this.building()?.devices ?? []).reduce(
      (sum, d) => sum + toKW(d.ratedCapacityUnit, d.ratedCapacityValue),
      0,
    ),
  );

  // Percent of total device capacity currently consumed — feeds EnergyDisplayComponent's
  // progress ring. Not clamped here; EnergyDisplayComponent clamps for display, since
  // consumption can exceed capacity if devices are removed after consumption was set.
  readonly consumptionPercent = computed(() => {
    const building = this.building();
    const totalKw = this.totalCapacityKw();
    if (!building || totalKw <= 0) return 0;
    return (toKW(building.consumptionUnit, building.consumptionValue) / totalKw) * 100;
  });

  constructor(
    private readonly facade: PublicBuildingFacade,
    private readonly route: ActivatedRoute,
  ) {}

  get buildingId(): string {
    return this.route.snapshot.paramMap.get('id')!; // safe — authGuard and route definition guarantee this segment is always present
  }

  ngOnInit(): void {
    this.load();
    this.subscribeToEvents();
    this.facade.connectRealtime(this.buildingId);
    // Service is shared across the whole /assets subtree (route-level provider), not
    // per-page — this component owns disconnecting its own connection on the way out.
    this.destroyRef.onDestroy(() => this.facade.disconnectRealtime());
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.reload$.next();
  }

  onAddDevice(result: AddDeviceDialogResult): void {
    const cmd: AddDeviceCommand = { ...result, buildingId: this.buildingId };
    this.facade.addDevice(cmd)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // reload is driven by the DEVICE_ADDED event published after save
        next: () => {
          this.showAddDeviceDialog = false;
          this.toastService.show(`Device "${result.name}" (${result.type}) added.`, 'success');
        },
        error: (err: ApplicationException) => {
          this.errorMessage.set(err.message);
          this.toastService.show(err.message, 'error');
        },
      });
  }

  onChangeConsumption(result: ChangeConsumptionDialogResult): void {
    this.facade.changeConsumption(this.buildingId, result)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // reload is driven by the CONSUMPTION_CHANGED event published after save
        next: () => {
          this.showChangeConsumptionDialog = false;
          this.toastService.show('Consumption updated.', 'success');
        },
        error: (err: ApplicationException) => {
          this.errorMessage.set(err.message);
          this.toastService.show(err.message, 'error');
        },
      });
  }

  onDeleteBuilding(): void {
    const name = this.building()?.name ?? 'this building';
    this.confirmDialogService.confirm(`Delete "${name}"? This cannot be undone.`)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.facade.delete(this.buildingId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.show(`Building "${name}" deleted.`, 'success');
          this.router.navigate(['/assets']);
        },
        error: (err: ApplicationException) => this.toastService.show(err.message, 'error'),
      });
  }

  onRemoveDevice(deviceId: string): void {
    const deviceName = this.building()?.devices.find(d => d.id === deviceId)?.name ?? 'Device';
    this.confirmDialogService.confirm('Remove this device? This cannot be undone.')
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.facade.removeDevice(this.buildingId, deviceId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        // reload is driven by the DEVICE_REMOVED event published after save
        next: () => this.toastService.show(`Device "${deviceName}" removed.`, 'success'),
        error: (err: ApplicationException) => {
          this.errorMessage.set(err.message);
          this.toastService.show(err.message, 'error');
        },
      });
  }

  hasUnsavedChanges(): boolean {
    return this.showAddDeviceDialog || this.showChangeConsumptionDialog;
  }

  // Subscribe to domain events for this specific building.
  // Covers both local actions (published by PublicBuildingAppService after save)
  // and external pushes (published via BuildingRealtimeGateway from backend STOMP messages).
  private subscribeToEvents(): void {
    const forThisBuilding = <T extends { buildingId: string }>(e: T) =>
      e.buildingId === this.buildingId;

    this.eventBus.on<DeviceAddedEvent>('DEVICE_ADDED')
      .pipe(filter(forThisBuilding), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    this.eventBus.on<DeviceRemovedEvent>('DEVICE_REMOVED')
      .pipe(filter(forThisBuilding), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    this.eventBus.on<ConsumptionChangedEvent>('CONSUMPTION_CHANGED')
      .pipe(filter(forThisBuilding), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    // PRODUCTION_CHANGED is published by the energy management bounded context (via WebSocket).
    // This component only reloads — production is managed outside the asset context.
    this.eventBus.on<ProductionChangedEvent>('PRODUCTION_CHANGED')
      .pipe(filter(forThisBuilding), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }
}

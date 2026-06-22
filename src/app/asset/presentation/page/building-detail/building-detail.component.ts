import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, EMPTY, switchMap, tap, catchError, filter } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LucideTriangleAlert, LucidePencil, LucidePlus } from '@lucide/angular';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { ApplicationException } from '../../../application/exception/application.exception';
import { DeviceListComponent } from '../../component/device-list/device-list.component';
import { EnergyDisplayComponent } from '../../component/energy-display/energy-display.component';
import { AddDeviceDialogComponent } from '../../dialog/add-device-dialog/add-device-dialog.component';
import { ChangeConsumptionDialogComponent } from '../../dialog/change-consumption-dialog/change-consumption-dialog.component';
import { AddDeviceCommand } from '../../../application/command/add-device.command';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import type { AddDeviceDialogResult } from '../../dialog/add-device-dialog/add-device-dialog.component';
import type { ChangeConsumptionDialogResult } from '../../dialog/change-consumption-dialog/change-consumption-dialog.component';
import type { HasUnsavedChanges } from '../../../../shared/infrastructure/guard/unsaved-changes.guard';
import type { DeviceAddedEvent } from '../../../domain/event/device-added.event';
import type { ConsumptionChangedEvent } from '../../../domain/event/consumption-changed.event';
import type { ProductionChangedEvent } from '../../../domain/event/production-changed.event';

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
  ],
  templateUrl: './building-detail.component.html',
  styleUrl: './building-detail.component.css',
})
export class BuildingDetailComponent implements OnInit, HasUnsavedChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventBus = inject(EventBusService);

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
        next: () => { this.showAddDeviceDialog = false; },
        error: (err: ApplicationException) => this.errorMessage.set(err.message),
      });
  }

  onChangeConsumption(result: ChangeConsumptionDialogResult): void {
    this.facade.changeConsumption(this.buildingId, result)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // reload is driven by the CONSUMPTION_CHANGED event published after save
        next: () => { this.showChangeConsumptionDialog = false; },
        error: (err: ApplicationException) => this.errorMessage.set(err.message),
      });
  }

  hasUnsavedChanges(): boolean {
    return this.showAddDeviceDialog || this.showChangeConsumptionDialog;
  }

  // Subscribe to domain events for this specific building.
  // Covers both local actions (published by PublicBuildingAppService after save)
  // and external pushes (published by BuildingWebSocketService from backend STOMP messages).
  private subscribeToEvents(): void {
    const forThisBuilding = <T extends { buildingId: string }>(e: T) =>
      e.buildingId === this.buildingId;

    this.eventBus.on<DeviceAddedEvent>('DEVICE_ADDED')
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

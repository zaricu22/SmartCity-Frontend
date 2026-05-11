import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Subject, merge, switchMap, tap, throttleTime } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { BuildingCardComponent } from '../../component/building-card/building-card.component';
import { CreateBuildingDialogComponent } from '../../dialog/create-building-dialog/create-building-dialog.component';
import { EmptyStateComponent } from '../../../../shared/presentation/component/empty-state/empty-state.component';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import type { CreateBuildingDialogResult } from '../../dialog/create-building-dialog/create-building-dialog.component';
import type { HasUnsavedChanges } from '../../../../shared/infrastructure/auth/unsaved-changes.guard';

@Component({
  selector: 'app-building-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BuildingCardComponent, CreateBuildingDialogComponent, EmptyStateComponent],
  templateUrl: './building-list.component.html',
})
export class BuildingListComponent implements OnInit, HasUnsavedChanges {
  private readonly facade = inject(PublicBuildingFacade);
  private readonly eventBus = inject(EventBusService);
  private readonly destroyRef = inject(DestroyRef);

  showCreateDialog = false;
  isLoading = signal(true);
  isSaving = signal(false);

  private readonly reload$ = new Subject<void>();

  // Merge manual reload triggers with external event bus pushes (WebSocket-sourced).
  // Any DEVICE_ADDED or CONSUMPTION_CHANGED event from any building refreshes the list
  // so building cards show up-to-date device counts and consumption values.
  readonly buildings = toSignal(
    merge(
      this.reload$,
      this.eventBus.on('DEVICE_ADDED'),
      this.eventBus.on('CONSUMPTION_CHANGED'),
    ).pipe(
      switchMap(() => this.facade.getAll().pipe(
        tap(() => this.isLoading.set(false)),
      )),
    ),
    { initialValue: [] },
  );

  // Rate-limit: at most one create submission per 2 seconds, leading edge only
  private readonly createAction$ = new Subject<CreateBuildingDialogResult>();

  constructor() {
    this.createAction$
      .pipe(throttleTime(2000), takeUntilDestroyed(this.destroyRef))
      .subscribe(result => this.submitCreate(result));
  }

  ngOnInit(): void {
    this.reload$.next();
  }

  onCreate(result: CreateBuildingDialogResult): void {
    this.createAction$.next(result);
  }

  // CanDeactivate — guard asks this before leaving the page
  hasUnsavedChanges(): boolean {
    return this.showCreateDialog;
  }

  private submitCreate(result: CreateBuildingDialogResult): void {
    this.isSaving.set(true);
    this.facade.create(result)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // create() produces no domain event so manual reload is still needed here
        next: () => {
          this.showCreateDialog = false;
          this.isLoading.set(true);
          this.reload$.next();
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false),
      });
  }
}

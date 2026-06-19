import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParamMap } from '@angular/router';
import { Subject, merge } from 'rxjs';
import { map, switchMap, tap, throttleTime } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LucidePlus, LucideBuilding2, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { BuildingCardComponent } from '../../component/building-card/building-card.component';
import { CreateBuildingDialogComponent } from '../../dialog/create-building-dialog/create-building-dialog.component';
import { EmptyStateComponent } from '../../../../shared/presentation/component/empty-state/empty-state.component';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import { AuthService } from '../../../../shared/infrastructure/auth/auth.service';
import { PageRequest, DEFAULT_PAGE_REQUEST } from '../../../shared/page-request';
import type { Page } from '../../../shared/page';
import type { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import type { CreateBuildingDialogResult } from '../../dialog/create-building-dialog/create-building-dialog.component';
import type { HasUnsavedChanges } from '../../../../shared/infrastructure/auth/unsaved-changes.guard';

const EMPTY_PAGE: Page<PublicBuildingDto> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: DEFAULT_PAGE_REQUEST.size,
};

function parseParams(params: ParamMap): PageRequest {
  return {
    page: Math.max(0, Number(params.get('page') ?? 0)),
    size: Number(params.get('size') ?? DEFAULT_PAGE_REQUEST.size),
    sort: params.get('sort') ?? DEFAULT_PAGE_REQUEST.sort,
    direction: (params.get('dir') ?? DEFAULT_PAGE_REQUEST.direction) as 'asc' | 'desc',
  };
}

@Component({
  selector: 'app-building-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BuildingCardComponent,
    CreateBuildingDialogComponent,
    EmptyStateComponent,
    LucidePlus,
    LucideBuilding2,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './building-list.component.html',
  styleUrl: './building-list.component.css',
})
export class BuildingListComponent implements HasUnsavedChanges {
  private readonly facade = inject(PublicBuildingFacade);
  private readonly eventBus = inject(EventBusService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  // TODO: plain boolean with OnPush — Angular does not detect this change automatically; migrate to signal<boolean>(false)
  showCreateDialog = false;
  isLoading = signal(true);
  isSaving = signal(false);

  // Handles forced reloads that must re-use current URL params without changing them
  // (event bus events and post-create when already on page 0).
  private readonly reload$ = new Subject<void>();

  // URL query params drive page/sort. Event bus events and forced reloads re-read the
  // current snapshot so they always use whatever page/sort the user is on.
  private readonly pageResult = toSignal(
    merge(
      this.route.queryParamMap.pipe(map(params => parseParams(params))),
      merge(
        this.reload$,
        this.eventBus.on('DEVICE_ADDED'),
        this.eventBus.on('CONSUMPTION_CHANGED'),
        this.eventBus.on('PRODUCTION_CHANGED'),
      ).pipe(map(() => parseParams(this.route.snapshot.queryParamMap))),
    ).pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(req => this.facade.getAll(req).pipe(
        tap(() => this.isLoading.set(false)),
      )),
    ),
    { initialValue: EMPTY_PAGE },
  );

  readonly buildings = computed(() => this.pageResult().content);
  readonly currentPage = computed(() => this.pageResult().page);
  readonly totalPages = computed(() => this.pageResult().totalPages);
  readonly hasPrev = computed(() => this.currentPage() > 0);
  readonly hasNext = computed(() => this.currentPage() < this.totalPages() - 1);

  readonly sortKey = toSignal(
    this.route.queryParamMap.pipe(
      map(p => `${p.get('sort') ?? DEFAULT_PAGE_REQUEST.sort},${p.get('dir') ?? DEFAULT_PAGE_REQUEST.direction}`),
    ),
    { initialValue: `${DEFAULT_PAGE_REQUEST.sort},${DEFAULT_PAGE_REQUEST.direction}` },
  );

  private readonly createAction$ = new Subject<CreateBuildingDialogResult>();

  constructor() {
    this.createAction$
      .pipe(throttleTime(2000), takeUntilDestroyed(this.destroyRef))
      .subscribe(result => this.submitCreate(result));
  }

  goToPage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  onSortChange(value: string): void {
    const [sort, dir] = value.split(',') as [string, 'asc' | 'desc'];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort, dir, page: 0 },
      queryParamsHandling: 'merge',
    });
  }

  onCreate(result: CreateBuildingDialogResult): void {
    this.createAction$.next(result);
  }

  hasUnsavedChanges(): boolean {
    return this.showCreateDialog;
  }

  private submitCreate(result: CreateBuildingDialogResult): void {
    this.isSaving.set(true);
    this.facade.create(result)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showCreateDialog = false;
          this.isSaving.set(false);
          // Navigate to page 0 so the new building is visible.
          // If already on page 0 the URL won't change, so a manual reload is needed instead.
          if (this.currentPage() === 0) {
            this.reload$.next();
          } else {
            this.goToPage(0);
          }
        },
        error: () => this.isSaving.set(false),
      });
  }
}

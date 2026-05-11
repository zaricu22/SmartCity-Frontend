import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ConfirmDialogRequest, ConfirmDialogService } from '../../service/confirm-dialog.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  private readonly service = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pending = signal<ConfirmDialogRequest | null>(null);

  constructor() {
    this.service.requests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(req => this.pending.set(req));
  }

  respond(result: boolean): void {
    this.pending()?.resolve(result);
    this.pending.set(null);
  }
}

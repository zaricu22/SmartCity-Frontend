import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription, timer } from 'rxjs';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  // Tracks the auto-dismiss timer per toast so it can be cancelled on early dismiss
  private readonly timers = new Map<string, Subscription>();

  show(message: string, type: ToastType = 'info', durationMs = 5000): void {
    const id = crypto.randomUUID();
    this._toasts.update(list => [...list, { id, message, type }]);
    const sub = timer(durationMs).subscribe(() => this.dismiss(id));
    this.timers.set(id, sub);
  }

  dismiss(id: string): void {
    this.timers.get(id)?.unsubscribe();
    this.timers.delete(id);
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  ngOnDestroy(): void {
    this.timers.forEach(sub => sub.unsubscribe());
    this.timers.clear();
  }
}

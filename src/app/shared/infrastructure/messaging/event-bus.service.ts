import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface DomainEvent {
  readonly type: string;
}

// In-process event bus — mirrors backend ApplicationEventPublisher for local cross-component communication
@Injectable({ providedIn: 'root' })
export class EventBusService {
  private readonly events$ = new Subject<DomainEvent>();

  publish(event: DomainEvent): void {
    this.events$.next(event);
  }

  on<T extends DomainEvent>(eventType: string): Observable<T> {
    return this.events$.pipe(filter(e => e.type === eventType)) as Observable<T>;
  }
}

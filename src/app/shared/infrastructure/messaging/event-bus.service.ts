import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

// In-process event bus — mirrors backend ApplicationEventPublisher for local cross-component communication.
// Uses a structural inline type rather than importing DomainEvent from the domain layer,
// keeping shared infrastructure independent of the asset bounded context (same approach
// as Spring's ApplicationEventPublisher accepting Object rather than a domain base type).
@Injectable({ providedIn: 'root' })
export class EventBusService {
  private readonly events$ = new Subject<{ readonly type: string }>();

  publish(event: { readonly type: string }): void {
    this.events$.next(event);
  }

  on<T extends { readonly type: string }>(eventType: string): Observable<T> {
    return this.events$.pipe(filter(e => e.type === eventType)) as Observable<T>;
  }
}

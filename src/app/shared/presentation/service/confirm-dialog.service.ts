import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmDialogRequest {
  message: string;
  resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly request$ = new Subject<ConfirmDialogRequest>();

  // Consumed by ConfirmDialogComponent in the shell template
  readonly requests$ = this.request$.asObservable();

  confirm(message: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.request$.next({
        message,
        resolve: (result: boolean) => {
          observer.next(result);
          observer.complete();
        },
      });
    });
  }
}

import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { catchError, map, of, timeout } from 'rxjs';
import { API_BASE_URL } from './shared/infrastructure/api/api.config';
import { ToastService } from './shared/presentation/service/toast.service';
import { ToastComponent } from './shared/presentation/component/toast/toast.component';
import { ConfirmDialogComponent } from './shared/presentation/component/confirm-dialog/confirm-dialog.component';

// Render's free tier sleeps the backend after inactivity — the first request after a
// cold start doesn't error, it just hangs for up to several minutes. A short client-side
// timeout is what tells "slow because asleep" apart from a normal response.
const PING_TIMEOUT_MS = 4000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'smartcityfront';

  // Flips true once we've warned, so we don't re-show the toast on this load.
  private backendWarned = false;

  constructor() {
    // Server-rendered HTML can't reflect a live backend check — only ping client-side,
    // right away on first load, before the page's own API calls get a chance to hang.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const http = inject(HttpClient);
    const apiBaseUrl = inject(API_BASE_URL);
    const toast = inject(ToastService);

    http
      .get(`${apiBaseUrl}/actuator/health`, { observe: 'response' })
      .pipe(
        map(() => true),
        timeout(PING_TIMEOUT_MS),
        catchError(err => of(err instanceof HttpErrorResponse && err.status !== 0)),
      )
      .subscribe(alive => {
        if (!alive && !this.backendWarned) {
          this.backendWarned = true;
          toast.show(
            "Backend isn't responding yet — Render's free tier sleeps after inactivity, the first request can take up to 5 minutes to wake it up.",
            'warning',
            8000,
          );
        }
      });
  }
}

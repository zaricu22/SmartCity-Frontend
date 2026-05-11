import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from '../../presentation/service/toast.service';
import { ApplicationException } from '../../../asset/application/exception/application.exception';
import { AppHttpError } from './app-http-error';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toastService = inject(ToastService);

  handleError(error: unknown): void {
    console.error('[GlobalErrorHandler]', error);

    if (error instanceof ApplicationException) {
      this.toastService.show(error.message, 'error');
    } else if (error instanceof AppHttpError) {
      this.toastService.show(error.userMessage, 'error');
    } else if (error instanceof Error) {
      this.toastService.show(error.message || 'An unexpected error occurred.', 'error');
    } else {
      this.toastService.show('An unexpected error occurred.', 'error');
    }
  }
}

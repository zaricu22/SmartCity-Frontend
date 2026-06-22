import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { unsavedChangesGuard, HasUnsavedChanges } from './unsaved-changes.guard';
import { ConfirmDialogService } from '../../presentation/service/confirm-dialog.service';

describe('unsavedChangesGuard', () => {
  let confirmDialog: jest.Mocked<Pick<ConfirmDialogService, 'confirm'>>;

  beforeEach(() => {
    confirmDialog = { confirm: jest.fn().mockReturnValue(of(true)) };
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmDialogService, useValue: confirmDialog }],
    });
  });

  const makeComponent = (hasChanges: boolean): HasUnsavedChanges => ({
    hasUnsavedChanges: () => hasChanges,
  });

  it('should return true without showing a dialog when there are no unsaved changes', () => {
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(false), {} as never, {} as never, {} as never),
    );
    expect(result).toBe(true);
    expect(confirmDialog.confirm).not.toHaveBeenCalled();
  });

  it('should call ConfirmDialogService when there are unsaved changes', () => {
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(true), {} as never, {} as never, {} as never),
    );
    expect(confirmDialog.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave the page?');
  });
});

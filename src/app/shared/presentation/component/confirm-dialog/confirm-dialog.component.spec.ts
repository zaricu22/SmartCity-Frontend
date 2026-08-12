import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogService } from '../../service/confirm-dialog.service';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let service: ConfirmDialogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();
  });

  it('should have no pending request on init', () => {
    expect(component.pending()).toBeNull();
  });

  it('should show the confirmation dialog when a confirm request arrives', () => {
    service.confirm('Delete this item?').subscribe();
    fixture.detectChanges();

    expect(component.pending()).not.toBeNull();
    expect(component.pending()?.message).toBe('Delete this item?');
  });

  it('should resolve to true and close the dialog when the user confirms', () => {
    let result: boolean | undefined;
    service.confirm('Are you sure?').subscribe(r => (result = r));
    fixture.detectChanges();

    component.respond(true);
    fixture.detectChanges();

    expect(result).toBe(true);
    expect(component.pending()).toBeNull();
  });

  it('should resolve to false and close the dialog when the user cancels', () => {
    let result: boolean | undefined;
    service.confirm('Are you sure?').subscribe(r => (result = r));
    fixture.detectChanges();

    component.respond(false);
    fixture.detectChanges();

    expect(result).toBe(false);
    expect(component.pending()).toBeNull();
  });

  it('should default to a "Leave" label with the primary style when no options are given', () => {
    service.confirm('You have unsaved changes. Leave the page?').subscribe();
    fixture.detectChanges();

    // Dialog template renders Cancel first, then the confirm/action button — index 1 is the latter.
    const buttons = fixture.nativeElement.querySelectorAll('.dialog__actions button');
    expect(buttons[1].textContent.trim()).toBe('Leave');
    expect(buttons[1].classList.contains('btn--primary')).toBe(true);
    expect(buttons[1].classList.contains('btn--danger')).toBe(false);
  });

  it('should render a custom label with the danger style for a destructive confirmation', () => {
    service.confirm('Delete "City Hall"? This cannot be undone.', { confirmLabel: 'Delete', danger: true }).subscribe();
    fixture.detectChanges();

    // Same DOM order as above — Cancel is index 0, the danger/confirm button is index 1.
    const buttons = fixture.nativeElement.querySelectorAll('.dialog__actions button');
    expect(buttons[1].textContent.trim()).toBe('Delete');
    expect(buttons[1].classList.contains('btn--danger')).toBe(true);
    expect(buttons[1].classList.contains('btn--primary')).toBe(false);
  });

  it('should handle a second confirm request after the first is resolved', () => {
    service.confirm('First').subscribe();
    fixture.detectChanges();
    component.respond(true);
    fixture.detectChanges();

    service.confirm('Second').subscribe();
    fixture.detectChanges();

    expect(component.pending()?.message).toBe('Second');
  });
});

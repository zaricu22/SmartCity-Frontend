import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateBuildingDialogComponent } from './create-building-dialog.component';
import type { CreateBuildingDialogResult } from './create-building-dialog.component';

describe('CreateBuildingDialogComponent', () => {
  let fixture: ComponentFixture<CreateBuildingDialogComponent>;
  let component: CreateBuildingDialogComponent;
  let confirmSpy: jasmine.Spy;
  let cancelSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBuildingDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateBuildingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    confirmSpy = jasmine.createSpy('confirm');
    cancelSpy  = jasmine.createSpy('cancel');
    component.confirmed.subscribe(confirmSpy);
    component.cancelled.subscribe(cancelSpy);
  });

  it('should disable the submit button when inputs are empty', () => {
    const button = fixture.nativeElement.querySelector('button:last-of-type');
    expect(button.disabled).toBeTrue();
  });

  it('should enable the submit button when both inputs are filled', () => {
    component.form.patchValue({ name: 'Library', location: 'Zone B' });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button:last-of-type');
    expect(button.disabled).toBeFalse();
  });

  it('should emit confirm with trimmed values on submit', () => {
    component.form.patchValue({ name: '  Library  ', location: '  Zone B  ' });
    component.submit();

    expect(confirmSpy).toHaveBeenCalledOnceWith(
      jasmine.objectContaining<CreateBuildingDialogResult>({ name: 'Library', location: 'Zone B' }),
    );
  });

  it('should not emit confirm when name is too short', () => {
    // minLength(2) — single character fails validation
    component.form.patchValue({ name: 'A', location: 'Zone B' });
    component.submit();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should not emit confirm when location is too short', () => {
    component.form.patchValue({ name: 'Library', location: 'Z' });
    component.submit();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should emit cancel when cancel button is clicked', () => {
    fixture.nativeElement.querySelector('button:first-of-type').click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});

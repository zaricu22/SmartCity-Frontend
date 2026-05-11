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

  it('should set pending signal when a confirm request arrives', () => {
    service.confirm('Delete this item?').subscribe();
    fixture.detectChanges();

    expect(component.pending()).not.toBeNull();
    expect(component.pending()?.message).toBe('Delete this item?');
  });

  it('should resolve true and clear pending when respond(true) is called', () => {
    let result: boolean | undefined;
    service.confirm('Are you sure?').subscribe(r => (result = r));
    fixture.detectChanges();

    component.respond(true);
    fixture.detectChanges();

    expect(result).toBe(true);
    expect(component.pending()).toBeNull();
  });

  it('should resolve false and clear pending when respond(false) is called', () => {
    let result: boolean | undefined;
    service.confirm('Are you sure?').subscribe(r => (result = r));
    fixture.detectChanges();

    component.respond(false);
    fixture.detectChanges();

    expect(result).toBe(false);
    expect(component.pending()).toBeNull();
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

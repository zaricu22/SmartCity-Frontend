import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from '../../service/toast.service';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let service: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    service = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should share the same toast service used elsewhere, so toasts shown by other parts of the app appear here', () => {
    expect(fixture.componentInstance.toastService).toBe(service);
  });

  it('should render a toast when the service shows one', () => {
    service.show('Something went wrong', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Something went wrong');
  });
});

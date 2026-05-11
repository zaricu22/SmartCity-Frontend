import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `<app-empty-state></app-empty-state>`,
})
class HostWithoutTemplateComponent {}

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state>
      <ng-template #emptyTpl>
        <p class="custom">Custom empty</p>
      </ng-template>
    </app-empty-state>
  `,
})
class HostWithTemplateComponent {}

describe('EmptyStateComponent', () => {
  describe('without custom template', () => {
    let fixture: ComponentFixture<HostWithoutTemplateComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithoutTemplateComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HostWithoutTemplateComponent);
      fixture.detectChanges();
    });

    it('should render the default template', () => {
      expect(fixture.nativeElement.textContent).toContain('No items found.');
    });
  });

  describe('with custom template', () => {
    let fixture: ComponentFixture<HostWithTemplateComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithTemplateComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HostWithTemplateComponent);
      fixture.detectChanges();
    });

    it('should render the custom template instead of the default', () => {
      expect(fixture.nativeElement.textContent).toContain('Custom empty');
      expect(fixture.nativeElement.textContent).not.toContain('No items found.');
    });
  });
});

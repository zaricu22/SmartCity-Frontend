import { AfterContentInit, Component, ContentChild, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent implements AfterContentInit {
  // Parent can pass a custom empty template as content:
  // <app-empty-state><ng-template #emptyTpl>...</ng-template></app-empty-state>
  @ContentChild('emptyTpl') customTpl?: TemplateRef<unknown>;

  // static: true — refs must be available in ngAfterContentInit, before change detection runs
  @ViewChild('defaultTpl', { static: true }) defaultTpl!: TemplateRef<unknown>;
  @ViewChild('outlet', { read: ViewContainerRef, static: true }) outlet!: ViewContainerRef;

  ngAfterContentInit(): void {
    this.outlet.createEmbeddedView(this.customTpl ?? this.defaultTpl);
  }
}

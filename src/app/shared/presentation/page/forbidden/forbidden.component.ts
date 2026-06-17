import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideShieldOff, LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideShieldOff, LucideArrowLeft],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.css',
})
export class ForbiddenComponent {}

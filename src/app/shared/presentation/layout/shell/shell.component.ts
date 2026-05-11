import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ToastComponent } from '../../component/toast/toast.component';
import { ConfirmDialogComponent } from '../../component/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './shell.component.html',
})
export class ShellComponent {}

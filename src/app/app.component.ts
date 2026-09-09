import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { KnowledgeFabComponent } from './shared/components/knowledge-fab/knowledge-fab.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingBarComponent, ConfirmDialogComponent, KnowledgeFabComponent],
  template: '<app-loading-bar /><app-toast /><app-confirm-dialog /><router-outlet /><app-knowledge-fab />',
})
export class AppComponent {}

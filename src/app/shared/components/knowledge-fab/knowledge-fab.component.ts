import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../../core/store/auth.store';
import { KnowledgeExplorerComponent } from '../knowledge-explorer/knowledge-explorer.component';

/**
 * Global floating button + lateral drawer for the knowledge base.
 * Available on every authenticated screen so the user can capture / look up
 * knowledge without leaving the page they're on.
 */
@Component({
  selector: 'app-knowledge-fab',
  standalone: true,
  imports: [DrawerModule, ButtonModule, TooltipModule, KnowledgeExplorerComponent],
  template: `
    @if (isAuthed()) {
      <button type="button" class="kfab" (click)="open()" pTooltip="Knowledge base" tooltipPosition="left"
              aria-label="Open knowledge base">
        <i class="pi pi-book"></i>
      </button>
    }

    <p-drawer [visible]="visible()" (visibleChange)="visible.set($event)" position="right"
              styleClass="kfab-drawer" [dismissible]="true" [modal]="true">
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-book" style="color: var(--deploy-primary, #6366F1)"></i>
          <span class="font-semibold">Knowledge base</span>
        </div>
      </ng-template>
      <!-- Recreate the explorer each time the drawer opens so it loads fresh -->
      @if (visible()) {
        <app-knowledge-explorer [compact]="true" />
      }
    </p-drawer>
  `,
  styles: [`
    .kfab { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 1100;
      width: 3.25rem; height: 3.25rem; border-radius: 999px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #fff;
      background: var(--deploy-primary, #6366F1); box-shadow: 0 8px 24px rgba(99,102,241,0.4);
      transition: transform 0.15s, box-shadow 0.15s; }
    .kfab:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(99,102,241,0.5); }
    .kfab:active { transform: translateY(0); }
    :host ::ng-deep .kfab-drawer { width: 32rem !important; max-width: 100vw; }
  `],
})
export class KnowledgeFabComponent {
  private store = inject(AuthStore);
  private router = inject(Router);

  visible = signal(false);

  // Hide the FAB on the login page (no auth token).
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isAuthed(): boolean {
    return !!this.store.user() && !this.currentUrl().startsWith('/login');
  }

  open(): void { this.visible.set(true); }
}

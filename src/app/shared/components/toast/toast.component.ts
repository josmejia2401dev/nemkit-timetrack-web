import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 flex flex-col gap-2 max-w-sm w-full" style="z-index: 20000">
      @for (n of notificationService.notifications(); track n.id) {
        <div class="rounded-lg px-4 py-3 shadow-lg border flex items-start gap-3 animate-slide-in"
             [class]="getClasses(n.severity)">
          <i [class]="getIcon(n.severity)" class="mt-0.5"></i>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ n.summary }}</p>
            @if (n.detail) { <p class="text-xs mt-0.5 opacity-80">{{ n.detail }}</p> }
          </div>
          <button (click)="notificationService.remove(n.id)" class="text-current opacity-50 hover:opacity-100">
            <i class="pi pi-times text-xs"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 0.2s ease-out; }
  `],
})
export class ToastComponent {
  notificationService = inject(NotificationService);

  getClasses(s: string): string {
    switch (s) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warn': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  }

  getIcon(s: string): string {
    switch (s) {
      case 'success': return 'pi pi-check-circle';
      case 'error': return 'pi pi-times-circle';
      case 'warn': return 'pi pi-exclamation-triangle';
      default: return 'pi pi-info-circle';
    }
  }
}

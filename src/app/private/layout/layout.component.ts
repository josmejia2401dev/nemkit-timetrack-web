import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { TimerWidgetComponent } from '../../shared/components/timer-widget/timer-widget.component';
import { BackendStatusTagComponent } from '../../shared/components/backend-status-tag/backend-status-tag.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TimerWidgetComponent, BackendStatusTagComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  private store = inject(AuthStore);
  private router = inject(Router);

  sidebarOpen = signal(false);
  user = this.store.user;

  private baseNav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-home' },
    { path: '/projects',  label: 'Projects',  icon: 'pi pi-folder' },
    { path: '/knowledge', label: 'Knowledge', icon: 'pi pi-book' },
    { path: '/profile',   label: 'Profile',   icon: 'pi pi-user' },
  ];

  private adminNav = [
    { path: '/loggers', label: 'Loggers', icon: 'pi pi-file' },
    { path: '/cache',   label: 'Cache',   icon: 'pi pi-database' },
  ];

  get navItems() {
    const roles: string[] = this.user()?.roles ?? [];
    return roles.includes('ADMIN') ? [...this.baseNav, ...this.adminNav] : this.baseNav;
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
  logout(): void { this.store.clear(); this.router.navigate(['/login']); }
}

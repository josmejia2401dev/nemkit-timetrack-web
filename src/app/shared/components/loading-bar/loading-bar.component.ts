import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationError, RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loading.loading()) {
      <div class="loading-bar">
        <div class="loading-bar__progress"></div>
      </div>
    }
  `,
  styles: [`
    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 9999;
      background: transparent;
      overflow: hidden;
    }

    .loading-bar__progress {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, transparent, var(--deploy-primary), var(--deploy-primary), transparent);
      border-radius: 0 2px 2px 0;
      animation: loading-slide 1.2s ease-in-out infinite;
    }

    @keyframes loading-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
  `],
})
export class LoadingBarComponent implements OnInit, OnDestroy {
  loading = inject(LoadingService);
  private router = inject(Router);
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof RouteConfigLoadStart) this.loading.start();
      if (event instanceof RouteConfigLoadEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loading.stop();
      }
    });
  }

  ngOnDestroy(): void { this.routerSubscription?.unsubscribe(); }
}

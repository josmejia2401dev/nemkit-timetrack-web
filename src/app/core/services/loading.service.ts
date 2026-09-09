import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  loading = signal(false);

  start(): void {
    this.count++;
    this.loading.set(true);
  }

  stop(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) this.loading.set(false);
  }
}

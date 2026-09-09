import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface CacheStat {
  name: string;
  type: string;
  size?: number;
  maxSize?: number;
  hits?: number;
  misses?: number;
  evictions?: number;
  hitRate?: number;
  policy?: string;
  // Campos del cache multinivel (si aplica en el futuro)
  l1Size?: number;
  l2Size?: number;
  tiers?: number;
  error?: string;
}

export interface CacheStatsSnapshot {
  generatedAt: string;
  totals: {
    caches: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  caches: CacheStat[];
}

@Injectable({ providedIn: 'root' })
export class CacheStatsService {
  private api = inject(ApiService);

  getStats(): Observable<ApiResponse<CacheStatsSnapshot>> {
    return this.api.get<CacheStatsSnapshot>('/cache/stats');
  }
}

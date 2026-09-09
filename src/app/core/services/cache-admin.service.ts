import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, ApiService } from './api.service';

export interface CacheEntry {
  key: string;
  expiresAt: number | null;
  sizeBytes: number;
  availableInMemory: boolean;
  availableOnDisk: boolean;
}

export interface CacheEntryDetail extends CacheEntry {
  value: unknown;
}

export interface CacheAdminItem {
  name: string;
  type: string;
  operations: string[];
  size?: number;
  maxSize?: number;
  hits?: number;
  misses?: number;
  evictions?: number;
  hitRate?: number;
  policy?: string;
  l1Size?: number;
  l2Size?: number;
  tiers?: number;
  error?: string;
}

export interface CacheAdminSnapshot {
  generatedAt: string;
  totals: {
    caches: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  caches: CacheAdminItem[];
}

export interface CacheEntriesPage {
  entries: CacheEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CacheAdminService {
  private api = inject(ApiService);

  listCaches(): Observable<ApiResponse<CacheAdminSnapshot>> {
    return this.api.get<CacheAdminSnapshot>('/cache');
  }

  listEntries(cacheName: string, page = 1, limit = 50, search = ''): Observable<ApiResponse<CacheEntriesPage>> {
    return this.api.get<CacheEntriesPage>(`/cache/${encodeURIComponent(cacheName)}/entries`, { page, limit, search });
  }

  getEntry(cacheName: string, key: string): Observable<ApiResponse<CacheEntryDetail>> {
    return this.api.get<CacheEntryDetail>(`/cache/${encodeURIComponent(cacheName)}/entries/${encodeURIComponent(key)}`);
  }

  deleteEntry(cacheName: string, key: string): Observable<ApiResponse<{ deleted: boolean; key: string }>> {
    return this.api.delete<{ deleted: boolean; key: string }>(`/cache/${encodeURIComponent(cacheName)}/entries/${encodeURIComponent(key)}`);
  }

  invalidate(cacheName: string, pattern: string): Observable<ApiResponse<{ pattern: string; deletedEntries: number }>> {
    return this.api.post<{ pattern: string; deletedEntries: number }>(`/cache/${encodeURIComponent(cacheName)}/invalidate`, { pattern });
  }

  clear(cacheName: string): Observable<ApiResponse<{ cleared: boolean; cacheName: string }>> {
    return this.api.post<{ cleared: boolean; cacheName: string }>(`/cache/${encodeURIComponent(cacheName)}/clear`, { confirmation: 'CLEAR_CACHE' });
  }
}

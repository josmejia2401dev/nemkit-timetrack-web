import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CacheAdminService, CacheAdminItem, CacheEntry, CacheEntryDetail } from '../../core/services/cache-admin.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { ContentLoaderComponent } from '../../shared/components/content-loader/content-loader.component';

@Component({
  selector: 'app-cache-stats',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ButtonModule, DialogModule, InputTextModule, TooltipModule, ContentLoaderComponent],
  templateUrl: './cache-stats.component.html',
})
export class CacheStatsComponent implements OnInit {
  private service = inject(CacheAdminService);
  private confirm = inject(ConfirmService);
  private notify = inject(NotificationService);

  loading = signal(false);
  generatedAt = signal<string | null>(null);
  totals = signal<{ caches: number; hits: number; misses: number; hitRate: number } | null>(null);
  caches = signal<CacheAdminItem[]>([]);
  selectedCache = signal<CacheAdminItem | null>(null);
  entries = signal<CacheEntry[]>([]);
  entryPage = signal(1);
  entryTotalPages = signal(0);
  entryTotal = signal(0);
  entrySearch = '';
  pattern = '';
  detailVisible = signal(false);
  detail = signal<CacheEntryDetail | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.listCaches().subscribe({
      next: (res) => {
        const snap = res.data;
        this.generatedAt.set(snap?.generatedAt ?? null);
        this.totals.set(snap?.totals ?? null);
        this.caches.set(snap?.caches ?? []);
        const selected = this.selectedCache();
        const next = selected ? snap?.caches?.find(c => c.name === selected.name) : snap?.caches?.[0];
        this.selectedCache.set(next ?? null);
        if (next) this.loadEntries(next.name);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load cache stats');
      },
    });
  }

  selectCache(cache: CacheAdminItem): void {
    this.selectedCache.set(cache);
    this.entryPage.set(1);
    this.loadEntries(cache.name);
  }

  loadEntries(cacheName = this.selectedCache()?.name): void {
    if (!cacheName) return;
    this.service.listEntries(cacheName, this.entryPage(), 50, this.entrySearch).subscribe({
      next: (res) => {
        const page = res.data;
        this.entries.set(page?.entries ?? []);
        this.entryTotalPages.set(page?.pagination?.totalPages ?? 0);
        this.entryTotal.set(page?.pagination?.total ?? 0);
      },
      error: () => this.notify.error('Failed to load cache entries'),
    });
  }

  searchEntries(): void {
    this.entryPage.set(1);
    this.loadEntries();
  }

  previousPage(): void {
    if (this.entryPage() <= 1) return;
    this.entryPage.update(page => page - 1);
    this.loadEntries();
  }

  nextPage(): void {
    if (this.entryPage() >= this.entryTotalPages()) return;
    this.entryPage.update(page => page + 1);
    this.loadEntries();
  }

  viewEntry(entry: CacheEntry): void {
    const cache = this.selectedCache();
    if (!cache) return;
    this.service.getEntry(cache.name, entry.key).subscribe({
      next: (res) => {
        this.detail.set(res.data ?? null);
        this.detailVisible.set(true);
      },
      error: () => this.notify.error('Failed to load cache entry'),
    });
  }

  async deleteEntry(entry: CacheEntry): Promise<void> {
    const cache = this.selectedCache();
    if (!cache) return;
    const confirmed = await this.confirm.ask({
      title: 'Delete cache entry',
      message: `Delete ${entry.key}?`,
      confirmLabel: 'Delete',
      severity: 'danger',
    });
    if (!confirmed) return;
    this.service.deleteEntry(cache.name, entry.key).subscribe({
      next: () => { this.notify.success('Cache entry deleted'); this.loadEntries(); this.load(); },
      error: () => this.notify.error('Failed to delete cache entry'),
    });
  }

  async clearCache(): Promise<void> {
    const cache = this.selectedCache();
    if (!cache) return;
    const confirmed = await this.confirm.ask({
      title: 'Clear cache',
      message: `Clear all entries from ${cache.name}?`,
      confirmLabel: 'Clear cache',
      severity: 'danger',
    });
    if (!confirmed) return;
    this.service.clear(cache.name).subscribe({
      next: () => { this.notify.success('Cache cleared'); this.load(); },
      error: () => this.notify.error('Failed to clear cache'),
    });
  }

  invalidatePattern(): void {
    const cache = this.selectedCache();
    const value = this.pattern.trim();
    if (!cache || !value) return;
    this.service.invalidate(cache.name, value).subscribe({
      next: (res) => {
        this.notify.success(`${res.data?.deletedEntries ?? 0} entries invalidated`);
        this.pattern = '';
        this.load();
      },
      error: () => this.notify.error('Failed to invalidate cache entries'),
    });
  }

  /** hitRate viene como fracción (0..1); lo mostramos como porcentaje. */
  asPercent(rate?: number): number {
    return Math.round((rate ?? 0) * 1000) / 10;
  }

  hitRateClass(rate?: number): string {
    const pct = (rate ?? 0) * 100;
    if (pct >= 70) return 'ke-rate--good';
    if (pct >= 40) return 'ke-rate--mid';
    return 'ke-rate--low';
  }

  formatValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  }
}

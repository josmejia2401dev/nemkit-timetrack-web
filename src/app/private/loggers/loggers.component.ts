import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { LogsService, LogFile, LogEntry } from '../../core/services/logs.service';
import { SystemMetricsService, SystemMetrics } from '../../core/services/system-metrics.service';
import { NotificationService } from '../../core/services/notification.service';
import { ContentLoaderComponent } from '../../shared/components/content-loader/content-loader.component';

@Component({
  selector: 'app-loggers',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonModule, InputTextModule, InputNumberModule, SelectModule, TooltipModule, ContentLoaderComponent],
  templateUrl: './loggers.component.html',
})
export class LoggersComponent implements OnInit {
  private service = inject(LogsService);
  private metricsService = inject(SystemMetricsService);
  private notify = inject(NotificationService);

  metrics = signal<SystemMetrics | null>(null);
  metricsLoading = signal(false);

  files = signal<LogFile[]>([]);
  entries = signal<LogEntry[]>([]);
  total = signal(0);
  loading = signal(false);
  filesLoading = signal(true);
  expanded = signal<string | number | null>(null);

  selectedFile: string | null = null;
  level: string | null = null;
  search = '';
  requestId = '';
  limit = 200;
  groupByRequest = signal(false);

  levelOptions = [
    { label: 'All levels', value: null },
    { label: 'Error', value: 'error' },
    { label: 'Warn', value: 'warn' },
    { label: 'Info', value: 'info' },
    { label: 'HTTP', value: 'http' },
    { label: 'Debug', value: 'debug' },
    { label: 'Fatal', value: 'fatal' },
  ];

  ngOnInit(): void { this.loadMetrics(); this.loadFiles(); }

  loadMetrics(): void {
    this.metricsLoading.set(true);
    this.metricsService.getMetrics().subscribe({
      next: (res) => { this.metrics.set(res.data); this.metricsLoading.set(false); },
      error: () => { this.metricsLoading.set(false); },
    });
  }

  loadFiles(): void {
    this.service.listFiles().subscribe({
      next: (res) => {
        this.files.set(res.data ?? []);
        this.filesLoading.set(false);
        if (res.data?.length && !this.selectedFile) {
          this.selectedFile = res.data[0].name;
          this.read();
        }
      },
      error: () => { this.filesLoading.set(false); this.notify.error('Failed to load log files'); },
    });
  }

  read(): void {
    if (!this.selectedFile) return;
    this.loading.set(true);
    this.expanded.set(null);
    this.service.read({
      file: this.selectedFile,
      level: this.level ?? undefined,
      search: this.search || undefined,
      requestId: this.requestId || undefined,
      limit: this.limit,
    }).subscribe({
      next: (res) => {
        this.entries.set(res.data.entries ?? []);
        this.total.set(res.data.total ?? 0);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notify.error('Failed to read log'); },
    });
  }

  toggle(key: string | number): void {
    this.expanded.set(this.expanded() === key ? null : key);
  }

  groupKey(requestId: string, index: number): string {
    return `${requestId}#${index}`;
  }

  levelClass(lvl: string): string {
    switch ((lvl || '').toLowerCase()) {
      case 'error':
      case 'fatal': return 'log-level--error';
      case 'warn':  return 'log-level--warn';
      case 'info':  return 'log-level--info';
      case 'http':  return 'log-level--http';
      default:      return 'log-level--debug';
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  metaOf(entry: LogEntry): string {
    const { timestamp, level, service, message, stack, raw, ...meta } = entry;
    return Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  }

  formatMb(mb: number | undefined | null): string {
    if (mb == null) return '—';
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(mb < 10 ? 2 : 0)} MB`;
  }

  formatUptime(seconds: number | undefined | null): string {
    if (seconds == null) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  isRequestReport(entry: LogEntry): boolean {
    return entry['event'] === 'request.report';
  }

  requestSummary(entry: LogEntry): string {
    const parts: string[] = [];
    if (entry['responseTimeMs'] != null) parts.push(`${entry['responseTimeMs']}ms`);
    if (entry['cpuTimeMs'] != null) parts.push(`cpu ${entry['cpuTimeMs']}ms`);
    if (entry['memoryConsumedMb'] != null) parts.push(`Δ${entry['memoryConsumedMb']}MB`);
    if (entry['totalMemoryConsumedMb'] != null) parts.push(`rss ${entry['totalMemoryConsumedMb']}MB`);
    return parts.join(' · ');
  }

  viewRequest(id: string | undefined): void {
    if (!id) return;
    this.requestId = id;
    this.read();
  }

  clearRequestFilter(): void {
    this.requestId = '';
    this.read();
  }

  toggleGrouping(): void {
    this.groupByRequest.update((v) => !v);
  }

  groupedEntries(): { requestId: string; entries: LogEntry[] }[] {
    const groups = new Map<string, LogEntry[]>();
    const noId = '(no request id)';
    for (const e of this.entries()) {
      const key = (e.requestId as string) || noId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries()).map(([requestId, entries]) => ({ requestId, entries }));
  }
}

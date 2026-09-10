import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { LogsService, LogFile, LogEntry } from '../../core/services/logs.service';
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
  private notify = inject(NotificationService);

  files = signal<LogFile[]>([]);
  entries = signal<LogEntry[]>([]);
  total = signal(0);
  loading = signal(false);
  filesLoading = signal(true);
  expanded = signal<number | null>(null);

  selectedFile: string | null = null;
  level: string | null = null;
  search = '';
  limit = 200;

  levelOptions = [
    { label: 'All levels', value: null },
    { label: 'Error', value: 'error' },
    { label: 'Warn', value: 'warn' },
    { label: 'Info', value: 'info' },
    { label: 'HTTP', value: 'http' },
    { label: 'Debug', value: 'debug' },
    { label: 'Fatal', value: 'fatal' },
  ];

  ngOnInit(): void { this.loadFiles(); }

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

  toggle(i: number): void {
    this.expanded.set(this.expanded() === i ? null : i);
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
}

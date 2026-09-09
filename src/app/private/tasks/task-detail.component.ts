import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TasksService, Task, TimeRecordType, TIME_RECORD_TYPES } from '../../core/services/tasks.service';
import { TimerService } from '../../core/services/timer.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { formatDuration, formatDurationShort } from '../../shared/utils/time.util';
import { isProductiveType } from '../../shared/utils/metrics.util';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, ButtonModule, SelectModule, TooltipModule, DialogModule, DatePickerModule, InputTextModule],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tasksService = inject(TasksService);
  private api = inject(ApiService);
  timer = inject(TimerService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  taskId = 0;
  task = signal<Task | null>(null);
  savingTimer = signal(false);

  typeOptions = TIME_RECORD_TYPES;

  // Dialog de detalles al detener el timer (elegir tipo + descripción)
  stopDialog = signal(false);
  stopPayload: { taskId: number; start: string; end: string; durationMs: number } | null = null;
  stopForm: { type: TimeRecordType; note: string } = { type: 'development', note: '' };

  // Manual time entry
  manualDialog = signal(false);
  manualForm: { start: Date | null; end: Date | null; type: TimeRecordType; note: string } =
    { start: null, end: null, type: 'development', note: '' };
  savingManual = signal(false);

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
  ];

  isTimingThis = computed(() => this.timer.state()?.taskId === this.taskId);

  ngOnInit(): void {
    this.taskId = +this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.tasksService.getById(this.taskId).subscribe({
      next: (res) => this.task.set(res.data),
      error: () => this.router.navigate(['/projects']),
    });
  }

  start(): void {
    const t = this.task();
    if (!t) return;
    this.timer.start(t.id, t.title);
    if (t.status === 'pending') this.changeStatus('in_progress');
    this.notify.success('Timer started');
  }

  pause(): void { this.timer.pause(); }
  resume(): void { this.timer.resume(); }

  stop(): void {
    const payload = this.timer.stop();
    if (!payload) { this.notify.info('Timer discarded', 'No time to save'); return; }
    // Guardar el intervalo y pedir tipo + descripción antes de persistir.
    this.stopPayload = { taskId: payload.taskId, start: payload.start, end: payload.end, durationMs: payload.durationMs };
    this.stopForm = { type: 'development', note: payload.note ?? '' };
    this.stopDialog.set(true);
  }

  confirmStop(): void {
    if (!this.stopPayload) return;
    const p = this.stopPayload;
    this.savingTimer.set(true);
    this.api.post(`/tasks/${p.taskId}/time-records`, {
      start: p.start, end: p.end, durationMs: p.durationMs, type: this.stopForm.type, note: this.stopForm.note,
    }).subscribe({
      next: () => { this.savingTimer.set(false); this.stopDialog.set(false); this.stopPayload = null; this.notify.success('Time saved', formatDuration(p.durationMs)); this.load(); },
      error: () => { this.savingTimer.set(false); this.notify.error('Failed to save time'); },
    });
  }

  discard(): void { this.timer.reset(); this.notify.info('Timer discarded'); }

  liveTime(): string { return formatDuration(this.timer.elapsedMs()); }

  changeStatus(status: string): void {
    this.tasksService.update(this.taskId, { status: status as Task['status'] }).subscribe({
      next: (res) => { this.task.set(res.data); this.notify.success('Status updated'); },
    });
  }

  markDone(): void { this.changeStatus('done'); }

  // ── Manual time entry ──────────────────────────────
  openManual(): void {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    this.manualForm = { start: hourAgo, end: now, type: 'development', note: '' };
    this.manualDialog.set(true);
  }

  saveManual(): void {
    const { start, end, type, note } = this.manualForm;
    if (!start || !end) { this.notify.warn('Start and end are required'); return; }
    if (end.getTime() <= start.getTime()) { this.notify.warn('End must be after start'); return; }
    this.savingManual.set(true);
    this.tasksService.addTimeRecord(this.taskId, {
      start: start.toISOString(),
      end: end.toISOString(),
      type,
      note: note || '',
    }).subscribe({
      next: (res) => { this.savingManual.set(false); this.manualDialog.set(false); this.notify.success('Time added'); this.task.set(res.data); },
      error: () => this.savingManual.set(false),
    });
  }

  typeLabel(value: string): string {
    return this.typeOptions.find(t => t.value === value)?.label ?? value;
  }

  async removeRecord(recordId: string): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Delete time record', message: 'Remove this time entry?', confirmLabel: 'Delete', severity: 'danger' });
    if (!ok) return;
    this.tasksService.removeTimeRecord(this.taskId, recordId).subscribe({
      next: (res) => { this.notify.success('Time record removed'); this.task.set(res.data); },
    });
  }

  fmt(ms: number): string { return formatDuration(ms); }
  fmtShort(ms: number): string { return formatDurationShort(ms); }

  estimatedMs(): number { return (this.task()?.estimatedMinutes ?? 0) * 60000; }

  /** Suma de tiempo por tipo (productivo vs gestión) recorriendo los registros. */
  productiveMs(): number {
    return (this.task()?.timeRecords ?? []).reduce((s, r) => s + (isProductiveType(r.type) ? (r.durationMs ?? 0) : 0), 0);
  }

  overheadMs(): number {
    return (this.task()?.timeRecords ?? []).reduce((s, r) => s + (isProductiveType(r.type) ? 0 : (r.durationMs ?? 0)), 0);
  }

  progressPct(): number {
    const est = this.estimatedMs();
    if (est <= 0) return 0;
    return Math.min(100, Math.round((this.productiveMs() / est) * 100));
  }

  variancePct(): number {
    const est = this.estimatedMs();
    if (est <= 0) return 0;
    return Math.round(((this.productiveMs() - est) / est) * 100);
  }

  sessionCount(): number { return this.task()?.timeRecords?.length ?? 0; }

  avgSessionMs(): number {
    const t = this.task();
    if (!t || t.timeRecords.length === 0) return 0;
    return Math.round(t.totalMs / t.timeRecords.length);
  }
}

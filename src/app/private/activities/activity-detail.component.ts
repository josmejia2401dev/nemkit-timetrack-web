import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ChipsModule } from 'primeng/chips';
import { CheckboxModule } from 'primeng/checkbox';
import { ActivitiesService, Activity } from '../../core/services/activities.service';
import { TasksService, Task } from '../../core/services/tasks.service';
import { TimerService } from '../../core/services/timer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ChipModule } from 'primeng/chip';
import { formatDuration, formatDurationShort } from '../../shared/utils/time.util';
import { computeTaskMetrics, TaskMetrics } from '../../shared/utils/metrics.util';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, InputNumberModule, DialogModule, SelectModule, TooltipModule, ChipsModule, CheckboxModule, ChipModule],
  templateUrl: './activity-detail.component.html',
})
export class ActivityDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private activitiesService = inject(ActivitiesService);
  private tasksService = inject(TasksService);
  timer = inject(TimerService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  activityId = 0;
  activity = signal<Activity | null>(null);
  tasks = signal<Task[]>([]);

  // Metrics derived from tasks
  metrics = computed<TaskMetrics>(() => computeTaskMetrics(this.tasks()));

  dialog = signal(false);
  editingId: number | null = null;
  form: { title: string; description: string; estimatedMinutes: number; status: Task['status']; category: string; tags: string[]; technologies: string[]; aiAssisted: boolean } =
    { title: '', description: '', estimatedMinutes: 0, status: 'pending', category: '', tags: [], technologies: [], aiAssisted: false };
  loading = signal(false);

  // Activity edit dialog
  actDialog = signal(false);
  actForm: { name: string; description: string; estimatedMinutes: number } = { name: '', description: '', estimatedMinutes: 0 };
  actLoading = signal(false);

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
  ];

  ngOnInit(): void {
    this.activityId = +this.route.snapshot.paramMap.get('id')!;
    this.loadActivity();
    this.loadTasks();
  }

  loadActivity(): void {
    this.activitiesService.getById(this.activityId).subscribe({
      next: (res) => this.activity.set(res.data),
      error: () => this.router.navigate(['/projects']),
    });
  }

  loadTasks(): void {
    this.tasksService.listByActivity(this.activityId).subscribe({
      next: (res) => this.tasks.set(res.data ?? []),
      error: () => this.tasks.set([]),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { title: '', description: '', estimatedMinutes: 0, status: 'pending', category: '', tags: [], technologies: [], aiAssisted: false };
    this.dialog.set(true);
  }

  openEdit(t: Task, ev: Event): void {
    ev.stopPropagation();
    this.editingId = t.id;
    this.form = {
      title: t.title, description: t.description ?? '', estimatedMinutes: t.estimatedMinutes ?? 0, status: t.status,
      category: t.category ?? '', tags: [...(t.tags ?? [])], technologies: [...(t.technologies ?? [])], aiAssisted: t.aiAssisted ?? false,
    };
    this.dialog.set(true);
  }

  save(): void {
    if (!this.form.title.trim()) { this.notify.warn('Title is required'); return; }
    this.loading.set(true);
    const req = this.editingId
      ? this.tasksService.update(this.editingId, this.form)
      : this.tasksService.create(this.activityId, this.form);
    req.subscribe({
      next: () => { this.loading.set(false); this.dialog.set(false); this.notify.success('Task saved'); this.loadTasks(); },
      error: () => this.loading.set(false),
    });
  }

  async remove(t: Task, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm.ask({ title: 'Delete task', message: `Delete "${t.title}"?`, confirmLabel: 'Delete', severity: 'danger' });
    if (!ok) return;
    this.tasksService.remove(t.id).subscribe({ next: () => { this.notify.success('Task deleted'); this.loadTasks(); } });
  }

  open(t: Task): void { this.router.navigate(['/tasks', t.id]); }

  startTimer(t: Task, ev: Event): void {
    ev.stopPropagation();
    this.timer.start(t.id, t.title);
    if (t.status === 'pending') {
      this.tasksService.update(t.id, { status: 'in_progress' }).subscribe({ next: () => this.loadTasks() });
    }
    this.notify.success('Timer started', t.title);
  }

  toggleDone(t: Task, ev: Event): void {
    ev.stopPropagation();
    const next = t.status === 'done' ? 'in_progress' : 'done';
    this.tasksService.update(t.id, { status: next }).subscribe({
      next: () => { this.notify.success(next === 'done' ? 'Task completed' : 'Task reopened'); this.loadTasks(); },
    });
  }

  // ── Activity edit ──────────────────────────────────
  openActEdit(): void {
    const a = this.activity();
    if (!a) return;
    this.actForm = { name: a.name, description: a.description ?? '', estimatedMinutes: a.estimatedMinutes ?? 0 };
    this.actDialog.set(true);
  }

  saveActivity(): void {
    if (!this.actForm.name.trim()) { this.notify.warn('Name is required'); return; }
    this.actLoading.set(true);
    this.activitiesService.update(this.activityId, this.actForm).subscribe({
      next: (res) => { this.actLoading.set(false); this.actDialog.set(false); this.activity.set(res.data); this.notify.success('Activity updated'); },
      error: () => this.actLoading.set(false),
    });
  }

  // ── Metrics helpers ────────────────────────────────
  /** Estimado de la actividad (manual) en ms. */
  activityEstimatedMs(): number { return (this.activity()?.estimatedMinutes ?? 0) * 60000; }

  /** % de tiempo PRODUCTIVO vs estimado de la actividad. */
  activityUsagePct(): number {
    const est = this.activityEstimatedMs();
    if (est <= 0) return 0;
    return Math.round((this.metrics().productiveMs / est) * 100);
  }

  /** Desviación productivo vs estimado de la actividad (positivo = pasado). */
  activityVariancePct(): number {
    const est = this.activityEstimatedMs();
    if (est <= 0) return 0;
    return Math.round(((this.metrics().productiveMs - est) / est) * 100);
  }

  fmt(ms: number): string { return formatDurationShort(ms); }
  fmtFull(ms: number): string { return formatDuration(ms); }

  statusBadge(status: string): string {
    if (status === 'done') return 'deploy-badge--running';
    if (status === 'in_progress') return 'deploy-badge--unknown';
    return 'deploy-badge--stopped';
  }
}

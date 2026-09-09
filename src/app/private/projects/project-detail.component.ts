import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { ChipsModule } from 'primeng/chips';
import { ProjectsService, Project } from '../../core/services/projects.service';
import { ActivitiesService, Activity } from '../../core/services/activities.service';
import { TasksService, Task } from '../../core/services/tasks.service';
import { NotesService, Note } from '../../core/services/notes.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { formatDurationShort } from '../../shared/utils/time.util';
import { computeTaskMetrics, TaskMetrics } from '../../shared/utils/metrics.util';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, InputNumberModule, DialogModule, TabsModule, TooltipModule, ChipsModule],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private activitiesService = inject(ActivitiesService);
  private tasksService = inject(TasksService);
  private notesService = inject(NotesService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  projectId = 0;
  project = signal<Project | null>(null);
  activities = signal<Activity[]>([]);
  notes = signal<Note[]>([]);
  allTasks = signal<Task[]>([]);

  // Aggregated project metrics (across all activities' tasks)
  metrics = computed<TaskMetrics>(() => computeTaskMetrics(this.allTasks()));
  // Estimated total = sum of activities' manual estimates
  activityEstimatedMs = computed(() => this.activities().reduce((s, a) => s + (a.estimatedMinutes ?? 0) * 60000, 0));

  actDialog = signal(false);
  actEditingId: number | null = null;
  actForm: { name: string; description: string; tags: string[]; technologies: string[] } =
    { name: '', description: '', tags: [], technologies: [] };
  actLoading = signal(false);

  noteDialog = signal(false);
  noteEditingId: number | null = null;
  noteForm = { title: '', content: '', pinned: false };
  noteLoading = signal(false);

  ngOnInit(): void {
    this.projectId = +this.route.snapshot.paramMap.get('id')!;
    this.loadProject();
    this.loadActivities();
    this.loadNotes();
  }

  loadProject(): void {
    this.projectsService.getById(this.projectId).subscribe({
      next: (res) => this.project.set(res.data),
      error: () => this.router.navigate(['/projects']),
    });
  }

  loadActivities(): void {
    this.activitiesService.listByProject(this.projectId, { status: 'active' }).subscribe({
      next: (res) => {
        const acts = res.data ?? [];
        this.activities.set(acts);
        this.loadAllTasks(acts);
      },
      error: () => { this.activities.set([]); this.allTasks.set([]); },
    });
  }

  /** Carga las tareas de todas las actividades para las métricas del proyecto. */
  private loadAllTasks(activities: Activity[]): void {
    if (activities.length === 0) { this.allTasks.set([]); return; }
    const calls = activities.map(a => this.tasksService.listByActivity(a.id));
    forkJoin(calls).subscribe({
      next: (results) => {
        const tasks = results.flatMap((r: any) => r.data ?? []);
        this.allTasks.set(tasks);
      },
      error: () => this.allTasks.set([]),
    });
  }

  fmt(ms: number): string { return formatDurationShort(ms); }

  projectVariancePct(): number {
    const est = this.activityEstimatedMs();
    if (est <= 0) return 0;
    return Math.round(((this.metrics().productiveMs - est) / est) * 100);
  }

  loadNotes(): void {
    this.notesService.listByProject(this.projectId).subscribe({
      next: (res) => this.notes.set(res.data ?? []),
      error: () => this.notes.set([]),
    });
  }

  // Activities
  openActCreate(): void { this.actEditingId = null; this.actForm = { name: '', description: '', tags: [], technologies: [] }; this.actDialog.set(true); }
  openActEdit(a: Activity, ev: Event): void { ev.stopPropagation(); this.actEditingId = a.id; this.actForm = { name: a.name, description: a.description ?? '', tags: [...(a.tags ?? [])], technologies: [...(a.technologies ?? [])] }; this.actDialog.set(true); }

  saveActivity(): void {
    if (!this.actForm.name.trim()) { this.notify.warn('Name is required'); return; }
    this.actLoading.set(true);
    const req = this.actEditingId
      ? this.activitiesService.update(this.actEditingId, this.actForm)
      : this.activitiesService.create(this.projectId, this.actForm);
    req.subscribe({
      next: () => { this.actLoading.set(false); this.actDialog.set(false); this.notify.success('Activity saved'); this.loadActivities(); },
      error: () => this.actLoading.set(false),
    });
  }

  async archiveActivity(a: Activity, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm.ask({ title: 'Archive activity', message: `Archive "${a.name}"?`, confirmLabel: 'Archive', severity: 'warn' });
    if (!ok) return;
    this.activitiesService.archive(a.id).subscribe({ next: () => { this.notify.success('Activity archived'); this.loadActivities(); } });
  }

  async removeActivity(a: Activity, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm.ask({ title: 'Delete activity', message: `Permanently delete "${a.name}"? Its tasks and time records will also be removed. This cannot be undone.`, confirmLabel: 'Delete', severity: 'danger' });
    if (!ok) return;
    this.activitiesService.remove(a.id).subscribe({ next: () => { this.notify.success('Activity deleted'); this.loadActivities(); } });
  }

  openActivity(a: Activity): void { this.router.navigate(['/activities', a.id]); }

  // Notes
  openNoteCreate(): void { this.noteEditingId = null; this.noteForm = { title: '', content: '', pinned: false }; this.noteDialog.set(true); }
  openNoteEdit(n: Note): void { this.noteEditingId = n.id; this.noteForm = { title: n.title, content: n.content ?? '', pinned: n.pinned }; this.noteDialog.set(true); }

  saveNote(): void {
    if (!this.noteForm.title.trim()) { this.notify.warn('Title is required'); return; }
    this.noteLoading.set(true);
    const req = this.noteEditingId
      ? this.notesService.update(this.noteEditingId, this.noteForm)
      : this.notesService.create(this.projectId, this.noteForm);
    req.subscribe({
      next: () => { this.noteLoading.set(false); this.noteDialog.set(false); this.notify.success('Note saved'); this.loadNotes(); },
      error: () => this.noteLoading.set(false),
    });
  }

  async removeNote(n: Note): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Delete note', message: `Delete "${n.title}"?`, confirmLabel: 'Delete', severity: 'danger' });
    if (!ok) return;
    this.notesService.remove(n.id).subscribe({ next: () => { this.notify.success('Note deleted'); this.loadNotes(); } });
  }

  togglePin(n: Note): void {
    this.notesService.update(n.id, { pinned: !n.pinned }).subscribe({ next: () => this.loadNotes() });
  }
}

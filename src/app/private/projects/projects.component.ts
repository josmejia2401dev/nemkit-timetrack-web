import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ChipsModule } from 'primeng/chips';
import { ProjectsService, Project } from '../../core/services/projects.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ContentLoaderComponent } from '../../shared/components/content-loader/content-loader.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, DialogModule, TooltipModule, ChipsModule, ContentLoaderComponent],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  private service = inject(ProjectsService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);

  projects = signal<Project[]>([]);
  view = signal<'active' | 'archived'>('active');

  dialogVisible = signal(false);
  editingId: number | null = null;
  loading = signal(false);
  dataLoading = signal(true);
  form: { name: string; description: string; color: string; company: string; client: string; tags: string[]; technologies: string[] } =
    { name: '', description: '', color: '#6366F1', company: '', client: '', tags: [], technologies: [] };
  colors = ['#6366F1', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.service.list({ status: this.view() }).subscribe({
      next: (res) => { this.projects.set(res.data ?? []); this.dataLoading.set(false); },
      error: () => { this.projects.set([]); this.dataLoading.set(false); },
    });
  }

  setView(v: 'active' | 'archived'): void {
    this.view.set(v);
    this.load();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { name: '', description: '', color: '#6366F1', company: '', client: '', tags: [], technologies: [] };
    this.dialogVisible.set(true);
  }

  openEdit(p: Project, ev: Event): void {
    ev.stopPropagation();
    this.editingId = p.id;
    this.form = {
      name: p.name, description: p.description ?? '', color: p.color ?? '#6366F1',
      company: p.company ?? '', client: p.client ?? '',
      tags: [...(p.tags ?? [])], technologies: [...(p.technologies ?? [])],
    };
    this.dialogVisible.set(true);
  }

  save(): void {
    if (!this.form.name.trim()) { this.notify.warn('Name is required'); return; }
    this.loading.set(true);
    const req = this.editingId
      ? this.service.update(this.editingId, this.form)
      : this.service.create(this.form);
    req.subscribe({
      next: () => { this.loading.set(false); this.dialogVisible.set(false); this.notify.success(this.editingId ? 'Project updated' : 'Project created'); this.load(); },
      error: () => this.loading.set(false),
    });
  }

  async archive(p: Project, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm.ask({ title: 'Archive project', message: `Archive "${p.name}"? You can restore it later from the Archived tab.`, confirmLabel: 'Archive', severity: 'warn' });
    if (!ok) return;
    this.service.archive(p.id).subscribe({ next: () => { this.notify.success('Project archived'); this.load(); } });
  }

  async remove(p: Project, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm.ask({ title: 'Delete project', message: `Permanently delete "${p.name}"? Its activities, tasks and time records will also be removed. This cannot be undone.`, confirmLabel: 'Delete', severity: 'danger' });
    if (!ok) return;
    this.service.remove(p.id).subscribe({ next: () => { this.notify.success('Project deleted'); this.load(); } });
  }

  unarchive(p: Project, ev: Event): void {
    ev.stopPropagation();
    this.service.update(p.id, { status: 'active' }).subscribe({
      next: () => { this.notify.success('Project restored'); this.load(); },
    });
  }

  open(p: Project): void {
    this.router.navigate(['/projects', p.id]);
  }
}

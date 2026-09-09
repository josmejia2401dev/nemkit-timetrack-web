import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProjectsService, Project } from '../../core/services/projects.service';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private store = inject(AuthStore);

  user = this.store.user;
  projects = signal<Project[]>([]);

  ngOnInit(): void {
    this.projectsService.list({ status: 'active', limit: 6 }).subscribe({
      next: (res) => this.projects.set(res.data ?? []),
      error: () => this.projects.set([]),
    });
  }
}

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './private/layout/layout.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./public/login/login.component').then(m => m.LoginComponent) },

  {
    path: '',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',      loadComponent: () => import('./private/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'projects',       loadComponent: () => import('./private/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id',   loadComponent: () => import('./private/projects/project-detail.component').then(m => m.ProjectDetailComponent) },
      { path: 'activities/:id', loadComponent: () => import('./private/activities/activity-detail.component').then(m => m.ActivityDetailComponent) },
      { path: 'tasks/:id',      loadComponent: () => import('./private/tasks/task-detail.component').then(m => m.TaskDetailComponent) },
      { path: 'knowledge',      loadComponent: () => import('./private/knowledge/knowledge.component').then(m => m.KnowledgeComponent) },
      { path: 'profile',        loadComponent: () => import('./private/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'loggers',        loadComponent: () => import('./private/loggers/loggers.component').then(m => m.LoggersComponent) },
      { path: 'cache',          loadComponent: () => import('./private/cache-stats/cache-stats.component').then(m => m.CacheStatsComponent) },
    ],
  },

  { path: '**', redirectTo: 'login' },
];

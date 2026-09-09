import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, PaginatedResponse } from './api.service';

export interface Activity {
  id: number;
  projectId: number;
  name: string;
  description: string;
  estimatedMinutes: number;
  tags: string[];
  technologies: string[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private api = inject(ApiService);

  listByProject(projectId: number, params?: Record<string, unknown>): Observable<PaginatedResponse<Activity>> {
    return this.api.get<Activity[]>(`/projects/${projectId}/activities`, params) as unknown as Observable<PaginatedResponse<Activity>>;
  }

  getById(id: number): Observable<ApiResponse<Activity>> {
    return this.api.get<Activity>(`/activities/${id}`);
  }

  create(projectId: number, body: Partial<Activity>): Observable<ApiResponse<Activity>> {
    return this.api.post<Activity>(`/projects/${projectId}/activities`, body);
  }

  update(id: number, body: Partial<Activity>): Observable<ApiResponse<Activity>> {
    return this.api.put<Activity>(`/activities/${id}`, body);
  }

  archive(id: number): Observable<ApiResponse<null>> {
    return this.api.post<null>(`/activities/${id}/archive`, {});
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/activities/${id}`);
  }
}

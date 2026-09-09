import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, PaginatedResponse } from './api.service';

export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  company: string;
  client: string;
  tags: string[];
  technologies: string[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private api = inject(ApiService);

  list(params?: Record<string, unknown>): Observable<PaginatedResponse<Project>> {
    return this.api.get<Project[]>('/projects', params) as unknown as Observable<PaginatedResponse<Project>>;
  }

  getById(id: number): Observable<ApiResponse<Project>> {
    return this.api.get<Project>(`/projects/${id}`);
  }

  create(body: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.post<Project>('/projects', body);
  }

  update(id: number, body: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.put<Project>(`/projects/${id}`, body);
  }

  archive(id: number): Observable<ApiResponse<null>> {
    return this.api.post<null>(`/projects/${id}/archive`, {});
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/projects/${id}`);
  }
}

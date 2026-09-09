import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, PaginatedResponse } from './api.service';

export interface Note {
  id: number;
  projectId: number;
  title: string;
  content: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private api = inject(ApiService);

  listByProject(projectId: number, params?: Record<string, unknown>): Observable<PaginatedResponse<Note>> {
    return this.api.get<Note[]>(`/projects/${projectId}/notes`, params) as unknown as Observable<PaginatedResponse<Note>>;
  }

  getById(id: number): Observable<ApiResponse<Note>> {
    return this.api.get<Note>(`/notes/${id}`);
  }

  create(projectId: number, body: Partial<Note>): Observable<ApiResponse<Note>> {
    return this.api.post<Note>(`/projects/${projectId}/notes`, body);
  }

  update(id: number, body: Partial<Note>): Observable<ApiResponse<Note>> {
    return this.api.put<Note>(`/notes/${id}`, body);
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/notes/${id}`);
  }
}

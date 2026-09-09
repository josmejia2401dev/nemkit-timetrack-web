import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, PaginatedResponse } from './api.service';

export type TimeRecordType = 'development' | 'meeting' | 'design' | 'bugfix' | 'documentation' | 'testing' | 'research' | 'other';

export const TIME_RECORD_TYPES: { label: string; value: TimeRecordType; icon: string }[] = [
  { label: 'Development',   value: 'development',   icon: 'pi pi-code' },
  { label: 'Meeting',       value: 'meeting',       icon: 'pi pi-users' },
  { label: 'Design',        value: 'design',        icon: 'pi pi-palette' },
  { label: 'Bug fixing',    value: 'bugfix',        icon: 'pi pi-wrench' },
  { label: 'Documentation', value: 'documentation', icon: 'pi pi-file-edit' },
  { label: 'Testing',       value: 'testing',       icon: 'pi pi-check-square' },
  { label: 'Research',      value: 'research',      icon: 'pi pi-search' },
  { label: 'Other',         value: 'other',         icon: 'pi pi-ellipsis-h' },
];

export interface TimeRecord {
  id: string;
  start: string;
  end: string;
  durationMs: number;
  type: TimeRecordType;
  note: string;
}

export interface Task {
  id: number;
  projectId: number;
  activityId: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done';
  estimatedMinutes: number;
  category: string;
  tags: string[];
  technologies: string[];
  aiAssisted: boolean;
  timeRecords: TimeRecord[];
  totalMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddTimeRecord {
  start: string;
  end: string;
  durationMs?: number;
  type?: TimeRecordType;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private api = inject(ApiService);

  listByActivity(activityId: number, params?: Record<string, unknown>): Observable<PaginatedResponse<Task>> {
    return this.api.get<Task[]>(`/activities/${activityId}/tasks`, params) as unknown as Observable<PaginatedResponse<Task>>;
  }

  getById(id: number): Observable<ApiResponse<Task>> {
    return this.api.get<Task>(`/tasks/${id}`);
  }

  create(activityId: number, body: Partial<Task>): Observable<ApiResponse<Task>> {
    return this.api.post<Task>(`/activities/${activityId}/tasks`, body);
  }

  update(id: number, body: Partial<Task>): Observable<ApiResponse<Task>> {
    return this.api.put<Task>(`/tasks/${id}`, body);
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/tasks/${id}`);
  }

  addTimeRecord(id: number, body: AddTimeRecord): Observable<ApiResponse<Task>> {
    return this.api.post<Task>(`/tasks/${id}/time-records`, body);
  }

  removeTimeRecord(id: number, recordId: string): Observable<ApiResponse<Task>> {
    return this.api.delete<Task>(`/tasks/${id}/time-records/${recordId}`);
  }
}

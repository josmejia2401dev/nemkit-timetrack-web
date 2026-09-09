import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface LogFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface LogEntry {
  timestamp: string | null;
  level: string;
  service?: string;
  message: string;
  requestId?: string;
  stack?: string;
  [key: string]: any;
}

export interface LogReadResult {
  file: string;
  total: number;
  returned: number;
  entries: LogEntry[];
}

@Injectable({ providedIn: 'root' })
export class LogsService {
  private api = inject(ApiService);

  listFiles(): Observable<ApiResponse<LogFile[]>> {
    return this.api.get<LogFile[]>('/logs/files');
  }

  read(params: { file: string; level?: string; search?: string; requestId?: string; limit?: number }): Observable<ApiResponse<LogReadResult>> {
    return this.api.get<LogReadResult>('/logs/read', params);
  }
}

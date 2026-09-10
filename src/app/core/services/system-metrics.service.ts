import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface ProcessMetrics {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  uptimeSeconds: number;
  pid: number;
  nodeVersion: string;
}

export interface SystemInfoMetrics {
  platform: string;
  arch: string;
  totalMemMb: number;
  freeMemMb: number;
  usedMemMb: number;
  usedMemPercent: number;
  cpuCores: number;
  cpuModel: string | null;
  loadAverage: number[];
  uptimeSeconds: number;
}

export interface DiskMetrics {
  path: string;
  totalMb: number;
  freeMb: number;
  usedMb: number;
  usedPercent: number;
}

export interface SystemMetrics {
  timestamp: string;
  process: ProcessMetrics;
  system: SystemInfoMetrics;
  disk: DiskMetrics | null;
}

@Injectable({ providedIn: 'root' })
export class SystemMetricsService {
  private api = inject(ApiService);

  getMetrics(): Observable<ApiResponse<SystemMetrics>> {
    return this.api.get<SystemMetrics>('/system/metrics');
  }
}

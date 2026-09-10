import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, expand, map, of, switchMap, timeout, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_AUTH, SKIP_ERROR_TOAST, SKIP_LOADING } from '../http/http-context.tokens';

export type BackendHealthStatus = 'checking' | 'online' | 'offline';
export type BackendHealthPollProfile = 'aggressive' | 'relaxed';

const PROBE_TIMEOUT_MS = 10_000;
const OFFLINE_INTERVAL_MS = 15_000;
const AGGRESSIVE_ONLINE_INTERVAL_MS = 15_000;
const RELAXED_ONLINE_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class BackendHealthService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  readonly status = signal<BackendHealthStatus>('checking');
  readonly lastCheckedAt = signal<number | null>(null);
  readonly pollProfile = signal<BackendHealthPollProfile>('relaxed');

  constructor() {
    this.probe().pipe(
      expand((ok) => {
        this.applyResult(ok);
        return timer(this.nextIntervalMs(ok)).pipe(switchMap(() => this.probe()));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  setPollProfile(profile: BackendHealthPollProfile): void {
    this.pollProfile.set(profile);
  }

  private probe() {
    const context = new HttpContext()
      .set(SKIP_AUTH, true)
      .set(SKIP_LOADING, true)
      .set(SKIP_ERROR_TOAST, true);

    return this.http.get<{ status: string }>(environment.healthUrl, { context }).pipe(
      timeout(PROBE_TIMEOUT_MS),
      map((res) => res.status === 'ok'),
      catchError(() => of(false)),
    );
  }

  private applyResult(ok: boolean): void {
    this.status.set(ok ? 'online' : 'offline');
    this.lastCheckedAt.set(Date.now());
  }

  private nextIntervalMs(ok: boolean): number {
    if (!ok) return OFFLINE_INTERVAL_MS;
    return this.pollProfile() === 'aggressive'
      ? AGGRESSIVE_ONLINE_INTERVAL_MS
      : RELAXED_ONLINE_INTERVAL_MS;
  }
}

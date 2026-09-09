import { Injectable, computed, signal } from '@angular/core';

export interface TimerState {
  taskId: number;
  taskTitle: string;
  state: 'running' | 'paused';
  startedAt: number;        // epoch ms del segmento en curso (0 si pausado)
  accumulatedMs: number;    // acumulado antes del segmento actual
  firstStartedAt: number;   // epoch ms del inicio original (para timeRecord.start)
  note: string;
}

const STORAGE_KEY = 'tt_timer';

/**
 * TimerService — cronómetro PSP manejado en el frontend (Opción A).
 * Persiste en localStorage para sobrevivir recargas.
 * Al detener, el componente lee stop() y hace POST /tasks/:id/time-records.
 */
@Injectable({ providedIn: 'root' })
export class TimerService {
  private stateSignal = signal<TimerState | null>(this.load());
  private tick = signal(0);
  private intervalRef: any = null;

  state = this.stateSignal.asReadonly();
  isActive = computed(() => this.stateSignal() !== null);
  isRunning = computed(() => this.stateSignal()?.state === 'running');

  elapsedMs = computed(() => {
    this.tick();
    const s = this.stateSignal();
    if (!s) return 0;
    if (s.state === 'running') return s.accumulatedMs + (Date.now() - s.startedAt);
    return s.accumulatedMs;
  });

  constructor() {
    if (this.stateSignal()?.state === 'running') this.startTicking();
  }

  start(taskId: number, taskTitle: string, note = ''): void {
    const now = Date.now();
    this.set({ taskId, taskTitle, state: 'running', startedAt: now, accumulatedMs: 0, firstStartedAt: now, note });
    this.startTicking();
  }

  pause(): void {
    const s = this.stateSignal();
    if (!s || s.state === 'paused') return;
    const accumulated = s.accumulatedMs + (Date.now() - s.startedAt);
    this.set({ ...s, state: 'paused', startedAt: 0, accumulatedMs: accumulated });
    this.stopTicking();
  }

  resume(): void {
    const s = this.stateSignal();
    if (!s || s.state === 'running') return;
    this.set({ ...s, state: 'running', startedAt: Date.now() });
    this.startTicking();
  }

  stop(): { taskId: number; start: string; end: string; durationMs: number; note: string } | null {
    const s = this.stateSignal();
    if (!s) return null;
    const durationMs = s.state === 'running' ? s.accumulatedMs + (Date.now() - s.startedAt) : s.accumulatedMs;
    const payload = {
      taskId: s.taskId,
      start: new Date(s.firstStartedAt).toISOString(),
      end: new Date().toISOString(),
      durationMs,
      note: s.note,
    };
    this.clear();
    return durationMs > 0 ? payload : null;
  }

  reset(): void { this.clear(); }

  private set(s: TimerState): void {
    this.stateSignal.set(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  private clear(): void {
    this.stopTicking();
    this.stateSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private startTicking(): void {
    this.stopTicking();
    this.intervalRef = setInterval(() => this.tick.update(v => v + 1), 1000);
  }

  private stopTicking(): void {
    if (this.intervalRef) { clearInterval(this.intervalRef); this.intervalRef = null; }
  }

  private load(): TimerState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as TimerState; } catch { return null; }
  }
}

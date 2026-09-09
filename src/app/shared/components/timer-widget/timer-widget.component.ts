import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TimerService } from '../../../core/services/timer.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatDuration } from '../../utils/time.util';

@Component({
  selector: 'app-timer-widget',
  standalone: true,
  imports: [RouterLink, ButtonModule, TooltipModule],
  template: `
    @if (timer.isActive()) {
      <div class="timer-widget">
        <span class="timer-widget__dot" [class.timer-widget__dot--paused]="!timer.isRunning()"></span>
        <a [routerLink]="['/tasks', timer.state()!.taskId]" class="timer-widget__task" [pTooltip]="timer.state()!.taskTitle" tooltipPosition="bottom">
          {{ timer.state()!.taskTitle }}
        </a>
        <span class="timer-widget__time">{{ display() }}</span>
        <div class="flex items-center gap-1">
          @if (timer.isRunning()) {
            <p-button icon="pi pi-pause" [rounded]="true" [text]="true" size="small" severity="secondary" (onClick)="timer.pause()" pTooltip="Pause" tooltipPosition="bottom" />
          } @else {
            <p-button icon="pi pi-play" [rounded]="true" [text]="true" size="small" severity="success" (onClick)="timer.resume()" pTooltip="Resume" tooltipPosition="bottom" />
          }
          <p-button icon="pi pi-stop" [rounded]="true" [text]="true" size="small" severity="danger" [loading]="saving" (onClick)="onStop()" pTooltip="Stop & save" tooltipPosition="bottom" />
          <p-button icon="pi pi-times" [rounded]="true" [text]="true" size="small" severity="secondary" (onClick)="onDiscard()" pTooltip="Discard" tooltipPosition="bottom" />
        </div>
      </div>
    }
  `,
  styles: [`
    .timer-widget { display: flex; align-items: center; gap: 0.75rem; padding: 0.375rem 0.375rem 0.375rem 0.875rem; background: var(--deploy-surface-0); border: 1px solid var(--deploy-border); border-radius: 999px; box-shadow: var(--deploy-shadow-md); }
    .timer-widget__dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; flex-shrink: 0; animation: tw-pulse 1.5s infinite; }
    .timer-widget__dot--paused { background: #F59E0B; animation: none; }
    .timer-widget__task { font-size: 0.8125rem; font-weight: 500; color: var(--deploy-text); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: none; }
    .timer-widget__task:hover { color: var(--deploy-primary); }
    .timer-widget__time { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 600; color: var(--deploy-primary); font-variant-numeric: tabular-nums; }
    @keyframes tw-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  `],
})
export class TimerWidgetComponent {
  timer = inject(TimerService);
  private api = inject(ApiService);
  private notify = inject(NotificationService);
  saving = false;

  display(): string { return formatDuration(this.timer.elapsedMs()); }

  onStop(): void {
    const payload = this.timer.stop();
    if (!payload) { this.notify.info('Timer discarded', 'No time to save'); return; }
    this.saving = true;
    this.api.post(`/tasks/${payload.taskId}/time-records`, {
      start: payload.start, end: payload.end, durationMs: payload.durationMs, note: payload.note,
    }).subscribe({
      next: () => { this.saving = false; this.notify.success('Time saved', formatDuration(payload.durationMs)); },
      error: () => { this.saving = false; this.notify.error('Failed to save time'); },
    });
  }

  onDiscard(): void { this.timer.reset(); this.notify.info('Timer discarded'); }
}

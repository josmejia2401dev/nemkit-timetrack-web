import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
  life?: number;
}

let counter = 0;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<Notification[]>([]);

  success(summary: string, detail?: string): void { this.add('success', summary, detail); }
  info(summary: string, detail?: string): void { this.add('info', summary, detail); }
  warn(summary: string, detail?: string): void { this.add('warn', summary, detail); }
  error(summary: string, detail?: string): void { this.add('error', summary, detail); }

  remove(id: number): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  private add(severity: Notification['severity'], summary: string, detail?: string): void {
    const id = ++counter;
    const life = severity === 'error' ? 5000 : 3000;
    this.notifications.update(list => [...list, { id, severity, summary, detail, life }]);
    setTimeout(() => this.remove(id), life);
  }
}

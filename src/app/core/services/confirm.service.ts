import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'danger' | 'warn' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  visible = signal(false);
  options = signal<ConfirmOptions>({ title: '', message: '' });
  private resolveFn: ((value: boolean) => void) | null = null;

  /**
   * Muestra un dialog de confirmación y retorna una Promise<boolean>.
   *
   * Uso:
   *   const confirmed = await this.confirm.ask({ title: 'Delete?', message: 'This cannot be undone.' });
   *   if (confirmed) { ... }
   */
  ask(options: ConfirmOptions): Promise<boolean> {
    this.options.set(options);
    this.visible.set(true);
    return new Promise(resolve => { this.resolveFn = resolve; });
  }

  accept(): void {
    this.visible.set(false);
    this.resolveFn?.(true);
    this.resolveFn = null;
  }

  reject(): void {
    this.visible.set(false);
    this.resolveFn?.(false);
    this.resolveFn = null;
  }
}

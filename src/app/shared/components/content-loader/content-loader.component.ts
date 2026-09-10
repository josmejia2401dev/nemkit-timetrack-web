import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-content-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-loader" role="status" aria-live="polite" aria-busy="true">
      <i class="pi pi-spin pi-spinner content-loader__icon" aria-hidden="true"></i>
      <span>{{ message() }}</span>
    </section>
  `,
  styles: [`
    .content-loader {
      min-height: 16rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      color: var(--deploy-text-muted);
      font-size: 0.8125rem;
    }

    .content-loader__icon {
      color: var(--deploy-primary);
      font-size: 1rem;
    }
  `],
})
export class ContentLoaderComponent {
  message = input('Loading...');
}

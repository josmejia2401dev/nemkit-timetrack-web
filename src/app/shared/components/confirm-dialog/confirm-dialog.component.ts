import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [header]="confirmService.options().title"
              [visible]="confirmService.visible()"
              (visibleChange)="onVisibleChange($event)"
              [modal]="true" [closable]="false" [draggable]="false"
              [style]="{width: '400px'}">
      <p class="text-sm" style="color: var(--deploy-text-muted)">{{ confirmService.options().message }}</p>
      <ng-template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <p-button [label]="confirmService.options().cancelLabel ?? 'Cancel'" [text]="true" (onClick)="confirmService.reject()" />
          <p-button [label]="confirmService.options().confirmLabel ?? 'Confirm'"
                    [severity]="confirmService.options().severity === 'danger' ? 'danger' : 'primary'"
                    (onClick)="confirmService.accept()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);

  // Si el usuario cierra el diálogo (ESC/overlay), se trata como rechazo.
  onVisibleChange(visible: boolean): void {
    if (!visible) this.confirmService.reject();
  }
}

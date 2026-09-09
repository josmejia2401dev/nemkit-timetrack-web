import { Component } from '@angular/core';
import { KnowledgeExplorerComponent } from '../../shared/components/knowledge-explorer/knowledge-explorer.component';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [KnowledgeExplorerComponent],
  template: `
    <div class="deploy-page-header">
      <div>
        <h1 class="deploy-page-title">Knowledge</h1>
        <p class="text-sm" style="color: var(--deploy-text-muted)">
          Your cross-project knowledge base: errors, docs, and reusable code snippets.
        </p>
      </div>
    </div>

    <div class="deploy-card p-4">
      <app-knowledge-explorer />
    </div>
  `,
})
export class KnowledgeComponent {}

import { Component, inject, signal, computed, OnInit, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
  KnowledgeService, KnowledgeFolder, KnowledgeItem, KnowledgeKind,
} from '../../../core/services/knowledge.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';

interface Crumb { id: number | null; name: string; }

const MAX_BYTES = 1024 * 1024; // 1 MB

/** Prefilled template for a bug report. */
const BUG_TEMPLATE = `## Summary
_Short description of the bug._

## Steps to reproduce
1.
2.
3.

## Expected behavior
_What should happen._

## Actual behavior
_What actually happens (error messages, stack traces...)._

## Environment
- App / service:
- Version / commit:
- OS / browser:

## Workaround / fix
_How it was solved, or a temporary workaround (if any)._
`;

const NOTE_TEMPLATE = `# Title

_Write your note here..._
`;

const LANGUAGES = [
  { label: 'Text', value: 'text' },
  { label: 'Java', value: 'java' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'shell' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'XML', value: 'xml' },
  { label: 'Python', value: 'python' },
];

@Component({
  selector: 'app-knowledge-explorer',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule, DialogModule, MenuModule],
  templateUrl: './knowledge-explorer.component.html',
})
export class KnowledgeExplorerComponent implements OnInit {
  private service = inject(KnowledgeService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  /** Compact mode trims paddings/typography for the drawer. */
  @Input() compact = false;

  @ViewChild('newMenu') newMenu!: Menu;

  languages = LANGUAGES;

  // Search
  searchQuery = '';
  searching = signal(false);
  searchActive = signal(false);
  searchResults = signal<KnowledgeItem[]>([]);

  // Kind filter chips
  kindFilter = signal<KnowledgeKind | null>(null); // null = All
  readonly kindChips: { label: string; value: KnowledgeKind | null }[] = [
    { label: 'All', value: null },
    { label: 'Files', value: 'file' },
    { label: 'Notes', value: 'note' },
    { label: 'Bugs', value: 'bug' },
  ];

  // "New" dropdown menu
  newMenuItems: MenuItem[] = [
    { label: 'New file / snippet', icon: 'pi pi-file', command: () => this.newEntry('file') },
    { label: 'New note', icon: 'pi pi-pencil', command: () => this.newEntry('note') },
    { label: 'Report a bug', icon: 'pi pi-exclamation-triangle', command: () => this.newEntry('bug') },
  ];

  // Navigation state
  currentFolderId = signal<number | null>(null);
  breadcrumbs = signal<Crumb[]>([{ id: null, name: 'Root' }]);

  // Data
  folders = signal<KnowledgeFolder[]>([]);
  items = signal<KnowledgeItem[]>([]);
  loading = signal(false);

  // New folder inline
  creatingFolder = signal(false);
  newFolderName = '';

  // Editor dialog
  editorVisible = signal(false);
  editorSaving = signal(false);
  editing = signal<KnowledgeItem | null>(null);
  editingPath = signal<string>('');
  form = { name: '', kind: 'file' as KnowledgeKind, language: 'text', content: '', tags: '' };

  // Internal drag & drop (move)
  private dragged = signal<{ kind: 'folder' | 'item'; id: number } | null>(null);
  dropTarget = signal<number | 'root' | null>(null); // folder id being hovered, or 'root'

  isEmpty = computed(() => this.folders().length === 0 && this.items().length === 0);

  ngOnInit(): void { this.load(); }

  // ── Loading ───────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    const fid = this.currentFolderId();
    this.service.listFolders(fid).subscribe({
      next: (res) => this.folders.set(res.data ?? []),
      error: () => this.notify.error('Failed to load folders'),
    });
    this.service.listItems(fid, this.kindFilter()).subscribe({
      next: (res) => { this.items.set(res.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Failed to load entries'); },
    });
  }

  setKindFilter(kind: KnowledgeKind | null): void {
    this.kindFilter.set(kind);
    if (this.searchActive()) this.runSearch();
    else this.load();
  }

  toggleNewMenu(event: Event): void {
    this.newMenu.toggle(event);
  }

  // ── Search (name / tags / content, global) ────────────
  runSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) { this.clearSearch(); return; }
    this.searching.set(true);
    this.searchActive.set(true);
    this.service.searchItems(q, this.kindFilter()).subscribe({
      next: (res) => { this.searchResults.set(res.data ?? []); this.searching.set(false); },
      error: () => { this.searching.set(false); this.notify.error('Search failed'); },
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchActive.set(false);
    this.searchResults.set([]);
  }

  // ── Navigation ────────────────────────────────────────
  openFolder(folder: KnowledgeFolder): void {
    // Evita agregar migas duplicadas si ya estamos dentro de esa carpeta.
    if (this.currentFolderId() === folder.id) return;
    this.currentFolderId.set(folder.id);
    this.breadcrumbs.update(bc => [...bc, { id: folder.id, name: folder.name }]);
    this.cancelNewFolder();
    this.load();
  }

  goToCrumb(index: number): void {
    const bc = this.breadcrumbs();
    const target = bc[index];
    this.breadcrumbs.set(bc.slice(0, index + 1));
    this.currentFolderId.set(target.id);
    this.cancelNewFolder();
    this.load();
  }

  // ── Folder CRUD ───────────────────────────────────────
  startNewFolder(): void { this.creatingFolder.set(true); this.newFolderName = ''; }
  cancelNewFolder(): void { this.creatingFolder.set(false); this.newFolderName = ''; }

  saveNewFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;
    this.service.createFolder({ name, parentId: this.currentFolderId() }).subscribe({
      next: () => { this.notify.success('Folder created'); this.cancelNewFolder(); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Failed to create folder'),
    });
  }

  // Rename folder dialog
  renameVisible = signal(false);
  renameSaving = signal(false);
  private renaming = signal<KnowledgeFolder | null>(null);
  renameValue = '';

  renameFolder(folder: KnowledgeFolder): void {
    this.renaming.set(folder);
    this.renameValue = folder.name;
    this.renameVisible.set(true);
  }

  closeRename(): void { this.renameVisible.set(false); this.renaming.set(null); }

  saveRename(): void {
    const folder = this.renaming();
    const name = this.renameValue.trim();
    if (!folder) return;
    if (!name) { this.notify.warn('Folder name is required'); return; }
    if (name === folder.name) { this.closeRename(); return; }

    this.renameSaving.set(true);
    this.service.renameFolder(folder.id, name).subscribe({
      next: () => {
        this.notify.success('Folder renamed');
        this.renameSaving.set(false);
        this.closeRename();
        this.load();
      },
      error: (e) => {
        this.renameSaving.set(false);
        this.notify.error(e?.error?.message ?? 'Failed to rename folder');
      },
    });
  }

  async deleteFolder(folder: KnowledgeFolder): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete folder',
      message: `Delete "${folder.name}" and all its contents? This cannot be undone.`,
      confirmLabel: 'Delete', severity: 'danger',
    });
    if (!ok) return;
    this.service.deleteFolder(folder.id).subscribe({
      next: () => { this.notify.success('Folder deleted'); this.load(); },
      error: () => this.notify.error('Failed to delete folder'),
    });
  }

  // ── Entry editor (file / note / bug) ──────────────────
  newEntry(kind: KnowledgeKind): void {
    this.editing.set(null);
    this.editingPath.set('');
    const defaults: Record<KnowledgeKind, { name: string; language: string; content: string }> = {
      file: { name: '', language: 'text', content: '' },
      note: { name: '', language: 'markdown', content: NOTE_TEMPLATE },
      bug:  { name: '', language: 'markdown', content: BUG_TEMPLATE },
    };
    const d = defaults[kind];
    this.form = { name: d.name, kind, language: d.language, content: d.content, tags: '' };
    this.editorVisible.set(true);
  }

  openFile(item: KnowledgeItem): void {
    this.service.getItem(item.id).subscribe({
      next: (res) => {
        const full = res.data;
        this.editing.set(full);
        this.editingPath.set(full.folderPath ?? '');
        this.form = {
          name: full.name,
          kind: full.kind ?? 'file',
          language: full.language ?? 'text',
          content: full.content ?? '',
          tags: (full.tags ?? []).join(', '),
        };
        this.editorVisible.set(true);
      },
      error: () => this.notify.error('Failed to open entry'),
    });
  }

  closeEditor(): void { this.editorVisible.set(false); this.editing.set(null); this.editingPath.set(''); }

  get contentBytes(): number {
    return new Blob([this.form.content ?? '']).size;
  }
  get overLimit(): boolean { return this.contentBytes > MAX_BYTES; }

  saveFile(): void {
    const name = this.form.name.trim();
    const label = this.kindLabel(this.form.kind);
    if (!name) { this.notify.warn(`${label} name is required`); return; }
    if (this.overLimit) { this.notify.error('Content exceeds the 1MB limit'); return; }

    const tags = this.form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload: Partial<KnowledgeItem> = {
      name, kind: this.form.kind, language: this.form.language, content: this.form.content, tags,
    };

    this.editorSaving.set(true);
    const editing = this.editing();
    const req$ = editing
      ? this.service.updateItem(editing.id, payload)
      : this.service.createItem({ ...payload, folderId: this.currentFolderId() });

    req$.subscribe({
      next: () => {
        this.notify.success(editing ? `${label} updated` : `${label} created`);
        this.editorSaving.set(false);
        this.closeEditor();
        this.load();
      },
      error: (e) => {
        this.editorSaving.set(false);
        this.notify.error(e?.error?.message ?? `Failed to save ${label.toLowerCase()}`);
      },
    });
  }

  async deleteFile(item: KnowledgeItem): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete file',
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmLabel: 'Delete', severity: 'danger',
    });
    if (!ok) return;
    this.service.deleteItem(item.id).subscribe({
      next: () => { this.notify.success('File deleted'); this.load(); },
      error: () => this.notify.error('Failed to delete file'),
    });
  }

  // ── Internal drag & drop (move items/folders) ─────────
  onDragStart(event: DragEvent, kind: 'folder' | 'item', id: number): void {
    this.dragged.set({ kind, id });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Some browsers require data to be set for the drag to start.
      event.dataTransfer.setData('text/plain', `${kind}:${id}`);
    }
  }

  onDragEnd(): void {
    this.dragged.set(null);
    this.dropTarget.set(null);
  }

  /** Hover over a folder row (valid drop target). */
  onFolderDragOver(event: DragEvent, folder: KnowledgeFolder): void {
    if (!this.dragged()) return; // let OS-file drops bubble to the root dropzone
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(folder.id);
  }

  onFolderDragLeave(folder: KnowledgeFolder): void {
    if (this.dropTarget() === folder.id) this.dropTarget.set(null);
  }

  /** Drop onto a folder row → move dragged item/folder into it. */
  onFolderDrop(event: DragEvent, folder: KnowledgeFolder): void {
    if (!this.dragged()) return;
    event.preventDefault();
    event.stopPropagation();
    this.performMove(folder.id);
  }

  /** Hover over a breadcrumb (drop into an ancestor folder / root). */
  onCrumbDragOver(event: DragEvent, crumbId: number | null): void {
    if (!this.dragged()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(crumbId ?? 'root');
  }

  onCrumbDrop(event: DragEvent, crumbId: number | null): void {
    if (!this.dragged()) return;
    event.preventDefault();
    this.performMove(crumbId);
  }

  /** Executes the move of the currently dragged element to a target folder (null = root). */
  private performMove(targetFolderId: number | null): void {
    const dragged = this.dragged();
    this.dropTarget.set(null);
    if (!dragged) return;
    this.dragged.set(null);

    if (dragged.kind === 'item') {
      const item = this.items().find(i => i.id === dragged.id);
      if (item && (item.folderId ?? null) === (targetFolderId ?? null)) return; // no-op
      this.service.moveItem(dragged.id, targetFolderId).subscribe({
        next: () => { this.notify.success('File moved'); this.load(); },
        error: (e) => this.notify.error(e?.error?.message ?? 'Failed to move file'),
      });
    } else {
      // Folder → folder. Guard obvious no-ops; backend prevents cycles.
      if (dragged.id === targetFolderId) return;
      const folder = this.folders().find(f => f.id === dragged.id);
      if (folder && (folder.parentId ?? null) === (targetFolderId ?? null)) return; // already here
      this.service.moveFolder(dragged.id, targetFolderId).subscribe({
        next: () => { this.notify.success('Folder moved'); this.load(); },
        error: (e) => this.notify.error(e?.error?.message ?? 'Failed to move folder'),
      });
    }
  }

  // ── Upload (button + drag & drop) ─────────────────────
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  /** Drop on the root surface: OS file upload, OR move a dragged item/folder to the current folder. */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropTarget.set(null);

    // OS files being dropped → upload
    const files = event.dataTransfer?.files;
    if (files?.length) { this.uploadFiles(Array.from(files)); return; }

    // Internal drag → move to the folder we're currently viewing
    this.performMove(this.currentFolderId());
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  private uploadFiles(files: File[]): void {
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        this.notify.error(`"${file.name}" exceeds the 1MB limit`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? '');
        this.service.createItem({
          name: file.name,
          folderId: this.currentFolderId(),
          kind: 'file',
          language: this.guessLanguage(file.name),
          mimeType: file.type || 'text/plain',
          content,
        }).subscribe({
          next: () => { this.notify.success(`Uploaded ${file.name}`); this.load(); },
          error: (e) => this.notify.error(e?.error?.message ?? `Failed to upload ${file.name}`),
        });
      };
      reader.onerror = () => this.notify.error(`Could not read ${file.name}`);
      reader.readAsText(file);
    }
  }

  private guessLanguage(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      java: 'java', js: 'javascript', mjs: 'javascript', ts: 'typescript',
      json: 'json', yml: 'yaml', yaml: 'yaml', sql: 'sql', sh: 'shell', bash: 'shell',
      md: 'markdown', markdown: 'markdown', html: 'html', htm: 'html', css: 'css',
      xml: 'xml', py: 'python',
    };
    return map[ext] ?? 'text';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private fileIcon(language: string): string {
    switch (language) {
      case 'java': return 'pi pi-cog';
      case 'javascript':
      case 'typescript': return 'pi pi-code';
      case 'json':
      case 'yaml':
      case 'xml': return 'pi pi-database';
      case 'markdown': return 'pi pi-book';
      default: return 'pi pi-file';
    }
  }

  /** Icon for a list row: bugs and notes take precedence over the language icon. */
  itemIcon(item: KnowledgeItem): string {
    if (item.kind === 'bug') return 'pi pi-exclamation-triangle';
    if (item.kind === 'note') return 'pi pi-pencil';
    return this.fileIcon(item.language);
  }

  /** Accent color per kind (used for the row icon). */
  kindColor(kind: KnowledgeKind): string {
    switch (kind) {
      case 'bug':  return '#DC2626';
      case 'note': return '#2563EB';
      default:     return 'var(--deploy-text-secondary)';
    }
  }

  kindLabel(kind: KnowledgeKind): string {
    switch (kind) {
      case 'bug':  return 'Bug';
      case 'note': return 'Note';
      default:     return 'File';
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

/** A folder node in the knowledge tree. */
export interface KnowledgeFolder {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Nested tree node returned by GET /knowledge/tree. */
export interface KnowledgeTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  children: KnowledgeTreeNode[];
}

export type KnowledgeKind = 'file' | 'note' | 'bug';

/** A file/note/bug entry. `content` is only present when fetched by id. */
export interface KnowledgeItem {
  id: number;
  folderId: number | null;
  name: string;
  kind: KnowledgeKind;
  language: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  content?: string;
  folderPath?: string; // ruta legible, ej: "Root / mi-unidad / bugs"
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private api = inject(ApiService);

  // ── Tree ──────────────────────────────────────────────
  getTree(): Observable<ApiResponse<KnowledgeTreeNode[]>> {
    return this.api.get<KnowledgeTreeNode[]>('/knowledge/tree');
  }

  // ── Folders ───────────────────────────────────────────
  listFolders(parentId: number | null): Observable<ApiResponse<KnowledgeFolder[]>> {
    return this.api.get<KnowledgeFolder[]>('/knowledge/folders', { parentId: parentId ?? 'root' });
  }

  createFolder(body: { name: string; parentId?: number | null }): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.post<KnowledgeFolder>('/knowledge/folders', body);
  }

  renameFolder(id: number, name: string): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.put<KnowledgeFolder>(`/knowledge/folders/${id}`, { name });
  }

  moveFolder(id: number, parentId: number | null): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.patch<KnowledgeFolder>(`/knowledge/folders/${id}/move`, { parentId });
  }

  deleteFolder(id: number): Observable<ApiResponse<{ deletedFolders: number }>> {
    return this.api.delete<{ deletedFolders: number }>(`/knowledge/folders/${id}`);
  }

  // ── Items ─────────────────────────────────────────────
  listItems(folderId: number | null, kind?: KnowledgeKind | null): Observable<ApiResponse<KnowledgeItem[]>> {
    const params: Record<string, unknown> = { folderId: folderId ?? 'root' };
    if (kind) params['kind'] = kind;
    return this.api.get<KnowledgeItem[]>('/knowledge/items', params);
  }

  getItem(id: number): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.get<KnowledgeItem>(`/knowledge/items/${id}`);
  }

  searchItems(q: string, kind?: KnowledgeKind | null): Observable<ApiResponse<KnowledgeItem[]>> {
    const params: Record<string, unknown> = { q };
    if (kind) params['kind'] = kind;
    return this.api.get<KnowledgeItem[]>('/knowledge/items/search', params);
  }

  createItem(body: Partial<KnowledgeItem>): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.post<KnowledgeItem>('/knowledge/items', body);
  }

  updateItem(id: number, body: Partial<KnowledgeItem>): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.put<KnowledgeItem>(`/knowledge/items/${id}`, body);
  }

  moveItem(id: number, folderId: number | null): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.patch<KnowledgeItem>(`/knowledge/items/${id}/move`, { folderId });
  }

  deleteItem(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/knowledge/items/${id}`);
  }
}

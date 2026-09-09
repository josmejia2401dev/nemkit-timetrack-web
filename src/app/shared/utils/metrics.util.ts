import { Task, TimeRecordType } from '../../core/services/tasks.service';

/** Tipos de registro que cuentan como tiempo productivo. */
const PRODUCTIVE_TYPES: TimeRecordType[] = ['development', 'design', 'bugfix', 'documentation', 'testing', 'research'];

/** Tipos que cuentan como gestión / overhead (reuniones, etc.). */
const OVERHEAD_TYPES: TimeRecordType[] = ['meeting', 'other'];

export function isProductiveType(type: string): boolean {
  return PRODUCTIVE_TYPES.includes(type as TimeRecordType);
}

export interface TaskMetrics {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  completionPct: number;       // % de tareas completadas
  estimatedMs: number;         // suma de estimados de las tareas
  trackedMs: number;           // suma de TODO el tiempo (productivo + gestión)
  productiveMs: number;        // tiempo productivo (dev, design, bugfix, docs, testing, research)
  overheadMs: number;          // tiempo de gestión / reuniones (meeting, other)
  variancePct: number;         // (productivo - estimado) / estimado * 100
  avgPerTaskMs: number;        // tiempo productivo promedio por tarea con tiempo
  totalRecords: number;        // nº total de registros de tiempo
  aiAssisted: number;          // tareas hechas con IA
}

/**
 * Calcula métricas agregadas recorriendo los registros de tiempo de las tareas.
 * Separa tiempo productivo de tiempo de gestión según el tipo de cada registro.
 */
export function computeTaskMetrics(tasks: Task[]): TaskMetrics {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const estimatedMs = tasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0) * 60000, 0);
  const aiAssisted = tasks.filter(t => t.aiAssisted).length;

  let trackedMs = 0;
  let productiveMs = 0;
  let overheadMs = 0;
  let totalRecords = 0;

  for (const t of tasks) {
    for (const r of (t.timeRecords ?? [])) {
      const dur = r.durationMs ?? 0;
      trackedMs += dur;
      totalRecords++;
      if (isProductiveType(r.type)) productiveMs += dur;
      else overheadMs += dur;
    }
  }

  // Promedio productivo por tarea que tenga algún tiempo productivo
  const tasksWithProductive = tasks.filter(t => (t.timeRecords ?? []).some(r => isProductiveType(r.type))).length;
  const avgPerTaskMs = tasksWithProductive > 0 ? Math.round(productiveMs / tasksWithProductive) : 0;

  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
  // La desviación se calcula SOLO contra el tiempo productivo (las reuniones no cuentan).
  const variancePct = estimatedMs > 0 ? Math.round(((productiveMs - estimatedMs) / estimatedMs) * 100) : 0;

  return { total, done, inProgress, pending, completionPct, estimatedMs, trackedMs, productiveMs, overheadMs, variancePct, avgPerTaskMs, totalRecords, aiAssisted };
}

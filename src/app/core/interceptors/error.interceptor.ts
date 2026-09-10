import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_TOAST } from '../http/http-context.tokens';

/**
 * Interceptor que muestra toast automáticamente en errores HTTP.
 * No intercepta 401 (eso lo maneja auth.interceptor).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  if (req.context.get(SKIP_ERROR_TOAST)) return next(req);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) return throwError(() => err);

      let message = err.error?.message ?? err.statusText ?? 'An error occurred';

      // Si es un Validation Error, mostrar los mensajes de campo específicos.
      const fieldErrors = err.error?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length) {
        message = fieldErrors.map((e: any) => e.message ?? e.field).join(' · ');
      }

      // Throttle: no repetir el mismo error para la misma URL en 3s
      const key = `${err.status}:${req.url}`;
      if (!recentErrors.has(key)) {
        recentErrors.add(key);
        setTimeout(() => recentErrors.delete(key), 3000);

        if (err.status === 0) {
          notifications.error('Connection error', 'Could not reach the server');
        } else if (err.status === 400 || err.status === 422) {
          notifications.warn('Validation error', message);
        } else if (err.status === 403) {
          notifications.error('Access denied', message);
        } else if (err.status === 404) {
          notifications.warn('Not found', message);
        } else if (err.status === 409) {
          notifications.warn('Conflict', message);
        } else if (err.status === 429) {
          notifications.warn('Too many requests', message);
        } else if (err.status >= 500) {
          notifications.error('Server error', message);
        } else {
          notifications.error('Error', message);
        }
      }

      return throwError(() => err);
    })
  );
};

const recentErrors = new Set<string>();

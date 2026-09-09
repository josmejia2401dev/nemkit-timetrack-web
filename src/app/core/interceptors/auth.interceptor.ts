import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

const PUBLIC_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password'];

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const api = inject(ApiService);
  const router = inject(Router);

  if (PUBLIC_PATHS.some(p => req.url.includes(p))) return next(req);

  const token = store.accessToken();
  if (!token) {
    store.clear();
    router.navigate(['/login']);
    return throwError(() => new Error('No token'));
  }

  // Si ya hay un refresh en curso, esperar
  if (isRefreshing) {
    return refreshSubject.pipe(
      filter(t => t !== null),
      take(1),
      switchMap(freshToken => next(addToken(req, freshToken!)))
    );
  }

  // Refresh proactivo si el token está por expirar
  if (store.isTokenExpiringSoon(environment.tokenRefreshThresholdMs)) {
    return doRefresh(req, next, api, store, router);
  }

  // Token válido
  return next(addToken(req, token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        if (isRefreshing) {
          return refreshSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap(freshToken => next(addToken(req, freshToken!)))
          );
        }
        return doRefresh(req, next, api, store, router);
      }
      return throwError(() => err);
    })
  );
};

function doRefresh(req: HttpRequest<unknown>, next: HttpHandlerFn, api: ApiService, store: AuthStore, router: Router): Observable<any> {
  isRefreshing = true;
  refreshSubject.next(null);

  return api.post<any>('/auth/refresh', { refreshToken: store.refreshToken() }).pipe(
    switchMap(res => {
      isRefreshing = false;
      const freshToken = res.data.accessToken;
      store.updateTokens(res.data.accessToken, res.data.refreshToken);
      refreshSubject.next(freshToken);
      return next(addToken(req, freshToken));
    }),
    catchError(err => {
      isRefreshing = false;
      refreshSubject.next(null);
      store.clear();
      router.navigate(['/login']);
      return throwError(() => err);
    })
  );
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

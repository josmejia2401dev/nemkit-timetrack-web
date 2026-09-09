import { Injectable, computed, signal } from '@angular/core';

const TOKEN_KEY = 'deploy_access_token';
const REFRESH_KEY = 'deploy_refresh_token';
const USER_KEY = 'deploy_user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private userSignal = signal<any>(this.load(USER_KEY));
  private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private refreshSignal = signal<string | null>(localStorage.getItem(REFRESH_KEY));

  user = this.userSignal.asReadonly();
  accessToken = this.tokenSignal.asReadonly();
  refreshToken = this.refreshSignal.asReadonly();
  isLoggedIn = computed(() => !!this.tokenSignal());

  setSession(user: any, access: string, refresh: string): void {
    this.userSignal.set(user);
    this.tokenSignal.set(access);
    this.refreshSignal.set(refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  updateTokens(access: string, refresh: string): void {
    this.tokenSignal.set(access);
    this.refreshSignal.set(refresh);
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  clear(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    this.refreshSignal.set(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  isTokenExpiringSoon(thresholdMs: number): boolean {
    const token = this.tokenSignal();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp * 1000 - Date.now()) < thresholdMs;
    } catch { return true; }
  }

  private load(key: string): any {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

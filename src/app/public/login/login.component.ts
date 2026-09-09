import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private api = inject(ApiService);
  private store = inject(AuthStore);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  onSubmit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.api.post<any>('/auth/login', { email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.store.setSession(res.data.user, res.data.accessToken, res.data.refreshToken);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.message ?? 'Login failed'); },
    });
  }
}

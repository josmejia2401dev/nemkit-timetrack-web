import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ContentLoaderComponent } from '../../shared/components/content-loader/content-loader.component';

interface Profile {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  security: {
    loginAttempts: number;
    lockedUntil: string | null;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonModule, InputTextModule, DialogModule, ContentLoaderComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  profile = signal<Profile | null>(null);
  loading = signal(false);

  // Edit form
  editName = '';
  editEmail = '';
  savingProfile = false;

  // Password form
  passwordDialogVisible = signal(false);
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = false;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.api.get<Profile>('/profile').subscribe({
      next: (res) => {
        this.profile.set(res.data);
        this.editName = res.data.fullName;
        this.editEmail = res.data.email;
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  saveProfile(): void {
    if (!this.editName.trim() || !this.editEmail.trim()) {
      this.notify.warn('Name and email are required');
      return;
    }
    this.savingProfile = true;
    this.api.put<any>('/profile', { fullName: this.editName.trim(), email: this.editEmail.trim() }).subscribe({
      next: (res) => {
        this.notify.success(res.message ?? 'Profile updated');
        this.savingProfile = false;
        this.loadProfile();
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Failed to update profile');
        this.savingProfile = false;
      },
    });
  }

  openPasswordDialog(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordDialogVisible.set(true);
  }

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.notify.warn('All fields are required');
      return;
    }
    if (this.newPassword.length < 6) {
      this.notify.warn('New password must be at least 6 characters');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.notify.warn('Passwords do not match');
      return;
    }

    this.savingPassword = true;
    this.api.put<any>('/profile/password', {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    }).subscribe({
      next: (res) => {
        this.notify.success(res.message ?? 'Password changed');
        this.savingPassword = false;
        this.passwordDialogVisible.set(false);
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Failed to change password');
        this.savingPassword = false;
      },
    });
  }
}

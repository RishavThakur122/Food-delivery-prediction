import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
<div class="page">
  <div class="card">

    <!-- logo -->
    <div class="logo">
      <span class="logo-icon">🛵</span>
      <div>
        <div class="logo-name">SwiftBite</div>
        <div class="logo-sub">Delivery Tracking</div>
      </div>
    </div>

    <!-- tabs -->
    <div class="tabs">
      <button class="tab" [class.active]="mode==='login'"    (click)="mode='login'">    Login    </button>
      <button class="tab" [class.active]="mode==='register'" (click)="mode='register'"> Register </button>
    </div>

    <!-- name field (register only) -->
    <div class="field" *ngIf="mode==='register'">
      <label>Full Name</label>
      <input type="text" [(ngModel)]="name" placeholder="Your name" />
    </div>

    <div class="field">
      <label>Email</label>
      <input type="email" [(ngModel)]="email" placeholder="you@example.com" />
    </div>

    <div class="field">
      <label>Password</label>
      <input type="password" [(ngModel)]="password" placeholder="••••••••" />
    </div>

    <!-- error -->
    <div class="error" *ngIf="error">{{ error }}</div>

    <!-- submit -->
    <button class="btn-submit" (click)="submit()" [disabled]="loading">
      <span *ngIf="!loading">{{ mode === 'login' ? 'Login' : 'Create Account' }}</span>
      <span *ngIf="loading" class="spin"></span>
    </button>

  </div>
</div>
  `,
    styles: [`
    :host {
      --or:   #F7510F;
      --ink:  #18130F;
      --mid:  #6B6560;
      --pale: #F5F0EB;
      --bdr:  rgba(24,19,15,0.10);
      --font: 'DM Sans', sans-serif;
      display: block;
      height: 100vh;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pale);
      font-family: var(--font);
    }

    .card {
      background: white;
      border: 1px solid var(--bdr);
      border-radius: 20px;
      padding: 36px 32px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 40px rgba(24,19,15,0.10);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 40px; height: 40px;
      background: var(--or);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .logo-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ink);
    }
    .logo-sub {
      font-size: 0.65rem;
      color: var(--mid);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .tabs {
      display: flex;
      background: var(--pale);
      border-radius: 10px;
      padding: 3px;
      gap: 3px;
    }
    .tab {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      font-family: var(--font);
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--mid);
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab.active {
      background: white;
      color: var(--ink);
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(24,19,15,0.10);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--ink);
    }
    input {
      padding: 10px 12px;
      border: 1.5px solid var(--bdr);
      border-radius: 10px;
      font-family: var(--font);
      font-size: 0.85rem;
      color: var(--ink);
      outline: none;
      transition: border-color 0.2s;
      background: white;
    }
    input:focus  { border-color: var(--or); }
    input::placeholder { color: #C5BDB7; }

    .error {
      font-size: 0.78rem;
      color: #E53935;
      background: #FFF0EE;
      border: 1px solid #FFCDD2;
      border-radius: 8px;
      padding: 9px 12px;
    }

    .btn-submit {
      width: 100%;
      padding: 12px;
      background: var(--or);
      border: none;
      border-radius: 10px;
      font-family: var(--font);
      font-size: 0.88rem;
      font-weight: 700;
      color: white;
      cursor: pointer;
      transition: opacity 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
    }
    .btn-submit:hover:not(:disabled) { opacity: 0.88; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .spin {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: sp 0.6s linear infinite;
    }
    @keyframes sp { to { transform: rotate(360deg); } }
  `]
})
export class AuthComponent {
    mode: 'login' | 'register' = 'login';

    name = '';
    email = '';
    password = '';
    error = '';
    loading = false;

    constructor(private auth: AuthService, private router: Router) {
        // already logged in — go straight to app
        if (this.auth.isLoggedIn()) this.router.navigate(['/']);
    }

    async submit(): Promise<void> {
        this.error = '';
        this.loading = true;

        try {
            if (this.mode === 'login') {
                await this.auth.login({ email: this.email, password: this.password });
            } else {
                if (!this.name.trim()) { this.error = 'Name is required'; this.loading = false; return; }
                await this.auth.register({ name: this.name, email: this.email, password: this.password });
            }
            this.router.navigate(['/']);
        } catch (e: any) {
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    }
}
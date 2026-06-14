import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface UserRow {
    userId: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

const API = 'http://localhost:5000/api/admin';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule],
    template: `
<div class="page">

  <header class="top">
    <div class="brand">
      <span class="brand-icon">🛠️</span>
      <div>
        <div class="brand-name">SwiftBite</div>
        <div class="brand-sub">Admin Dashboard</div>
      </div>
    </div>
    <button class="btn-back" (click)="goHome()">← Back to App</button>
  </header>

  <div class="content">

    <h2 class="section-title">Users ({{ users.length }})</h2>

    <div class="loading" *ngIf="loading">Loading…</div>

    <table class="users-table" *ngIf="!loading">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let u of users">
          <td>{{ u.userId }}</td>
          <td>{{ u.name }}</td>
          <td>{{ u.email }}</td>
          <td><span class="role-badge" [class.admin]="u.role === 'admin'">{{ u.role }}</span></td>
          <td>{{ u.createdAt | date:'MMM d, y, h:mm a' }}</td>
        </tr>
      </tbody>
    </table>

  </div>
</div>
  `,
    styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

    :host {
      --or:   #F7510F;
      --ink:  #18130F;
      --mid:  #6B6560;
      --pale: #F5F0EB;
      --bdr:  rgba(24,19,15,0.10);
      --font: 'Syne', sans-serif;
      --body: 'DM Sans', sans-serif;
      display: block;
      min-height: 100vh;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page { min-height: 100vh; background: var(--pale); font-family: var(--body); }

    .top {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: white; border-bottom: 1px solid var(--bdr);
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 36px; height: 36px; background: var(--ink); border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .brand-name { font-family: var(--font); font-weight: 800; font-size: 1rem; color: var(--ink); }
    .brand-sub  { font-size: 0.65rem; color: var(--mid); text-transform: uppercase; letter-spacing: 0.08em; }

    .btn-back {
      background: transparent; border: 1.5px solid var(--bdr); border-radius: 8px;
      padding: 7px 14px; font-size: 0.78rem; font-family: var(--body); color: var(--mid);
      cursor: pointer; transition: all 0.15s;
    }
    .btn-back:hover { border-color: var(--or); color: var(--or); }

    .content { max-width: 900px; margin: 0 auto; padding: 24px; }

    .section-title {
      font-family: var(--font); font-size: 1.1rem; font-weight: 800;
      color: var(--ink); margin-bottom: 14px;
    }

    .loading { color: var(--mid); font-size: 0.85rem; padding: 20px 0; }

    .users-table {
      width: 100%; border-collapse: collapse;
      background: white; border-radius: 14px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(24,19,15,0.04);
    }
    .users-table th {
      text-align: left; padding: 12px 16px;
      background: var(--ink); color: white;
      font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .users-table td {
      padding: 12px 16px; border-bottom: 1px solid var(--bdr);
      font-size: 0.82rem; color: var(--ink);
    }
    .users-table tr:last-child td { border-bottom: none; }
    .users-table tr:hover { background: var(--pale); }

    .role-badge {
      display: inline-block;
      padding: 3px 10px; border-radius: 20px;
      font-size: 0.68rem; font-weight: 700;
      background: var(--pale); color: var(--mid);
      text-transform: capitalize;
    }
    .role-badge.admin { background: #FFF0EB; color: var(--or); }
  `]
})
export class AdminUsersComponent implements OnInit {
    users: UserRow[] = [];
    loading = true;

    constructor(private auth: AuthService, private router: Router) { }

    async ngOnInit(): Promise<void> {
        try {
            const res = await fetch(`${API}/users`, {
                headers: { 'Authorization': `Bearer ${this.auth.getToken()}` }
            });
            this.users = await res.json();
        } finally {
            this.loading = false;
        }
    }

    goHome(): void {
        this.router.navigate(['/']);
    }
}
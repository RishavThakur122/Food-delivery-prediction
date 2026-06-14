import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface OrderRow {
    orderId: string;
    status: string;
    driverId: string | null;
    customerName: string;
    customerEmail: string;
    originalEtaMinutes: number | null;
    createdAt: string;
    deliveredAt: string | null;
}

const API = 'http://localhost:5000/api/admin';

@Component({
    selector: 'app-admin-orders',
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

  <nav class="tabs">
    <a routerLink="/admin"        class="tab" (click)="goUsers()">Users</a>
    <a class="tab active">Orders</a>
  </nav>

  <div class="content">

    <h2 class="section-title">Orders ({{ orders.length }})</h2>

    <div class="loading" *ngIf="loading">Loading…</div>
    <div class="table-scroll" *ngIf="!loading">
    <table class="orders-table" >
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Driver</th>
          <th>ETA</th>
          <th>Placed</th>
          <th>Delivered</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let o of orders">
          <td class="mono">{{ o.orderId }}</td>
          <td>
            <div class="cust-name">{{ o.customerName }}</div>
            <div class="cust-email">{{ o.customerEmail }}</div>
          </td>
          <td><span class="status-badge" [ngClass]="statusClass(o.status)">{{ o.status }}</span></td>
          <td class="mono">{{ o.driverId || '—' }}</td>
          <td>{{ o.originalEtaMinutes ? o.originalEtaMinutes + ' min' : '—' }}</td>
          <td>{{ o.createdAt | date:'MMM d, h:mm a' }}</td>
          <td>{{ o.deliveredAt ? (o.deliveredAt | date:'MMM d, h:mm a') : '—' }}</td>
        </tr>
      </tbody>
    </table>
    </div>
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
      --grn:  #10B86C;
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

    .tabs {
      display: flex; gap: 4px;
      padding: 12px 24px 0;
      background: white;
      border-bottom: 1px solid var(--bdr);
    }
    .tab {
      padding: 10px 18px;
      font-size: 0.82rem; font-weight: 600; color: var(--mid);
      text-decoration: none; cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }

    .table-scroll {
  overflow-x: auto;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(24,19,15,0.04);
}
.table-scroll .orders-table {
  box-shadow: none;
}
    .tab:hover { color: var(--ink); }
    .tab.active { color: var(--or); border-bottom-color: var(--or); }

    .content { max-width: 1100px; margin: 0 auto; padding: 24px; }

    .section-title {
      font-family: var(--font); font-size: 1.1rem; font-weight: 800;
      color: var(--ink); margin-bottom: 14px;
    }

    .loading { color: var(--mid); font-size: 0.85rem; padding: 20px 0; }

    .orders-table {
      width: 100%; border-collapse: collapse;
      background: white; border-radius: 14px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(24,19,15,0.04);
    }
    .orders-table th {
      text-align: left; padding: 12px 14px;
      background: var(--ink); color: white;
      font-size: 0.66rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .orders-table td {
      padding: 12px 14px; border-bottom: 1px solid var(--bdr);
      font-size: 0.8rem; color: var(--ink);
      white-space: nowrap;
    }
    .orders-table tr:last-child td { border-bottom: none; }
    .orders-table tr:hover { background: var(--pale); }

    .mono { font-family: monospace; font-size: 0.74rem; color: var(--mid); }

    .cust-name  { font-weight: 600; }
    .cust-email { font-size: 0.7rem; color: var(--mid); }

    .status-badge {
      display: inline-block;
      padding: 3px 10px; border-radius: 20px;
      font-size: 0.66rem; font-weight: 700;
      background: var(--pale); color: var(--mid);
    }
    .status-badge.waiting   { background: #F0EBE6; color: var(--mid); }
    .status-badge.active    { background: #FFF0EB; color: var(--or); }
    .status-badge.arrived   { background: #E8FBF3; color: var(--grn); }
    .status-badge.cancelled { background: #FFF0EE; color: #E53935; }
  `]
})
export class AdminOrdersComponent implements OnInit {
    orders: OrderRow[] = [];
    loading = true;

    constructor(private auth: AuthService, private router: Router) { }

    async ngOnInit(): Promise<void> {
        try {
            const res = await fetch(`${API}/orders`, {
                headers: { 'Authorization': `Bearer ${this.auth.getToken()}` }
            });
            this.orders = await res.json();
        } catch {
            this.orders = [];
        } finally {
            this.loading = false;
        }
    }

    statusClass(status: string): string {
        if (status === 'Waiting for driver') return 'waiting';
        if (status === 'Arrived') return 'arrived';
        if (status === 'Cancelled') return 'cancelled';
        return 'active'; // Driver Assigned / En Route / Nearby
    }

    goUsers(): void { this.router.navigate(['/admin']); }
    goHome(): void { this.router.navigate(['/']); }
}
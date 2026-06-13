import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface CoordinateDto { lat: number; lng: number; }

interface OrderDto {
    orderId: string;
    userLocation: CoordinateDto;
    restaurantLocation: CoordinateDto;
    status: string;
    driverId?: string;
    originalEtaMinutes?: number;
    createdAt: string;
}

const API = 'http://localhost:5000/api/orders';

@Component({
    selector: 'app-driver-list',
    standalone: true,
    imports: [CommonModule],
    template: `
<div class="page">

  <header class="top">
    <div class="brand">
      <span class="brand-icon">🛵</span>
      <div>
        <div class="brand-name">SwiftBite</div>
        <div class="brand-sub">Driver Dashboard</div>
      </div>
    </div>
    <button class="btn-back" (click)="goHome()">← Back to App</button>
  </header>

  <div class="content">

    <div class="info-bar">
      <span>Driver ID: <strong>{{ driverId || '—' }}</strong></span>
      <button class="btn-refresh" (click)="loadOrders()" [disabled]="loading">
        <span *ngIf="!loading">Refresh</span>
        <span *ngIf="loading" class="spin"></span>
      </button>
    </div>

    <!-- success message -->
    <div class="success-msg" *ngIf="acceptedOrderId">
      ✅ Order <strong>#{{ acceptedOrderId }}</strong> accepted! Open the driver app on your phone to start sharing GPS for this order.
    </div>

    <!-- empty state -->
    <div class="empty" *ngIf="!loading && orders.length === 0">
      No orders waiting for a driver right now.
    </div>

    <!-- order cards -->
    <div class="order-card" *ngFor="let o of orders">
      <div class="card-top">
        <div class="order-id">#{{ o.orderId }}</div>
        <div class="eta-badge" *ngIf="o.originalEtaMinutes">
          {{ o.originalEtaMinutes }} min ETA
        </div>
      </div>

      <div class="locations">
        <div class="loc-row">
          <span class="loc-dot rest-dot"></span>
          <span class="loc-label">Pickup</span>
          <span class="loc-coord">{{ o.restaurantLocation.lat | number:'1.4-4' }}, {{ o.restaurantLocation.lng | number:'1.4-4' }}</span>
        </div>
        <div class="loc-row">
          <span class="loc-dot user-dot"></span>
          <span class="loc-label">Drop-off</span>
          <span class="loc-coord">{{ o.userLocation.lat | number:'1.4-4' }}, {{ o.userLocation.lng | number:'1.4-4' }}</span>
        </div>
      </div>

      <button class="btn-accept" (click)="accept(o.orderId)" [disabled]="accepting === o.orderId">
        <span *ngIf="accepting !== o.orderId">Accept Order</span>
        <span *ngIf="accepting === o.orderId" class="spin"></span>
      </button>
    </div>

  </div>
</div>
  `,
    styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

    :host {
      --or:    #F7510F;
      --ink:   #18130F;
      --mid:   #6B6560;
      --pale:  #F5F0EB;
      --grn:   #10B86C;
      --bdr:   rgba(24,19,15,0.10);
      --font:  'Syne', sans-serif;
      --body:  'DM Sans', sans-serif;
      display: block;
      min-height: 100vh;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page {
      min-height: 100vh;
      background: var(--pale);
      font-family: var(--body);
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid var(--bdr);
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 36px; height: 36px;
      background: var(--or); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .brand-name { font-family: var(--font); font-weight: 800; font-size: 1rem; color: var(--ink); }
    .brand-sub  { font-size: 0.65rem; color: var(--mid); text-transform: uppercase; letter-spacing: 0.08em; }

    .btn-back {
      background: transparent;
      border: 1.5px solid var(--bdr);
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 0.78rem;
      font-family: var(--body);
      color: var(--mid);
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-back:hover { border-color: var(--or); color: var(--or); }

    .content {
      max-width: 560px;
      margin: 0 auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
      color: var(--mid);
    }
    .info-bar strong { color: var(--ink); }

    .btn-refresh {
      background: white;
      border: 1.5px solid var(--bdr);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 0.78rem;
      color: var(--ink);
      cursor: pointer;
      font-family: var(--body);
      min-width: 70px;
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.15s;
    }
    .btn-refresh:hover:not(:disabled) { border-color: var(--or); }
    .btn-refresh:disabled { opacity: 0.6; }

    .success-msg {
      background: #E8FBF3;
      border: 1px solid rgba(16,184,108,0.2);
      color: #0E8F57;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .empty {
      text-align: center;
      color: var(--mid);
      font-size: 0.85rem;
      padding: 40px 0;
    }

    .order-card {
      background: white;
      border: 1px solid var(--bdr);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 2px 12px rgba(24,19,15,0.04);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .order-id {
      font-family: var(--font);
      font-weight: 800;
      font-size: 0.95rem;
      color: var(--ink);
    }
    .eta-badge {
      background: var(--ink);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .locations { display: flex; flex-direction: column; gap: 6px; }
    .loc-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
    }
    .loc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .rest-dot { background: var(--or); }
    .user-dot { background: var(--grn); }
    .loc-label {
      font-weight: 600;
      color: var(--ink);
      min-width: 60px;
    }
    .loc-coord {
      font-family: monospace;
      color: var(--mid);
      font-size: 0.72rem;
    }

    .btn-accept {
      width: 100%;
      padding: 11px;
      background: var(--or);
      border: none;
      border-radius: 10px;
      font-family: var(--font);
      font-size: 0.85rem;
      font-weight: 700;
      color: white;
      cursor: pointer;
      transition: opacity 0.15s;
      display: flex; align-items: center; justify-content: center;
      min-height: 42px;
    }
    .btn-accept:hover:not(:disabled) { opacity: 0.88; }
    .btn-accept:disabled { opacity: 0.6; cursor: not-allowed; }

    .spin {
      width: 14px; height: 14px;
      border: 2px solid rgba(0,0,0,0.15);
      border-top-color: var(--or);
      border-radius: 50%;
      animation: sp 0.6s linear infinite;
    }
    .btn-accept .spin { border: 2px solid rgba(255,255,255,0.4); border-top-color: white; }
    @keyframes sp { to { transform: rotate(360deg); } }
  `]
})
export class DriverListComponent implements OnInit, OnDestroy {
    orders: OrderDto[] = [];
    loading = false;
    accepting: string | null = null;
    acceptedOrderId: string | null = null;
    driverId = '';

    private pollHandle: any;

    constructor(private auth: AuthService, private router: Router) {
        this.driverId = this.auth.getUserId();
    }

    ngOnInit(): void {
        this.loadOrders();
        this.pollHandle = setInterval(() => this.loadOrders(), 10000);
    }

    ngOnDestroy(): void {
        if (this.pollHandle) clearInterval(this.pollHandle);
    }

    async loadOrders(): Promise<void> {
        this.loading = true;
        try {
            const res = await fetch(`${API}/available`);
            this.orders = await res.json();
        } catch {
            this.orders = [];
        } finally {
            this.loading = false;
        }
    }

    async accept(orderId: string): Promise<void> {
        this.accepting = orderId;
        try {
            const res = await fetch(`${API}/${orderId}/accept?driverId=${this.driverId}`, {
                method: 'POST'
            });

            if (res.ok) {
                this.acceptedOrderId = orderId;
                this.orders = this.orders.filter(o => o.orderId !== orderId);
            }
        } finally {
            this.accepting = null;
        }
    }

    goHome(): void {
        this.router.navigate(['/']);
    }
}
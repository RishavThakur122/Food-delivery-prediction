import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import * as signalR from '@microsoft/signalr';

declare const L: any;

const API = 'http://localhost:5000/api';
const HUB = 'http://localhost:5000/hubs/tracking';

@Component({
    selector: 'app-driver-track',
    standalone: true,
    imports: [CommonModule],
    template: `
<div class="page">

  <header class="top">
    <div class="brand">
      <span class="brand-icon">🛵</span>
      <div>
        <div class="brand-name">Order #{{ orderId }}</div>
        <div class="brand-sub">Live Delivery</div>
      </div>
    </div>
    <button class="btn-back" (click)="goBack()">← Orders</button>
  </header>

  <div class="map-wrap">
    <div #mapEl class="map-el"></div>

    <div class="status-pill" [class.arrived]="status === 'Arrived'">
      <span class="dot"></span> {{ status || 'Waiting to start' }}
    </div>
  </div>

  <div class="panel">

    <div class="row" *ngIf="distanceKm !== null">
      <span class="k">Distance to customer</span>
      <span class="v">{{ distanceKm }} km</span>
    </div>

    <div class="row" *ngIf="lastSent">
      <span class="k">Last GPS sent</span>
      <span class="v">{{ lastSent }}</span>
    </div>

    <div class="error" *ngIf="error">{{ error }}</div>

    <button class="btn-main" *ngIf="!tracking" (click)="startTracking()">
      Start Sharing Location
    </button>

    <button class="btn-stop" *ngIf="tracking" (click)="stopTracking()">
      Stop Sharing Location
    </button>

    <div class="log" *ngIf="log.length">
      <div class="log-row" *ngFor="let l of log">{{ l }}</div>
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
      height: 100vh;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: var(--body);
      background: var(--pale);
    }

    .top {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      background: white;
      border-bottom: 1px solid var(--bdr);
      flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 36px; height: 36px;
      background: var(--or); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .brand-name { font-family: var(--font); font-weight: 800; font-size: 0.92rem; color: var(--ink); }
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

    .map-wrap { position: relative; flex: 1; min-height: 240px; }
    .map-el   { width: 100%; height: 100%; }

    .status-pill {
      position: absolute;
      top: 14px; left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: white;
      padding: 8px 18px;
      border-radius: 30px;
      font-size: 0.78rem;
      font-weight: 600;
      display: flex; align-items: center; gap: 7px;
      box-shadow: 0 4px 16px rgba(24,19,15,0.2);
      z-index: 800;
    }
    .status-pill .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #F59E0B;
      animation: pulse 1.4s infinite;
    }
    .status-pill.arrived .dot { background: var(--grn); animation: none; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.3; }
    }

    .panel {
      background: white;
      border-top: 1px solid var(--bdr);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
      max-height: 40vh;
      overflow-y: auto;
    }

    .row {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
    }
    .k { color: var(--mid); }
    .v { color: var(--ink); font-weight: 600; }

    .error {
      background: #FFF0EE;
      border: 1px solid #FFCDD2;
      color: #E53935;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 0.78rem;
    }

    .btn-main, .btn-stop {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 12px;
      font-family: var(--font);
      font-size: 0.88rem;
      font-weight: 700;
      color: white;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-main { background: var(--or); }
    .btn-stop { background: var(--ink); }
    .btn-main:hover, .btn-stop:hover { opacity: 0.88; }

    .log {
      background: var(--pale);
      border-radius: 10px;
      padding: 10px 12px;
      font-family: monospace;
      font-size: 0.68rem;
      color: var(--mid);
      max-height: 110px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    :host ::ng-deep .leaflet-container { background: #E8E0D8; }
    :host ::ng-deep .m-driver, :host ::ng-deep .m-user {
      width: 16px; height: 16px; border-radius: 50%; border: 3px solid white;
      box-shadow: 0 2px 12px rgba(24,19,15,0.25);
    }
    :host ::ng-deep .m-driver { background: #4f8ef7; }
    :host ::ng-deep .m-user   { background: var(--grn); }
  `]
})
export class DriverTrackComponent implements OnInit, OnDestroy {
    @ViewChild('mapEl') mapEl!: ElementRef;

    orderId = '';
    status = '';
    distanceKm: number | null = null;
    lastSent = '';
    error = '';
    tracking = false;
    log: string[] = [];

    private map: any = null;
    private driverMark: any = null;
    private userMark: any = null;
    private routeLine: any = null;
    private hubConnection: signalR.HubConnection | null = null;
    private watchId: number | null = null;
    private lastPushTime = 0;
    private userLoc: { lat: number; lng: number } | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private auth: AuthService,
        private zone: NgZone
    ) { }

    ngOnInit(): void {
        this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
        this.loadLeaflet();
        this.loadOrder();
    }

    ngOnDestroy(): void {
        this.stopTracking();
        this.map?.remove();
    }

    // ── Leaflet setup ──────────────────────────────────────────────────────
    private loadLeaflet(): void {
        if ((window as any).L) { this.initMap(); return; }
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        const js = document.createElement('script');
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        js.onload = () => this.zone.run(() => this.initMap());
        document.head.appendChild(js);
    }

    private initMap(): void {
        setTimeout(() => {
            this.map = L.map(this.mapEl.nativeElement, { center: [28.6139, 77.209], zoom: 13 });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors', maxZoom: 19
            }).addTo(this.map);

            if (this.userLoc) this.placeUserMarker();
        }, 100);
    }

    // ── Load order to get drop-off location ──────────────────────────────────
    private async loadOrder(): Promise<void> {
        try {
            const res = await fetch(`${API}/orders/${this.orderId}`, {
                headers: { 'Authorization': `Bearer ${this.auth.getToken()}` }
            });
            const data = await res.json();
            this.userLoc = data.order.userLocation;

            if (this.map && this.userLoc) this.placeUserMarker();
        } catch {
            this.error = 'Could not load order details';
        }
    }

    private placeUserMarker(): void {
        if (!this.userLoc) return;
        const icon = L.divIcon({ className: '', html: '<div class="m-user"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
        this.userMark = L.marker([this.userLoc.lat, this.userLoc.lng], { icon })
            .addTo(this.map)
            .bindPopup('📍 Drop-off');
        this.map.setView([this.userLoc.lat, this.userLoc.lng], 13);
    }

    // ── SignalR ────────────────────────────────────────────────────────────
    private async connectHub(): Promise<void> {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(HUB)
            .withAutomaticReconnect()
            .build();

        this.hubConnection.on('LocationUpdated', (snap: any) => {
            this.zone.run(() => {
                this.status = snap.status;
                this.distanceKm = snap.distanceToUserKm;

                if (snap.routeGeometry) this.drawRoute(snap.routeGeometry);
            });
        });

        this.hubConnection.on('DeliveryArrived', () => {
            this.zone.run(() => {
                this.status = 'Arrived';
                this.stopTracking();
                this.log.unshift('🎉 Delivery marked as arrived!');
            });
        });

        this.hubConnection.on('DelayAlert', (a: any) => {
            this.zone.run(() => this.log.unshift(`⚠️ Delay alert sent to customer: ${a.reason}`));
        });

        await this.hubConnection.start();
        await this.hubConnection.invoke('RegisterDelivery', this.orderId);
    }

    // ── GPS tracking ───────────────────────────────────────────────────────
    async startTracking(): Promise<void> {
        if (!navigator.geolocation) {
            this.error = 'Geolocation is not supported on this device';
            return;
        }

        this.error = '';
        await this.connectHub();
        this.tracking = true;

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.handlePosition(pos),
            (err) => this.zone.run(() => this.error = `GPS error: ${err.message}`),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }

    stopTracking(): void {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.hubConnection?.stop();
        this.hubConnection = null;
        this.tracking = false;
    }

    private handlePosition(pos: GeolocationPosition): void {
        const now = Date.now();
        // throttle — push at most every 3 seconds
        if (now - this.lastPushTime < 3000) return;
        this.lastPushTime = now;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmh = pos.coords.speed != null ? pos.coords.speed * 3.6 : null;
        const heading = pos.coords.heading ?? null;

        this.zone.run(() => {
            this.updateDriverMarker(lat, lng);
            this.lastSent = new Date().toLocaleTimeString();
            this.log.unshift(`Sent: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            if (this.log.length > 8) this.log.pop();
        });

        this.hubConnection?.invoke('PushLocation', {
            orderId: this.orderId,
            location: { lat, lng },
            speedKmh,
            heading
        }).catch(() => { });
    }

    // ── Map helpers ────────────────────────────────────────────────────────
    private updateDriverMarker(lat: number, lng: number): void {
        if (!this.map) return;

        if (this.driverMark) {
            this.driverMark.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({ className: '', html: '<div class="m-driver"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
            this.driverMark = L.marker([lat, lng], { icon }).addTo(this.map).bindPopup('🛵 You');
        }
        this.map.panTo([lat, lng]);
    }

    private drawRoute(geometry: string): void {
        if (!geometry || !this.map) return;
        const points = this.decodePolyline(geometry);
        if (!points.length) return;

        if (this.routeLine) this.map.removeLayer(this.routeLine);
        this.routeLine = L.polyline(points, {
            color: '#F7510F', weight: 4, opacity: 0.7,
            lineJoin: 'round', lineCap: 'round', dashArray: '8, 6'
        }).addTo(this.map);
    }

    private decodePolyline(encoded: string): [number, number][] {
        const points: [number, number][] = [];
        let index = 0, lat = 0, lng = 0;

        while (index < encoded.length) {
            let b: number, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lat += result & 1 ? ~(result >> 1) : result >> 1;

            shift = 0; result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lng += result & 1 ? ~(result >> 1) : result >> 1;

            points.push([lat / 1e5, lng / 1e5]);
        }
        return points;
    }

    goBack(): void {
        this.router.navigate(['/driver']);
    }
}
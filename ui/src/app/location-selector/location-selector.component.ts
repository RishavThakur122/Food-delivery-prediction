import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule, DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const L: any;

export interface LocPin {
  lat: number;
  lng: number;
  addr: string;
}

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SlicePipe],

  //template
  template: `
<div class="shell">

  //sidebar
  <aside class="sidebar">

    //logo
    <div class="logo-area">
      <div class="logo">
        <div class="logo-icon">🛵</div>
        <div>
          <div class="logo-name">SwiftBite</div>
          <div class="logo-sub">Delivery Predictor</div>
        </div>
      </div>
      <p class="logo-tagline">Pin locations · Get delivery prediction</p>
    </div>

    //step-nav
    <nav class="steps-nav">
      <div class="step-item" [class.active]="step==='user'" [class.done]="!!userLoc" (click)="goto('user')">
        <div class="step-dot">{{ userLoc ? '✓' : '1' }}</div>
        <div class="step-meta">
          <span class="step-lbl">Your Location</span>
          <span class="step-desc">Drop your delivery pin</span>
        </div>
      </div>
      <div class="step-line"></div>
      <div class="step-item" [class.active]="step==='restaurant'" [class.done]="!!restLoc" [class.off]="!userLoc" (click)="userLoc && goto('restaurant')">
        <div class="step-dot">{{ restLoc ? '✓' : '2' }}</div>
        <div class="step-meta">
          <span class="step-lbl">Restaurant</span>
          <span class="step-desc">Pin the restaurant</span>
        </div>
      </div>
      <div class="step-line"></div>
      <div class="step-item" [class.active]="step==='confirm'" [class.off]="!restLoc" (click)="restLoc && goto('confirm')">
        <div class="step-dot">3</div>
        <div class="step-meta">
          <span class="step-lbl">Confirm & Predict</span>
          <span class="step-desc">Review &amp; get ETA</span>
        </div>
      </div>
    </nav>

    <div class="divider"></div>

   //form
    <div class="form-area">

     //user location
      <div class="section-block">
        <div class="section-title">Your Location</div>
        <div class="input-group">
          <div class="input-row">
            <input
              type="text"
              [(ngModel)]="userQuery"
              class="addr-input"
              placeholder="Search your address…"
              (keyup.enter)="searchAddr('user')"
              [disabled]="searching === 'user'"
            />
            <button class="btn-go" (click)="searchAddr('user')" [disabled]="searching === 'user'">
              <span *ngIf="searching !== 'user'">Go</span>
              <span *ngIf="searching === 'user'" class="spin"></span>
            </button>
          </div>
          <button class="btn-gps" (click)="useGPS()" [disabled]="gpsLoading">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            </svg>
            {{ gpsLoading ? 'Detecting…' : 'Use GPS location' }}
          </button>
        </div>
        <div class="pin-card user-pin" *ngIf="userLoc">
          <div class="pin-dot user-dot"></div>
          <div class="pin-body">
            <div class="pin-label">Your location pinned</div>
            <div class="pin-addr">{{ userLoc.addr | slice:0:72 }}…</div>
            <div class="pin-coords">{{ userLoc.lat | number:'1.5-5' }}, {{ userLoc.lng | number:'1.5-5' }}</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      //restaurant
      <div class="section-block">
        <div class="section-title">Restaurant</div>
        <div class="input-group">
          <div class="input-row">
            <input
              type="text"
              [(ngModel)]="restQuery"
              class="addr-input"
              placeholder="Search restaurant name or address…"
              (keyup.enter)="searchAddr('restaurant')"
              [disabled]="searching === 'restaurant'"
            />
            <button class="btn-go" (click)="searchAddr('restaurant')" [disabled]="searching === 'restaurant'">
              <span *ngIf="searching !== 'restaurant'">Go</span>
              <span *ngIf="searching === 'restaurant'" class="spin"></span>
            </button>
          </div>
        </div>
        <div class="pin-card rest-pin" *ngIf="restLoc">
          <div class="pin-dot rest-dot"></div>
          <div class="pin-body">
            <div class="pin-label">Restaurant pinned</div>
            <div class="pin-addr">{{ restLoc.addr | slice:0:72 }}…</div>
            <div class="pin-coords">{{ restLoc.lat | number:'1.5-5' }}, {{ restLoc.lng | number:'1.5-5' }}</div>
          </div>
        </div>
      </div>

      <div class="divider" *ngIf="userLoc && restLoc"></div>

      //summary
      <div class="summary-box" *ngIf="userLoc && restLoc">
        <div class="section-title">Trip Summary</div>
        <div class="sum-grid">
          <div class="sum-stat">
            <span class="sum-k">Distance</span>
            <span class="sum-v orange">{{ distance }} km</span>
          </div>
          <div class="sum-stat">
            <span class="sum-k">Est. Delivery</span>
            <span class="sum-v orange">{{ etaMin }}–{{ etaMax }} min</span>
          </div>
        </div>
      </div>

     //predict cta
      <button class="btn-predict" *ngIf="userLoc && restLoc" (click)="predict()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Predict Delivery Time
      </button>

    </div>
  </aside>

 //main map area
  <main class="main-area">

    //top bar
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="top-bar-title">Location Selector</div>
        <div class="top-bar-hint">{{ topHint }}</div>
      </div>
      <button class="btn-reset" (click)="resetAll()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Reset
      </button>
    </div>

    //user location map
    <div class="map-pane">
      <div class="map-header">
        <span class="badge user-badge">
          <span class="badge-dot u-dot"></span>
          Your Location
        </span>
        <span class="map-hint-sm">Click the map to drop your pin</span>
        <span class="coord-pill" *ngIf="userLoc">
          {{ userLoc.lat | number:'1.4-4' }}, {{ userLoc.lng | number:'1.4-4' }}
        </span>
      </div>
      <div class="map-wrap">
        <div #userMapEl class="leaflet-host"></div>
        <div class="map-no-pin" *ngIf="!userLoc">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a4860" stroke-width="1.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Click map to pin your location</span>
        </div>
      </div>
    </div>

    //restaurant map
    <div class="map-pane bottom-pane">
      <div class="map-header">
        <span class="badge rest-badge">
          <span class="badge-dot r-dot"></span>
          Restaurant
        </span>
        <span class="map-hint-sm">Click the map to pin restaurant</span>
        <span class="coord-pill" *ngIf="restLoc">
          {{ restLoc.lat | number:'1.4-4' }}, {{ restLoc.lng | number:'1.4-4' }}
        </span>
      </div>
      <div class="map-wrap">
        <div #restMapEl class="leaflet-host"></div>
        <div class="map-no-pin" *ngIf="!restLoc">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a4860" stroke-width="1.5">
            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
          </svg>
          <span>Click map to pin restaurant</span>
        </div>
      </div>
    </div>

  </main>

  <!-- ══ SUCCESS OVERLAY ════════════════════════════════════════════════════ -->
  <div class="success-overlay" *ngIf="showSuccess">
    <div class="success-card">
      <div class="success-glow"></div>
      <div class="success-icon">🎉</div>
      <h2 class="success-title">Locations Confirmed!</h2>
      <p class="success-sub">
        Your coordinates are ready for the prediction engine.<br>
        Pass <code>userLoc</code> and <code>restLoc</code> to your ASP.NET API.
      </p>
      <div class="success-stats">
        <div class="s-stat">
          <span class="s-k">Distance</span>
          <span class="s-v">{{ distance }} km</span>
        </div>
        <div class="s-stat">
          <span class="s-k">Est. Delivery</span>
          <span class="s-v">{{ etaMin }}–{{ etaMax }} min</span>
        </div>
      </div>
      <div class="success-coords">
        <div class="coord-block">
          <div class="cb-label">
            <span class="c-dot u-dot-sm"></span> Your coordinates
          </div>
          <div class="cb-val">{{ userLoc?.lat | number:'1.5-5' }}, {{ userLoc?.lng | number:'1.5-5' }}</div>
        </div>
        <div class="coord-block">
          <div class="cb-label">
            <span class="c-dot r-dot-sm"></span> Restaurant coordinates
          </div>
          <div class="cb-val">{{ restLoc?.lat | number:'1.5-5' }}, {{ restLoc?.lng | number:'1.5-5' }}</div>
        </div>
      </div>
      <button class="btn-reset full-reset" (click)="resetAll()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
        Start Over
      </button>
    </div>
  </div>

</div>
  `,

  /* ═══════════════════════════════════════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════════════════════════════════════ */
  styles: [`
    :host {
      --or:    #f7510f;
      --or2:   #ff7043;
      --grn:   #22c57e;
      --blue:  #4f8ef7;
      --mut:   #9190a0;
      --card:  #1a1920;
      --ink:   #22202e;
      --bdr:   #2a2836;
      --surf:  #141318;
      --fg:    #f0ede8;
      --font:  'Plus Jakarta Sans', sans-serif;
      --mono:  'JetBrains Mono', monospace;
      display: block;
      height: 100vh;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .shell {
      display: grid;
      grid-template-columns: 300px 1fr;
      height: 100vh;
      background: var(--surf);
      color: var(--fg);
      font-family: var(--font);
      position: relative;
      overflow: hidden;
    }

    /* ══ SIDEBAR ══════════════════════════════════════════════ */
    .sidebar {
      background: var(--card);
      border-right: 1px solid var(--bdr);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .logo-area {
      padding: 1.4rem 1.4rem 1.1rem;
      border-bottom: 1px solid var(--bdr);
      flex-shrink: 0;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: var(--or); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .logo-name {
      font-size: 1.1rem; font-weight: 800; letter-spacing: -0.4px; line-height: 1.1;
    }
    .logo-sub {
      font-size: 0.6rem; color: var(--mut); font-weight: 600;
      letter-spacing: 1.1px; text-transform: uppercase;
    }
    .logo-tagline {
      font-size: 0.72rem; color: var(--mut); font-weight: 400; line-height: 1.4;
    }

    /* Steps */
    .steps-nav {
      padding: 1rem 1.2rem;
      display: flex; flex-direction: column; gap: 2px;
      flex-shrink: 0;
    }
    .step-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 10px; cursor: pointer;
      transition: background 0.15s;
    }
    .step-item:hover { background: #201e2c; }
    .step-item.active { background: rgba(247,81,15,0.1); }
    .step-item.off { opacity: 0.38; pointer-events: none; }
    .step-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1.5px solid var(--bdr); display: flex; align-items: center;
      justify-content: center; font-size: 0.7rem; font-weight: 700;
      color: var(--mut); flex-shrink: 0; transition: all 0.2s;
    }
    .step-item.active .step-dot { border-color: var(--or); background: var(--or); color: #fff; }
    .step-item.done  .step-dot  { border-color: var(--grn); background: var(--grn); color: #fff; font-size: 9px; }
    .step-meta { display: flex; flex-direction: column; gap: 1px; }
    .step-lbl  { font-size: 0.8rem; font-weight: 600; color: var(--mut); }
    .step-desc { font-size: 0.67rem; color: #4a4860; }
    .step-item.active .step-lbl { color: var(--fg); }
    .step-item.done  .step-lbl  { color: var(--grn); }
    .step-line {
      width: 1.5px; height: 14px; background: var(--bdr);
      margin-left: 23px; flex-shrink: 0;
    }

    .divider { height: 1px; background: var(--bdr); flex-shrink: 0; }

    /* Form */
    .form-area {
      padding: 1rem 1.2rem;
      flex: 1; display: flex; flex-direction: column; gap: 0.85rem;
      overflow-y: auto;
    }
    .section-block { display: flex; flex-direction: column; gap: 0.5rem; }
    .section-title {
      font-size: 0.63rem; font-weight: 700; color: var(--mut);
      text-transform: uppercase; letter-spacing: 1.3px;
    }
    .input-group { display: flex; flex-direction: column; gap: 5px; }
    .input-row { display: flex; gap: 5px; }
    .addr-input {
      flex: 1; min-width: 0;
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 8px; padding: 8px 11px;
      font-size: 0.78rem; color: var(--fg);
      font-family: var(--font); outline: none;
      transition: border-color 0.2s;
    }
    .addr-input:focus { border-color: var(--or); }
    .addr-input::placeholder { color: #4a4860; }
    .addr-input:disabled { opacity: 0.5; }
    .btn-go {
      background: var(--or); border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 0.76rem; font-weight: 700;
      color: #fff; cursor: pointer; flex-shrink: 0;
      font-family: var(--font);
      display: flex; align-items: center; gap: 4px;
      transition: background 0.15s;
    }
    .btn-go:hover:not(:disabled) { background: #e04510; }
    .btn-go:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-gps {
      width: 100%; background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 8px; padding: 8px 10px;
      font-size: 0.76rem; font-weight: 500; color: var(--mut);
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 6px;
      font-family: var(--font); transition: all 0.15s;
    }
    .btn-gps:hover:not(:disabled) { border-color: var(--or); color: var(--fg); }
    .btn-gps:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Pin cards */
    .pin-card {
      display: flex; gap: 9px; align-items: flex-start;
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 9px; padding: 9px 11px;
      animation: fadeUp 0.25s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pin-dot {
      width: 10px; height: 10px; border-radius: 50%;
      flex-shrink: 0; margin-top: 3px;
    }
    .user-dot { background: var(--grn); box-shadow: 0 0 0 3px rgba(34,197,126,0.2); }
    .rest-dot { background: var(--or2); box-shadow: 0 0 0 3px rgba(247,81,15,0.2); }
    .pin-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pin-label {
      font-size: 0.65rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.7px;
    }
    .user-pin .pin-label { color: var(--grn); }
    .rest-pin .pin-label { color: var(--or2); }
    .pin-addr { font-size: 0.73rem; color: var(--mut); line-height: 1.4; word-break: break-word; }
    .pin-coords { font-family: var(--mono); font-size: 0.6rem; color: #4a4860; margin-top: 2px; }

    /* Summary */
    .summary-box {
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 9px; padding: 11px 12px;
      animation: fadeUp 0.25s ease;
    }
    .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 7px; }
    .sum-stat {
      background: #1a1920; border: 1px solid var(--bdr);
      border-radius: 7px; padding: 8px 10px;
      display: flex; flex-direction: column; gap: 3px;
    }
    .sum-k { font-size: 0.62rem; color: var(--mut); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .sum-v { font-size: 0.95rem; font-weight: 800; }
    .orange { color: var(--or2); }

    .btn-predict {
      width: 100%; background: linear-gradient(135deg, var(--or) 0%, var(--or2) 100%);
      border: none; border-radius: 9px; padding: 11px 14px;
      font-size: 0.85rem; font-weight: 700; color: #fff;
      cursor: pointer; font-family: var(--font);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.15s, transform 0.15s;
      animation: fadeUp 0.3s ease;
    }
    .btn-predict:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-predict:active { transform: translateY(0); }

    /* ══ MAIN ═════════════════════════════════════════════════ */
    .main-area {
      display: grid;
      grid-template-rows: 52px 1fr 1fr;
      overflow: hidden;
    }

    .top-bar {
      padding: 0 1.3rem;
      border-bottom: 1px solid var(--bdr);
      background: var(--card);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .top-bar-title { font-size: 0.88rem; font-weight: 700; }
    .top-bar-hint { font-size: 0.7rem; color: var(--mut); margin-top: 1px; }
    .btn-reset {
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 7px; padding: 5px 12px;
      font-size: 0.7rem; color: var(--mut); cursor: pointer;
      font-family: var(--font);
      display: flex; align-items: center; gap: 5px;
      transition: all 0.15s;
    }
    .btn-reset:hover { border-color: var(--mut); color: var(--fg); }

    /* Maps */
    .map-pane { display: flex; flex-direction: column; overflow: hidden; }
    .bottom-pane { border-top: 1px solid var(--bdr); }
    .map-header {
      padding: 0.55rem 1rem; border-bottom: 1px solid var(--bdr);
      background: var(--card);
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .badge {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.9px; padding: 3px 10px; border-radius: 20px;
      display: flex; align-items: center; gap: 5px;
    }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .u-dot  { background: var(--grn); }
    .r-dot  { background: var(--or2); }
    .user-badge {
      background: rgba(34,197,126,0.1); color: var(--grn);
      border: 1px solid rgba(34,197,126,0.2);
    }
    .rest-badge {
      background: rgba(247,81,15,0.1); color: var(--or2);
      border: 1px solid rgba(247,81,15,0.2);
    }
    .map-hint-sm { font-size: 0.7rem; color: var(--mut); flex: 1; }
    .coord-pill {
      font-family: var(--mono); font-size: 0.62rem; color: #4a4860;
      background: var(--ink); border: 1px solid var(--bdr);
      padding: 3px 9px; border-radius: 6px;
    }
    .map-wrap { flex: 1; position: relative; overflow: hidden; }
    .leaflet-host { height: 100%; width: 100%; }
    .map-no-pin {
      position: absolute; inset: 0; z-index: 500; pointer-events: none;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px;
      background: rgba(15,15,19,0.45); backdrop-filter: blur(2px);
    }
    .map-no-pin span { font-size: 0.75rem; color: var(--mut); }

    /* Leaflet overrides */
    :host ::ng-deep .leaflet-tile           { filter: brightness(0.72) saturate(0.45); }
    :host ::ng-deep .leaflet-container      { background: var(--card); }
    :host ::ng-deep .leaflet-control-zoom a {
      background: var(--ink) !important; color: var(--fg) !important;
      border-color: var(--bdr) !important;
    }
    :host ::ng-deep .leaflet-control-zoom a:hover { background: #2f2d40 !important; }
    :host ::ng-deep .leaflet-popup-content-wrapper {
      background: var(--card) !important; border: 1px solid var(--bdr) !important;
      color: var(--fg) !important; border-radius: 10px !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
    }
    :host ::ng-deep .leaflet-popup-tip     { background: var(--card) !important; }
    :host ::ng-deep .leaflet-popup-content { font-family: var(--font); font-size: 11px; line-height: 1.5; }
    :host ::ng-deep .leaflet-control-attribution {
      background: rgba(15,15,19,0.7) !important; color: #4a4860 !important;
    }

    /* Custom markers */
    :host ::ng-deep .m-user {
      width: 14px; height: 14px; border-radius: 50%;
      background: var(--grn); border: 3px solid #0f0f13;
      box-shadow: 0 0 0 5px rgba(34,197,126,0.25);
    }
    :host ::ng-deep .m-rest {
      width: 14px; height: 14px; border-radius: 50%;
      background: var(--or); border: 3px solid #0f0f13;
      box-shadow: 0 0 0 5px rgba(247,81,15,0.25);
    }

    /* ══ SUCCESS OVERLAY ══════════════════════════════════════ */
    .success-overlay {
      position: absolute; inset: 0; z-index: 9999;
      background: rgba(10,10,18,0.9); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeUp 0.3s ease;
    }
    .success-card {
      background: var(--card); border: 1px solid var(--bdr);
      border-radius: 20px; padding: 2rem 2.2rem;
      max-width: 400px; width: 90%; text-align: center;
      position: relative; overflow: hidden;
    }
    .success-glow {
      position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(247,81,15,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .success-icon {
      font-size: 3.2rem; display: block; margin-bottom: 0.9rem;
      animation: pop 0.5s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes pop { from { transform: scale(0); } 60% { transform: scale(1.2); } to { transform: scale(1); } }
    .success-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.4rem; letter-spacing: -0.3px; }
    .success-sub   { font-size: 0.8rem; color: var(--mut); line-height: 1.6; margin-bottom: 1.3rem; }
    .success-sub code {
      font-family: var(--mono); font-size: 0.75rem;
      color: var(--or2); background: rgba(247,81,15,0.1);
      padding: 1px 5px; border-radius: 4px;
    }
    .success-stats { display: flex; gap: 0.8rem; justify-content: center; margin-bottom: 1rem; }
    .s-stat {
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 10px; padding: 0.7rem 1.1rem;
      display: flex; flex-direction: column; gap: 3px; min-width: 110px;
    }
    .s-k { font-size: 0.62rem; font-weight: 700; color: var(--mut); text-transform: uppercase; letter-spacing: 0.6px; }
    .s-v { font-size: 1.15rem; font-weight: 800; color: var(--or2); }

    .success-coords {
      display: flex; flex-direction: column; gap: 6px;
      margin-bottom: 1.2rem;
    }
    .coord-block {
      background: var(--ink); border: 1px solid var(--bdr);
      border-radius: 8px; padding: 8px 12px; text-align: left;
    }
    .cb-label { display: flex; align-items: center; gap: 5px; font-size: 0.65rem; color: var(--mut); font-weight: 600; margin-bottom: 3px; }
    .c-dot    { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .u-dot-sm { background: var(--grn); }
    .r-dot-sm { background: var(--or2); }
    .cb-val   { font-family: var(--mono); font-size: 0.7rem; color: var(--fg); }

    .full-reset {
      width: 100%; justify-content: center;
      padding: 9px 14px; font-size: 0.78rem;
    }

    /* Spinner */
    .spin {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      border-radius: 50%; animation: sp 0.6s linear infinite;
    }
    @keyframes sp { to { transform: rotate(360deg); } }

    /* ══ RESPONSIVE ══════════════════════════════════════════ */
    @media (max-width: 768px) {
      .shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .sidebar { max-height: 45vh; overflow-y: auto; }
      .main-area { grid-template-rows: 44px 1fr 1fr; }
      .steps-nav { flex-direction: row; overflow-x: auto; gap: 4px; padding: 0.7rem; }
      .step-line { width: 20px; height: 1.5px; margin: 0; margin-bottom: 0; align-self: center; }
      .step-meta { display: none; }
    }
  `]
})
export class LocationSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('userMapEl') userMapEl!: ElementRef;
  @ViewChild('restMapEl') restMapEl!: ElementRef;

  // ── State ────────────────────────────────────────────────────────────────
  step: 'user' | 'restaurant' | 'confirm' = 'user';
  topHint = 'Click either map to drop a pin — or search an address above';
  showSuccess = false;

  // ── Location inputs ───────────────────────────────────────────────────────
  userQuery = '';
  restQuery = '';
  userLoc: LocPin | null = null;
  restLoc: LocPin | null = null;
  searching: 'user' | 'restaurant' | null = null;
  gpsLoading = false;

  // ── Map instances ─────────────────────────────────────────────────────────
  private uMap: any = null;
  private rMap: any = null;
  private uMark: any = null;
  private rMark: any = null;

  // ── Computed ──────────────────────────────────────────────────────────────
  get distance(): string {
    if (!this.userLoc || !this.restLoc) return '—';
    return this.haversine(this.userLoc, this.restLoc).toFixed(2);
  }
  get etaMin(): number { return Math.round(parseFloat(this.distance) * 3 + 8); }
  get etaMax(): number { return this.etaMin + 10; }

  constructor(private zone: NgZone) {}

  ngOnInit(): void   { this.loadLeaflet(); }
  ngAfterViewInit(): void { if ((window as any).L) this.initMaps(); }
  ngOnDestroy(): void  { this.uMap?.remove(); this.rMap?.remove(); }

  // ── Leaflet loader ────────────────────────────────────────────────────────
  private loadLeaflet(): void {
    if ((window as any).L) { return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => this.zone.run(() => this.initMaps());
    document.head.appendChild(js);
  }

  // ── Map init ──────────────────────────────────────────────────────────────
  private initMaps(): void {
    setTimeout(() => {
      const addTiles = (map: any) =>
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors', maxZoom: 19
        }).addTo(map);

      const center: [number, number] = [28.6139, 77.209]; // New Delhi

      this.uMap = L.map(this.userMapEl.nativeElement, { center, zoom: 12 });
      addTiles(this.uMap);
      this.uMap.on('click', (e: any) => this.zone.run(() => this.pinUser(e.latlng)));

      this.rMap = L.map(this.restMapEl.nativeElement, { center, zoom: 12 });
      addTiles(this.rMap);
      this.rMap.on('click', (e: any) => this.zone.run(() => this.pinRest(e.latlng)));
    }, 120);
  }

  // ── Icons ─────────────────────────────────────────────────────────────────
  private uIcon() {
    return L.divIcon({ className: '', html: '<div class="m-user"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
  }
  private rIcon() {
    return L.divIcon({ className: '', html: '<div class="m-rest"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
  }

  // ── Pinning ───────────────────────────────────────────────────────────────
  private async pinUser(ll: { lat: number; lng: number }): Promise<void> {
    const addr = await this.reverseGeo(ll.lat, ll.lng);
    this.userLoc = { lat: ll.lat, lng: ll.lng, addr };
    this.userQuery = addr.substring(0, 60);
    if (this.uMark) this.uMap.removeLayer(this.uMark);
    this.uMark = L.marker([ll.lat, ll.lng], { icon: this.uIcon() })
      .addTo(this.uMap)
      .bindPopup(`<b>Your Location</b><br>${addr.substring(0, 55)}…`)
      .openPopup();
    this.refreshHint();
  }

  private async pinRest(ll: { lat: number; lng: number }): Promise<void> {
    const addr = await this.reverseGeo(ll.lat, ll.lng);
    this.restLoc = { lat: ll.lat, lng: ll.lng, addr };
    this.restQuery = addr.substring(0, 60);
    if (this.rMark) this.rMap.removeLayer(this.rMark);
    this.rMark = L.marker([ll.lat, ll.lng], { icon: this.rIcon() })
      .addTo(this.rMap)
      .bindPopup(`<b>Restaurant</b><br>${addr.substring(0, 55)}…`)
      .openPopup();
    this.refreshHint();
  }

  // ── Address search ────────────────────────────────────────────────────────
  async searchAddr(type: 'user' | 'restaurant'): Promise<void> {
    const q = type === 'user' ? this.userQuery : this.restQuery;
    if (!q.trim()) return;
    this.searching = type;
    const res = await this.geocode(q);
    this.searching = null;
    if (!res) return;
    if (type === 'user') {
      this.uMap.setView([res.lat, res.lng], 15);
      await this.pinUser(res);
    } else {
      this.rMap.setView([res.lat, res.lng], 15);
      await this.pinRest(res);
    }
  }

  // ── GPS ───────────────────────────────────────────────────────────────────
  useGPS(): void {
    if (!navigator.geolocation) return;
    this.gpsLoading = true;
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.uMap.setView([ll.lat, ll.lng], 15);
        await this.pinUser(ll);
        this.gpsLoading = false;
      },
      () => { this.gpsLoading = false; }
    );
  }

  // ── Nominatim ─────────────────────────────────────────────────────────────
  private async geocode(q: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      return data.length ? { lat: +data[0].lat, lng: +data[0].lon } : null;
    } catch { return null; }
  }

  private async reverseGeo(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      return (await res.json()).display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
  }

  // ── Distance (Haversine) ──────────────────────────────────────────────────
  private haversine(a: LocPin, b: LocPin): number {
    const R = 6371;
    const dLat = this.rad(b.lat - a.lat);
    const dLng = this.rad(b.lng - a.lng);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.rad(a.lat)) * Math.cos(this.rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  private rad = (deg: number) => (deg * Math.PI) / 180;

  // ── Navigation ────────────────────────────────────────────────────────────
  goto(s: 'user' | 'restaurant' | 'confirm'): void {
    this.step = s;
    setTimeout(() => {
      if (s === 'user')       this.uMap?.invalidateSize();
      if (s === 'restaurant') this.rMap?.invalidateSize();
    }, 100);
  }

  predict(): void { this.showSuccess = true; }

  resetAll(): void {
    this.userLoc = null;
    this.restLoc = null;
    this.userQuery = '';
    this.restQuery = '';
    this.showSuccess = false;
    this.step = 'user';
    if (this.uMark) { this.uMap.removeLayer(this.uMark); this.uMark = null; }
    if (this.rMark) { this.rMap.removeLayer(this.rMark); this.rMark = null; }
    this.topHint = 'Click either map to drop a pin — or search an address above';
    setTimeout(() => { this.uMap?.invalidateSize(); this.rMap?.invalidateSize(); }, 100);
  }

  private refreshHint(): void {
    if (this.userLoc && this.restLoc) {
      this.topHint = '✓ Both locations pinned — review the summary and predict!';
    } else if (this.userLoc) {
      this.topHint = '✓ Your location set — now pin the restaurant on the lower map';
    } else {
      this.topHint = 'Click either map to drop a pin — or search an address above';
    }
  }
}

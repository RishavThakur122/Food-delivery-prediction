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

  template: `
<div class="shell">

  <!-- ── Full-bleed map ───────────────────────────────────────── -->
  <div class="map-full">
    <div #mapEl class="map-el"></div>

    <!-- mode pill -->
    <div class="mode-pill">
      <button class="mode-btn" [class.active]="pinMode==='user'"    (click)="setMode('user')">
        <span class="m-dot u-dot"></span> Your Location
      </button>
      <button class="mode-btn" [class.active]="pinMode==='restaurant'" [disabled]="!userLoc" (click)="setMode('restaurant')">
        <span class="m-dot r-dot"></span> Restaurant
      </button>
    </div>

    <!-- crosshair hint -->
    <div class="tap-hint" *ngIf="!userLoc || (userLoc && !restLoc && pinMode==='restaurant')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>
      {{ pinMode === 'user' ? 'Tap map to pin your location' : 'Tap map to pin the restaurant' }}
    </div>
  </div>

  <!-- ── Floating side panel ──────────────────────────────────── -->
  <aside class="panel" [class.collapsed]="panelCollapsed">

    <!-- toggle -->
    <button class="collapse-btn" (click)="panelCollapsed = !panelCollapsed" [attr.aria-label]="panelCollapsed ? 'Expand panel' : 'Collapse panel'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path *ngIf="!panelCollapsed" d="M15 18l-6-6 6-6"/>
        <path *ngIf="panelCollapsed"  d="M9 18l6-6-6-6"/>
      </svg>
    </button>

    <div class="panel-inner">

      <!-- brand -->
      <div class="brand">
        <div class="brand-mark">🛵</div>
        <div>
          <div class="brand-name">SwiftBite</div>
          <div class="brand-tag">Delivery Predictor</div>
        </div>
      </div>

      <!-- progress -->
      <div class="progress-track">
        <div class="prog-step" [class.done]="!!userLoc" [class.active]="!userLoc">
          <div class="prog-num">{{ userLoc ? '✓' : '1' }}</div>
          <span>Your Location</span>
        </div>
        <div class="prog-line"></div>
        <div class="prog-step" [class.done]="!!restLoc" [class.active]="userLoc && !restLoc" [class.idle]="!userLoc">
          <div class="prog-num">{{ restLoc ? '✓' : '2' }}</div>
          <span>Restaurant</span>
        </div>
        <div class="prog-line"></div>
        <div class="prog-step" [class.active]="userLoc && restLoc" [class.idle]="!restLoc">
          <div class="prog-num">3</div>
          <span>Predict</span>
        </div>
      </div>

      <div class="sep"></div>

      <!-- search: your location -->
      <div class="field-group">
        <label class="field-label">
          <span class="dot u-dot"></span> Your Location
        </label>
        <div class="search-row">
          <input class="search-input" type="text" [(ngModel)]="userQuery"
            placeholder="Search address…"
            (keyup.enter)="searchAddr('user')"
            [disabled]="searching === 'user'" />
          <button class="go-btn" (click)="searchAddr('user')" [disabled]="searching === 'user'">
            <span *ngIf="searching !== 'user'">→</span>
            <span *ngIf="searching === 'user'" class="spin"></span>
          </button>
        </div>
        <button class="gps-btn" (click)="useGPS()" [disabled]="gpsLoading">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
          {{ gpsLoading ? 'Detecting…' : 'Use GPS' }}
        </button>

        <div class="loc-chip u-chip" *ngIf="userLoc">
          <div class="chip-label">Pinned</div>
          <div class="chip-addr">{{ userLoc.addr | slice:0:65 }}…</div>
          <div class="chip-coord">{{ userLoc.lat | number:'1.5-5' }}, {{ userLoc.lng | number:'1.5-5' }}</div>
        </div>
      </div>

      <!-- search: restaurant -->
      <div class="field-group" [class.locked]="!userLoc">
        <label class="field-label">
          <span class="dot r-dot"></span> Restaurant
        </label>
        <div class="search-row">
          <input class="search-input" type="text" [(ngModel)]="restQuery"
            placeholder="Search restaurant…"
            (keyup.enter)="searchAddr('restaurant')"
            [disabled]="searching === 'restaurant' || !userLoc" />
          <button class="go-btn" (click)="searchAddr('restaurant')" [disabled]="searching === 'restaurant' || !userLoc">
            <span *ngIf="searching !== 'restaurant'">→</span>
            <span *ngIf="searching === 'restaurant'" class="spin"></span>
          </button>
        </div>

        <div class="loc-chip r-chip" *ngIf="restLoc">
          <div class="chip-label">Pinned</div>
          <div class="chip-addr">{{ restLoc.addr | slice:0:65 }}…</div>
          <div class="chip-coord">{{ restLoc.lat | number:'1.5-5' }}, {{ restLoc.lng | number:'1.5-5' }}</div>
        </div>
      </div>

      <!-- ETA card -->
      <div class="eta-card" *ngIf="userLoc && restLoc">
        <div class="eta-row">
          <div class="eta-block">
            <div class="eta-key">Distance</div>
            <div class="eta-val">{{ distance }} <span class="eta-unit">km</span></div>
          </div>
          <div class="eta-divider"></div>
          <div class="eta-block">
            <div class="eta-key">Est. Delivery</div>
            <div class="eta-val">{{ etaMin }}–{{ etaMax }} <span class="eta-unit">min</span></div>
          </div>
        </div>
      </div>

      <!-- actions -->
      <div class="actions">
        <button class="predict-btn" *ngIf="userLoc && restLoc" (click)="predict()">
          Get Delivery Prediction
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button class="reset-btn" *ngIf="userLoc || restLoc" (click)="resetAll()">
          Reset
        </button>
      </div>

    </div>
  </aside>

  <!-- ── Success overlay ──────────────────────────────────────── -->
  <div class="overlay" *ngIf="showSuccess" (click)="showSuccess = false">
    <div class="success-card" (click)="$event.stopPropagation()">

      <button class="close-btn" (click)="showSuccess = false">✕</button>

      <div class="success-emoji">🎉</div>
      <h2 class="success-h">Locations Confirmed</h2>
      <p class="success-p">Ready to pass to your ASP.NET tracking API.</p>

      <div class="result-grid">
        <div class="result-block">
          <div class="rb-label"><span class="dot u-dot"></span> Your Location</div>
          <div class="rb-addr">{{ userLoc?.addr | slice:0:60 }}…</div>
          <div class="rb-coord">{{ userLoc?.lat | number:'1.5-5' }}, {{ userLoc?.lng | number:'1.5-5' }}</div>
        </div>
        <div class="result-block">
          <div class="rb-label"><span class="dot r-dot"></span> Restaurant</div>
          <div class="rb-addr">{{ restLoc?.addr | slice:0:60 }}…</div>
          <div class="rb-coord">{{ restLoc?.lat | number:'1.5-5' }}, {{ restLoc?.lng | number:'1.5-5' }}</div>
        </div>
      </div>

      <div class="result-stats">
        <div class="rs-item">
          <div class="rs-k">Distance</div>
          <div class="rs-v">{{ distance }} km</div>
        </div>
        <div class="rs-item">
          <div class="rs-k">Estimated Delivery</div>
          <div class="rs-v">{{ etaMin }}–{{ etaMax }} min</div>
        </div>
      </div>

      <button class="reset-btn full" (click)="resetAll()">Start Over</button>
    </div>
  </div>

</div>
  `,

  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

    :host {
      --or:     #F7510F;
      --or-lt:  #FFF0EB;
      --grn:    #10B86C;
      --grn-lt: #E8FBF3;
      --ink:    #18130F;
      --mid:    #6B6560;
      --pale:   #F5F0EB;
      --white:  #FFFCFA;
      --bdr:    rgba(24,19,15,0.10);
      --panel:  rgba(255,252,250,0.96);
      --shadow: 0 8px 40px rgba(24,19,15,0.14), 0 2px 8px rgba(24,19,15,0.08);
      --font:   'Syne', sans-serif;
      --body:   'DM Sans', sans-serif;
      --r:      14px;
      display: block;
      height: 100vh;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Shell ───────────────────────────────────────── */
    .shell {
      position: relative;
      height: 100vh;
      overflow: hidden;
      font-family: var(--body);
      background: #E8E0D8;
    }

    /* ── Full map ────────────────────────────────────── */
    .map-full {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .map-el { width: 100%; height: 100%; }

    /* mode pill */
    .mode-pill {
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 800;
      display: flex;
      background: var(--white);
      border: 1px solid var(--bdr);
      border-radius: 50px;
      padding: 4px;
      gap: 2px;
      box-shadow: var(--shadow);
    }
    .mode-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 18px;
      border-radius: 40px;
      border: none;
      background: transparent;
      font-family: var(--body);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--mid);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .mode-btn.active {
      background: var(--ink);
      color: var(--white);
    }
    .mode-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* tap hint */
    .tap-hint {
      position: absolute;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 800;
      display: flex;
      align-items: center;
      gap: 7px;
      background: var(--ink);
      color: var(--white);
      font-family: var(--body);
      font-size: 0.78rem;
      font-weight: 400;
      padding: 9px 18px;
      border-radius: 40px;
      letter-spacing: 0.01em;
      opacity: 0.88;
      pointer-events: none;
      animation: fadeUp 0.3s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 0.88; transform: translateX(-50%) translateY(0); }
    }

    /* dots */
    .dot   { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .m-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .u-dot { background: var(--grn); }
    .r-dot { background: var(--or); }

    /* ── Panel ───────────────────────────────────────── */
    .panel {
      position: absolute;
      top: 18px;
      left: 18px;
      bottom: 18px;
      z-index: 900;
      width: 320px;
      background: var(--panel);
      border: 1px solid var(--bdr);
      border-radius: 20px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .panel.collapsed {
      transform: translateX(calc(-100% - 10px));
      opacity: 0;
      pointer-events: none;
    }

    .collapse-btn {
      position: absolute;
      right: -42px;
      top: 50%;
      transform: translateY(-50%);
      width: 34px;
      height: 34px;
      background: var(--white);
      border: 1px solid var(--bdr);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(24,19,15,0.12);
      color: var(--ink);
      pointer-events: all;
      z-index: 10;
      transition: background 0.15s;
    }
    .panel.collapsed .collapse-btn {
      transform: translateY(-50%) translateX(calc(100% + 10px + 18px));
      right: auto;
      left: 18px;
      opacity: 1;
      pointer-events: all;
    }
    .collapse-btn:hover { background: var(--pale); }

    .panel-inner {
      flex: 1;
      overflow-y: auto;
      padding: 22px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      scrollbar-width: none;
    }
    .panel-inner::-webkit-scrollbar { display: none; }

    /* brand */
    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      background: var(--or);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .brand-name {
      font-family: var(--font);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--ink);
      letter-spacing: -0.3px;
      line-height: 1.1;
    }
    .brand-tag {
      font-size: 0.62rem;
      font-weight: 500;
      color: var(--mid);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 1px;
    }

    /* progress */
    .progress-track {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .prog-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .prog-step span {
      font-size: 0.6rem;
      font-weight: 600;
      color: var(--mid);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .prog-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1.5px solid #D8D2CC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font);
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--mid);
      transition: all 0.2s;
    }
    .prog-step.active .prog-num {
      background: var(--ink);
      border-color: var(--ink);
      color: var(--white);
    }
    .prog-step.done .prog-num {
      background: var(--grn);
      border-color: var(--grn);
      color: white;
      font-size: 0.6rem;
    }
    .prog-step.active span,
    .prog-step.done span {
      color: var(--ink);
    }
    .prog-step.idle { opacity: 0.35; }
    .prog-line {
      flex: 1;
      height: 1.5px;
      background: #D8D2CC;
      margin: 0 6px;
      margin-bottom: 22px;
    }

    .sep { height: 1px; background: var(--bdr); }

    /* field groups */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 7px;
      transition: opacity 0.2s;
    }
    .field-group.locked { opacity: 0.4; pointer-events: none; }

    .field-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .search-row { display: flex; gap: 5px; }
    .search-input {
      flex: 1;
      min-width: 0;
      background: var(--pale);
      border: 1.5px solid transparent;
      border-radius: 10px;
      padding: 9px 12px;
      font-family: var(--body);
      font-size: 0.8rem;
      color: var(--ink);
      outline: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .search-input:focus {
      border-color: var(--or);
      background: var(--white);
    }
    .search-input::placeholder { color: #B5ADA7; }
    .search-input:disabled { opacity: 0.5; cursor: not-allowed; }

    .go-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--ink);
      border: none;
      color: var(--white);
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .go-btn:hover:not(:disabled) { background: #2C2520; }
    .go-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .gps-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: transparent;
      border: 1.5px solid var(--bdr);
      border-radius: 10px;
      padding: 8px;
      font-family: var(--body);
      font-size: 0.76rem;
      font-weight: 500;
      color: var(--mid);
      cursor: pointer;
      transition: all 0.15s;
    }
    .gps-btn:hover:not(:disabled) {
      border-color: var(--or);
      color: var(--or);
    }
    .gps-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* location chips */
    .loc-chip {
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      animation: chipIn 0.25s ease;
    }
    @keyframes chipIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .u-chip { background: var(--grn-lt); border: 1px solid rgba(16,184,108,0.2); }
    .r-chip { background: var(--or-lt);  border: 1px solid rgba(247,81,15,0.2); }

    .chip-label {
      font-family: var(--font);
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .u-chip .chip-label { color: var(--grn); }
    .r-chip .chip-label { color: var(--or); }
    .chip-addr  { font-size: 0.73rem; color: var(--ink); line-height: 1.4; }
    .chip-coord { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: var(--mid); margin-top: 2px; }

    /* ETA card */
    .eta-card {
      background: var(--ink);
      border-radius: var(--r);
      padding: 16px;
      animation: chipIn 0.25s ease;
    }
    .eta-row {
      display: flex;
      align-items: center;
    }
    .eta-block {
      flex: 1;
      text-align: center;
    }
    .eta-key {
      font-size: 0.62rem;
      font-weight: 500;
      color: rgba(255,252,250,0.45);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .eta-val {
      font-family: var(--font);
      font-size: 1.55rem;
      font-weight: 800;
      color: var(--white);
      letter-spacing: -0.5px;
    }
    .eta-unit {
      font-size: 0.7rem;
      font-weight: 400;
      opacity: 0.5;
    }
    .eta-divider {
      width: 1px;
      height: 40px;
      background: rgba(255,252,250,0.1);
      flex-shrink: 0;
    }

    /* actions */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-top: auto;
    }
    .predict-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px;
      background: var(--or);
      border: none;
      border-radius: var(--r);
      font-family: var(--font);
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--white);
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      animation: chipIn 0.3s ease;
    }
    .predict-btn:hover { opacity: 0.88; transform: translateY(-1px); }
    .predict-btn:active { transform: none; }

    .reset-btn {
      width: 100%;
      padding: 9px;
      background: transparent;
      border: 1.5px solid var(--bdr);
      border-radius: var(--r);
      font-family: var(--body);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--mid);
      cursor: pointer;
      transition: all 0.15s;
    }
    .reset-btn:hover { border-color: #B5ADA7; color: var(--ink); }
    .reset-btn.full  { margin-top: 4px; }

    /* spinner */
    .spin {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: sp 0.6s linear infinite;
    }
    @keyframes sp { to { transform: rotate(360deg); } }

    /* ── Overlay / Success ───────────────────────────── */
    .overlay {
      position: absolute;
      inset: 0;
      z-index: 9999;
      background: rgba(24,19,15,0.55);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .success-card {
      position: relative;
      background: var(--white);
      border-radius: 22px;
      padding: 32px 28px 28px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 24px 80px rgba(24,19,15,0.25);
      animation: cardUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes cardUp {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: none; }
    }

    .close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--pale);
      border: none;
      font-size: 0.7rem;
      color: var(--mid);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .close-btn:hover { background: #E8E0D8; }

    .success-emoji {
      font-size: 2.8rem;
      display: block;
      margin-bottom: 10px;
      animation: pop 0.5s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes pop {
      from { transform: scale(0); }
      60%  { transform: scale(1.18); }
      to   { transform: scale(1); }
    }
    .success-h {
      font-family: var(--font);
      font-size: 1.55rem;
      font-weight: 800;
      color: var(--ink);
      letter-spacing: -0.4px;
      margin-bottom: 6px;
    }
    .success-p {
      font-size: 0.82rem;
      color: var(--mid);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .result-grid {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-bottom: 14px;
    }
    .result-block {
      background: var(--pale);
      border-radius: 10px;
      padding: 11px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .rb-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font);
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mid);
    }
    .rb-addr  { font-size: 0.78rem; color: var(--ink); line-height: 1.4; }
    .rb-coord { font-family: monospace; font-size: 0.64rem; color: var(--mid); }

    .result-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .rs-item {
      background: var(--ink);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .rs-k {
      font-size: 0.6rem;
      font-weight: 500;
      color: rgba(255,252,250,0.4);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 4px;
    }
    .rs-v {
      font-family: var(--font);
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--white);
    }

    /* ── Leaflet overrides ───────────────────────────── */
    :host ::ng-deep .leaflet-tile { filter: saturate(0.6) brightness(1.02); }
    :host ::ng-deep .leaflet-container { background: #E8E0D8; }
    :host ::ng-deep .leaflet-control-zoom a {
      background: var(--white) !important;
      color: var(--ink) !important;
      border-color: var(--bdr) !important;
      font-family: var(--body) !important;
    }
    :host ::ng-deep .leaflet-control-zoom { border: none !important; box-shadow: var(--shadow) !important; border-radius: 10px !important; overflow: hidden; }
    :host ::ng-deep .leaflet-control-zoom a:hover { background: var(--pale) !important; }
    :host ::ng-deep .leaflet-popup-content-wrapper {
      background: var(--white) !important;
      border: 1px solid var(--bdr) !important;
      color: var(--ink) !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 30px rgba(24,19,15,0.15) !important;
    }
    :host ::ng-deep .leaflet-popup-tip { background: var(--white) !important; }
    :host ::ng-deep .leaflet-popup-content { font-family: var(--body); font-size: 12px; line-height: 1.5; color: var(--ink) !important; }
    :host ::ng-deep .leaflet-control-attribution {
      background: rgba(255,252,250,0.8) !important;
      color: var(--mid) !important;
      font-size: 10px !important;
    }
    :host ::ng-deep .m-user, :host ::ng-deep .m-rest {
      width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--white);
      box-shadow: 0 2px 12px rgba(24,19,15,0.25);
    }
    :host ::ng-deep .m-user { background: var(--grn); }
    :host ::ng-deep .m-rest { background: var(--or); }

    /* ── Responsive ──────────────────────────────────── */
    @media (max-width: 680px) {
      .panel { width: calc(100vw - 36px); top: auto; bottom: 18px; left: 18px; right: 18px; max-height: 55vh; }
      .collapse-btn { top: -22px; right: 50%; transform: translateX(50%); }
      .panel.collapsed { transform: translateY(calc(100% + 18px)); }
      .panel.collapsed .collapse-btn { transform: translateX(50%) translateY(calc(-100% - 18px - 10px)); left: auto; right: 50%; }
      .mode-pill { top: 14px; }
      .tap-hint  { bottom: auto; top: 58px; }
    }
  `]
})
export class LocationSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef;

  // ── State ─────────────────────────────────────────────────────────────────
  pinMode: 'user' | 'restaurant' = 'user';
  showSuccess  = false;
  panelCollapsed = false;

  // ── Inputs ────────────────────────────────────────────────────────────────
  userQuery = '';
  restQuery = '';
  userLoc: LocPin | null = null;
  restLoc: LocPin | null = null;
  searching: 'user' | 'restaurant' | null = null;
  gpsLoading = false;

  // ── Map ───────────────────────────────────────────────────────────────────
  private map: any   = null;
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

  ngOnInit(): void      { this.loadLeaflet(); }
  ngAfterViewInit(): void { if ((window as any).L) this.initMap(); }
  ngOnDestroy(): void   { this.map?.remove(); }

  // ── Leaflet ───────────────────────────────────────────────────────────────
  private loadLeaflet(): void {
    if ((window as any).L) return;
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
      this.map = L.map(this.mapEl.nativeElement, {
        center: [28.6139, 77.209],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      this.map.on('click', (e: any) => this.zone.run(() => {
        if (this.pinMode === 'user')       this.pinUser(e.latlng);
        else                               this.pinRest(e.latlng);
      }));
    }, 120);
  }

  // ── Icons ─────────────────────────────────────────────────────────────────
  private uIcon = () => L.divIcon({ className: '', html: '<div class="m-user"></div>', iconSize: [16,16], iconAnchor: [8,8] });
  private rIcon = () => L.divIcon({ className: '', html: '<div class="m-rest"></div>', iconSize: [16,16], iconAnchor: [8,8] });

  // ── Pinning ───────────────────────────────────────────────────────────────
  private async pinUser(ll: { lat: number; lng: number }): Promise<void> {
    const addr = await this.reverseGeo(ll.lat, ll.lng);
    this.userLoc  = { lat: ll.lat, lng: ll.lng, addr };
    this.userQuery = addr.substring(0, 60);
    if (this.uMark) this.map.removeLayer(this.uMark);
    this.uMark = L.marker([ll.lat, ll.lng], { icon: this.uIcon() })
      .addTo(this.map)
      .bindPopup(`<b>Your Location</b><br>${addr.substring(0, 55)}…`)
      .openPopup();
    // auto-switch to restaurant mode after pinning user
    this.pinMode = 'restaurant';
  }

  private async pinRest(ll: { lat: number; lng: number }): Promise<void> {
    const addr = await this.reverseGeo(ll.lat, ll.lng);
    this.restLoc  = { lat: ll.lat, lng: ll.lng, addr };
    this.restQuery = addr.substring(0, 60);
    if (this.rMark) this.map.removeLayer(this.rMark);
    this.rMark = L.marker([ll.lat, ll.lng], { icon: this.rIcon() })
      .addTo(this.map)
      .bindPopup(`<b>Restaurant</b><br>${addr.substring(0, 55)}…`)
      .openPopup();
  }

  // ── Address search ────────────────────────────────────────────────────────
  async searchAddr(type: 'user' | 'restaurant'): Promise<void> {
    const q = type === 'user' ? this.userQuery : this.restQuery;
    if (!q.trim()) return;
    this.searching = type;
    const res = await this.geocode(q);
    this.searching = null;
    if (!res) return;
    this.map.setView([res.lat, res.lng], 15);
    if (type === 'user') await this.pinUser(res);
    else                 await this.pinRest(res);
  }

  // ── GPS ───────────────────────────────────────────────────────────────────
  useGPS(): void {
    if (!navigator.geolocation) return;
    this.gpsLoading = true;
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.map.setView([ll.lat, ll.lng], 15);
        await this.pinUser(ll);
        this.gpsLoading = false;
      },
      () => { this.gpsLoading = false; }
    );
  }

  // ── Mode ──────────────────────────────────────────────────────────────────
  setMode(m: 'user' | 'restaurant'): void { this.pinMode = m; }

  // ── Predict ───────────────────────────────────────────────────────────────
  predict(): void { this.showSuccess = true; }

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetAll(): void {
    this.userLoc = null;
    this.restLoc = null;
    this.userQuery = '';
    this.restQuery = '';
    this.showSuccess = false;
    this.pinMode = 'user';
    if (this.uMark) { this.map.removeLayer(this.uMark); this.uMark = null; }
    if (this.rMark) { this.map.removeLayer(this.rMark); this.rMark = null; }
  }

  // ── Nominatim ─────────────────────────────────────────────────────────────
  private async geocode(q: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      return data.length ? { lat: +data[0].lat, lng: +data[0].lon } : null;
    } catch { return null; }
  }

  private async reverseGeo(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } });
      return (await res.json()).display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
  }

  // ── Haversine ─────────────────────────────────────────────────────────────
  private haversine(a: LocPin, b: LocPin): number {
    const R    = 6371;
    const dLat = this.rad(b.lat - a.lat);
    const dLng = this.rad(b.lng - a.lng);
    const x    = Math.sin(dLat/2)**2 + Math.cos(this.rad(a.lat)) * Math.cos(this.rad(b.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  }
  private rad = (d: number) => d * Math.PI / 180;
}
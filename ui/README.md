


---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run dev server
```bash
npm start
```
Open `http://localhost:4200`

### 3. Build for production
```bash
npm run build
```


---

## Connecting to your ASP.NET Backend

Inside `location-selector.component.ts`, find the `predict()` method and call your API:

```typescript
predict(): void {
  const payload = {
    userLat:  this.userLoc!.lat,
    userLng:  this.userLoc!.lng,
    restLat:  this.restLoc!.lat,
    restLng:  this.restLoc!.lng,
    distance: parseFloat(this.distance)
  };

  this.http.post<{ eta: number }>('/api/predict', payload)
    .subscribe(res => {
      console.log('ETA from server:', res.eta);
      this.showSuccess = true;
    });
}
```

Add `HttpClientModule` to imports in `app.component.ts` to enable HTTP.

---

## Map Provider

Uses **Leaflet + OpenStreetMap** — completely free, no API key required.
Geocoding via **Nominatim** (free, rate-limited to 1 req/sec).

For production, consider switching to Google Maps or Mapbox for higher limits.

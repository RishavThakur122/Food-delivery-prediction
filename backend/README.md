# 🛵 SwiftBite Backend — ASP.NET Core Web API

Real road distance + live traffic between a user and a restaurant.

---

## 📁 Project Structure

```
SwiftBite.API/
├── Controllers/
│   └── DeliveryController.cs       ← All API endpoints
├── DTOs/
│   └── RouteDtos.cs                ← Request/Response shapes
├── Middleware/
│   └── GlobalExceptionMiddleware.cs
├── Models/
│   └── ExternalApiModels.cs        ← Google + OSRM JSON models
├── Services/
│   ├── IDistanceService.cs         ← Interface
│   ├── HaversineService.cs         ← Straight-line math
│   ├── GoogleDistanceService.cs    ← Google Maps (with traffic)
│   └── OsrmDistanceService.cs      ← OSRM (free, no traffic)
├── frontend-integration/
│   ├── delivery.service.ts         ← Drop into your Angular project
│   └── environment.ts              ← Angular env files
├── Program.cs
├── appsettings.json
└── SwiftBite.API.csproj
```

---

## ⚡ Running the API

```bash
cd SwiftBite.API
dotnet restore
dotnet run
```

API runs at: `http://localhost:5000`
Swagger UI:  `http://localhost:5000/swagger`

---

## 📡 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/delivery/route` | Road distance + traffic (main endpoint) |
| `GET`  | `/api/delivery/distance` | Instant Haversine distance (no external call) |
| `GET`  | `/api/delivery/health` | Health check |

---

## 🔑 Distance Providers

### Option A — OSRM (FREE, default)
- No API key needed
- Real road routing via OpenStreetMap
- **No live traffic data**

Set in `appsettings.json`:
```json
"DistanceProvider": "OSRM"
```

### Option B — Google Maps (PAID, with live traffic)
1. Go to https://console.cloud.google.com
2. Create a project → Enable **Distance Matrix API**
3. Create an API key → paste it below

Set in `appsettings.json`:
```json
"DistanceProvider": "Google",
"GoogleMaps": {
  "ApiKey": "YOUR_KEY_HERE"
}
```

---

## 🔌 Connecting to Angular Frontend

### Step 1 — Copy the Angular service file
Copy `frontend-integration/delivery.service.ts` into:
```
src/app/services/delivery.service.ts
```

### Step 2 — Create environment files
Copy `frontend-integration/environment.ts` into:
```
src/environments/environment.ts
```

### Step 3 — Add HttpClientModule
In `app.component.ts` (or your AppModule):
```typescript
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()]
});
```

### Step 4 — Call the API from your component
Inject `DeliveryService` and call it inside your `predict()` method:

```typescript
import { DeliveryService, RouteResponseDto } from '../services/delivery.service';

// In constructor:
constructor(private deliveryService: DeliveryService) {}

// In predict():
predict(): void {
  if (!this.userLoc || !this.restLoc) return;

  this.deliveryService.getRoute({
    userLocation:       { lat: this.userLoc.lat, lng: this.userLoc.lng },
    restaurantLocation: { lat: this.restLoc.lat, lng: this.restLoc.lng },
    travelMode:         'driving',
    includeTraffic:     true
  }).subscribe({
    next: (response) => {
      const data: RouteResponseDto = response.data;
      console.log('Road distance:', data.roadDistanceKm, 'km');
      console.log('Duration:', data.durationText);
      console.log('Traffic duration:', data.durationInTrafficText);
      console.log('Traffic condition:', data.trafficCondition);
      this.showSuccess = true;
    },
    error: (err) => console.error('API error:', err)
  });
}
```

---

## 📬 Sample Request & Response

### POST `/api/delivery/route`

**Request body:**
```json
{
  "userLocation":       { "lat": 28.6139, "lng": 77.2090 },
  "restaurantLocation": { "lat": 28.6304, "lng": 77.2177 },
  "travelMode":  "driving",
  "includeTraffic": true
}
```

**Response (OSRM):**
```json
{
  "success": true,
  "data": {
    "straightLineDistanceKm":   2.34,
    "roadDistanceKm":           3.10,
    "distanceText":             "3.1 km",
    "durationMinutes":          14,
    "durationText":             "14 mins",
    "durationInTrafficMinutes": null,
    "durationInTrafficText":    null,
    "trafficCondition":         "Unknown (OSRM — no live traffic)",
    "provider":                 "OSRM",
    "fetchedAt":                "2026-04-26T10:30:00Z"
  },
  "message": "Route fetched successfully."
}
```

**Response (Google — with traffic):**
```json
{
  "success": true,
  "data": {
    "straightLineDistanceKm":   2.34,
    "roadDistanceKm":           3.10,
    "distanceText":             "3.1 km",
    "durationMinutes":          14,
    "durationText":             "14 mins",
    "durationInTrafficMinutes": 19,
    "durationInTrafficText":    "19 mins",
    "trafficCondition":         "Moderate",
    "provider":                 "Google",
    "fetchedAt":                "2026-04-26T10:30:00Z"
  },
  "message": "Route fetched successfully."
}
```

---

## 🚀 Next Steps (when you're ready)
- Add your ML prediction endpoint (`POST /api/delivery/predict`)
- Add authentication (JWT)
- Deploy to Azure App Service or AWS


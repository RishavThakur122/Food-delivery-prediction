

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Basic data shapes for requests and responses.
export interface CoordinateDto {
  lat: number;
  lng: number;
}

export interface RouteRequestDto {
  userLocation: CoordinateDto;
  restaurantLocation: CoordinateDto;
  travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  includeTraffic?: boolean;
}

export interface RouteResponseDto {
  straightLineDistanceKm: number;
  roadDistanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
  durationInTrafficMinutes: number | null;
  durationInTrafficText: string | null;
  trafficCondition: string;
  provider: string;
  fetchedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/delivery`;

  constructor(private http: HttpClient) {}

  /**
   * Ask the backend for route and traffic data.
   */
  getRoute(request: RouteRequestDto): Observable<ApiResponse<RouteResponseDto>> {
    const body = {
      userLocation: request.userLocation,
      restaurantLocation: request.restaurantLocation,
      travelMode: request.travelMode ?? 'driving',
      includeTraffic: request.includeTraffic ?? true,
    };

    return this.http.post<ApiResponse<RouteResponseDto>>(`${this.baseUrl}/route`, body);
  }

  /**
   * Get the straight-line distance between two points.
   */
  getStraightLineDistance(
    userLat: number,
    userLng: number,
    restLat: number,
    restLng: number
  ): Observable<ApiResponse<{ straightLineDistanceKm: number; note: string }>> {
    const params = new HttpParams()
      .set('userLat', userLat)
      .set('userLng', userLng)
      .set('restLat', restLat)
      .set('restLng', restLng);

    return this.http.get<ApiResponse<{ straightLineDistanceKm: number; note: string }>>(
      `${this.baseUrl}/distance`,
      { params }
    );
  }

  /**
   * Check if the backend is available.
   */
  checkHealth(): Observable<ApiResponse<{ status: string; timestamp: string }>> {
    return this.http.get<ApiResponse<{ status: string; timestamp: string }>>(`${this.baseUrl}/health`);
  }
}

using System.Text.Json;
using SwiftBite.API.DTOs;
using SwiftBite.API.Models;

namespace SwiftBite.API.Services;

/// <summary>
/// Uses the OSRM (Open Source Routing Machine) public API for road-based
/// routing. Completely FREE — no API key required.
///
/// ⚠ Limitation: OSRM does NOT have a live-traffic layer.
///   Duration is based on historical average speeds.
///   For real traffic data, switch provider to "Google".
///
/// OSRM endpoint format:
///   GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false
/// </summary>
public class OsrmDistanceService : IDistanceService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<OsrmDistanceService> _logger;

    public OsrmDistanceService(
        IHttpClientFactory factory,
        IConfiguration config,
        ILogger<OsrmDistanceService> logger)
    {
        _http   = factory.CreateClient("OSRM");
        _config = config;
        _logger = logger;
    }

    public async Task<RouteResponseDto> GetRouteInfoAsync(RouteRequestDto request)
    {
        var baseUrl = _config["OSRM:BaseUrl"] ?? "https://router.project-osrm.org";

        // OSRM expects lng,lat (NOT lat,lng)
        var origin      = $"{request.UserLocation.Lng},{request.UserLocation.Lat}";
        var destination = $"{request.RestaurantLocation.Lng},{request.RestaurantLocation.Lat}";

        var url = $"{baseUrl}/route/v1/driving/{origin};{destination}?overview=false&steps=false";

        _logger.LogInformation("Calling OSRM routing API for {Origin} → {Dest}", origin, destination);

        var json = await _http.GetStringAsync(url);
        var response = JsonSerializer.Deserialize<OsrmRouteResponse>(json)
                       ?? throw new Exception("Empty response from OSRM API.");

        if (response.Code != "Ok" || !response.Routes.Any())
            throw new Exception($"OSRM returned code: {response.Code}. No route found.");

        var route = response.Routes.First();

        var roadDistanceKm = Math.Round(route.Distance / 1000.0, 2);
        var durationMin    = (int)Math.Ceiling(route.Duration / 60.0);

        var distanceText = roadDistanceKm >= 1
            ? $"{roadDistanceKm:F1} km"
            : $"{route.Distance:F0} m";

        var durationText = durationMin >= 60
            ? $"{durationMin / 60}h {durationMin % 60}min"
            : $"{durationMin} mins";

        var straightLine = HaversineService.CalculateKm(
            request.UserLocation.Lat, request.UserLocation.Lng,
            request.RestaurantLocation.Lat, request.RestaurantLocation.Lng);

        return new RouteResponseDto
        {
            StraightLineDistanceKm   = straightLine,
            RoadDistanceKm           = roadDistanceKm,
            DistanceText             = distanceText,
            DurationMinutes          = durationMin,
            DurationText             = durationText,
            DurationInTrafficMinutes = null,   // OSRM has no traffic data
            DurationInTrafficText    = null,
            TrafficCondition         = "Unknown (OSRM — no live traffic)",
            Provider                 = "OSRM",
            FetchedAt                = DateTime.UtcNow
        };
    }
}

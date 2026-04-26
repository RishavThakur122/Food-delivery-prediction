using System.Text.Json;
using SwiftBite.API.DTOs;
using SwiftBite.API.Models;

namespace SwiftBite.API.Services;

/// <summary>
/// Uses the Google Distance Matrix API to fetch real road distance
/// plus live traffic duration.
///
/// Requires: GoogleMaps:ApiKey in appsettings.json
///           "Distance Matrix API" enabled in Google Cloud Console
/// </summary>
public class GoogleDistanceService : IDistanceService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleDistanceService> _logger;

    public GoogleDistanceService(
        IHttpClientFactory factory,
        IConfiguration config,
        ILogger<GoogleDistanceService> logger)
    {
        _http   = factory.CreateClient("Google");
        _config = config;
        _logger = logger;
    }

    public async Task<RouteResponseDto> GetRouteInfoAsync(RouteRequestDto request)
    {
        var apiKey     = _config["GoogleMaps:ApiKey"] ?? throw new InvalidOperationException("Google Maps API key is not configured.");
        var baseUrl    = _config["GoogleMaps:DistanceMatrixUrl"]!;
        var travelMode = request.TravelMode.ToLower();

        // Build query string
        var origin      = $"{request.UserLocation.Lat},{request.UserLocation.Lng}";
        var destination = $"{request.RestaurantLocation.Lat},{request.RestaurantLocation.Lng}";

        // departure_time=now enables traffic model (requires billing enabled on key)
        var trafficParam = request.IncludeTraffic
            ? "&departure_time=now&traffic_model=best_guess"
            : string.Empty;

        var url = $"{baseUrl}?origins={origin}&destinations={destination}" +
                  $"&mode={travelMode}&units=metric&key={apiKey}{trafficParam}";

        _logger.LogInformation("Calling Google Distance Matrix API for {Origin} → {Dest}", origin, destination);

        var json = await _http.GetStringAsync(url);
        var response = JsonSerializer.Deserialize<GoogleDistanceMatrixResponse>(json)
                       ?? throw new Exception("Empty response from Google Distance Matrix API.");

        if (response.Status != "OK")
            throw new Exception($"Google Distance Matrix returned status: {response.Status}");

        var element = response.Rows.FirstOrDefault()?.Elements.FirstOrDefault()
                      ?? throw new Exception("No route elements in Google response.");

        if (element.Status != "OK")
            throw new Exception($"Route element status: {element.Status}");

        var roadDistanceKm = Math.Round(element.Distance!.Value / 1000.0, 2);
        var durationMin    = (int)Math.Ceiling(element.Duration!.Value / 60.0);
        int? trafficMin    = element.DurationInTraffic != null
                             ? (int)Math.Ceiling(element.DurationInTraffic.Value / 60.0)
                             : null;

        var straightLine = HaversineService.CalculateKm(
            request.UserLocation.Lat, request.UserLocation.Lng,
            request.RestaurantLocation.Lat, request.RestaurantLocation.Lng);

        return new RouteResponseDto
        {
            StraightLineDistanceKm    = straightLine,
            RoadDistanceKm            = roadDistanceKm,
            DistanceText              = element.Distance.Text,
            DurationMinutes           = durationMin,
            DurationText              = element.Duration.Text,
            DurationInTrafficMinutes  = trafficMin,
            DurationInTrafficText     = element.DurationInTraffic?.Text,
            TrafficCondition          = ClassifyTraffic(durationMin, trafficMin),
            Provider                  = "Google",
            FetchedAt                 = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Compares base duration vs traffic duration to give a traffic label.
    /// </summary>
    private static string ClassifyTraffic(int baseMins, int? trafficMins)
    {
        if (trafficMins is null) return "Unknown";

        var ratio = (double)trafficMins / baseMins;
        return ratio switch
        {
            <= 1.10 => "Light",
            <= 1.30 => "Moderate",
            _       => "Heavy"
        };
    }
}

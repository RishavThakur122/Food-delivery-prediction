using System.Text.Json;

namespace SwiftBite.API.Services;

public class TomTomRouteResult
{
    public double TravelTimeSeconds { get; set; } // with live traffic
    public double TrafficDelaySeconds { get; set; } // extra time due to traffic
    public double LengthMeters { get; set; }
}

public class TomTomService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public TomTomService(IConfiguration config)
    {
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        _apiKey = config["TomTom:ApiKey"]!;
    }

    public async Task<TomTomRouteResult?> GetLiveRoute(
        double fromLat, double fromLng,
        double toLat, double toLng)
    {
        try
        {
            // TomTom Routing API with live traffic
            var url = $"https://api.tomtom.com/routing/1/calculateRoute/" +
                      $"{fromLat},{fromLng}:{toLat},{toLng}/json" +
                      $"?traffic=true" +
                      $"&travelMode=car" +
                      $"&key={_apiKey}";

            var res = await _http.GetStringAsync(url);
            var doc = JsonDocument.Parse(res);

            var summary = doc.RootElement
                .GetProperty("routes")[0]
                .GetProperty("summary");

            return new TomTomRouteResult
            {
                TravelTimeSeconds = summary.GetProperty("travelTimeInSeconds").GetDouble(),
                TrafficDelaySeconds = summary.GetProperty("trafficDelayInSeconds").GetDouble(),
                LengthMeters = summary.GetProperty("lengthInMeters").GetDouble()
            };
        }
        catch { return null; }
    }
}
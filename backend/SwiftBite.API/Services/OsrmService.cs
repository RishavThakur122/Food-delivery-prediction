using System.Text.Json;

namespace SwiftBite.API.Services;

public class OsrmRouteResult
{
    public double DistanceMeters { get; set; }
    public double DurationSeconds { get; set; }
    public string Geometry { get; set; } = ""; // encoded polyline for map
}

public class OsrmService
{
    private readonly HttpClient _http;

    public OsrmService()
    {
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<OsrmRouteResult?> GetRoute(
        double fromLat, double fromLng,
        double toLat, double toLng)
    {
        try
        {
            // OSRM expects lng,lat order
            var url = $"http://router.project-osrm.org/route/v1/driving/" +
                      $"{fromLng},{fromLat};{toLng},{toLat}" +
                      $"?overview=full&steps=false&geometries=polyline";

            var res = await _http.GetStringAsync(url);
            var doc = JsonDocument.Parse(res);
            var root = doc.RootElement;

            if (root.GetProperty("code").GetString() != "Ok") return null;

            var route = root.GetProperty("routes")[0];

            return new OsrmRouteResult
            {
                DistanceMeters = route.GetProperty("distance").GetDouble(),
                DurationSeconds = route.GetProperty("duration").GetDouble(),
                Geometry = route.GetProperty("geometry").GetString() ?? ""
            };
        }
        catch { return null; }
    }
}
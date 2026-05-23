using Microsoft.AspNetCore.SignalR;
using SwiftBite.API.DTOs;
using SwiftBite.API.Hubs;

namespace SwiftBite.API.Services;

public class DelayDetector
{
    private readonly OsrmService _osrm;
    private readonly TomTomService _tomtom;
    private readonly OllamaService _ollama;
    private readonly OrderStore _orders;
    private readonly TrackingStore _tracking;
    private readonly IHubContext<TrackingHub> _hub;
    private readonly IConfiguration _config;

    // track which orders already got an alert — avoid spamming
    private readonly HashSet<string> _alerted = new();

    public DelayDetector(
        OsrmService osrm,
        TomTomService tomtom,
        OllamaService ollama,
        OrderStore orders,
         TrackingStore tracking,
        IHubContext<TrackingHub> hub,
        IConfiguration config)
    {
        _osrm = osrm;
        _tomtom = tomtom;
        _ollama = ollama;
        _orders = orders;
        _hub = hub;
        _tracking = tracking;
        _config = config;
    }

    public async Task CheckAsync(LocationUpdateDto update)
    {
        var order = _orders.Get(update.OrderId);
        if (order is null) return;

        // skip if no user location stored yet
        if (order.UserLocation is null) return;

        // skip if already alerted for this order
        if (_alerted.Contains(update.OrderId)) return;

        //Step 1: get road data 
        var osrm = await _osrm.GetRoute(
            update.Location.Lat, update.Location.Lng,
            order.UserLocation.Lat, order.UserLocation.Lng);

        if (osrm is null) return;
        var snap = _tracking.Get(update.OrderId);
        if (snap is not null)
        {
            snap.RouteGeometry = osrm.Geometry;
            _tracking.Upsert(snap);
        }
        //  Step 2: get live traffic data 
        var tomtom = await _tomtom.GetLiveRoute(
            update.Location.Lat, update.Location.Lng,
            order.UserLocation.Lat, order.UserLocation.Lng);

        if (tomtom is null) return;

        var roadDistanceKm = osrm.DistanceMeters / 1000.0;
        var osrmMinutes = osrm.DurationSeconds / 60.0;
        var tomtomMinutes = tomtom.TravelTimeSeconds / 60.0;
        var trafficDelayMinutes = tomtom.TrafficDelaySeconds / 60.0;
        var hour = DateTime.Now.Hour;

        // Step 3: ask Ollama for prediction 
        var predictedMinutes = await _ollama.PredictMinutes(
            roadDistanceKm,
            osrmMinutes,
            tomtomMinutes,
            trafficDelayMinutes,
            hour);

        // Step 4: compare to original ETA 
        var threshold = int.Parse(_config["DelayThresholdMinutes"] ?? "10");
        var extraMinutes = predictedMinutes - (order.OriginalEtaMinutes ?? predictedMinutes);

        if (extraMinutes < threshold) return; // no delay — do nothing

        // Step 5: generate friendly reason via Ollama 
        var reason = await _ollama.GenerateReason(
            roadDistanceKm,
            update.SpeedKmh ?? 0,
            (int)extraMinutes);

        // Step 6: build alert and broadcast
        var alert = new DelayAlertDto
        {
            OrderId = update.OrderId,
            ExtraMinutes = (int)extraMinutes,
            Reason = reason,
            NewEta = DateTime.UtcNow.AddMinutes(predictedMinutes)
        };

        await _hub.Clients.Group(update.OrderId)
            .SendAsync("DelayAlert", alert);

        // mark as alerted — one alert per order
        _alerted.Add(update.OrderId);
    }
}
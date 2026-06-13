using Microsoft.AspNetCore.SignalR;
using SwiftBite.API.Data;
using SwiftBite.API.DTOs;
using SwiftBite.API.Models;
using SwiftBite.API.Services;

namespace SwiftBite.API.Hubs;

public class TrackingHub : Hub
{
    private readonly TrackingStore _store;
    private readonly OrderStore _orders;
    private readonly DelayDetector _delay;
    private readonly IServiceScopeFactory _scope;
    public TrackingHub(TrackingStore store, OrderStore orders, DelayDetector delay, IServiceScopeFactory scope)
    {
        _store = store;
        _orders = orders;
        _delay = delay;
        _scope = scope;
    }

    //Delivery man: register for an order
    public async Task RegisterDelivery(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, orderId);
        _store.Upsert(new DeliverySnapshot { OrderId = orderId, Status = "En Route" });
        await Clients.Caller.SendAsync("Registered", orderId);
    }

    //Delivery man: push GPS position (call every 3–5 s) 
    public async Task PushLocation(LocationUpdateDto update)
    {
        var snap = _store.Get(update.OrderId) ?? new DeliverySnapshot { OrderId = update.OrderId };

        snap.DeliveryLocation = update.Location;
        snap.SpeedKmh         = update.SpeedKmh;
        snap.Heading          = update.Heading;
        snap.LastUpdated      = DateTime.UtcNow;

        if (snap.UserLocation is not null)
        {
            var km = Haversine(update.Location, snap.UserLocation);
            snap.DistanceToUserKm = km;
            snap.Status = km <= 0.2 ? "Arrived" : km <= 0.5 ? "Nearby" : "En Route";
            var order = _orders.Get(update.OrderId);
            if (order is not null) order.Status = snap.Status;
        }

        _store.Upsert(snap);
        await Clients.Group(update.OrderId).SendAsync("LocationUpdated", snap);

        if (snap.Status == "Arrived")
            await Clients.Group(update.OrderId).SendAsync("DeliveryArrived", update.OrderId);
        _ = Task.Run(() => _delay.CheckAsync(update));
        // save GPS point to history
        _ = Task.Run(async () =>
        {
            using var db = _scope.CreateScope()
                                 .ServiceProvider
                                 .GetRequiredService<AppDbContext>();
            db.AgentLocations.Add(new AgentLocationEntity
            {
                OrderId = update.OrderId,
                Latitude = update.Location.Lat,
                Longitude = update.Location.Lng,
                SpeedKmh = update.SpeedKmh,
                Heading = update.Heading,
                RecordedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        });
    }

    //  Customer: subscribe to watch an order
    public async Task WatchOrder(WatchOrderDto dto)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, dto.OrderId);

        var snap = _store.Get(dto.OrderId);

        if (snap is not null && dto.UserLocation is not null)
        {
            snap.UserLocation = dto.UserLocation;
            _store.Upsert(snap);
        }

        // Send the current state immediately so the customer doesn't wait
        if (snap is not null)
            await Clients.Caller.SendAsync("LocationUpdated", snap);
    }

    // Haversine distance in km 
    private static double Haversine(CoordinateDto a, CoordinateDto b)
    {
        var dLat = (b.Lat - a.Lat) * Math.PI / 180;
        var dLng = (b.Lng - a.Lng) * Math.PI / 180;
        var h = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(a.Lat * Math.PI / 180) * Math.Cos(b.Lat * Math.PI / 180)
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return Math.Round(6371 * 2 * Math.Atan2(Math.Sqrt(h), Math.Sqrt(1 - h)), 2);
    }
}

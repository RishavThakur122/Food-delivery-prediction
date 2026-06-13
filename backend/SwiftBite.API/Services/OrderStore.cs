using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using SwiftBite.API.Data;
using SwiftBite.API.DTOs;
using SwiftBite.API.Models;

namespace SwiftBite.API.Services;

public class OrderStore
{
    private readonly ConcurrentDictionary<string, OrderDto> _orders = new();
    private readonly IServiceScopeFactory _scope;

    public OrderStore(IServiceScopeFactory scope)
    {
        _scope = scope;
    }

    public OrderDto? Get(string orderId) =>
        _orders.TryGetValue(orderId, out var o) ? o : null;

    public IEnumerable<OrderDto> GetAll() => _orders.Values;

    public async Task<OrderDto> CreateAsync(CreateOrderDto dto, int etaMinutes, string userId)
    {
        var order = new OrderDto
        {
            OrderId = Guid.NewGuid().ToString("N")[..8].ToUpper(),
            UserLocation = dto.UserLocation,
            RestaurantLocation = dto.RestaurantLocation,
            OriginalEtaMinutes = etaMinutes
        };

        // write to MySQL
        using var db = _scope.CreateScope()
                             .ServiceProvider
                             .GetRequiredService<AppDbContext>();

        db.Orders.Add(new OrderEntity
        {
            OrderId = order.OrderId,
            Status = order.Status,
            UserId = int.Parse(userId),
            UserLat = dto.UserLocation.Lat,
            UserLng = dto.UserLocation.Lng,
            RestaurantLat = dto.RestaurantLocation.Lat,
            RestaurantLng = dto.RestaurantLocation.Lng,
            OriginalEtaMinutes = etaMinutes
        });
        await db.SaveChangesAsync();

        // cache in memory
        _orders[order.OrderId] = order;
        return order;
    }
    public OrderDto? Accept(string orderId, string driverId)
    {
        var order = Get(orderId);
        if (order is null) return null;

        order.Status = "Driver assigned";
        order.DriverId = driverId;
        return order;
    }
    public async Task UpdateStatusAsync(string orderId, string status)
    {
        if (_orders.TryGetValue(orderId, out var o))
            o.Status = status;

        using var db = _scope.CreateScope()
                             .ServiceProvider
                             .GetRequiredService<AppDbContext>();

        var entity = await db.Orders.FindAsync(orderId);
        if (entity is null) return;
        entity.Status = status;
        await db.SaveChangesAsync();
    }
}
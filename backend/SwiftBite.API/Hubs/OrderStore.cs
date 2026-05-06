using System.Collections.Concurrent;
using SwiftBite.API.DTOs;

namespace SwiftBite.API.Services;

// Holds active orders in memory.
// Each order gets a random short ID so it's easy to share/debug.
public class OrderStore
{
    private readonly ConcurrentDictionary<string, OrderDto> _orders = new();

    public OrderDto Create(CreateOrderDto dto)
    {
        var order = new OrderDto
        {
            OrderId            = Guid.NewGuid().ToString("N")[..8].ToUpper(), // e.g. "A3F9C21B"
            UserLocation       = dto.UserLocation,
            RestaurantLocation = dto.RestaurantLocation
        };

        _orders[order.OrderId] = order;
        return order;
    }
public OrderDto? Accept(string orderId, string driverId)
{
    var order = Get(orderId);
    if (order is null) return null;

    order.Status   = "Driver assigned";
    order.DriverId = driverId;
    return order;
}
    public OrderDto? Get(string orderId) =>
        _orders.TryGetValue(orderId, out var o) ? o : null;
}

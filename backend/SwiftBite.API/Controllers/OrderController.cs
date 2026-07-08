using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SwiftBite.API.Data;
using SwiftBite.API.DTOs;
using SwiftBite.API.Hubs;
using SwiftBite.API.Services;

namespace SwiftBite.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly OrderStore _orders;
    private readonly TrackingStore _tracking;
    private readonly OsrmService _osrm;
    private readonly TomTomService _tomtom;
    private readonly OllamaService _ollama;
    private readonly IHubContext<TrackingHub> _hub;
    private readonly AppDbContext _db;

    public OrderController(
        OrderStore orders,
        TrackingStore tracking,
        OsrmService osrm,
        TomTomService tomtom,
        OllamaService ollama,
        IHubContext<TrackingHub> hub,
        AppDbContext db)
    {
        _orders = orders;
        _tracking = tracking;
        _osrm = osrm;
        _tomtom = tomtom;
        _ollama = ollama;
        _hub = hub;
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult> CreateOrder(CreateOrderDto dto)
    {
        var userIdClaim = User.FindFirst("userId")?.Value;
        if (userIdClaim is null) return Unauthorized();

        // Step 1: get road distance from OSRM 
        var osrmResult = await _osrm.GetRoute(
            dto.UserLocation.Lat, dto.UserLocation.Lng,
            dto.RestaurantLocation.Lat, dto.RestaurantLocation.Lng);

        // Step 2: get live traffic from TomTom 
        var tomtomResult = await _tomtom.GetLiveRoute(
            dto.UserLocation.Lat, dto.UserLocation.Lng,
            dto.RestaurantLocation.Lat, dto.RestaurantLocation.Lng);

        // Step 3: ask Ollama for final prediction
        var roadDistanceKm = osrmResult is not null ? osrmResult.DistanceMeters / 1000.0 : 0;
        var osrmMinutes = osrmResult is not null ? osrmResult.DurationSeconds / 60.0 : 0;
        var tomtomMinutes = tomtomResult is not null ? tomtomResult.TravelTimeSeconds / 60.0 : osrmMinutes;
        var trafficDelayMinutes = tomtomResult is not null ? tomtomResult.TrafficDelaySeconds / 60.0 : 0;
        var hour = DateTime.Now.Hour;

        var etaMinutes = await _ollama.PredictMinutes(
            roadDistanceKm,
            osrmMinutes,
            tomtomMinutes,
            trafficDelayMinutes,
            hour);

        // Step 4: create order with ETA 
        var order = await _orders.CreateAsync(dto, etaMinutes, userIdClaim);
        return Ok(new
        {
            order,
            etaMinutes,
            roadDistanceKm = Math.Round(roadDistanceKm, 2),
            trafficDelayMin = Math.Round(trafficDelayMinutes, 1)
        });
    }

    [HttpGet("{orderId}")]
    public async Task<ActionResult> GetOrder(string orderId)
    {
        var order = _orders.Get(orderId);
        if (order is null) return NotFound();

        var snap = _tracking.Get(orderId);

        // get customer name from DB
        var customer = await _db.Users.FindAsync(
            order.UserId > 0 ? order.UserId : 0);

        return Ok(new
        {
            order,
            tracking = snap,
            customerName = customer?.Name ?? "Customer"
        });
    }

    [HttpGet("{orderId}/status")]
    public ActionResult GetOrderStatus(string orderId)
    {
        var order = _orders.Get(orderId);
        if (order is null) return NotFound();

        var snap = _tracking.Get(orderId);

        return Ok(new
        {
            orderId = order.OrderId,
            status = order.Status,
            driverId = order.DriverId,
            distanceToUser = snap?.DistanceToUserKm,
            driverLocation = snap?.DeliveryLocation,
            lastUpdated = snap?.LastUpdated
        });
    }

    [HttpPost("{orderId}/accept")]
    public ActionResult AcceptOrder(string orderId, [FromQuery] string driverId)
    {
        var order = _orders.Accept(orderId, driverId);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPatch("{orderId}/accept")]
    public async Task<ActionResult> AcceptOrderWithNotification(string orderId, [FromQuery] string driverId)
    {
        var order = _orders.Accept(orderId, driverId);
        if (order is null) return NotFound();

        // notify customer — driver is on the way
        await _hub.Clients.Group(orderId).SendAsync("OrderAccepted", new
        {
            orderId,
            driverId,
            message = "A driver has been assigned to your order!"
        });

        return Ok(order);
    }

    [HttpPatch("{orderId}/cancel")]
    public async Task<ActionResult> CancelOrder(string orderId)
    {
        var order = _orders.Get(orderId);
        if (order is null) return NotFound();

        order.Status = "Cancelled";

        await _hub.Clients.Group(orderId).SendAsync("OrderCancelled", orderId);

        return Ok(order);
    }

    [HttpPost("{orderId}/arrived")]
    public async Task<ActionResult> MarkArrived(string orderId)
    {
        var order = _orders.Get(orderId);
        if (order is null) return NotFound();

        order.Status = "Arrived";
        await _orders.UpdateStatusAsync(orderId, "Arrived");

        await _hub.Clients.Group(orderId)
            .SendAsync("DeliveryArrived", orderId);

        return Ok(new { message = "Marked as arrived" });
    }

    [HttpGet("available", Name = "GetAvailableOrders")]
    public ActionResult GetAvailableOrders()
    {
        var available = _orders.GetAll()
            .Where(o => o.Status == "Waiting for driver")
            .ToList();

        return Ok(available);
    }
}

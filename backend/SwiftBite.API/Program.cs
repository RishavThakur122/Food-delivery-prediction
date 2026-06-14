
using SwiftBite.API.DTOs;
using SwiftBite.API.Hubs;
using SwiftBite.API.Services;
using Microsoft.AspNetCore.SignalR;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using SwiftBite.API.Data;
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
var conn = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(conn));
builder.Services.AddSingleton<TrackingStore>();
builder.Services.AddSingleton<OsrmService>();
builder.Services.AddSingleton<TomTomService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<OrderStore>();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<OllamaService>();
builder.Services.AddSingleton<DelayDetector>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(o => {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("role", "admin"));
});
builder.Services.AddCors(o => o.AddPolicy("dev", p =>
    p.WithOrigins("http://localhost:4200","http://localhost:5000")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();




  


app.UseCors("dev");
app.MapHub<TrackingHub>("/hubs/tracking");
app.UseAuthentication();
app.UseAuthorization();
// REST fallback — for HTTP polling when SignalR isn't available
app.MapGet("/api/tracking/{orderId}", (string orderId, TrackingStore store)=> {
    string check="running proper";
    return Results.Ok(check);
    // store.Get(orderId) is { } snap ? Results.Ok(snap) : Results.NotFound()
    });

app.MapGet("/api/tracking/active", (TrackingStore store) =>
    Results.Ok(store.GetAll()));
// Customer confirms locations → we create an order and return an orderId
//app.MapPost("/api/orders", (CreateOrderDto dto, OrderStore orders) =>
//{   
//    dto.UserLocation = new CoordinateDto(1.2,3.2);
//    dto.RestaurantLocation=new CoordinateDto(4.3,5.6);
//    var order = orders.Create(dto);
//    return Results.Ok(order);
//});
// Customer polls this to get their order + current delivery snapshot
app.MapGet("/api/orders/{orderId}", (string orderId, OrderStore orders, TrackingStore tracking) =>
{
    var order = orders.Get(orderId);
    if (order is null) return Results.NotFound();

    // attach live tracking snapshot if a driver has already registered
    var snap = tracking.Get(orderId);

    return Results.Ok(new { order, tracking = snap });
});
// Driver accepts an order
app.MapPost("/api/orders/{orderId}/accept", (string orderId, string driverId, OrderStore orders) =>
{
    var order = orders.Accept(orderId, driverId);
    return order is null ? Results.NotFound() : Results.Ok(order);

});
app.MapGet("/api/orders/{orderId}/status", (string orderId, OrderStore orders, TrackingStore tracking) =>
{
    var order = orders.Get(orderId);
    if (order is null) return Results.NotFound();

    var snap = tracking.Get(orderId);

    return Results.Ok(new
    {
        orderId = order.OrderId,
        status = order.Status,
        driverId = order.DriverId,
        distanceToUser = snap?.DistanceToUserKm,
        driverLocation = snap?.DeliveryLocation,
        lastUpdated = snap?.LastUpdated
    });
});

// Cancel an order — notifies everyone via SignalR
app.MapMethods("/api/orders/{orderId}/cancel", ["PATCH"],
    async (string orderId, OrderStore orders, IHubContext<TrackingHub> hub) =>
    {
        var order = orders.Get(orderId);
        if (order is null) return Results.NotFound();

        order.Status = "Cancelled";

        await hub.Clients.Group(orderId).SendAsync("OrderCancelled", orderId);

        return Results.Ok(order);
    });

// Driver dashboard — list orders waiting for a driver
app.MapGet("/api/orders/available", (OrderStore orders) =>
{
    var available = orders.GetAll()
        .Where(o => o.Status == "Waiting for driver")
        .ToList();

    return Results.Ok(available);
});


//Auth 
app.MapPost("/api/auth/register", async (RegisterDto dto, AuthService auth) =>
{
    var (success, error, result) = await auth.RegisterAsync(dto);
    return success ? Results.Ok(result) : Results.BadRequest(new { error });
});

app.MapPost("/api/auth/login", async (LoginDto dto, AuthService auth) =>
{
    var (success, error, result) = await auth.LoginAsync(dto);
    return success ? Results.Ok(result) : Results.Unauthorized();
});
// Admin 
app.MapGet("/api/admin/users", async (AppDbContext db) =>
{
    var users = await db.Users
        .OrderByDescending(u => u.CreatedAt)
        .Select(u => new
        {
            u.UserId,
            u.Name,
            u.Email,
            u.Role,
            u.CreatedAt
        })
        .ToListAsync();

    return Results.Ok(users);
}).RequireAuthorization("AdminOnly");

app.MapGet("/api/admin/orders", async (AppDbContext db) =>
{
    var orders = await db.Orders
        .Include(o => o.User)
        .OrderByDescending(o => o.CreatedAt)
        .Select(o => new
        {
            o.OrderId,
            o.Status,
            o.DriverId,
            CustomerName = o.User != null ? o.User.Name : "Unknown",
            CustomerEmail = o.User != null ? o.User.Email : "",
            o.OriginalEtaMinutes,
            o.CreatedAt,
            o.DeliveredAt
        })
        .ToListAsync();

    return Results.Ok(orders);
}).RequireAuthorization("AdminOnly");
app.MapPost("/api/orders", async (
     HttpContext http,
    CreateOrderDto dto,
    OrderStore orders,
    OsrmService osrm,
    TomTomService tomtom,
    OllamaService ollama) =>
{
    var userIdClaim = http.User.FindFirst("userId")?.Value;
    if (userIdClaim is null) return Results.Unauthorized();
    // Step 1: get road distance from OSRM 
    var osrmResult = await osrm.GetRoute(
        dto.UserLocation.Lat, dto.UserLocation.Lng,
        dto.RestaurantLocation.Lat, dto.RestaurantLocation.Lng);

    // Step 2: get live traffic from TomTom 
    var tomtomResult = await tomtom.GetLiveRoute(
        dto.UserLocation.Lat, dto.UserLocation.Lng,
        dto.RestaurantLocation.Lat, dto.RestaurantLocation.Lng);

    // Step 3: ask Ollama for final prediction
    var roadDistanceKm = osrmResult is not null ? osrmResult.DistanceMeters / 1000.0 : 0;
    var osrmMinutes = osrmResult is not null ? osrmResult.DurationSeconds / 60.0 : 0;
    var tomtomMinutes = tomtomResult is not null ? tomtomResult.TravelTimeSeconds / 60.0 : osrmMinutes;
    var trafficDelayMinutes = tomtomResult is not null ? tomtomResult.TrafficDelaySeconds / 60.0 : 0;
    var hour = DateTime.Now.Hour;

    var etaMinutes = await ollama.PredictMinutes(
        roadDistanceKm,
        osrmMinutes,
        tomtomMinutes,
        trafficDelayMinutes,
        hour);

    //Step 4: create order with ETA 
 var order = await orders.CreateAsync(dto, etaMinutes, userIdClaim);
    return Results.Ok(new
    {
        order,
        etaMinutes,
        roadDistanceKm = Math.Round(roadDistanceKm, 2),
        trafficDelayMin = Math.Round(trafficDelayMinutes, 1)
    });
}).RequireAuthorization();
app.Run();

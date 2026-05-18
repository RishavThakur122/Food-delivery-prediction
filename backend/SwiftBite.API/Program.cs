using Scalar.AspNetCore;
using SwiftBite.API.DTOs;
using SwiftBite.API.Hubs;
using SwiftBite.API.Services;
using Microsoft.AspNetCore.SignalR;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
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
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
        ValidateIssuer = false,
        ValidateAudience = false
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddPolicy("dev", p =>
    p.WithOrigins("http://localhost:4200","http://localhost:5000")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();



    app.UseSwagger();
   app.MapScalarApiReference("/scalar/v1", options =>
{
    options.Title = "SwiftBite API";
    options.Theme = ScalarTheme.Default;  
   options.ShowSidebar = true;
});



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
app.MapPost("/api/orders", (CreateOrderDto dto, OrderStore orders) =>
{   
    dto.UserLocation = new CoordinateDto(1.2,3.2);
    dto.RestaurantLocation=new CoordinateDto(4.3,5.6);
    var order = orders.Create(dto);
    return Results.Ok(order);
});
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

//Auth 
app.MapPost("/api/auth/register", (RegisterDto dto, AuthService auth) =>
{
    var (success, error, result) = auth.Register(dto);
    return success ? Results.Ok(result) : Results.BadRequest(new { error });
});

app.MapPost("/api/auth/login", (LoginDto dto, AuthService auth) =>
{
    var (success, error, result) = auth.Login(dto);
    return success ? Results.Ok(result) : Results.Unauthorized();
});
app.Run();

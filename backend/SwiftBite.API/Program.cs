using Scalar.AspNetCore;
using SwiftBite.API.DTOs;
using SwiftBite.API.Hubs;
using SwiftBite.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<TrackingStore>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<OrderStore>();

builder.Services.AddCors(o => o.AddPolicy("dev", p =>
    p.WithOrigins("http://localhost:4200","http://localhost:5000")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.MapScalarApiReference();
}

app.UseCors("dev");
app.MapHub<TrackingHub>("/hubs/tracking");

// REST fallback — for HTTP polling when SignalR isn't available
app.MapGet("/api/tracking/{orderId}", (string orderId, TrackingStore store) =>
    store.Get(orderId) is { } snap ? Results.Ok(snap) : Results.NotFound());

app.MapGet("/api/tracking/active", (TrackingStore store) =>
    Results.Ok(store.GetAll()));
// Customer confirms locations → we create an order and return an orderId
app.MapPost("/api/orders", (CreateOrderDto dto, OrderStore orders) =>
{
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
app.Run();

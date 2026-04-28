using Scalar.AspNetCore;
using SwiftBite.API.Hubs;
using SwiftBite.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<TrackingStore>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.Run();

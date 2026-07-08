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
builder.Services.AddScoped<UserStore>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<OllamaService>();
builder.Services.AddSingleton<DelayDetector>();
builder.Services.AddControllers();
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
    p.WithOrigins("http://localhost:4200", "http://localhost:5000")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseCors("dev");
app.MapHub<TrackingHub>("/hubs/tracking");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

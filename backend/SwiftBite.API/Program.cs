using Serilog;
using SwiftBite.API.Middleware;
using SwiftBite.API.Services;

//Logger bootstrap
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    //Serilog
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console());

    //Controllers & API explorer
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    //Swagger / OpenAPI 
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new()
        {
            Title       = "SwiftBite Delivery API",
            Version     = "v1",
            Description = "Food delivery location + distance + traffic API"
        });
        // Include XML comments if you generate them
        // var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        // c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
    });

    //CORS — allow Angular dev server
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? ["http://localhost:4200"];

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AngularClient", policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod());
    });

    // HttpClients
    builder.Services.AddHttpClient("Google", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
        client.DefaultRequestHeaders.Add("Accept", "application/json");
    });

    builder.Services.AddHttpClient("OSRM", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
        client.DefaultRequestHeaders.Add("User-Agent", "SwiftBite/1.0 (contact@swiftbite.dev)");
        // ⚠ OSRM's public demo server requires a User-Agent header
    });

    //  Distance Service (switch via appsettings.json → DistanceProvider)
    var provider = builder.Configuration["DistanceProvider"] ?? "OSRM";

    if (provider.Equals("Google", StringComparison.OrdinalIgnoreCase))
    {
        Log.Information("Using Google Distance Matrix as distance provider.");
        builder.Services.AddScoped<IDistanceService, GoogleDistanceService>();
    }
    else
    {
        Log.Information("Using OSRM as distance provider (free, no traffic data).");
        builder.Services.AddScoped<IDistanceService, OsrmDistanceService>();
    }


    var app = builder.Build();
    

    // Middleware pipeline 
    app.UseMiddleware<GlobalExceptionMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "SwiftBite API v1");
            c.RoutePrefix = "swagger";   // http://localhost:5000/swagger
        });
    }

    app.UseCors("AngularClient");
    app.UseAuthorization();
    app.MapControllers();

    Log.Information("SwiftBite API starting on {Urls}", string.Join(", ", app.Urls));
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start.");
}
finally
{
    Log.CloseAndFlush();
}

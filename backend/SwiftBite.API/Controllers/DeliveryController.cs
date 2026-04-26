using Microsoft.AspNetCore.Mvc;
using SwiftBite.API.DTOs;
using SwiftBite.API.Services;

namespace SwiftBite.API.Controllers;

/// <summary>
/// Delivery route endpoints.
/// Base URL: /api/delivery
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DeliveryController : ControllerBase
{
    private readonly IDistanceService _distanceService;
    private readonly ILogger<DeliveryController> _logger;

    public DeliveryController(
        IDistanceService distanceService,
        ILogger<DeliveryController> logger)
    {
        _distanceService = distanceService;
        _logger = logger;
    }

    //  POST /api/delivery/route

    //  Main endpoint — takes user + restaurant coords, returns road distance,
    //  duration, and (if using Google) live traffic information.
  

    /// <summary>
    /// Get real road distance and travel time between a user and a restaurant.
    /// When using Google provider, includes live traffic data.
    /// </summary>
    /// <remarks>
    /// Sample request:
    ///
    ///     POST /api/delivery/route
    ///     {
    ///         "userLocation":       { "lat": 28.6139, "lng": 77.2090 },
    ///         "restaurantLocation": { "lat": 28.6304, "lng": 77.2177 },
    ///         "travelMode":  "driving",
    ///         "includeTraffic": true
    ///     }
    /// </remarks>
    [HttpPost("route")]
    [ProducesResponseType(typeof(ApiResponse<RouteResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetRoute([FromBody] RouteRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiErrorResponse { Error = "Invalid request payload.", StatusCode = 400 });

        // Basic coordinate range validation
        if (!IsValidCoordinate(request.UserLocation.Lat, request.UserLocation.Lng))
            return BadRequest(new ApiErrorResponse { Error = "Invalid user coordinates.", StatusCode = 400 });

        if (!IsValidCoordinate(request.RestaurantLocation.Lat, request.RestaurantLocation.Lng))
            return BadRequest(new ApiErrorResponse { Error = "Invalid restaurant coordinates.", StatusCode = 400 });

        _logger.LogInformation(
            "Route request: User({ULat},{ULng}) → Restaurant({RLat},{RLng})",
            request.UserLocation.Lat, request.UserLocation.Lng,
            request.RestaurantLocation.Lat, request.RestaurantLocation.Lng);

        try
        {
            var result = await _distanceService.GetRouteInfoAsync(request);
            return Ok(new ApiResponse<RouteResponseDto> { Data = result, Message = "Route fetched successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch route info.");
            return StatusCode(500, new ApiErrorResponse
            {
                Error      = $"Route service error: {ex.Message}",
                StatusCode = 500
            });
        }
    }

    
    //  GET /api/delivery/distance

    //  Quick straight-line distance via query params (no external API call).
    //  Useful for fast checks from the frontend before calling /route.


    /// <summary>
    /// Returns the straight-line (Haversine) distance between two coordinates.
    /// No external API call — instant response.
    /// </summary>
    [HttpGet("distance")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public IActionResult GetStraightLineDistance(
        [FromQuery] double userLat,
        [FromQuery] double userLng,
        [FromQuery] double restLat,
        [FromQuery] double restLng)
    {
        if (!IsValidCoordinate(userLat, userLng) || !IsValidCoordinate(restLat, restLng))
            return BadRequest(new ApiErrorResponse { Error = "Invalid coordinates supplied.", StatusCode = 400 });

        var distKm = HaversineService.CalculateKm(userLat, userLng, restLat, restLng);

        return Ok(new ApiResponse<object>
        {
            Data = new
            {
                StraightLineDistanceKm = distKm,
                Note = "This is straight-line distance only. Call POST /api/delivery/route for real road distance."
            }
        });
    }


    //  GET /api/delivery/health
  
    //  Simple health check endpoint.


    /// <summary>Health check — confirms the API is running.</summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult Health() =>
        Ok(new ApiResponse<object>
        {
            Data = new
            {
                Status    = "Healthy",
                Timestamp = DateTime.UtcNow,
                Version   = "1.0.0"
            }
        });

    // ─── Private helpers ──────────────────────────────────────────────────
    private static bool IsValidCoordinate(double lat, double lng) =>
        lat is >= -90 and <= 90 && lng is >= -180 and <= 180;
}

using SwiftBite.API.DTOs;

namespace SwiftBite.API.Services;

/// <summary>
/// Contract for any distance-calculation provider.
/// Implementations: GoogleDistanceService, OsrmDistanceService
/// </summary>
public interface IDistanceService
{
    /// <summary>
    /// Fetch real road distance (and optionally live traffic) between two points.
    /// </summary>
    Task<RouteResponseDto> GetRouteInfoAsync(RouteRequestDto request);
}

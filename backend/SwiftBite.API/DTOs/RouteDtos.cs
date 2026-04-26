namespace SwiftBite.API.DTOs;

// Shared 

//A lat/lng coordinate pair.
public record CoordinateDto(double Lat, double Lng);

//Request DTOs 


//Sent by the Angular frontend when the user has pinned both locations.

public class RouteRequestDto
{
    /// <summary>User's delivery address coordinates.</summary>
    public required CoordinateDto UserLocation { get; set; }

    /// <summary>Restaurant coordinates.</summary>
    public required CoordinateDto RestaurantLocation { get; set; }

    /// <summary>
    /// Optional: "driving" (default) | "walking" | "bicycling" | "transit"
    /// Only relevant when using the Google provider.
    /// </summary>
    public string TravelMode { get; set; } = "driving";

    /// <summary>
    /// Optional: request live traffic conditions.
    /// Only effective when Provider = "Google" and a valid API key is set.
    /// </summary>
    public bool IncludeTraffic { get; set; } = true;
}

//  Response DTOs
/// <summary>Full route information returned to the frontend.</summary>
public class RouteResponseDto
{
    /// <summary>Straight-line (as-the-crow-flies) distance in km.</summary>
    public double StraightLineDistanceKm { get; set; }

    /// <summary>Actual road distance in km.</summary>
    public double RoadDistanceKm { get; set; }

    /// <summary>Human-readable road distance (e.g. "4.7 km").</summary>
    public string DistanceText { get; set; } = string.Empty;

    /// <summary>Base travel duration without traffic in minutes.</summary>
    public int DurationMinutes { get; set; }

    /// <summary>Human-readable base duration (e.g. "18 mins").</summary>
    public string DurationText { get; set; } = string.Empty;

    /// <summary>Duration in traffic in minutes (null when using OSRM).</summary>
    public int? DurationInTrafficMinutes { get; set; }

    /// <summary>Human-readable traffic duration (null when using OSRM).</summary>
    public string? DurationInTrafficText { get; set; }

    /// <summary>Traffic condition label: Light / Moderate / Heavy / Unknown.</summary>
    public string TrafficCondition { get; set; } = "Unknown";

    /// <summary>Which provider produced this result: "Google" | "OSRM".</summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>UTC timestamp of when the data was fetched.</summary>
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Wrapper for a successful API response.</summary>
public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Message { get; set; }
}

/// <summary>Wrapper for an error API response.</summary>
public class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public string Error { get; set; } = string.Empty;
    public int StatusCode { get; set; }
}

using System.Text.Json.Serialization;

namespace SwiftBite.API.Models;


//  Google Distance Matrix API response shape


public class GoogleDistanceMatrixResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("rows")]
    public List<GoogleMatrixRow> Rows { get; set; } = [];
}

public class GoogleMatrixRow
{
    [JsonPropertyName("elements")]
    public List<GoogleMatrixElement> Elements { get; set; } = [];
}

public class GoogleMatrixElement
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("distance")]
    public GoogleTextValue? Distance { get; set; }

    [JsonPropertyName("duration")]
    public GoogleTextValue? Duration { get; set; }

    //Only populated when departure_time is set (requires key).
    [JsonPropertyName("duration_in_traffic")]
    public GoogleTextValue? DurationInTraffic { get; set; }
}

public class GoogleTextValue
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; set; }   // metres for distance, seconds for duration
}


//  OSRM Route API response shape


public class OsrmRouteResponse
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("routes")]
    public List<OsrmRoute> Routes { get; set; } = [];
}

public class OsrmRoute
{
    //Total distance in metres.
    [JsonPropertyName("distance")]
    public double Distance { get; set; }

    //Total duration in seconds.
    [JsonPropertyName("duration")]
    public double Duration { get; set; }
}

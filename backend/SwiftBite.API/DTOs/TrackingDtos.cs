namespace SwiftBite.API.DTOs;

public record CoordinateDto(double Lat, double Lng);

// Delivery man sends this every few seconds
public class LocationUpdateDto
{
    public required string OrderId { get; set; }
    public required CoordinateDto Location { get; set; }
    public double? SpeedKmh { get; set; }
    public double? Heading { get; set; }
}

// Stored in memory and broadcast to the customer
public class DeliverySnapshot
{
    public string OrderId { get; set; } = "";
    public CoordinateDto DeliveryLocation { get; set; } = new(0, 0);
    public CoordinateDto? UserLocation { get; set; }
    public double? SpeedKmh { get; set; }
    public double? Heading { get; set; }
    public double? DistanceToUserKm { get; set; }
    public string Status { get; set; } = "En Route"; // En Route | Nearby | Arrived
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

// Customer sends this to start watching an order
public class WatchOrderDto
{
    public required string OrderId { get; set; }
    public CoordinateDto? UserLocation { get; set; }
}
